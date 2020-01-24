/**
 * Abstract class that defines the methods that should be implemented by any verifiable computation suite.
 * as expected by the LocalOffChainHolder class.
 */
module.exports = class AbstractSuite {
    constructor(secret){
        this.secret = secret;
    }

    getHolderContractArgs(){
        throw new TypeError("Do not call abstract method.");
    }

    computeAndProve(public_input){
        throw new TypeError("Do not call abstract method.");
    }

}