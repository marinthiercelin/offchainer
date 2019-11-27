pragma solidity >=0.4.21 <0.6.0;
import "../../src/onchain/interfaces.sol";

contract Example1Requester is SecretRequester {

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {}

    event addSecretRequest(uint id);
    event addSecretAnswer(uint id, uint output);

    function addSecret(uint input) public returns (uint){
        uint id = secret_holder.requestComputation(input);
        emit addSecretRequest(id);
    }

    function handleAnswer(uint id, uint output) internal {
        emit addSecretAnswer(id, output);
    }
}
