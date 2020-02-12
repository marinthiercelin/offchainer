const exec = require('../../src/offchain/helpers/exec_command');
const assert = require('assert');
const crypto = require('crypto');

async function pedersenHash(hex_str){
    // console.log(hex_str.length);
    let cmd = `python3 ../../dependencies/zokrates_pycrypto/cli.py hash ${hex_str};`;
    let res = await exec(cmd).catch(e =>{console.log(e.stderr); throw e.error});
    return res.stdout.trim();
}

async function sha256Hash(hex_str){
    assert(hex_str.length == 128);
    let buffer = Buffer.alloc(64);
    buffer.write(hex_str, 'hex');
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return new Promise((resolve) => resolve(hash.digest('hex')));
}

async function ZokratesHash(file_name, list){
    assert(list.length == 4, 'Need 4 integers');
    // console.log(list);
    cmd = `zokrates compute-witness -i ${file_name} --light -a ${list.join(" ")};`;
    // console.log(cmd);
    let res = await exec(cmd).catch(e =>{console.log(e.stderr); throw e.error});
    let printout = res.stdout;
    // console.log(printout);
    let reg = /\[\["(\d+)","(\d+)"\]\]/
    let match = printout.match(reg)
    assert(match.length === 3, 'Zokrates didn\'t return 2 integers' );
    return listToHex([match[1], match[2]]);
}

function listToHex(list){
    return list.map(BigInt).map(x => x.toString(16)).map(x => "0".repeat(32 -x.length)+x).join('');
}

async function setup(file_name){
    let cmd = `zokrates compile --light -i ${file_name}.zok -o ${file_name};`
    await exec(cmd).catch(e =>{console.log(e.stderr); throw e.error});
    // cmd = `zokrates setup --light -i ${file_name} -v ${file_name}.ver -p ${file_name}.pr;`
    // await exec(cmd);
}

let list = [10, 20, 30, 40];
console.log(list);
console.log("Pedersen:");
pedersenHash(listToHex(list))
.then(x => console.log("local\n", x, x.length))
.then(()=>{
    let file_name = 'pedersen_hash';
    // setup(file_name).then(()=>ZokratesHash(file_name,list)).catch(e =>{throw e;}).then(console.log);
    return ZokratesHash(file_name,list)
})
.then(x => console.log("zokrates\n", x, x.length))
.then(()=>{
    console.log("SHA256:");
    return sha256Hash(listToHex(list))
})
.then(x => console.log("local\n", x, x.length))
.then(()=>{
    let file_name = 'sha256_hash';
    return setup(file_name).then(()=>ZokratesHash(file_name,list))
    // return ZokratesHash(file_name,list)
})
.then(x => console.log("zokrates\n", x, x.length))
.catch(e =>{throw e;});
