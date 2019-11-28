var offchainer = require('../../index.js');
const path = require('path');
const fs = require('fs');
const {performance} = require('perf_hooks');



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

async function main(mode_chosen){

    function writeMeasure(file, data){
        if(!fs.existsSync(file)){
            fs.writeFileSync(file, "mode,actor,action,type,value,unit\n");
        }
        let str = `${mode_chosen},${data.actor},${data.action},${data.type},${data.value},${data.unit}\n`
        fs.appendFile(file, str,function (err) {});
    }
    
    var config = {
        node_http_rpc:"http://127.0.0.1:8545",
        node_ws_rpc:"ws://127.0.0.1:8546",
        verbose:true,
        measure: {
            write:  writeMeasure,
            file: path.resolve(__dirname+"/data/measures.csv")
        }
    }
    
    let mode = modes[mode_chosen]
    if(!mode){
        throw `Need to choose a mode in ${Object.keys(modes).join(" ")}`;
    }
    var t0=0;
    var t1=0;

    let secret = 7;
    t0 = performance.now();
    let holder_setup = await mode.setup(secret, config, options);
    t1 = performance.now();
    if(config.measure){
        config.measure.write(
            config.measure.file, 
            {
                actor: "owner",
                action: "setup",
                type: "time",
                value: t1 - t0,
                unit: "ms",
            }
        )
    }

    var contractDeployer = new offchainer.helpers.ContractDeployer(config);

    config.verbose && console.log("Deploying holder contract");
    t0 = performance.now();
    let holder_address = await contractDeployer.deploy(options, holder_setup.holder_contract.abi, holder_setup.holder_contract.bin, holder_setup.holder_args, "owner", "holder dep.");
    t1 = performance.now();
    console.log(`Holder address: ${holder_address}`);
    if(config.measure){
        config.measure.write(
            config.measure.file, 
            {
                actor: "owner",
                action: "holder dep.",
                type: "time",
                value: t1 - t0,
                unit: "ms",
            }
        )
    }

    let build_dir = path.resolve(__dirname+"/build");
    let requester_file = path.resolve(__dirname+"/example1_requester.sol")

    let requester_contract = await offchainer.helpers.SolidityCompiler.getCompiledContract(
        true,
        'Example1Requester', 
        requester_file, 
        build_dir
    );
    config.verbose && console.log("Deploying requester contract");
    t0 = performance.now();
    let requester_address = await contractDeployer.deploy(options, requester_contract.abi, requester_contract.bin, [holder_address], "owner", "requester dep.");
    t1 = performance.now();
    console.log(`Requester address: ${requester_address}`);
    if(config.measure){
        config.measure.write(
            config.measure.file, 
            {
                actor: "owner",
                action: "requester dep.",
                type: "time",
                value: t1 - t0,
                unit: "ms",
            }
        )
    }

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
    t0 = performance.now();
    let output = await requesterUI.useMethodWithOffChainRequest(method_info, options, input);
    t1 = performance.now();
    if(config.measure){
        config.measure.write(
            config.measure.file, 
            {
                actor: "user",
                action: "request",
                type: "time",
                value: t1 - t0,
                unit: "ms",
            }
        )
    }
    console.log(output);
}

function loop(mode, repeat=5, i=0){
    if(i < repeat){
        console.log(`mode ${mode} ${i+1} of ${repeat}`);
        return main(mode).then(() => loop(mode, repeat, i+1)).catch(console.error)
    }
}

loop("onchain")
.then(() => loop("unverified"))
.then(() => loop("zokrates"))
.finally(() => setTimeout(process.exit, 5000));
