const web3Connector = require("../web3/web3Connector");
const assert = require('assert');

module.exports = class OffChainHolderDeployer extends web3Connector.web3ConnectedClass {

    constructor(config){
        super(config);
        this.deployed = false;
    }

    async deploy(deploy_options, holder_contract_json, deploy_args){
        assert(!this.deployed, "the holder contract was already deployed");
        this._connectWeb3Http();
        let contractObject = new this.web3.eth.Contract(holder_contract_json.abi);
        let deploymentTx = contractObject.deploy({
            data:holder_contract_json.bytecode, 
            arguments:deploy_args,
        });
        await this.web3.eth.personal.unlockAccount(deploy_options.account, deploy_options.password, deploy_options.unlockDuration);
        this.config.verbose && console.log("Deploying holder contract");
        this.contract = await deploymentTx.send({
            from: deploy_options.account,
            gas: deploy_options.gas,
            gasPrice: deploy_options.gasPrice,
            value: deploy_options.value
        });
        this.deployed = true;
    }

    getContractAddress(){
        assert(this.deployed, "The holder contract was not deployed");
        return this.contract.options.address;
    }
}