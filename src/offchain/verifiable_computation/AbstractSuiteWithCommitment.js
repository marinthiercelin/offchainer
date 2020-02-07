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
    
    constructor(config, secret_inputs, commitment_scheme, commitment_pair=undefined){
        super(secret_inputs);
        this.config = config;
        this.commitment_scheme = commitment_scheme;
        this._makeCommitment(commitment_pair);
    }

    _makeCommitment(commitment_pair){
        if(typeof commitment_pair !=="undefined"){
            this.commitment_pair=commitment_pair;
        }else{
            this.commitment_pair=this.commitment_scheme.commit(this.secret_inputs);
        }
    }

    getCommitmentPair(){
        return this.commitment_pair;
    }

}