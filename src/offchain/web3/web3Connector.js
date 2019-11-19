const Web3 = require('web3');
module.exports.connectWeb3WithWebsocket = function (eth_node_address){
    return new Web3(new Web3.providers.WebsocketProvider(`ws://${eth_node_address}`));
}

module.exports.connectWeb3WithHTTP = function (eth_node_address){
    return new Web3(new Web3.providers.HttpProvider(`http://${eth_node_address}`));
}