const crypto = require('crypto');
const fs = require('fs');

/**
 * 
 * @param {string} value hex string of a 128bit value
 */
function commit(value){
    var buffer = Buffer.alloc(16);
    buffer.write(value, 'hex');
    var random_number = crypto.randomBytes(48);
    buffer = Buffer.concat([buffer, random_number]);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    var digest = hash.digest('hex');
    return {commitment:digest , key:random_number.toString('hex')}
}

function addCommitmentToZokrates(zokrates_filepath, modified_filepath){
    let original_content = fs.readFileSync(zokrates_filepath, 'utf8');
    let main_start_regex = / *def *main *\( *private *field *secret_input *, *field *public_input *\) *-> *\( *field *\) *: *\n/;
    let main_start = original_content.search(main_start_regex);
    if(main_start < 0){
        throw "Could not find the main function in the zokrates file";
    }
    var main_end = original_content.substring(main_start).search(/\n\n/);
    if(main_end < 0){
        main_end = original_content.length;
    }
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