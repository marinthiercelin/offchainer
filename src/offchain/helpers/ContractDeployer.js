const web3Connector = require("../web3/web3Connector");
const assert = require('assert');

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
     * @param {Object} contract_abi 
     * @param {string} contract_bin 
     * @param {Object} deploy_args 
     */
    async deploy(deploy_options, contract_abi, contract_bin, deploy_args){
        this._connectWeb3Ws();
        let contractObject = new this.web3.eth.Contract(contract_abi);
        if(contract_bin.length < 2 || contract_bin[0]!=="0" || contract_bin[1]!=="x"){
            contract_bin = "0x"+contract_bin;
        }
        let deploymentTx = contractObject.deploy({
            data:contract_bin, 
            arguments: deploy_args
        });
        await this.web3.eth.personal.unlockAccount(deploy_options.account, deploy_options.password, deploy_options.unlockDuration);
        this.contract = await deploymentTx.send({
            from: deploy_options.account,
            gas: deploy_options.gas,
            gasPrice: deploy_options.gasPrice,
            value: deploy_options.value,
        }).on("error", (error)=> {console.log(error); throw "Couldn't deploy contract"});
        this.deployed = true;
        this.config.verbose && console.log("Contract deployed");
        return this.contract.options.address;
    }
}