pragma solidity >=0.4.21 <0.6.0;
import "../interfaces/interfaces.sol";

contract NaiveExampleRequester is SecretRequester {
    constructor(NaiveExampleHolder secret_holder) SecretRequester(secret_holder) public {
    }
    event NewExampleAnswer(uint output);

    function addSecret(uint input) public {
        secret_holder.requestComputation(input);
    }

    function handleAnswer(uint output) internal{
         emit NewExampleAnswer(output);
    }
}

contract NaiveExampleHolder is NaiveSecretHolder {
    constructor(uint secret_value) NaiveSecretHolder(secret_value) public {}
    function computation(uint secret_input, uint input) internal returns (uint){
        return secret_input + input;
    }
}

