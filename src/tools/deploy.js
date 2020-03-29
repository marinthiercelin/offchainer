const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const {supported_commitments, supported_hash_functions} = require('./init');
const ContractDeployer = require('../offchain/helpers/ContractDeployer');
const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const ZokratesSuite = require('../offchain/verifiable_computation/zokrates/suite_zokrates');
const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

module.exports.functionality  = async function(config, account, password, requester_value, secret_inputs, ...requester_args){
    if(typeof secret_inputs === "undefined" || secret_inputs.length !== config.nb_priv_inputs){
        throw `The secret inputs should be a list of size ${config.nb_priv_inputs}`
    }
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
        let BN256G2 = await solidity_compiler.getCompiledContract(
            true,
            'BN256G2', 
            setup_values.verifier_contract, 
            setup_values.setup_dir,

        );
        var contractDeployer = new ContractDeployer(config);
        let library_address = await contractDeployer.deploy(deploy_options, BN256G2.abi, BN256G2.bin);

        let verifier = await solidity_compiler.getCompiledContract(
            false,
            'Verifier', 
            setup_values.verifier_contract, 
            setup_values.setup_dir,
            [{name:setup_values.verifier_contract+':BN256G2', address: library_address}]
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

        let verifier_address = await contractDeployer.deploy(deploy_options, verifier.abi, verifier.bin);

        setup_values = {...setup_values, verifier_address:verifier_address};
        let zokratesSetup = new ZokratesSetup(config, setup_values);
        let commitment_pair = await commitment_scheme.commit(secret_inputs);
        let suite = new ZokratesSuite(config, zokratesSetup, secret_inputs, commitment_scheme, commitment_pair);
        let holder_address = await contractDeployer.deploy(deploy_options, holder.abi, holder.bin, suite.getHolderContractArgs());
        
        deploy_options.value = Web3.utils.toWei( requester_value, 'ether');
        let requester_address = await contractDeployer.deploy(deploy_options, requester.abi, requester.bin, [holder_address, ...requester_args]);
        
        let instance_pub = {
            owner_account: account,
            library_address: library_address,
            verifier_address: verifier_address,
            holder_address: holder_address,
            requester_address: requester_address,
            requester_abi: requester.abi,
            holder_abi: holder.abi,
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
        let instance_pub_path = instances_dir + `/${config.proj_name}_${count}_pub.json`;
        let instance_key_path = path.resolve(instances_dir + `/${config.proj_name}_${count}_key.json`);
        fs.writeFileSync(path.resolve(instance_pub_path), JSON.stringify(instance_pub));
        fs.writeFileSync(instance_key_path, JSON.stringify(instance_key));
        return [instance_pub_path, instance_key_path];
    }catch(e){
        console.log(e)
    }
}

module.exports.functionality2  = async function(config, account, password, requester_value, secret_inputs, ...requester_args){
    let holder_args = [];
    if(config.onchain){
        holder_args.push(secret_inputs);
    }
    // console.log(holder_args);
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
        var contractDeployer = new ContractDeployer(config);
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
        let holder_address = await contractDeployer.deploy(deploy_options, holder.abi, holder.bin, holder_args);
        deploy_options.value = Web3.utils.toWei( requester_value, 'ether');
        let requester_address = await contractDeployer.deploy(deploy_options, requester.abi, requester.bin, [holder_address, ...requester_args]);
        
        let instance_pub = {
            owner_account: account,
            holder_address: holder_address,
            requester_address: requester_address,
            requester_abi: requester.abi,
            holder_abi: holder.abi
        };
        
        let instance_key = {
            secret_inputs: secret_inputs.map(x => '0x'+x.toString(16)),
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
        let instance_pub_path = instances_dir + `/${config.proj_name}_${count}_pub.json`;
        let instance_key_path = path.resolve(instances_dir + `/${config.proj_name}_${count}_key.json`);
        fs.writeFileSync(path.resolve(instance_pub_path), JSON.stringify(instance_pub));
        fs.writeFileSync(instance_key_path, JSON.stringify(instance_key));
        return [instance_pub_path, instance_key_path];
    }catch(e){
        console.log(e)
    }
}