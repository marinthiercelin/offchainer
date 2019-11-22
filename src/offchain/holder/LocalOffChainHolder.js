const web3Connector = require("../web3/web3Connector");
const assert = require('assert');
const OffChainHolderDeployer = require('./OffChainHolderDeployer');

module.exports = class LocalOffChainHolder extends web3Connector.web3ConnectedClass {

    constructor(config, holder_contract_json, secret, verifiable_computation){
        super(config);
        this.config = config;
        this.holder_contract_json = holder_contract_json;
        this.secret = secret;
        this.verifiable_computation = verifiable_computation;
        this.connected = false;
        this.started = false;
    }

    async deploy(deploy_options){
        assert(!this.connected, "the holder was already connected to a contract");
        let verification_data = this.verifiable_computation.verificationData(this.secret);
        let deployer = new OffChainHolderDeployer(this.config);
        await deployer.deploy(deploy_options, this.holder_contract_json, verification_data.verifier_material);
        let address = deployer.getContractAddress();
        await this.connect(address, verification_data);
    }

    async connect(address, verification_data){
        assert(!this.connected, "the holder was already connected to a contract");
        this.verification_data = verification_data;
        this._connectWeb3Ws();
        this.contract = new this.web3.eth.Contract(this.holder_contract_json.abi, address);
        this.connected = true;
    }

    async start(answer_options){
        assert(this.connected, "the holder wasn't connected to a contract");
        assert(!this.started, "the holder was already started");
        this._startAnsweringRequests(answer_options); 
        this.started = true;
    }

    getContractAddress(){
        assert(this.connected, "The holder wasn't connected to a contract");
        return this.contract.options.address;
    }

    _startAnsweringRequests(answer_options){
        this.subscription = this.contract.events.NewRequest()
        .on("data", this._answerRequest(answer_options))
        .on("error", console.error);
        this.config.verbose && console.log("Started listening to holder contract events");
    }

    _answerRequest(answer_options){
        return (data) => {
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
                this.web3.eth.personal.unlockAccount(answer_options.account, answer_options.password, answer_options.unlockDuration)
                .then( () => 
                    this.verifiable_computation.computeAndProve(
                        this.secret, input, this.verification_data.prover_material
                    )
                )
                .then( verifiable_output  => {
                    console.log(verifiable_output);
                    if(this.config.verbose){
                        console.log(`Answering a request id: ${id} input: ${input} output: ${verifiable_output.output}`);
                    }
                    let answerTx = this.contract.methods.answerRequest(
                        id, 
                        verifiable_output.output, 
                        verifiable_output.proof
                    );
                    answerTx.send({
                        from: answer_options.account,
                        gas: answer_options.gas,
                        gasPrice: answer_options.gasPrice,
                        value: answer_options.value
                    })
                    .on("error", console.error)
                });
            }
        }
    }
}