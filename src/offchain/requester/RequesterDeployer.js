const web3Connector = require("../web3/web3Connector");
const assert = require('assert');
module.exports = class LocalSecretHolder{

    constructor(config, holder_json, secret, verifiable_computation){
        this.config = config;
        this.holder_json = holder_json;
        this.secret = secret;
        this.verifiable_computation = verifiable_computation;
        this.deployed = false;
        this.started = false;
    }

    async deploy(){
        assert(!this.deployed, "the holder was already deployed");
        this._connectWeb3();
        await this._deployContract();
        this.deployed = true;
    }

    start(){
        assert(this.deployed, "the holder wasn't yet deployed");
        assert(!this.started, "the holder was already started");
        this._startAnsweringRequests(); 
        this.started = true;
    }

    _connectWeb3(){
        this.config.verbose && console.log("Connecting web3");
        this.web3 = web3Connector.connectWeb3WithWebsocket(this.config.eth_node_address);
    }

    async _unlockAccount(){
        this.config.verbose && console.log(`Unlocking account ${this.config.account}`);
        if(this.config.account && typeof this.config.password != "undefined"){
            await this.web3.eth.personal.unlockAccount(this.config.account, this.config.password, this.config.unlockDuration);
            return;
        }
        this.config.verbose && console.log("No account or password was provided");
    }

    async _deployContract(){
        this.commitment_pair = this.verifiable_computation.commit(this.secret);
        let contractObject = new this.web3.eth.Contract(this.holder_json.abi);
        let deploymentTx = contractObject.deploy({
            data:this.holder_json.bytecode, 
            arguments:[
                this.web3.utils.hexToBytes(this.commitment_pair.commitment), 
                this.web3.utils.hexToBytes(this.verifiable_computation.verificationData())
            ]
        });
        await this._unlockAccount();
        this.config.verbose && console.log("Deploying holder contract");
        this.contract = await deploymentTx.send({
            from: this.config.account,
            gas: this.config.maxDeployGas,
            value: this.config.deployValue
        });
        this.config.verbose && console.log("Deployed holder contract");
    }

    getContractAddress(){
        assert(this.started, "The holder was not started");
        return this.contract.options.address;
    }

    async _deployContract(holder_json){
        this.commitment_pair = this.verifiable_computation.commit(this.secret);
        let contractObject = new this.web3.eth.Contract(holder_json.abi);
        let deploymentTx = contractObject.deploy({
            data:holder_json.bytecode, 
            arguments:[
                this.web3.utils.hexToBytes(this.commitment_pair.commitment), 
                this.web3.utils.hexToBytes(this.verifiable_computation.verificationData())
            ]
        });
        await this._unlockAccount();
        this.config.verbose && console.log("Deploying holder contract");
        this.contract = await deploymentTx.send({
            from: this.config.account,
            gas: this.config.maxDeployGas,
            value: this.config.deployValue
        });
        this.config.verbose && console.log("Deployed holder contract");
    }

    _startAnsweringRequests(){
        this.subscription = this.contract.events.NewRequest()
        .on("data", this._answerRequest.bind(this))
        .on("error", console.error);
        this.config.verbose && console.log("Started listening to holder events");
    }

    _answerRequest(data){
        this.config.verbose && console.log("Received a Request");
        if( data.event=="NewRequest" && 
            data.returnValues && 
            data.returnValues.id && 
            data.returnValues.input &&
            data.returnValues.reward)
        {
            
            let id = parseInt(data.returnValues.id);
            let input = parseInt(data.returnValues.input);
            let reward = parseInt(data.returnValues.reward);
            this.config.verbose && console.log(`id: ${id} input: ${input} reward: ${reward}`);
            let verifiable_output = this.verifiable_computation.computeAndProve(this.secret, input, this.commitment_pair);
            let answerTx = this.contract.methods.answerRequest(
                id, 
                verifiable_output.output, 
                this.web3.utils.hexToBytes(verifiable_output.proof)
            );
            this._unlockAccount().then( () => {
                if(this.config.verbose){
                    console.log(`Answering a request id: ${id} input: ${input} output: ${verifiable_output.output}`);
                }
                answerTx.send({
                    from: this.config.account,
                    gas: this.config.maxAnswerGas,
                    value: this.config.answerValue
                })
                .on("error", console.error)
            });
        }
    }
}