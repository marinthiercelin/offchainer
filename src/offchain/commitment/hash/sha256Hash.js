const assert = require('assert');
const crypto = require('crypto');

module.exports = class sha256Hash {
    
    hash(hex_str){
        if(hex_str.substring(0,2)==="0x"){
            hex_str = hex_str.substring(2);
        }
        assert(hex_str.length == 128);
        let buffer = Buffer.alloc(64);
        buffer.write(hex_str, 'hex');
        const hash = crypto.createHash('sha256');
        hash.update(buffer);
        return new Promise((resolve) => resolve(hash.digest('hex')));
    }

    zokratesImport(){
        return 'from "hashes/sha256/512bitPacked.zok" import main as hash';
    }

    zokratesHashFunction(){
        return '\n';
    }

    zokratesMerkleTree(length){
        let level = 0;
        let level_ln = length;
        let result = `\n
def merkleTree(private field[${length}] base_values) -> (field[2]):
    field[${level_ln}][2] level${level}_hash = [[0;2];${level_ln}]
    for field i in 0..${level_ln} do
        h = hash([0, 0, 0, base_values[i]])
        level${level}_hash[i] = h
    endfor`;
        while(level_ln > 1){
            level_ln = level_ln/2;
            level +=1;
            result += `
    field[${level_ln}][2] level${level}_hash = [[0;2];${level_ln}]
    for field i in 0..${level_ln} do
        h = hash([level${level-1}_hash[2*i][0], level${level-1}_hash[2*i][1], level${level-1}_hash[2*i+1][0], level${level-1}_hash[2*i+1][1]])
        level${level}_hash[i] = h
    endfor`;
        }
        result += `
    return level${level}_hash[0]\n\n`
        return result;
    }


}