const Web3 = require('web3');
const assert = require('assert');

module.exports = class LocalSecretHolder{

    constructor(holder_json, address){
        this.secret = secret;
        this.holder_json = holder_json;
        this.config = config;
        this.verifiable_computation = verifiable_computation;
        this.started = false;
    }

    async start(config, holder_json, secret, verifiable_computation){
        assert(!this.started, "The holder was already started");
        await this._deployContract(this.holder_json);
        this.started = true;
        this._startAnsweringRequests(); 
    }

    _connectWeb3(){
        this.config.verbose && console.log("Connecting web3");
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(`ws://${this.config.eth_node_address}`));
    }

    async _unlockAccount(){
        this.config.verbose && console.log(`Unlocking account ${this.config.account}`);
        if(this.config.account && typeof this.config.password != "undefined"){
            await this.web3.eth.personal.unlockAccount(this.config.account, this.config.password);
            return;
        }
        this.config.verbose && console.log("No account or password was provided");
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