// Template to follow for verifiable computation suite :
// This shows the method that are expected by the secret holder.
class TemplateSuite {
    constructor(){
        // TODO Make trusted setup if necessary
        // Generate keys and verifier contracts
    }

    // Cryptographic commitment
    commit(value){
        // TODO implement it
        return {commitment:0, key:0}
    }

    verificationData(){
        // Return the verification key, or the verifier contract address
        return 0
    }

    // make the computation and generate a proof of correctness
    computeAndProve(secret, input, commitment_pair){
        // TODO implement it
        return {output:0, proof:0}
    }

}