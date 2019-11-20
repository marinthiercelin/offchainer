const web3Connector = require("../web3/web3Connector");
const assert = require('assert');

module.exports = class OffChainHolderDeployer extends web3Connector.web3ConnectedClass {

    constructor(config){
        super(config);
        this.deployed = false;
    }

    async deploy(holder_contract_json, commitment, verification_data){
        assert(!this.deployed, "the holder contract was already deployed");
        this._connectWeb3Http();
        let contractObject = new this.web3.eth.Contract(holder_contract_json.abi);
        let deploymentTx = contractObject.deploy({
            data:holder_contract_json.bytecode, 
            arguments:[
                this.web3.utils.hexToBytes(commitment), 
                this.web3.utils.hexToBytes(verification_data)
            ]
        });
        await this._unlockAccount();
        this.config.verbose && console.log("Deploying holder contract");
        this.contract = await deploymentTx.send({
            from: this.config.account,
            gas: this.config.maxDeployGas,
            gasPrice: this.config.deployGasPrice,
            value: this.config.deployValue
        });
        this.deployed = true;
    }

    getContractAddress(){
        assert(this.deployed, "The holder contract was not deployed");
        return this.contract.options.address;
    }
}