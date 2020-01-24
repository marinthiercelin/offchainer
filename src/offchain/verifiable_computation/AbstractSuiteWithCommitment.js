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
    
    constructor(config, secret, commitment_scheme, commitment_pair=undefined){
        super(secret);
        this.config = config;
        this.commitment_scheme = commitment_scheme;
        this._makeCommitment(commitment_pair);
    }

    _makeCommitment(commitment_pair){
        if(typeof commitment_pair !=="undefined"){
            this.commitment_pair=commitment_pair;
        }else{
            let hex_str = fromNumberTo128bitHex(this.secret);
            this.commitment_pair=this.commitment_scheme.commit(hex_str);
        }
    }

    getCommitmentPair(){
        return this.commitment_pair;
    }

}