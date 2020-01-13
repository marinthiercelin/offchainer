const crypto = require('crypto');
const fs = require('fs');
/**
 * Defines a commitment scheme
 * This is a hash based commitment using SHA256
 * Where Comm: {0,1}^128 -> {0,1}^384 x {0,1}^256 
 * Comm(x) = (key <- Uniform({0,1}^384), comm := SHA56(x|key))
 * ! This is only secure in the Random oracle model 
 * 
 * @param {string} value hex string of a 128bit value
 * @returns {Object} an object with a commitment field and a key field.
 */
function commit(value){
    if(value.length > 34){
        throw "Value is too long to hash";
    }
    var buffer = Buffer.alloc(16);
    buffer.write(value, 'hex');
    var random_number = crypto.randomBytes(48);
    buffer = Buffer.concat([buffer, random_number]);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    var digest = hash.digest('hex');
    return {commitment:digest , key:random_number.toString('hex')};
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
function addCommitmentToZokrates(zokrates_filepath, modified_filepath){
    let original_content = fs.readFileSync(zokrates_filepath, 'utf8');
    let main_start_regex = / *def *main *\( *private *field *secret_input *, *field *public_input *\) *-> *\( *field *\) *: *\n/;
    let main_start = original_content.search(main_start_regex);
    if(main_start < 0){
        throw "Could not find the main function in the zokrates file";
    }
    main_end = original_content.length;
    let before_main = original_content.substring(0, main_start);
    let original_main = original_content.substring(main_start, main_end);
    let after_main= original_content.substring(main_end, original_content.length);
    var include_str = 'import "hashes/sha256/512bitPacked" as sha256packed\n';

    var commit_str = `\n
def checkCommitment(private field secret_input, private field[3] commitment_key, field[2] commitment) -> (field):
    field[2] h = sha256packed([secret_input, commitment_key[0], commitment_key[1], commitment_key[2]])
    field check = if h[0]==commitment[0] && h[1]==commitment[1] then 1 else 0 fi
    return check\n\n`

    let end_of_main_def = original_main.search('\n');

    let main_original_body = original_main.substring(end_of_main_def+1);

    let modified_main = `def main(private field secret_input, field public_input, private field[3] commitment_key, field[2] commitment) -> (field):
    field isCommitted = checkCommitment(secret_input, commitment_key, commitment)
    isCommitted == 1\n` + main_original_body;
    let modified_final_str = include_str + before_main + commit_str + modified_main + after_main;
    fs.writeFileSync(modified_filepath, modified_final_str);
}

module.exports.commit = commit;
module.exports.addCommitmentToZokrates = addCommitmentToZokrates;