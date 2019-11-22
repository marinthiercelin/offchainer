pragma solidity >=0.4.21 <0.6.0;
import "../contract_interfaces.sol";

contract ZokratesOffChainHolder is OffChainSecretHolder {

    uint[2] public commitment;
    address public verifier_contract;

    constructor(uint[2] memory commitment_value, address verifier_contract_address) public{
        commitment = commitment_value;
        verifier_contract = verifier_contract_address;
    }

    // We always return true, hence the computation is unverified
    function verifyProof(uint input, uint output, bytes memory proof) internal returns (bool){
       return true;
    }

}



