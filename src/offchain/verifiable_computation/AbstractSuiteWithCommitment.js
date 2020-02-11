const AbstractSuite = require('./AbstractSuite');

function fromNumberTo128bitHex(number){
    let hex_str = BigInt(number).toString(16);
    let hex_length = hex_str.length;
    return "0".repeat(32-hex_length)+hex_str;
}

/**
 * Abstract class that defines the methods that should be implemented by any verifiable computation suite.
 * as expected by the LocalOffChainHolder class.
 */
module.exports = class AbstractSuiteWithCommitment extends AbstractSuite {
    
    constructor(config, secret_inputs, commitment_scheme, commitment_pair){
        super(secret_inputs);
        this.config = config;
        this.commitment_scheme = commitment_scheme;
        this.commitment_pair=commitment_pair;
    }

    getCommitmentPair(){
        return this.commitment_pair;
    }

}