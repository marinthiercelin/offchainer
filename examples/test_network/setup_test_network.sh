#!/bin/bash
nb_account=10;
password="the_password"
geth --dev --datadir="./devnet" --dev.period 7 --ipcdisable \
    --ws --wsapi="eth,web3,personal" --wsorigins="*" \
    --rpccorsdomain "http://remix.ethereum.org" --rpc --rpcapi="eth,web3" --allow-insecure-unlock console; 
