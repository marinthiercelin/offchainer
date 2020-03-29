const AbstractSuite = require('../AbstractSuite');

/**
 * Class that performs the computation without giving any kind of way to verify correctness.
 * Meant has a first step toward offchain verifiable computation
 * Should be used with the src/onchain/implementations/unverified_holder.sol holder contract.
 */
module.exports = class UnverifiedComputationSuite extends AbstractSuite {

    /**
     * Constructor of the class
     * @param {Number} secret the input of the computation that stays secret and offchain
     * @param {(secret_input:Number, public_input:Number) => Number} computeOutput the computation to run for each request
     */
    constructor(secret_inputs, computeOutput){
        super(secret_inputs);
        this.computeOutput = computeOutput;
    }

    /**
     * Returns the arguments that should be given when deploying the holder contract.
     */
    getHolderContractArgs(){
        return [];
    }

    /**
     * Makes the computation and returns the output, with an empty proof
     * @param {Number} public_inputs the public input of the computation.
     */
    computeAndProve(public_inputs){
        return {output:this.computeOutput(this.secret_inputs, public_inputs)}
    }

}


