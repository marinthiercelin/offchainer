const web3Connector = require("../web3/web3Connector");
const assert = require('assert');

module.exports = class RequesterUI extends web3Connector.web3ConnectedClass {

    constructor(config, requester_contract_json){
        super(config);
        this.config = config;
        this.requester_contract_json = requester_contract_json;
        this.connected = false;
    }

    async connect(address){
        assert(!this.connected, "the ui was already connected to a contract");
        this._connectWeb3Ws();
        this.contract = new this.web3.eth.Contract(this.requester_contract_json.abi, address);
        this.connected = true;
    }

    getContractAddress(){
        assert(this.connected, "The ui wasn't connected to a contract");
        return this.contract.options.address;
    }

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
        return this._unlockAccount().then(()=>{
            return new Promise((resolve, reject) => {
                this.config.verbose && console.log(`Sending transaction for ${method_info.name} (with offchain)`);
                if(method_info.timeout > 0){
                    this.config.verbose && console.log(`Setting a timeout of ${method_info.timeout}ms`);
                    setTimeout(() => reject("Timeout!"), method_info.timeout)
                }
                transaction.send(
                    {...send_options, from: this.config.account}
                )
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
                this._waitForOutputEvent(method_info, request_id, resolve, reject);
            }
        }
    }

    _waitForOutputEvent(method_info, request_id, resolve, reject){
        this.config.verbose && console.log(`Waiting for event ${method_info.output_event} with id ${request_id}`);
        this.contract.events[method_info.output_event]({filter:{id:request_id}})
        .on("data", (output_event)=>{
            if(
                typeof output_event === "undefined" || 
                typeof output_event.returnValues === "undefined" || 
                typeof output_event.returnValues.id === "undefined"
            ){
                reject("Could not find the output");
            }else{
                let received_id = parseInt(output_event.returnValues.id);
                if(received_id === request_id){
                    this._waitForOutputEvent(method_info, request_id, resolve, reject);
                    resolve(output_event.returnValues);
                }else{
                    this.config.verbose && console.log("Received output event with wrong id");
                }
            }
        })
        .on("error", (error)=>{
            reject(error);
        });
    }
}