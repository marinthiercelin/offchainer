const Web3 = require('web3');

module.exports.web3ConnectedClass = class {
    constructor(config){
        this.config = config;
        this.web3 = new Web3();
    }
    _connectWeb3Ws(){
        this.config.verbose && console.log("Connecting web3 with ws");
        this.web3.setProvider(new Web3.providers.WebsocketProvider(`ws://${this.config.eth_node_address}`));
    }
    _connectWeb3Http(){
        this.config.verbose && console.log("Connecting web3 with http");
        this.web3.setProvider(new Web3.providers.HttpProvider(`http://${this.config.eth_node_address}`));
    }
}