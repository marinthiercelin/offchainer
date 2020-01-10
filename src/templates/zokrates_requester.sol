pragma solidity >=0.4.21 <0.6.0;
import "./interfaces.sol";

contract ZokratesRequester is SecretRequester {

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {}

    event Start(uint256 id);
    event End(uint256 id, uint256 result);

    function start(uint256 user_data) public returns (uint256){
        // ==== modify here ====

        uint f_input = user_data;
        
        // =====================
        // call for a computation of f(secret, f_input)
        uint256 id = secret_holder.requestComputation(f_input);
        emit Start(id);
    }

    function handleAnswer(uint256 id, uint256 output) internal {
        // receive the value f(secret, f_input)
        // ==== modify here ====

        uint256 result = output;

        // =====================
        emit End(id, result);
    }
}
