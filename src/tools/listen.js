const fs = require('fs');
const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const {supported_commitments} = require('./init');
const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const ZokratesSuite = require('../offchain/verifiable_computation/zokrates/suite_zokrates');
const HolderListener = require('../offchain/holder/HolderListener');

module.exports.functionality  = async function(config, account, password, instance_pub_path, instance_key_path){
    let commitment_scheme;
    if(!(config.commitment_scheme in supported_commitments)){
        throw `Unknown config.commitment_scheme ${config.commitment_scheme}, needs to be ${Object.keys(supported_commitments).join("|")}`;
    }else{
        commitment_scheme = new supported_commitments[config.commitment_scheme]();
    }
    var setup_values = config.setup_values;
    const instance_pub = JSON.parse(fs.readFileSync(instance_pub_path));
    const instance_key = JSON.parse(fs.readFileSync(instance_key_path));
    setup_values = {...setup_values, verifier_address:instance_pub.verifier_address};
    let zokratesSetup = new ZokratesSetup(config, setup_values);
    let commitment_pair = {commitment: instance_pub.commitment, key: instance_key.key};
    let secret_inputs = instance_key.secret_inputs.map(BigInt);
    let suite = new ZokratesSuite(config, zokratesSetup, secret_inputs, commitment_scheme, commitment_pair=commitment_pair);
    let holder = new HolderListener(config, suite);
    let holder_contract = await solidity_compiler.getCompiledContract(
        true,
        config.holder_name, 
        config.onchain_file, 
        setup_values.setup_dir
    );
    await holder.connect(holder_contract.abi, instance_pub.holder_address);
    var listen_options = {
        ...config.listen_options,
        account: account,
        password: password
    };
    holder.start(listen_options);
    await new Promise((resolve, reject) => {});
}