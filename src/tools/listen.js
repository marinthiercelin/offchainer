const fs = require('fs');
const {supported_commitments, supported_hash_functions} = require('./init');
const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const ZokratesSuite = require('../offchain/verifiable_computation/zokrates/suite_zokrates');
const UnverifiedSuite = require('../offchain/verifiable_computation/unverified/UnverifiedComputationSuite');
const HolderListener = require('../offchain/holder/HolderListener');

module.exports.functionality  = async function(config, account, password, instance_pub_path, instance_key_path){
    let hash_function;
    if(!(config.hash_function in supported_hash_functions)){
        throw `Unknown config.hash_function ${config.hash_function}, needs to be ${Object.keys(supported_hash_functions).join("|")}`;
    }else{
        hash_function = new supported_hash_functions[config.hash_function]();
    }
    let commitment_scheme;
    if(!(config.commitment_scheme in supported_commitments)){
        throw `Unknown config.commitment_scheme ${config.commitment_scheme}, needs to be ${Object.keys(supported_commitments).join("|")}`;
    }else{
        commitment_scheme = new supported_commitments[config.commitment_scheme](hash_function);
    }
    var setup_values = config.setup_values;
    const instance_pub = JSON.parse(fs.readFileSync(instance_pub_path));
    const instance_key = JSON.parse(fs.readFileSync(instance_key_path));
    setup_values = {...setup_values, verifier_address:instance_pub.verifier_address};
    let zokratesSetup = new ZokratesSetup(config, setup_values);
    let commitment_pair = {commitment: instance_pub.commitment, key: instance_key.key};
    let secret_inputs = instance_key.secret_inputs.map(BigInt);
    let suite = new ZokratesSuite(config, zokratesSetup, secret_inputs, commitment_scheme, commitment_pair);
    let holder = new HolderListener(config, suite);
    await holder.connect(instance_pub.holder_abi, instance_pub.holder_address);
    var listen_options = {
        ...config.listen_options,
        account: account,
        password: password
    };
    holder.start(listen_options);
    await new Promise((resolve, reject) => {});
}


module.exports.functionality2  = async function(config, account, password, instance_pub_path, instance_key_path, computation){
    const instance_pub = JSON.parse(fs.readFileSync(instance_pub_path));
    const instance_key = JSON.parse(fs.readFileSync(instance_key_path));
    let secret_inputs = instance_key.secret_inputs.map(BigInt);
    let suite = new UnverifiedSuite(secret_inputs, computation);
    let holder = new HolderListener(config, suite);
    await holder.connect(instance_pub.holder_abi, instance_pub.holder_address);
    var listen_options = {
        ...config.listen_options,
        account: account,
        password: password
    };
    holder.start(listen_options);
    await new Promise((resolve, reject) => {});
}