pragma solidity ^0.6.1;
import "./interfaces.sol";

contract __PROJECT_NAME__Requester is SecretRequester {

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {
        // You can modify the constructor to accept application specific values
    }

    event Start(uint256 id);
    // You can modify the signature of this event
    event End(uint256 id, uint256[__NB_PUB_INPUTS__] inputs, uint256 result);

    // You can change the signature and arguments of this function
    function start(uint256[__NB_PUB_INPUTS__] memory user_inputs) public returns (uint256) {
        // You can change the way f_inputs are computed
        uint256[__NB_PUB_INPUTS__] memory f_inputs = user_inputs;

        // Do not change below
        // call for a computation of f(secret, f_input)
        uint256 id = secret_holder.requestComputation(f_inputs);
        emit Start(id);
        return id;
    }

    // Do not change the signature of this function
    function end(uint256 id, uint256[__NB_PUB_INPUTS__] memory f_inputs, uint256 output) internal override{
        // You can change the structure and computation of the result
        uint256 result = output;
        emit End(id, f_inputs, result);
    }
}
