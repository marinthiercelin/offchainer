const Web3 = require('web3');

class LocalSecretHolder{

    constructor(config, holder_json, secret, verifiable_computation){
        this.secret = secret;
        this.config = config;
        this.verifiable_computation = verifiable_computation;
        this.connectWeb3();
        this.deployContract(holder_json).then(instance => {
            this.contract = instance;
            startAnsweringRequests();
        })
    }

    connectWeb3(){
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(`ws://${config.eth_node_address}`));
    }

    unlockAccount(){
        return this.web3.personal.unlockAccount(this.config.account, this.config.password);
    }

    getContractInstance(){
        this.contract.options.address; 
    }

    async deployContract(holder_json){
        this.commitment_pair = this.verifiable_computation.commit(secret_value);
        contractObject = new this.web3.eth.Contract(holder_json.abi);
        let deploymentTx = contractObject.deploy({
            data:holder_json.bytecode, 
            arguments:[
                this.commitment_pair.commitment, 
                this.verifiable_computation.verificationData()
            ]
        });
        await this.unlockAccount();
        this.contract = await deploymentTx.send({
            from: this.config.account,
            gas: this.config.maxDeployGas,
            value: this.config.deployValue
        })
    }

    startAnsweringRequests(){
        this.subscription = this.contract.events.NewRequest()
        .on("data", this.answerRequest)
        .on("error", console.error);
    }

    answerRequest(data){
        if( data.event=="NewRequest" && 
            data.returnValues && 
            data.returnValues.id && 
            data.returnValues.input)
        {
            let id = parseInt(data.returnValues.id);
            let input = parseInt(data.returnValues.input);
            let verifiable_output = this.verifiable_computation.computeAndProve(secret, input, this.commitment_pair);
            let answerTx = this.contract.methods.answerRequest(
                id, 
                verifiable_output.output, 
                verifiable_output.proof
            );
            this.unlockAccount().then( () =>
                answerTx.send({
                    from: this.config.account,
                    gas: this.config.maxAnswerGas,
                    value: this.config.answerValue
                })
                .on("error", console.error)
            );
        }
    }
}