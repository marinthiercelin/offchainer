const Web3 = require('web3');
// Class that makes a computation and doesn't provide any verification
module.exports = class UnverifiedComputationSuite {

    /**
     * 
     * @param {(int, int) => int} computeOutput the computation to realize offchain
     */
    constructor(computeOutput){
        this.computeOutput = computeOutput
    }

    verificationData(secret){
        // no verification is performed
        return {
            verifier_material : [],
            prover_material: {}
        }
    }

    // make the computation and generate a proof of correctness
    async computeAndProve(secret, input, prover_material){
        // Here we use the method that will be provided by the user
        // And we don't compute any proof since it
        return {output:this.computeOutput(secret, input), proof:[]}
    }

}


