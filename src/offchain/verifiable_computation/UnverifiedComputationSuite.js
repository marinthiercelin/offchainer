// Class that makes a computation and doesn't provide any verification
class UnverifiedComputationSuite {

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
        return {commitment:0, key:0}
    }

    verificationData(){
        // no veification is performed
        return 0
    }

    // make the computation and generate a proof of correctness
    computeAndProve(secret, input, commitment_pair){
        // Here we use the method that will be provided by the user
        // And we don't compute any proof since it
        return {output:this.computeOutput(secret, input), proof:0}
    }

}


