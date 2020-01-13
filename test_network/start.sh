#!/bin/bash
password="the_password"
geth --dev --datadir="./devnet" --dev.period 14  --ipcdisable \
    --ws --wsapi="eth,web3,personal" --wsorigins="*" \
    --rpccorsdomain "http://remix.ethereum.org" --rpc --rpcapi="eth,web3,net,personal" --allow-insecure-unlock \
    --preload 'load_and_print_accounts.js' \
    console; 
