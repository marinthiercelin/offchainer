for(var i in eth.accounts){
    eth.sendTransaction({from:eth.coinbase, to:eth.accounts[i], value: web3.toWei(100, "ether")});
}
for(var i in eth.accounts){
    console.log("Account", eth.accounts[i], "\nBalance", web3.fromWei(eth.getBalance(eth.accounts[i]), "ether"), "ETH");
}
