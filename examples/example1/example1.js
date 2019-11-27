var offchainer = require('../../index.js');
const path = require('path');

var config = {
    node_http_rpc:"http://127.0.0.1:8545",
    node_ws_rpc:"ws://127.0.0.1:8546",
    verbose:true,
};

var options = {
    account: "0x3fa68075aa987cf3b61ed52b54c936ab2007f38b",
    password: "the_password",
    unlockDuration: 0,
    gas: 4712388,
    gasPrice: 100000000000,
    value: 0
};

const modes ={
    "onchain": require("./onchain/onchain_example"),
    "unverified": require("./unverified/unverified_example"),
    "zokrates": require("./zokrates/zokrates_example"),
};

async function main(){
    if(process.argv.length < 2){
        throw `Need to choose a mode in ${Object.keys(modes)}`;
    }
    let mode = modes[process.argv[2]]
    if(!mode){
        throw `Need to choose a mode in ${Object.keys(modes).join(" ")}`;
    }
    let secret = 7;
    let holder_setup = await mode.setup(secret, config, options);

    var contractDeployer = new offchainer.helpers.ContractDeployer(config);

    config.verbose && console.log("Deploying holder contract");
    let holder_address = await contractDeployer.deploy(options, holder_setup.holder_contract.abi, holder_setup.holder_contract.bin, holder_setup.holder_args);
    console.log(`Holder address: ${holder_address}`);

    let build_dir = path.resolve(__dirname+"/build");
    let requester_file = path.resolve(__dirname+"/example1_requester.sol")

    let requester_contract = await offchainer.helpers.SolidityCompiler.getCompiledContract(
        true,
        'Example1Requester', 
        requester_file, 
        build_dir
    );
    config.verbose && console.log("Deploying requester contract");
    let requester_address = await contractDeployer.deploy(options, requester_contract.abi, requester_contract.bin, [holder_address]);
    console.log(`Requester address: ${requester_address}`);

    if(holder_setup.offchain){
        let holder = new offchainer.holder.LocalOffChainHolder(config, holder_setup.suite);
        await holder.connect(holder_setup.holder_contract.abi, holder_address);
        holder.start(options);
    }
    
    var requesterUI = new offchainer.requester.RequesterUI(config);
    await requesterUI.connect(requester_address, requester_contract.abi);

    var method_info = {
        name: "addSecret",
        input_event: "addSecretRequest",
        output_event: "addSecretAnswer",
        block_timeout: undefined,
    };
    let input = 9;
    let output = await requesterUI.useMethodWithOffChainRequest(method_info, options, input);
    console.log(output);
}

main().then(()=>console.log("Finished")).catch(console.error).finally(process.exit);
