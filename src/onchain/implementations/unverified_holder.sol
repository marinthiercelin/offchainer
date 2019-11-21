pragma solidity >=0.4.21 <0.6.0;
import "../contract_interfaces.sol";

contract UnverifiedOffchainHolder is OffChainSecretHolder {

    // We always return true, hence the computation is unverified
    function verifyProof(uint input, uint output, bytes memory proof) internal returns (bool){
       return true;
    }

}

