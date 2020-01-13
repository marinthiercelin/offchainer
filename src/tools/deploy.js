const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const commitment_scheme = require('../offchain/commitment/HashBasedCommitment');
const ContractDeployer = require('../offchain/helpers/ContractDeployer');
const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const ZokratesSuite = require('../offchain/verifiable_computation/zokrates/suite_zokrates');
const fs = require('fs');
const path = require('path');

module.exports = async function(...args){
    if(args.length < 2){
        throw "Need to provide the account, password and secret"
    }
    const account = args[0];
    const password = args[1];
    const secret = parseInt(args[2]);
    const requester_args = args.slice(3);
    const config = JSON.parse(fs.readFileSync('./config.json'));
    var deploy_options = {
        ...config.deploy_options,
        account: account,
        password: password
    };
    var setup_values = config.setup_values;
    try{
        var contractDeployer = new ContractDeployer(config);
        if (!fs.existsSync(setup_values.setup_dir)){
            fs.mkdirSync(setup_values.setup_dir, {recursive:true});
        }
        let verifier = await solidity_compiler.getCompiledContract(
            true,
            'Verifier', 
            setup_values.verifier_contract, 
            setup_values.setup_dir
        );
        let verifier_address = await contractDeployer.deploy(deploy_options, verifier.abi, verifier.bin);
        let zokratesSetup = new ZokratesSetup(config);
        setup_values = {...setup_values, verifier_address:verifier_address};
        zokratesSetup.usePastSetup(setup_values);
        let suite = new ZokratesSuite(config, zokratesSetup, secret, commitment_scheme);
        let holder = await solidity_compiler.getCompiledContract(
            true,
            config.holder_name, 
            config.onchain_file, 
            setup_values.setup_dir
        );
        let holder_address = await contractDeployer.deploy(deploy_options, holder.abi, holder.bin, suite.getHolderContractArgs());
        let requester = await solidity_compiler.getCompiledContract(
            false,
            config.requester_name, 
            config.onchain_file,  
            setup_values.setup_dir
        );
        let requester_address = await contractDeployer.deploy(deploy_options, requester.abi, requester.bin, [holder_address, ...requester_args]);
        let commitment_pair = suite.getCommitmentPair();
        let instance_pub = {
            owner_account: account,
            verifier_address: verifier_address,
            holder_address: holder_address,
            requester_address: requester_address,
            commitment: commitment_pair.commitment,
        };
        let instance_key = {
            secret: secret,
            key: commitment_pair.key,
        };
        const instances_dir = config.instances_dir;
        if (!fs.existsSync(instances_dir)){
            fs.mkdirSync(instances_dir, {recursive:true});
        }
        var count=0;
        while(fs.existsSync(path.resolve(instances_dir + `/${config.proj_name}_${count}_pub.json`))){
            count++;
        }
        fs.writeFileSync(path.resolve(instances_dir + `/${config.proj_name}_${count}_pub.json`), JSON.stringify(instance_pub));
        fs.writeFileSync(path.resolve(instances_dir + `/${config.proj_name}_${count}_key.json`), JSON.stringify(instance_key));
    }catch(e){
        console.log(e)
    }
}