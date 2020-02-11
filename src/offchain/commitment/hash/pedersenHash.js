const path = require('path');
const exec = require('../../helpers/exec_command');
const assert = require('assert');

const zokrates_pycrypto_cli = path.resolve(__dirname+'/../../../../dependencies/zokrates_pycrypto/cli.py') 

module.exports = class PedersenHash {
    
    hash(hex_str){
        if(hex_str.substring(0,2)==="0x"){
            hex_str = hex_str.substring(2);
        }
        assert(hex_str.length == 128);

        let cmd = `python3 ${zokrates_pycrypto_cli} hash ${hex_str};`;
        return exec(cmd).then(res => res.stdout.trim()).catch(e =>{console.log(e.stderr); throw e.error});
    }

    zokratesHashFunction(){
        return `
from "hashes/pedersen/512bit.zok" import main as pedersen_hash
from "utils/pack/unpack128.zok" import main as unpack128
from "utils/pack/pack128.zok" import main as pack128

def field4ToField512(field[4] inputs) -> (field[512]):
    field[4][128] unpacked128 =[[0;128];4]
    for field i in 0..4 do
        unpacked = unpack128(inputs[i])
        unpacked128[i] = unpacked
    endfor
    field[512] result = [0;512]
    for field i in 0..128 do
        result[i] = unpacked128[0][i]
        result[128+i] = unpacked128[1][i]
        result[256+i] = unpacked128[2][i]
        result[384+i] = unpacked128[3][i]
    endfor
    return result

def field256ToField2(field[256] input) -> (field[2]):
    field[128] input1 = input[0..128]
    field[128] input2 = input[128..256]
    output1 = pack128(input1)
    output2 = pack128(input2)
    return [output1, output2]

def hash(field[4] inputs) -> (field[2]):
    unpacked = field4ToField512(inputs)
    h = pedersen_hash(unpacked)
    packed = field256ToField2(h)
    return packed\n\n`;
    }
}