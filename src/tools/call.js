const fs = require('fs');
const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const RequesterUI = require('../offchain/requester/RequesterUI');
const Web3 = require('web3');

module.exports.functionality  = async function(config, account, password, instance_pub_path, method_name, call_value, ...call_args){
    
    const instance_pub = JSON.parse(fs.readFileSync(instance_pub_path));
    var requesterUI = new RequesterUI(config);
    await requesterUI.connect(instance_pub.requester_address, instance_pub.requester_abi);
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
    config.verbose && console.log(output);
    return output;
}