const exec_command = require('./exec_command');
const fs = require('fs');
const path = require('path');

const solidity_path = path.resolve(__dirname+'/../../../dependencies/solidity/build/solc/solc');

module.exports.compile = async function(solidity_file, build_dir){
    if (!fs.existsSync(build_dir)){
        fs.mkdirSync(build_dir, {recursive:true});
    }
    let compile_cmd = `${solidity_path} --abi --bin --overwrite -o ${build_dir} ${solidity_file}`;
    // console.log(compile_cmd);
    let output = await exec_command(compile_cmd);
    return output;
}

module.exports.link = async function(binary_file, build_dir, linked_libraries){
    if (!fs.existsSync(build_dir)){
        fs.mkdirSync(build_dir, {recursive:true});
    }
    let link_cmd = `solc --link --libraries "${linked_libraries.map(x => x.name +":"+x.address).join(" ")}" ${binary_file}`;
    // console.log(link_cmd)
    let output = await exec_command(link_cmd);
    return output;
}

module.exports.getCompiledContract = async function(do_compilation, contract_name, solidity_file, build_dir, linked_libraries=undefined){
    let bin_file = path.resolve(build_dir+`/${contract_name}.bin`);
    if(do_compilation){
        await module.exports.compile(solidity_file, build_dir);
    }
    if(linked_libraries){
        await module.exports.link(bin_file, build_dir, linked_libraries);
    }
    const abi = JSON.parse(fs.readFileSync(path.resolve(build_dir+`/${contract_name}.abi`)));
    const bin = fs.readFileSync(path.resolve(build_dir+`/${contract_name}.bin`));
    return {abi:abi, bin:bin};
}