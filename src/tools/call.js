const fs = require('fs');
const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const RequesterUI = require('../offchain/requester/RequesterUI');
const Web3 = require('web3');

module.exports = async function(config, account, password, instance_pub_path, method_name, call_value, ...call_args){
    const instance_pub = JSON.parse(fs.readFileSync(instance_pub_path));
    let requester_contract = await solidity_compiler.getCompiledContract(
        true,
        config.requester_name, 
        config.onchain_file, 
        config.setup_values.setup_dir
    );
    var requesterUI = new RequesterUI(config);
    await requesterUI.connect(instance_pub.requester_address, requester_contract.abi);
    var call_options = {
        ...config.call_options,
        block_timeout:undefined,
        account: account,
        password: password,
    };
    call_options.value = Web3.utils.toWei( call_value, 'ether');
    var method_info = {
        name: method_name,
        input_event: "Start",
        output_event: "End",
        block_timeout: call_options.block_timeout,
    };
    let output = await requesterUI.useMethodWithOffChainRequest(method_info, call_options, ...call_args);
    console.log(output);
    return output;
}