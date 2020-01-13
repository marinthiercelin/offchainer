pragma solidity >=0.4.21 <0.6.0;

contract SecretRequester {

    SecretHolder secret_holder;
    constructor(SecretHolder sh) internal {
        secret_holder = sh;
        secret_holder.registerRequester();
    }
    modifier isFromHolder(){
        require(msg.sender == address(secret_holder), "Answer from unkown holder");
        _;
    }

    function callback(uint256 id, uint256 input, uint256 output) public isFromHolder(){
        handleAnswer(id, input, output);
    }
    function handleAnswer(uint256 id, uint256 input, uint256 output) internal;
}

contract SecretHolder {

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
    function requestComputation(uint256 input)
        public
        payable
        isFromRequester()
    returns (uint256){
        uint256 id = id_counter;
        id_counter++;
        makeComputation(id, input);
        return id;
    }
    function makeComputation(uint256 id, uint256 input) internal;
}

contract OnChainSecretHolder is SecretHolder {
    uint private secret;
    constructor(uint256 secret_value) public {
        secret = secret_value;
    }
    function makeComputation(uint256 id, uint256 input) internal{
        uint output = computation(secret, input);
        requester.callback(id, input, output);
    }
    function computation(uint256 secret_input, uint256 input) internal returns (uint256);
}

contract OffChainSecretHolder is SecretHolder {
    struct request {
        uint256 input;
        uint256 reward;
        bool active;
    }
    mapping(uint256 => request) private requests;
    event NewRequest(uint256 id, uint256 input, uint256 reward);
    event NewAnswer(uint256 id, uint256 input, uint256 output);

    function makeComputation(uint256 id, uint256 input) internal {
        requests[id] = request(input, msg.value, true);
        emit NewRequest(id, input, msg.value);
    }

    function answerRequest(uint256 id, uint256 output, bytes memory proof) public{
        require(requests[id].active, "The answer wasn't needed");
        bool check = verifyProof(requests[id].input, output, proof);
        require(check, "The proof was incorrect");
        emit NewAnswer(id, requests[id].input, output);
        requests[id].active = false;
        msg.sender.transfer(requests[id].reward);
        requester.callback(id, requests[id].input, output);
    }

    function verifyProof(uint256 input, uint256 output, bytes memory proof) internal returns (bool);
}