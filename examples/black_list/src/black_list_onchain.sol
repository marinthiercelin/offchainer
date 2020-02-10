pragma solidity ^0.6.1;
import "./interfaces.sol";

contract black_listRequester is SecretRequester {

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {
        // You can modify the constructor to accept application-specific values
    }

    event Start(uint256 id);
    // You can modify the signature of this event
    event End(uint256 id, uint128 user_id, bool is_in_blacklist);

    // You can change the signature and arguments of this function
    function isInBlackList(uint128 user_id) public returns (uint256) {
        // You can change the way f_inputs are computed
        uint128[1] memory f_inputs = [user_id];

        // Do not change below
        // call for a computation of f(secret, f_input)
        uint256 id = secret_holder.requestComputation(f_inputs);
        emit Start(id);
        return id;
    }

    // Do not change the signature of this function
    function end(uint256 id, uint128[1] memory f_inputs, uint128 output) internal override{
        // You can change the structure and computation of the result
        emit End(id, f_inputs[0], output==1);
    }
}
