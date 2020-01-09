const fs = require('fs');
const solidity_compiler = require('../offchain/helpers/solidity_compiler');
const RequesterUI = require('../offchain/requester/RequesterUI');
module.exports = async function(...args){
    if(args.length < 3){
        throw "Need to provide the instance public values, the account, the password and the call arguments"
    }
    const config = JSON.parse(fs.readFileSync('./src/config.json'));
    const instance_pub = JSON.parse(fs.readFileSync(args[0]));
    const account = args[1];
    const password = args[2];
    const call_args = args.slice(3);
    let requester_contract = await solidity_compiler.getCompiledContract(
        false,
        'ZokratesRequester', 
        './src/zokrates_requester.sol', 
        config.setup_values.setup_dir
    );
    var requesterUI = new RequesterUI(config);
    await requesterUI.connect(instance_pub.requester_address, requester_contract.abi);
    var call_options = {
        ...config.call_options,
        block_timeout:undefined,
        account: account,
        password: password
    };
    var method_info = {
        name: "start",
        input_event: "Start",
        output_event: "End",
        block_timeout: call_options.block_timeout,
    };
    let output = await requesterUI.useMethodWithOffChainRequest(method_info, call_options, call_args);
    console.log(output);
    return output;
}