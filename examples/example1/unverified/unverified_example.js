var offchainer = require('../../../index.js');
const path = require("path");

module.exports.setup = async function(secret, config, options){
    let build_dir = path.resolve(__dirname+"/../build/unverified");
    let holder_contract = await offchainer.helpers.SolidityCompiler.getCompiledContract(
        true,
        offchainer.verifiable_computation.unverified.HolderContractName, 
        offchainer.verifiable_computation.unverified.HolderContractPath, 
        build_dir
    );
    
    let computation = function(secret, input){
        return secret + input;
    }
    let suite = new offchainer.verifiable_computation.unverified.Suite(secret, computation);
    return {
        holder_contract:holder_contract, 
        holder_args:suite.getHolderContractArgs(),
        suite:suite,
        offchain:true
    };
}