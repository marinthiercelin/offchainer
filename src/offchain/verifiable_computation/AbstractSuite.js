/**
 * Abstract class that defines the methods that should be implemented by any verifiable computation suite.
 * Has expected by the LocalOffChainHolder class.
 */
module.exports = class AbstractSuite {
    constructor(secret){
        // TODO Make trusted setup if necessary
        // Generate keys and verifier contracts
        this.secret = secret;
    }

    getHolderContractArgs(){
        throw new TypeError("Do not call abstract method.");
    }

    computeAndProve(public_input){
        throw new TypeError("Do not call abstract method.");
    }

}