pragma solidity >=0.4.21 <0.6.0;
import "../../../src/onchain/interfaces.sol";

contract Example1OnChainHolder is OnChainSecretHolder {
    constructor(uint secret_value) OnChainSecretHolder(secret_value) public {
    }
    function computation(uint secret_input, uint input) internal returns (uint){
        return secret_input + input;
    }
}