/**
 * Abstract class that defines the methods that should be implemented by any verifiable computation suite.
 * as expected by the LocalOffChainHolder class.
 */
module.exports = class AbstractSuite {
    constructor(secret_inputs){
        this.secret_inputs = secret_inputs;
    }

    getHolderContractArgs(){
        throw new TypeError("Do not call abstract method.");
    }

    computeAndProve(public_inputs){
        throw new TypeError("Do not call abstract method.");
    }

}