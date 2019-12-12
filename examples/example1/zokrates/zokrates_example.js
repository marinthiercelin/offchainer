var offchainer = require('../../../index.js');
var path = require('path');
var {performance} = require('perf_hooks');

module.exports.setup = async function(secret, config, options){
    const zokrates_file = path.resolve(__dirname + '/test_computation.zok');
    const build_dir = path.resolve(__dirname+"/../build/zokrates");
    const setup_dir = path.resolve(build_dir+"/setup");
    const setup_json = path.resolve(setup_dir + '/setup.json');
    

    let zokratesSetup = new offchainer.verifiable_computation.zokrates.Setup(config);

    t0 = performance.now();
    await zokratesSetup.init(offchainer.commitment.HashBasedCommitment, zokrates_file, setup_dir);
    t1 = performance.now();
    if(config.write_measure){
        var measure_data = {
            actor: "trusted 3rd party",
            action: "key generation",
            type: "time",
            value: (t1 - t0)/1000.0,
            unit: "s.",
        };
        config.write_measure(measure_data);
    }

    t0 = performance.now();
    await zokratesSetup.deployVerifier(options);
    t1 = performance.now();
    if(config.write_measure){
        var measure_data = {
            actor: "owner",
            action: "verifier deployment",
            type: "time",
            value: (t1 - t0)/1000.0,
            unit: "s.",
        };
        config.write_measure(measure_data);
    }
    zokratesSetup.save(setup_json);
    // zokratesSetup.load(setup_json);

    config.verbose && console.log(`Verifier contract at address ${zokratesSetup.getSetupValues().verifier_address}`);

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