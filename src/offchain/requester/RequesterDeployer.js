const web3Connector = require("../web3/web3Connector");
const assert = require('assert');

module.exports = class RequesterDeployer extends web3Connector.web3ConnectedClass {

    constructor(config, requester_contract_json, holder_address){
        super(config);
        this.config = config;
        this.requester_contract_json = requester_contract_json;
        this.holder_address = holder_address;
        this.deployed = false;
    }

    async deploy(){
        assert(!this.deployed, "the requester was already deployed");
        this._connectWeb3Http();
        let contractObject = new this.web3.eth.Contract(this.requester_contract_json.abi);
        let deploymentTx = contractObject.deploy({
            data:this.requester_contract_json.bytecode, 
            arguments:[
                this.holder_address,
            ]
        });
        await this._unlockAccount();
        this.config.verbose && console.log("deploying requester contract");
        this.contract = await deploymentTx.send({
            from: this.config.account,
            gas: this.config.maxDeployGas,
            value: this.config.deployValue
        });
        this.deployed = true;
    }

    getContractAddress(){
        assert(this.deployed, "the requester wasn't deployed");
        return this.contract.options.address;
    }
}