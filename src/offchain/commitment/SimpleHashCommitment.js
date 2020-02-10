const crypto = require('crypto');
const HashChainCommitment = require('./HashChainCommitment');

module.exports = class SimpleHashCommitment extends HashChainCommitment{


    /**
     * Defines a commitment scheme
     * This is a hash based commitment using SHA256
     * Where Comm: {0,1}^128 -> {0,1}^384 x {0,1}^256 
     * Comm(x) = (key <- Uniform({0,1}^384), comm := SHA56(x|key))
     * ! This is only secure in the Random oracle model 
     * 
     * @param {bigint} values list of bigint values
     * @returns {Object} an object with a commitment field and a key field.
     */
    commit(values){
        let commitment = "0x";
        let key = "0x";
        var zeros = Buffer.alloc(16);
        for(var i in values){
            var value = values[i];
            var random_number = crypto.randomBytes(32);
            const hash = crypto.createHash('sha256');
            var value_hex = this.fromNumberTo128bitHex(value);
            var value_buffer = Buffer.alloc(16);
            value_buffer.write(value_hex, 'hex');
            var buffer_to_hash = Buffer.concat([zeros, value_buffer, random_number]);
            hash.update(buffer_to_hash);
            var hash_digest = hash.digest();
            commitment += hash_digest.toString('hex');
            key += random_number.toString('hex');
        }
        return {commitment:commitment , key:key};
    }


    getModifiedMainSignature(nb_private_inputs, nb_public_inputs) {
        return `\n
def main(private field[${nb_private_inputs}] secret_inputs, field[${nb_public_inputs}] public_inputs, private field[${2*nb_private_inputs}] commitment_key, field[${2*nb_private_inputs}] commitment) -> (field):
    field isCommitted = checkCommitment(secret_inputs, commitment_key, commitment)
    isCommitted == 1\n`;
    }

    getCheckCommitString(nb_private_inputs) {
        return `\n
def checkCommitment(private field[${nb_private_inputs}] secret_inputs, private field[${2*nb_private_inputs}] commitment_key, field[${2*nb_private_inputs}] commitment) -> (field):
    field check = 1
    for field i in 0..${nb_private_inputs} do
        field[2] comm = sha256([0, secret_inputs[i], commitment_key[2*i], commitment_key[2*i+1]])
        check = if comm[0]==commitment[2*i] && comm[1]==commitment[2*i+1] then check else 0 fi
    endfor
    return check\n\n`;
    }

    getIncludeString(){
        return 'from "hashes/sha256/512bitPacked.zok" import main as sha256\n';
    }

    static getCommitmentBitSize(nb_private_inputs){
        return 2*nb_private_inputs*128;
    }
}