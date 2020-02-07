const crypto = require('crypto');

function sha256(hex_string){
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

function hexToBigIntArray(hexstr, divide_in){
    if(hexstr[0]==='0' && hexstr[1]==='x'){
        hexstr = hexstr.substring(2);
    }
    if(hexstr.length % divide_in !== 0){
        throw "Cannot divide the hex_str equally";
    }
    let bigIntLen = hexstr.length/divide_in;
    let indexes = [...Array(divide_in).keys()];
    let substrings = indexes.map(i => '0x'+hexstr.substring(i*bigIntLen, (i+1)*bigIntLen));
    let result = substrings.map(str => BigInt(str));
    return result;
}

function commit(values){
    var random_number = crypto.randomBytes(32);
    let tree = makeTree(list);
    var merkleRoot = tree.getHash();
    var key = random_number.toString('hex');
    var commitment = sha256(merkleRoot+random_number);
    return {commitment:'0x'+commitment, key:'0x'+key};
}

let list = [25, 90, 877876, 9];
let comm = commit(list);

console.log(list.toString());
console.log(comm);
console.log(hexToBigIntArray(comm.commitment, 2).join( ));
console.log(hexToBigIntArray(comm.key, 2).join(" "));
