const crypto = require('crypto');
const HashChainCommitment = require('./HashChainCommitment');

function fromNumberTo256bitHex(number){
    let hex_str = BigInt(number).toString(16);
    let hex_length = hex_str.length;
    return "0".repeat(64-hex_length)+hex_str;
}

class Leaf {
    constructor(value, hash_alg){
        this.value = value; 
    }
    getValue(){
        return this.value;
    }
    getHash(){
        return hash_alg.hash("0".repeat(64)+fromNumberTo256bitHex(this.value));
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
    constructor(left, right, hash_alg){
        this.left = left;
        this.right = right; 
    }
    async getHash(){
        return hash_alg.hash((await this.left.getHash()) + (await this.right.getHash()));
    }
    toString(){
        return `(${this.left.toString()}:${this.right.toString()})`;
    }
}

function makeTree(list, hash_alg){
    if(list.length == 0){
        return new EmptyLeaf();
    }
    if(list.length == 1){
        return new Leaf(list[0], hash_alg);
    }
    let half = Math.ceil(list.length/2.0);
    return new Node(makeTree(list.slice(0, half), hash_alg), makeTree(list.slice(half), hash_alg), hash_alg);
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

module.exports = class MerkleTreeCommitment extends HashChainCommitment {

    async commit(values){
        let extended = extend(values);
        var random_number = crypto.randomBytes(32);
        let tree = makeTree(extended, this.hash);
        var merkleRoot = await tree.getHash();
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
def extendInput(private field[${nb_private_inputs}] secret_inputs) -> (field[${extended_len}]):
    field[${extended_len}] result = [0;${extended_len}]
    for field i in 0..${nb_private_inputs} do
        result[i] = secret_inputs[i]
    endfor
    return result\n` : '\n';
        let extensionStr2 = extended_len != nb_private_inputs ?  `extended = extendInput(secret_inputs)\n\t merkle_root = merkleTree(extended)` : 'merkle_root = merkleTree(secret_inputs)';
        let merkle_str = this.getMerkleString(extended_len);
        let commit_str = `\n
def checkCommitment(private field[${nb_private_inputs}] secret_inputs, private field[2] commitment_key, field[2] commitment) -> (field):
    ${extensionStr2}
    comm = hash([merkle_root[0], merkle_root[1], commitment_key[0], commitment_key[1]])
    field check = if comm[0]==commitment[0] && comm[1]==commitment[1] then 1 else 0 fi
    return check\n\n`;
        return extensionStr + merkle_str + commit_str;
    }

    getMerkleString(length){
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

    static getCommitmentBitSize(nb_private_inputs){
        return 256;
    }
}


