const web3Connector = require("../web3/web3Connector");
const assert = require('assert');
const util = require('util');
const {stringify} =require('flatted');

/**
 * This class deploys the a smart contract to the chain
 */
module.exports = class ContractDeployer extends web3Connector.web3ConnectedClass {

    /**
     * 
     * @param {{node_address:string, verbose:bool}} config 
     *  the node_address field should be set to the address and port of the ethereum node interface.
     *  the verbose field should be set to true if status messages need to be printed.
     */
    constructor(config){
        super(config);
        this.deployed = false;
    }

    /**
     * 
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} deploy_options 
     * @param {Object} holder_contract_abi 
     * @param {string} holder_contract_bin 
     * @param {Object} deploy_args 
     */
    async deploy(deploy_options, holder_contract_abi, holder_contract_bin, deploy_args, actor="unknown", action="dep."){
        this._connectWeb3Ws();
        let contractObject = new this.web3.eth.Contract(holder_contract_abi);
        if(holder_contract_bin.length < 2 || holder_contract_bin[0]!=="0" || holder_contract_bin[1]!=="x"){
            holder_contract_bin = "0x"+holder_contract_bin;
        }
        let deploymentTx = contractObject.deploy({
            data:holder_contract_bin, 
            arguments: deploy_args
        });
        
        if(this.config.write_measure){
            var measure_data = {
                actor: actor,
                action: action,
                type: "size",
                value: (deploymentTx._deployData.length-2)/2,
                unit: "byte",
            };
            this.config.write_measure(measure_data);
        }
        await this.web3.eth.personal.unlockAccount(deploy_options.account, deploy_options.password, deploy_options.unlockDuration);
        this.contract = await deploymentTx.send({
            from: deploy_options.account,
            gas: deploy_options.gas,
            gasPrice: deploy_options.gasPrice,
            value: deploy_options.value,
        })
        .on("receipt", (receipt)=> {
            if(this.config.write_measure){
                var measure_data = {
                    actor: actor,
                    action: action,
                    type: "gas",
                    value: receipt.gasUsed*deploy_options.gasPrice,
                    unit: "wei",
                };
                this.config.write_measure(measure_data);
            }
        })
        .on("error", (error)=> {console.log(error); throw "Couldn't deploy contract"});
        this.deployed = true;
        this.config.verbose && console.log("Contract deployed");
        return this.contract.options.address;
    }

}