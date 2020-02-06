pragma solidity ^0.6.1;

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

    function callback(uint256 id, uint256[] memory inputs, uint256 output) public isFromHolder(){
        handleAnswer(id, inputs, output);
    }
    function handleAnswer(uint256 id, uint256[] memory inputs, uint256 output) internal virtual;
}

abstract contract SecretHolder {

    SecretRequester public requester;
    bool is_registered;
    uint private id_counter;

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
    function requestComputation(uint256[] memory inputs)
        public
        payable
        isFromRequester()
    returns (uint256){
        uint256 id = id_counter;
        id_counter++;
        makeComputation(id, inputs);
        return id;
    }
    function makeComputation(uint256 id, uint256[] memory inputs) internal virtual;
}

abstract contract OnChainSecretHolder is SecretHolder {
    uint private secret;
    constructor(uint256 secret_value) public {
        secret = secret_value;
    }
    function makeComputation(uint256 id, uint256[] memory inputs) internal override{
        uint output = computation(secret, inputs);
        requester.callback(id, inputs, output);
    }
    function computation(uint256 secret_input, uint256[] memory inputs) internal virtual returns (uint256);
}

abstract contract OffChainSecretHolder is SecretHolder {
    struct request {
        uint256[] inputs;
        uint256 reward;
        bool active;
    }
    mapping(uint256 => request) private requests;
    event NewRequest(uint256 id, uint256[] inputs, uint256 reward);
    event NewAnswer(uint256 id, uint256[] inputs, uint256 output);

    function makeComputation(uint256 id, uint256[] memory inputs) internal override{
        requests[id] = request(inputs, msg.value, true);
        emit NewRequest(id, inputs, msg.value);
    }

    function answerRequest(uint256 id, uint256 output, bytes memory proof) public{
        require(requests[id].active, "The answer wasn't needed");
        bool check = verifyProof(requests[id].inputs, output, proof);
        require(check, "The proof was incorrect");
        emit NewAnswer(id, requests[id].inputs, output);
        requests[id].active = false;
        msg.sender.transfer(requests[id].reward);
        requester.callback(id, requests[id].inputs, output);
    }

    function verifyProof(uint256[] memory inputs, uint256 output, bytes memory proof) virtual internal returns (bool);
}