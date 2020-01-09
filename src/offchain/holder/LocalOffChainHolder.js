const web3Connector = require("../web3/web3Connector");
const assert = require('assert');
const ContractDeployer = require('../helpers/ContractDeployer');

/**
 * This class is the off-chain part of
 * the OffChainHolder construct.
 * The OffChainHolder construct as 2 parts : 
 * A smart contract (holder contract) that registers requests for computations, and notifies new requests through events.
 * And a code (this) running locally, waiting for requests modifications, performing computations
 * and returning the results (along with proofs, if needed).
 */
module.exports = class LocalOffChainHolder extends web3Connector.web3ConnectedClass {

    /**
     * 
     * @param {{node_address:string, verbose:bool}} config 
     *  the node_address field should be set to the address and port of the ethereum node interface.
     *  the verbose field should be set to true if status messages need to be printed.
     * @param {Object} verifiable_computation_suite this is a class instance that encapsulate the way the computation is done and verified.
     *  It should be an instance of a subclass of AbstractSuite
     */
    constructor(config, verifiable_computation_suite){
        super(config);
        this.config = config;
        this.verifiable_computation_suite = verifiable_computation_suite;
        this.connected = false;
        this.started = false;
    }

    /**
     * Connects the class to an already deployed holder contract. 
     * @param {Object} holder_contract_abi the ABI of the deployed holder contract
     * @param {string} address the address of the contract
     */
    async connect(holder_contract_abi, address){
        assert(!this.connected, "the holder was already connected to a contract");
        this._connectWeb3Ws();
        this.contract = new this.web3.eth.Contract(holder_contract_abi, address);
        this.connected = true;
    }

    /**
     * Starts an event listener for new request notifications, and answer notifications with (verified) computations.
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} answer_options 
     * should contain the account and password to be used for the answer transaction
     * also optionally the gas, gasPrice and value used for the transaction.
     */
    async start(answer_options){
        assert(this.connected, "the holder wasn't connected to a contract");
        assert(!this.started, "the holder was already started");
        this.subscription = this.contract.events.NewRequest()
        .on("data", this._answerRequest(answer_options))
        .on("error", console.error);
        this.config.verbose && console.log("Started listening to holder contract events");
        this.started = true;
    }

    /**
     * Returns the address of the holder contract
     */
    getContractAddress(){
        assert(this.connected, "The holder wasn't connected to a contract");
        return this.contract.options.address;
    }

    /**
     * Parse the data of new requests events, and replies with an answer to the request.
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} answer_options 
     * should contain the account and password to be used for the answer transaction
     * also optionally the gas, gasPrice and value used for the transaction. 
     */
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
                    this.verifiable_computation_suite.computeAndProve(input)
                )
                .then( verifiable_output  => {
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
                    .on("error", console.error);
                }).catch(console.log);
            }
        }
    }
}