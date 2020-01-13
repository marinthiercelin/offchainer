const web3Connector = require("../web3/web3Connector");
const assert = require('assert');

/**
 * This class takes an address of a requester contract, that make requests to an offchain holder.
 * The class can be used to emulate the case where all computations is done onchain.
 */
module.exports = class RequesterUI extends web3Connector.web3ConnectedClass {

    /**
     * 
     * @param {{node_address:string, verbose:bool}} config 
     *  the node_address field should be set to the address and port of the ethereum node interface.
     *  the verbose field should be set to true if status messages need to be printed. 
     */
    constructor(config){
        super(config);
        this.config = config;
        this.connected = false;
    }

    /**
     * Connects the class to the requester contract
     * @param {string} address the address of the deployed contract
     * @param {Object} requester_contract_abi the ABI of the deployed contract
     */
    async connect(address, requester_contract_abi){
        assert(!this.connected, "the ui was already connected to a contract");
        this._connectWeb3Ws();
        this.contract = new this.web3.eth.Contract(requester_contract_abi, address);
        this.connected = true;
    }

    /**
     * Returns the address of the contract
     */
    getContractAddress(){
        assert(this.connected, "The ui wasn't connected to a contract");
        return this.contract.options.address;
    }

    /**
     * This is the method that calls a contract method requiring offchain computation from the holder
     * and emulates it in such a way, that the user can receive the output as if it had been performed onchain
     * @param {{name:string, input_event:string, output_event:string, block_timeout:Number, timeout:Number}} method_info The information of the method to call
     * fields:
     *  name - the name of the method to call (as from the ABI)
     *  input_event - the name of the event that is emitted by the method called, this event should contain an id field
     *  output_event - the name of the event that is emitted when the logical computation completed 
     *      (after the holder answered the request), 
     *      this event should have field id corresponding to the one given in the input_event, 
     *      and contain all the ouptuts useful to the user.
     *  block_timeout (optional) - the returned Promise is rejected if the output event hasn't been emitted after block_timeout blocks have been mined.
     *  timeout (optional) - the returned Promise is rejected if the output event hasn't been emitted after timeout ms.
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} send_options 
     * should contain the account and password to be used for the call transaction
     * also optionally the gas, gasPrice and value used for the transaction.
     * @param  {...any} args Any arguments that should be given to the method called.
     */
    useMethodWithOffChainRequest(method_info, send_options, ...args){
        assert(this.connected, "The ui wasn't connected to a contract");
        this.config.verbose && console.log(`Calling ${method_info.name} (with offchain)`);
        let method = this.contract.methods[method_info.name];
        if(typeof method ==="undefined"){
            throw "Unkown method";
        }
        let tx = method(...args);
        return this._makeOutputPromise(method_info, send_options, tx);
    }

    _makeOutputPromise(method_info, send_options, transaction){
        return this.web3.eth.personal.unlockAccount(send_options.account, send_options.password, send_options.unlockDuration)
        .then(()=>{
            return new Promise((resolve, reject) => {
                this.config.verbose && console.log(`Sending transaction for ${method_info.name} (with offchain)`);
                if(method_info.timeout > 0){
                    this.config.verbose && console.log(`Setting a timeout of ${method_info.timeout}ms`);
                    setTimeout(() => reject("Timeout!"), method_info.timeout)
                }
                transaction.send({
                    from: send_options.account,
                    gas: send_options.gas,
                    gasPrice: send_options.gasPrice,
                    value: send_options.value
                })
                .on("receipt", this._dealWithReceiptCallBack(method_info, resolve, reject))
                .on("confirmation", this._dealWithConfirmationCallBack(method_info, resolve, reject))
                .on("error", (e) => reject(e));
            })
        });
    }

    _dealWithConfirmationCallBack(method_info, resolve, reject){
        return (number)=>{
            if(method_info.block_timeout && number >= method_info.block_timeout){
                this.config.verbose && console.log(`Received confirmation nb ${number}`);
                reject("Block Timeout!");
            }
        }
    }

    _dealWithReceiptCallBack(method_info, resolve, reject){
        return (data) => {
            this.config.verbose && console.log(`Received a receipt for ${method_info.name}`);
            let input_event = data.events[method_info.input_event];
            if(
                typeof input_event === "undefined" || 
                typeof input_event.returnValues === "undefined" || 
                typeof input_event.returnValues.id === "undefined" 
            ){
                reject("Could not find the request id");
            }else{
                let request_id = parseInt(input_event.returnValues.id);
                this.config.verbose && console.log(`Request Id: ${request_id}`);
                this._waitForOutputEvent(method_info, request_id, resolve, reject);
            }
        }
    }

    _waitForOutputEvent(method_info, request_id, resolve, reject){
        let options = {filter:{id:request_id}, fromBlock: 0, toBlock: 'latest'};
        this.contract.getPastEvents(method_info.output_event, options)
        .then( past_events => {
            if(past_events.length > 0){
                let event_handler = this._dealWithOutputEvent(reject, request_id, method_info, resolve);
                past_events.forEach(event_handler);
            }
        })
        .catch(reject);
        this.config.verbose && console.log(`Waiting for event ${method_info.output_event} with id ${request_id}`);
        this.contract.events[method_info.output_event](options)
        .on("data", this._dealWithOutputEvent(reject, request_id, method_info, resolve) )
        .on("error", (error)=>{
            reject(error);
        });
    }

    _dealWithOutputEvent(reject, request_id, method_info, resolve) {
        return (output_event) => {
            if (typeof output_event === "undefined" ||
                typeof output_event.returnValues === "undefined" ||
                typeof output_event.returnValues.id === "undefined") {
                reject("Could not find the output");
            }
            else {
                let received_id = parseInt(output_event.returnValues.id);
                if (received_id === request_id) {
                    resolve(output_event.returnValues);
                }
                else {
                    this.config.verbose && console.log(`Received output event with wrong id ${received_id}`);
                }
            }
        };
    }
}