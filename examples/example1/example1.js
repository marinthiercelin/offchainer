var offchainer = require('../../index.js');
const path = require('path');
const fs = require('fs');
const {performance} = require('perf_hooks');

var options = {
    account: "0x2db685e56b28f87e60fdd62eee66d8b7c5a9ba8e",
    password: "",
    unlockDuration: 0,
    gas: 4712388,
    gasPrice: 10000000000,
    value: 0
};

const modes ={
    "onchain": require("./onchain/onchain_example"),
    "unverified": require("./unverified/unverified_example"),
    "zokrates": require("./zokrates/zokrates_example"),
};

async function main(mode_chosen, verbose, write_measure){
    var config = {
        node_http_rpc:"http://127.0.0.1:8545",
        node_ws_rpc:"ws://127.0.0.1:8546",
        verbose:verbose,
        write_measure:write_measure,
    }
    
    let mode = modes[mode_chosen]
    if(!mode){
        throw `Need to choose a mode in ${Object.keys(modes).join(" ")}`;
    }
    var t0=0;
    var t1=0;

    let secret = 7;
    let holder_setup = await mode.setup(secret, config, options);

    var contractDeployer = new offchainer.helpers.ContractDeployer(config);

    config.verbose && console.log("Deploying holder contract");
    t0 = performance.now();
    let holder_address = await contractDeployer.deploy(options, holder_setup.holder_contract.abi, holder_setup.holder_contract.bin, holder_setup.holder_args, "owner", "holder deployment");
    t1 = performance.now();
    verbose && console.log(`Holder address: ${holder_address}`);
    if(config.write_measure){
        var measure_data = {
            actor: "owner",
            action: "holder deployment",
            type: "time",
            value: (t1 - t0)/1000.0,
            unit: "s.",
        };
        config.write_measure(measure_data);
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
    let requester_address = await contractDeployer.deploy(options, requester_contract.abi, requester_contract.bin, [holder_address], "owner", "requester deployment");
    t1 = performance.now();
    verbose && console.log(`Requester address: ${requester_address}`);
    if(config.write_measure){
        var measure_data = {
            actor: "owner",
            action: "requester deployment",
            type: "time",
            value: (t1 - t0)/1000.0,
            unit: "s.",
        };
        config.write_measure(measure_data);
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
    if(config.write_measure){
        var measure_data = {
            actor: "user",
            action: "request",
            type: "time",
            value: (t1 - t0)/1000.0,
            unit: "s.",
        };
        config.write_measure(measure_data);
    }
    verbose && console.log(output);
}

function loop(mode, repeat, verbose, write_measure, i=0){
    if(i < repeat){
        verbose && console.log(`mode ${mode} ${i+1} of ${repeat}`);
        return main(mode, verbose, write_measure).then(() => loop(mode, repeat, verbose, write_measure, i+1))
    }
    return new Promise((r, e)=>(r()))
}

function measureToCSV(mode, data){
    return `${mode},${data.actor},${data.action},${data.type},${data.value},${data.unit}`;
}

let verbose = process.argv.includes('-v');
let mode = process.argv.includes('--mode') && process.argv.indexOf('--mode') + 1< process.argv.length ? 
    process.argv[process.argv.indexOf('--mode')+1] : 'onchain';
let repeat = process.argv.includes('--repeat') && process.argv.indexOf('--repeat') + 1< process.argv.length ? 
    Number(process.argv[process.argv.indexOf('--repeat')+1]) : 1

var write_measure = false;
if(process.argv.includes('--measure')){
    let output_file =  process.argv.indexOf('-o') + 1< process.argv.length ? 
    process.argv[process.argv.indexOf('-o')+1] : false;
    if(output_file){
        write_measure = (data) => fs.appendFile(output_file, measureToCSV(mode, data)+'\n',function (err) {})
    }
    if(process.argv.includes('-p')){
        write_measure = (data) => console.log(measureToCSV(mode, data))
    }
}

loop(mode, repeat, verbose, write_measure)
.catch(e => {
    console.log(e);
    process.exit(1);
})
.finally(() => setTimeout(process.exit(0), 5000));