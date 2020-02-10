pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

abstract contract SecretRequester {

    SecretHolder secret_holder;
    constructor(SecretHolder sh) internal {
        secret_holder = sh;
        secret_holder.registerRequester();
    }
    modifier isFromHolder(){
        require(msg.sender == address(secret_holder), "Answer from unkown holder");
        _;
    }

    function callback(uint256 id, uint128[1] memory f_inputs, uint128 output) public isFromHolder(){
        end(id, f_inputs, output);
    }

    function end(uint256 id, uint128[1] memory f_inputs, uint128 output) internal virtual;
}

abstract contract SecretHolder {

    SecretRequester public requester;
    bool is_registered;
    uint256 private id_counter;

    constructor() public{
        id_counter = 0;
    }

    function registerRequester() public {
        require(!is_registered, "A requester was already registered");
        requester = SecretRequester(msg.sender);
        is_registered = true;
    }
    modifier isFromRequester(){
        require(is_registered, "No requester was registered");
        require(msg.sender == address(requester), "Request from unkown requester");
        _;
    }
    function requestComputation(uint128[1] memory f_inputs)
        public
        payable
        isFromRequester()
    returns (uint256){
        uint256 id = id_counter;
        id_counter++;
        makeComputation(id, f_inputs);
        return id;
    }
    function makeComputation(uint256 id, uint128[1] memory f_inputs) internal virtual;
}



abstract contract OffChainSecretHolder is SecretHolder {
    struct request {
        uint128[1] inputs;
        uint256 reward;
        bool active;
    }
    mapping(uint256 => request) internal requests;
    event NewRequest(uint256 id, uint128[1] inputs, uint256 reward);
    event NewAnswer(uint256 id, uint128[1] inputs, uint128 output);

    function makeComputation(uint256 id, uint128[1] memory f_inputs) internal override{
        requests[id] = request(f_inputs, msg.value, true);
        emit NewRequest(id, f_inputs, msg.value);
    }

    modifier needsAnswer(uint256 id){
        require(requests[id].active, "The answer wasn't needed");
        _;
    }

    function afterCheck(uint256 id, uint128 output, bool check) internal {
        require(check, "The proof was incorrect");
        emit NewAnswer(id, requests[id].inputs, output);
        requests[id].active = false;
        msg.sender.transfer(requests[id].reward);
        requester.callback(id, requests[id].inputs, output);
    }
}

interface VerifierContract{
    function verifyTx(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[1+20+1] calldata inputs
    ) external returns (bool r);
}

contract ZokratesHolder is OffChainSecretHolder {

    uint128[20] public commitment;
    VerifierContract public verifier_contract;

    constructor(uint128[20] memory commitment_value, address verifier_contract_address) public{
        commitment = commitment_value;
        verifier_contract = VerifierContract(verifier_contract_address);
    }

    struct Proof{
        uint256[2] a;
        uint256[2][2] b;
        uint[2] c;
    }

    function answerRequest(uint256 id, uint128 output, Proof memory proof) public needsAnswer(id){
        bool check = verifyProof(requests[id].inputs, output, proof);
        afterCheck(id, output, check);
    }

    // We always return true, hence the computation is unverified
    function verifyProof(uint128[1] memory f_inputs, uint128 output, Proof memory proof) internal returns (bool){
        uint256[1+20+1] memory verifier_inputs;
        for(uint i = 0; i < 1; i++){
            verifier_inputs[i] = f_inputs[i];
        }
        for(uint i = 0; i < 20; i++){
            verifier_inputs[1+i] = commitment[i];
        }
        verifier_inputs[1+20] = output;
        bool check = verifier_contract.verifyTx(proof.a, proof.b, proof.c, verifier_inputs);
        return check;
    }


}