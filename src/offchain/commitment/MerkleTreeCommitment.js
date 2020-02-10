const crypto = require('crypto');
const fs = require('fs');
const HashBasedCommitment = require('./HashBasedCommitment');

function sha256(hex_string){
    // console.log(hex_string, hex_string.length)
    const hashFun = crypto.createHash('sha256');
    let hex_length = hex_string.length;
    hex_string = "0".repeat(128-hex_length)+hex_string
    // console.log(hex_string, hex_string.length)
    var buffer = Buffer.alloc(64);
    buffer.write(hex_string, 'hex');
    hashFun.update(buffer);
    let hash_digest = hashFun.digest('hex');
    // console.log(hash_digest, hash_digest.length);
    return hash_digest
}

function fromNumberTo256bitHex(number){
    let hex_str = BigInt(number).toString(16);
    let hex_length = hex_str.length;
    return "0".repeat(64-hex_length)+hex_str;
}

class Leaf {
    constructor(value){
        this.value = value;
        this.hash = sha256(fromNumberTo256bitHex(this.value));
    }
    getValue(){
        return this.value;
    }
    getHash(){
        return this.hash;
    }
    toString(){
        return this.value;
    }
}

class EmptyLeaf {
    getValue(){
        return 0;
    }
    getHash(){
        return "0".repeat(64);
    }
    toString(){
        return '-';
    }
}



class Node {
    constructor(left, right){
        this.left = left;
        this.right = right;
    }
    getHash(){
        return sha256(this.left.getHash() + this.right.getHash());
    }
    toString(){
        return `(${this.left.toString()}:${this.right.toString()})`;
    }
}

function makeTree(list){
    if(list.length == 0){
        return new EmptyLeaf();
    }
    if(list.length == 1){
        return new Leaf(list[0]);
    }
    let half = Math.ceil(list.length/2.0);
    return new Node(makeTree(list.slice(0, half)), makeTree(list.slice(half)));
}

function extend(values){
    let len = values.length;
    let powerOf2 = extendedLen(len);
    var extended = values.slice();
    for(var i = 0 ; i < powerOf2 -len; ++i){
        extended.push(0);
    }
    return extended;
}

function extendedLen(len) {
    if(len == 0){
        return 0;
    }
    return Math.pow(2, Math.ceil(Math.log2(len)));
}

module.exports = class MerkleTreeCommitment extends HashBasedCommitment {

    commit(values){
        let extended = extend(values);
        var random_number = crypto.randomBytes(32);
        let tree = makeTree(extended);
        var merkleRoot = tree.getHash();
        var key = random_number.toString('hex');
        var commitment = sha256(merkleRoot+key);
        return {commitment:'0x'+commitment, key:'0x'+key};
    }

    getModifiedMainSignature(nb_private_inputs, nb_public_inputs) {
        return `
def main(private field[${nb_private_inputs}] secret_inputs, field[${nb_public_inputs}] public_inputs, private field[2] commitment_key, field[2] commitment) -> (field):
    field isCommitted = checkCommitment(secret_inputs, commitment_key, commitment)
    isCommitted == 1\n`;
    }

    getCheckCommitString(nb_private_inputs) {
        let extended_len = extendedLen(nb_private_inputs);
        let extensionStr = extended_len != nb_private_inputs ? `\n
def extendInput(private field[${nb_private_inputs}] secret_inputs) -> (field[4]):
    field[4] result = [0;4]
    for field i in 0..3 do
        result[i] = secret_inputs[i]
    endfor
    return result\n` : '\n';
        let helper_functions = `\n
def unpack256(private field toUnpack0, private field toUnpack1) -> (field[256]):
    field[128] unpacked0 = unpack128(toUnpack0)
    field[128] unpacked1 = unpack128(toUnpack1)
    field[256] unpacked = [0;256]
    for field j in 0..128 do
        unpacked[j] = unpacked0[j]
        unpacked[128+j]= unpacked1[j]
    endfor
    return unpacked
    
def hashInput(private field secret_input) -> (field[256]):
    field[256] input_256 = unpack256(0, secret_input)
    field[256] zero_256 = [0; 256]
    field[256] h = sha256(zero_256, input_256)
    return h ${extensionStr}`;
        let extensionStr2 = extended_len != nb_private_inputs ?  `field[${extended_len}] extended = extendInput(secret_inputs)\n\tfield[256] merkle_root = merkleTree(extended)` : 'field[256] merkle_root = merkleTree(secret_inputs)';
        let merkle_str = this.getMerkleString(extended_len);
        let commit_str = `\n
def checkCommitment(private field[${nb_private_inputs}] secret_inputs, private field[2] commitment_key, field[2] commitment) -> (field):
    ${extensionStr2}
    field[256] k = unpack256(commitment_key[0], commitment_key[1])
    field[256] comm = sha256(merkle_root, k)
    field c0 = pack128(comm[0..128])
    field c1 = pack128(comm[128..256])
    field check = if c0==commitment[0] && c1==commitment[1] then 1 else 0 fi
    return check\n\n`;
        return helper_functions + merkle_str + commit_str;
    }

    getIncludeString(){
        return 'from "hashes/sha256/512bitPadded.zok" import main as sha256\nfrom "utils/pack/unpack128.zok" import main as unpack128\nfrom "utils/pack/pack128.zok" import main as pack128\n'
    }

    getMerkleString(length){
        let level = 0;
        let level_ln = length;
        let result = `\n
def merkleTree(private field[${length}] base_values) -> (field[256]):
    field[${level_ln}][256] level${level}_hash = [[0;256];${level_ln}]
    for field i in 0..${level_ln} do
        field[256] h = hashInput(base_values[i])
        level${level}_hash[i] = h
    endfor`;
        while(level_ln > 1){
            level_ln = level_ln/2;
            level +=1;
            result += `
    field[${level_ln}][256] level${level}_hash = [[0;256];${level_ln}]
    for field i in 0..${level_ln} do
        field[256] h = sha256(level${level-1}_hash[2*i], level${level-1}_hash[2*i+1])
        level${level}_hash[i] = h
    endfor`;
        }
        result += `
    return level${level}_hash[0]\n\n`
        return result;
    }

    getZokratesArgs(commitment_pair){
        let commitment_ints = this.hexToBigIntArray(commitment_pair.commitment, 2);
        let key_ints = this.hexToBigIntArray(commitment_pair.key, 2);
        return key_ints.map(x => x.toString()).join(" ") + " " + commitment_ints.map(x => x.toString()).join(" ");
    }
}


