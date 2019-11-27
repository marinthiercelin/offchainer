var offchainer = require('../../../index.js');
const path = require("path");

module.exports.setup = async function(secret, config, options){
    let build_dir = path.resolve(__dirname+"/../build/onchain/");
    let holder_src_file = path.resolve(__dirname+"/onchain_holder.sol");
    let holder_contract = await offchainer.helpers.SolidityCompiler.getCompiledContract(
        true,
        'Example1OnChainHolder', 
        holder_src_file, 
        build_dir
    );
    return {
        holder_contract:holder_contract, 
        holder_args:[secret]
    };
}