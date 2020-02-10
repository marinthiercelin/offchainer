const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const {supported_commitments} = require('./init');
const ContractDeployer = require('../offchain/helpers/ContractDeployer');
const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const ZokratesSuite = require('../offchain/verifiable_computation/zokrates/suite_zokrates');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

module.exports.functionality  = async function(config, account, password, requester_value, secret_inputs, ...requester_args){
    if(secret_inputs.length !== config.nb_priv_inputs){
        throw `The secret inputs should be a list of size ${config.nb_priv_inputs}`
    }
    let commitment_scheme;
    if(!(config.commitment_scheme in supported_commitments)){
        throw `Unknown config.commitment_scheme ${config.commitment_scheme}, needs to be ${Object.keys(supported_commitments).join("|")}`;
    }else{
        commitment_scheme = new supported_commitments[config.commitment_scheme]();
    }
    secret_inputs = secret_inputs.map(BigInt);
    var deploy_options = {
        ...config.deploy_options,
        account: account,
        password: password,
    };
    var setup_values = config.setup_values;
    try{
        if (!fs.existsSync(setup_values.setup_dir)){
            fs.mkdirSync(setup_values.setup_dir, {recursive:true});
        }
        
        let verifier = await solidity_compiler.getCompiledContract(
            true,
            'Verifier', 
            setup_values.verifier_contract, 
            setup_values.setup_dir
        );
        let holder = await solidity_compiler.getCompiledContract(
            true,
            config.holder_name, 
            config.onchain_file, 
            setup_values.setup_dir
        );
        let requester = await solidity_compiler.getCompiledContract(
            false,
            config.requester_name, 
            config.onchain_file,  
            setup_values.setup_dir
        );

        var contractDeployer = new ContractDeployer(config);
        let verifier_address = await contractDeployer.deploy(deploy_options, verifier.abi, verifier.bin);

        setup_values = {...setup_values, verifier_address:verifier_address};
        let zokratesSetup = new ZokratesSetup(config, setup_values);
        let suite = new ZokratesSuite(config, zokratesSetup, secret_inputs, commitment_scheme);
        let holder_address = await contractDeployer.deploy(deploy_options, holder.abi, holder.bin, suite.getHolderContractArgs());
        
        deploy_options.value = Web3.utils.toWei( requester_value, 'ether');
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
            secret_inputs: secret_inputs.map(x => '0x'+x.toString(16)),
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
        config.verbose && console.log(`Instance Number: ${count}`);
        fs.writeFileSync(path.resolve(instances_dir + `/${config.proj_name}_${count}_pub.json`), JSON.stringify(instance_pub));
        fs.writeFileSync(path.resolve(instances_dir + `/${config.proj_name}_${count}_key.json`), JSON.stringify(instance_key));
    }catch(e){
        console.log(e)
    }
}