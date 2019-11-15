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
    function callback(uint output) public isFromHolder(){
        handleAnswer(output);
    }
    function handleAnswer(uint output) internal;
}

contract SecretHolder {
    SecretRequester requester;
    bool is_registered;

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
    function requestComputation(uint input) public isFromRequester(){
        makeComputation(input);
    }
    function makeComputation(uint input) internal;
}

contract NaiveSecretHolder is SecretHolder {
    uint private secret;
    constructor(uint secret_value) internal{
        secret = secret_value;
    }
    function makeComputation(uint input) internal{
        uint output = computation(secret, input);
        requester.callback(output);
    }
    function computation(uint secret_input, uint input) internal returns (uint);
}

contract OffChainSecretHolder is SecretHolder {
    bytes private commitment;
    bytes private verification_data;
    struct request {
        uint input;
        bool active;
    }
    uint private request_counter;
    mapping(uint => request) private requests;
    event NewRequest(uint id, uint input);
    event NewAnswer(uint id, uint input, uint output);
    constructor(bytes memory commitment_value, bytes memory verification_data_value) public{
        commitment = commitment_value;
        verification_data = verification_data_value;
        request_counter = 0;
    }
    function makeComputation(uint input) internal {
        requests[request_counter] = request(input, true);
        emit NewRequest(request_counter, input);
        request_counter++;
    }

    function answerRequest(uint id, uint output, bytes memory proof) public{
        require(requests[id].active, "The answer wasn't needed");
        require(verifyProof(requests[id].input, output, proof), "The proof was incorrect");
        requester.callback(output);
    }

    function verifyProof(uint input, uint output, bytes memory proof) internal returns (bool);
}