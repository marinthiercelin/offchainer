pragma solidity >=0.4.21 <0.6.0;
import "./interfaces.sol";

contract ZokratesRequester is SecretRequester {

    constructor(SecretHolder secret_holder)
        SecretRequester(secret_holder)
        public
    {}

    event Start(uint id);
    event End(uint id, uint result);

    function start(uint user_data) public returns (uint){
        // ==== modify here ====

        uint f_input = user_data;
        
        // =====================
        // call for a computation of f(secret, f_input)
        uint id = secret_holder.requestComputation(f_input);
        emit Start(id);
    }

    function handleAnswer(uint id, uint output) internal {
        // receive the value f(secret, f_input)
        // ==== modify here ====

        uint result = output;

        // =====================
        emit End(id, result);
    }
}
