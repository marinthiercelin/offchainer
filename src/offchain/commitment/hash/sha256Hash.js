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

    zokratesHashFunction(){
        return `
from "hashes/sha256/512bitPacked.zok" import main as sha256_hash

def hash(field[4] inputs) -> (field[2]):
    h = sha256_hash(inputs)
    return h\n\n`;
    }
}