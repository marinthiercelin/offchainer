for(var i in eth.accounts){
    console.log("Account", eth.accounts[i], "\nBalance", web3.fromWei(eth.getBalance(eth.accounts[i]), "ether"), "ETH");
}
