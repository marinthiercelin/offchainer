const crypto = require('crypto');
const fs = require('fs');



module.exports = class HashChainCommitment {

    constructor(hash_alg){
        this.hash_alg = hash_alg;
    }

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
    async commit(values){
        var random_number = crypto.randomBytes(16);
        var key = random_number.toString('hex');
        key = '0'.repeat(32 - key.length) + key;
        var hash_digest = '0'.repeat(64);
        for(var i in values){
            var value = values[i];
            var value_hex = this.fromNumberTo128bitHex(value);
            var to_hash = value_hex+key+hash_digest;
            hash_digest = await this.hash_alg.hash(to_hash);
        }
        return {commitment:'0x'+hash_digest , key:'0x'+key};
    }

    fromNumberTo128bitHex(number){
        let hex_str = BigInt(number).toString(16);
        let hex_length = hex_str.length;
        return "0".repeat(32-hex_length)+hex_str;
    }

    getMainRegexp(){
        return /def\s+main\s*\(\s*private\s+field(?:\[(\d+)\])*\s+secret_inputs\s*,\s*field(?:\[(\d+)\])*\s+public_inputs\s*\)\s*->\s*\(\s*field\s*\)\s*:\s*\n/;
    }

    /**
     * This function takes a Zokrates file,
     * that defines a function f, taking as arguments one secret field input and a public field input
     * and returns a field output.
     * And produces a new zokrates file, that additionaly takes a public array of 2 fields, the commitment,
     * and a private array of 3 fields, the key, 
     * and checks that commitment0|commitment1 = SHA256(input|key0|key1|key2).
     * @param {string} zokrates_filepath the absolute path to the original zokrates file
     * @param {string} modified_filepath the absolute path of the file that will be generated
     */
    addCommitmentToZokrates(zokrates_filepath, modified_filepath){
        let original_content = fs.readFileSync(zokrates_filepath, 'utf8');
        let main_start_regex = this.getMainRegexp();
        let main_match = original_content.match(main_start_regex);
        let main_start = main_match.index;
        if(main_start < 0 || main_match.length != 3){
            throw "Could not find the main function in the zokrates file";
        }
        let nb_private_inputs = main_match[1] ? parseInt(main_match[1]) : 1;
        let nb_public_inputs = main_match[2] ? parseInt(main_match[2]) : 1;
        let main_end = original_content.length;
        let before_main = original_content.substring(0, main_start);
        let original_main = original_content.substring(main_start, main_end);
        let after_main= original_content.substring(main_end, original_content.length);
        var hash_str = this.hash_alg.zokratesHashFunction();

        var commit_str = this.getCheckCommitString(nb_private_inputs);

        let end_of_main_def = original_main.search('\n');

        let main_original_body = original_main.substring(end_of_main_def+1);

        let modified_main = this.getModifiedMainSignature(nb_private_inputs, nb_public_inputs) + main_original_body;
        let modified_final_str = hash_str + before_main + commit_str + modified_main + after_main;
        fs.writeFileSync(modified_filepath, modified_final_str);
    }

    getModifiedMainSignature(nb_private_inputs, nb_public_inputs) {
        return `\n
def main(private field[${nb_private_inputs}] secret_inputs, field[${nb_public_inputs}] public_inputs, private field commitment_key, field[2] commitment) -> (field):
    field isCommitted = checkCommitment(secret_inputs, commitment_key, commitment)
    isCommitted == 1\n`;
    }

    getCheckCommitString(nb_private_inputs) {
        return `\n
def checkCommitment(private field[${nb_private_inputs}] secret_inputs, private field commitment_key, field[2] commitment) -> (field):
    field[2] h = [0; 2]
    for field i in 0..${nb_private_inputs} do
        h = hash([secret_inputs[i], commitment_key, h[0], h[1]])
    endfor
    field check = if h[0]==commitment[0] && h[1]==commitment[1] then 1 else 0 fi
    return check\n\n`;
    }

    hexTo128bitDecimals(hexstr){
        if(hexstr[0]==='0' && hexstr[1]==='x'){
            hexstr = hexstr.substring(2);
        }
        if(hexstr.length < 32 || hexstr.length % 32 !== 0){
            throw "Cannot divide the hex_str equally in 128bits";
        }
        let divide_in = hexstr.length/32
        let bigIntLen = 32;
        let indexes = [...Array(divide_in).keys()];
        let substrings = indexes.map(i => '0x'+hexstr.substring(i*bigIntLen, (i+1)*bigIntLen));
        let result = substrings.map(str => BigInt(str).toString());
        return result;
    }

    getZokratesArgs(commitment_pair){
        let commitment_ints = this.hexTo128bitDecimals(commitment_pair.commitment);
        let key_ints = this.hexTo128bitDecimals(commitment_pair.key);
        return key_ints.join(" ") + " " + commitment_ints.join(" ");
    }

    getHolderArgs(commitment_pair){
        let commitment_ints = this.hexTo128bitDecimals(commitment_pair.commitment);
        return [commitment_ints];
    }

    static getCommitmentBitSize(nb_private_inputs){
        return 256;
    }
}