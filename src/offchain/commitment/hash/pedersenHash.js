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

    zokratesImport(){
        return 'from "hashes/pedersen/512bit.zok" import main as pedersen_hash\n'
        + 'from "utils/pack/unpack128.zok" import main as unpack128\n'
        + 'from "utils/pack/pack128.zok" import main as pack128\n';
    }

    zokratesHashFunction(){
        return '\n';
    }

    zokratesMerkleTree(length){
        let level = 0;
        let level_ln = length;
        let result = `\n
def field2_256ToField512(field[256] input1, field[256] input2) -> (field[512]):
    field[512] result = [0;512]
    for field i in 0..256 do
        result[i] = input1[i]
        result[256+i] = input2[i]
    endfor
    return result

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
    o1 = pack128(input[0..128])
    o2 = pack128(input[128..256])
    return [o1, o2]

def merkleTree(private field[${length}] base_values, private field[2] commitment_key) -> (field[2]):
    field[${level_ln}][256] level${level}_hash = [[0;256];${level_ln}]
    for field i in 0..${level_ln} do
        to512 = field4ToField512([0, 0, 0, base_values[i]])
        h = pedersen_hash(to512)
        level${level}_hash[i] = h
    endfor`;
        while(level_ln > 1){
            level_ln = level_ln/2;
            level +=1;
            result += `
    field[${level_ln}][256] level${level}_hash = [[0;256];${level_ln}]
    for field i in 0..${level_ln} do
        to512 = field2_256ToField512(level${level-1}_hash[2*i], level${level-1}_hash[2*i+1])
        h = pedersen_hash(to512)
        level${level}_hash[i] = h
    endfor`;
        }
        result += `
    key128_0 = unpack128(commitment_key[0])
    key128_1 = unpack128(commitment_key[1])
    field[512] to512 = [0;512]
    for field i in 0..128 do
        to512[i] = level${level}_hash[0][i]
        to512[128+i] = level${level}_hash[0][128+i]
        to512[256+i] = key128_0[i] 
        to512[384+i] = key128_0[i]
    endfor
    comm = pedersen_hash(to512)
    result = field256ToField2(comm)
    return result\n\n`
        return result;
    }

    zokratesHashFunction(){
        return `
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
    o1 = pack128(input[0..128])
    o2 = pack128(input[128..256])
    return [o1, o2]

def hash(field[4] inputs) -> (field[2]):
    unpacked = field4ToField512(inputs)
    h = pedersen_hash(unpacked)
    packed = field256ToField2(h)
    return packed\n\n`;
    }

    zokratesChain(nb_private_inputs){
        return `
def field256ToField2(field[256] input) -> (field[2]):
    o1 = pack128(input[0..128])
    o2 = pack128(input[128..256])
    return [o1, o2]

def chain(private field[${nb_private_inputs}] secret_inputs, private field commitment_key) -> (field[2]):
    field[256] h = [0; 256]
    key128 = unpack128(commitment_key)
    field[512] to_hash = [0;512]
    for field i in 0..128 do
        to_hash[128+i] = key128[i]
    endfor
    for field i in 0..${nb_private_inputs} do
        input128 = unpack128(secret_inputs[i])
        for field i in 0..128 do
            to_hash[i] = key128[i]
            to_hash[256+i] = h[i]
            to_hash[384+i] = h[128+i]
        endfor
        h = pedersen_hash(to_hash)
    endfor
    comm = field256ToField2(h)
    return comm\n`
    }
}