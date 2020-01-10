#!/bin/bash
nb_account=10;
password="the_password"
geth --dev --datadir="./devnet" --dev.period 2 --ipcdisable \
    --ws --wsapi="eth,web3,personal" --wsorigins="*" \
    --rpccorsdomain "http://remix.ethereum.org" --rpc --rpcapi="eth,web3,net,personal" --allow-insecure-unlock \
    --preload 'create_accounts.js' \
    console; 
