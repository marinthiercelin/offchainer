// Class that makes a computation and doesn't provide any verification
module.exports = class UnverifiedComputationSuite {

    /**
     * 
     * @param {(int, int) => int} computeOutput the computation to realize offchain
     */
    constructor(computeOutput){
        this.computeOutput = computeOutput
    }

    // Cryptographic commitment
    commit(value){
        // we don't commit to anything
        return {commitment:"0x00000000000000000000000000000000", key:"0x00000000000000000000000000000000"}
    }

    verificationData(){
        // no veification is performed
        return "0x00000000000000000000000000000000"
    }

    // make the computation and generate a proof of correctness
    computeAndProve(secret, input, commitment_pair){
        // Here we use the method that will be provided by the user
        // And we don't compute any proof since it
        return {output:this.computeOutput(secret, input), proof:"0x00000000000000000000000000000000"}
    }

}


