const fs = require('fs');
const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const commitment_scheme = require('../offchain/commitment/HashBasedCommitment');
const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const ZokratesSuite = require('../offchain/verifiable_computation/zokrates/suite_zokrates');
const LocalOffChainHolder = require('../offchain/holder/LocalOffChainHolder');
module.exports = async function(...args){
    if(args.length < 4){
        throw "Need to provide the instance public and private values, the account and the password"
    }
    const config = JSON.parse(fs.readFileSync('./config.json'));
    var setup_values = config.setup_values;
    const instance_pub = JSON.parse(fs.readFileSync(args[0]));
    const instance_key = JSON.parse(fs.readFileSync(args[1]));
    const account = args[2];
    const password = args[3];
    let zokratesSetup = new ZokratesSetup(config);
    setup_values = {...setup_values, verifier_address:instance_pub.verifier_address};
    zokratesSetup.usePastSetup(setup_values);
    let commitment_pair = {commitment: instance_pub.commitment, key: instance_key.key};
    let suite = new ZokratesSuite(config, zokratesSetup, instance_key.secret, commitment_scheme, commitment_pair=commitment_pair);
    let holder = new LocalOffChainHolder(config, suite);
    let holder_contract = await solidity_compiler.getCompiledContract(
        true,
        config.requester_name, 
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