const Web3 = require('web3');

module.exports.web3ConnectedClass = class {

    /**
     * 
     * @param {{node_address:string, verbose:bool}} config 
     *  the node_address field should be set to the address and port of the ethereum node interface.
     *  the verbose field should be set to true if status messages need to be printed. 
     */
    constructor(config){
        this.config=config;
        this.web3 = new Web3();
    }
    _connectWeb3Ws(){
        this.config.verbose && console.log("Connecting web3 with ws");
        this.web3.setProvider(new Web3.providers.WebsocketProvider(`ws://${this.config.node_address}`));
    }
    _connectWeb3Http(){
        this.config.verbose && console.log("Connecting web3 with http");
        this.web3.setProvider(new Web3.providers.HttpProvider(`http://${this.config.node_address}`));
    }
}