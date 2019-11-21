const crypto = require('crypto');
const bigInt = require("big-integer");
const bigIntBuffer = require('bigint-buffer');
const fs = require('fs');
var regexp_quote = require("regexp-quote");

/**
 * 
 * @param {bigInt} value the value to commit to
 */
function commit(value){
    var buffer = bigIntBuffer.toBufferBE('0x'+value.toString(radix=16), 32);
    var random_number = crypto.randomBytes(32);
    buffer = Buffer.concat([buffer, random_number]);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    var digest = hash.digest('hex');
    return {commitment:digest , key:random_number.toString('hex')}
}

function addCommitmentToZokrates(zokrates_filepath, modified_filepath){
    let original_content = fs.readFileSync(zokrates_filepath, 'utf8');
    console.log(original_content);
    let main_start = original_content.search(/ *def *main/);
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

    var include_str = 'import "hashes/sha256/512bitPacked" as sha256packed';
    // var regex = new RegExp(include_str, 'g');
    // include_str = original_content.search(regex) > 0 ? "" : include_str + "\n";

    let modified_final_str = include_str + before_main + "THIS IS A TEST!\n" + original_main + after_main;
    fs.writeFileSync(modified_filepath, modified_final_str);
}

module.exports.commit = commit;
module.exports.addCommitmentToZokrates = addCommitmentToZokrates;