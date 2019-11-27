var offchainer = require('../../../index.js');
var path = require('path');

module.exports.setup = async function(secret, config, options){
    const zokrates_file = path.resolve(__dirname + '/test_computation.zok');
    const build_dir = path.resolve(__dirname+"/../build/zokrates");
    const setup_dir = path.resolve(build_dir+"/setup");
    const setup_json = path.resolve(setup_dir + '/setup.json');
    
    let zokratesSetup = new offchainer.verifiable_computation.zokrates.Setup(config);
    await zokratesSetup.init(offchainer.commitment.HashBasedCommitment, zokrates_file, setup_dir, options);
    zokratesSetup.save(setup_json);
    // zokratesSetup.load(setup_json);

    console.log(`Verifier contract at address ${zokratesSetup.getSetupValues().verifier_address}`);

    let suite = new offchainer.verifiable_computation.zokrates.Suite(config, zokratesSetup, secret, offchainer.commitment.HashBasedCommitment);
    
    let holder_contract = await offchainer.helpers.SolidityCompiler.getCompiledContract(
        true,
        offchainer.verifiable_computation.zokrates.HolderContractName, 
        offchainer.verifiable_computation.zokrates.HolderContractPath, 
        build_dir
    );
    
    return {
        holder_contract:holder_contract, 
        holder_args:suite.getHolderContractArgs(),
        suite:suite,
        offchain:true
    };
}