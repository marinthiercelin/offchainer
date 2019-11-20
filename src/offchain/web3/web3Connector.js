const Web3 = require('web3');
module.exports.connectWeb3WithWebsocket = function (eth_node_address){
    return new Web3(new Web3.providers.WebsocketProvider(`ws://${eth_node_address}`));
}

module.exports.connectWeb3WithHttp = function (eth_node_address){
    return new Web3(new Web3.providers.HttpProvider(`http://${eth_node_address}`));
}

module.exports.web3ConnectedClass = class {
    constructor(config){
        this.config = config;
    }
    _connectWeb3Ws(){
        this.config.verbose && console.log("Connecting web3 with ws");
        this.web3 = module.exports.connectWeb3WithWebsocket(this.config.eth_node_address);
    }
    _connectWeb3Http(){
        this.config.verbose && console.log("Connecting web3 with http");
        this.web3 = module.exports.connectWeb3WithHttp(this.config.eth_node_address);
    }
    async _unlockAccount(){
        this.config.verbose && console.log(`Unlocking account ${this.config.account}`);
        if(this.config.account && typeof this.config.password !== "undefined"){
            await this.web3.eth.personal.unlockAccount(this.config.account, this.config.password, this.config.unlockDuration);
            return;
        }
        this.config.verbose && console.log("No account or password was provided");
    }
}