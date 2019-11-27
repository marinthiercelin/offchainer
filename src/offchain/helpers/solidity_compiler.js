const exec_command = require('./exec_command');
const fs = require('fs');
const path = require('path');

module.exports.compile = async function(solidity_file, build_dir){
    if (!fs.existsSync(build_dir)){
        fs.mkdirSync(build_dir, {recursive:true});
    }
    let onchain_path = path.resolve(__dirname+"/../../onchain");
    let compile_cmd = `solc --abi --bin --allow-paths ${onchain_path} --overwrite -o ${build_dir} ${solidity_file}`;
    let output = await exec_command(compile_cmd);
    return output;
}

module.exports.getCompiledContract = async function(do_compilation, contract_name, solidity_file, build_dir){
    if(do_compilation){
        await module.exports.compile(solidity_file, build_dir);
    }
    const abi = JSON.parse(fs.readFileSync(path.resolve(build_dir+`/${contract_name}.abi`)));
    const bin = fs.readFileSync(path.resolve(build_dir+`/${contract_name}.bin`));
    return {abi:abi, bin:bin};
}