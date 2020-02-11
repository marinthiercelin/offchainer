# offchainer
Tools to have ethereum develop smart contract interacting with off-chain data and computation.
Aims at facilitating development of smart contract in scenarios where some data and associated computation
needs to be off-chain, either for privacy or efficiency reasons.
We take computations out of the smart contract, while ensuring correctness, using commitments and zk-proofs.

## Reference Paper

[_Smart contract with secret parameters_](#/docs/paper.pdf)
Marin Thiercelin, Chen-Mou Cheng, Atsuko Miyaji, Serge Vaudenay
*SCIS 2020*

## Dependencies 

### Library dependencies:
- [nodejs](https://github.com/nodesource/distributions/blob/master/README.md#debinstall) v12 or above
- [solc](https://solidity.readthedocs.io/en/v0.5.13/installing-solidity.html#binary-packages) v0.6.1 or above
- [zokrates](https://zokrates.github.io/gettingstarted.html)

Nb: Current Zokrates version doesn't work with latest solc version (0.6.1), you should use the develop version
of zokrates and build from source

### Test network dependencies:
- [geth](https://geth.ethereum.org/docs/install-and-build/installing-geth#install-on-ubuntu-via-ppas)

## Use the library:
### Development
In your project workspace:
- run `npm install git+https://github.com/marinthiercelin/offchainer.git`
- run `nodejs offchainer init <project_name> [sha256|pedersen] [simple|chain|merkle] <nb_secret_inputs> <nb_public_inputs>`
- write your onchain code in `./src/<project_name>_onchain.sol`
- write your offchain code in `./src/<project_name>_offchain.zok`.

### Ethereum network
You need to have a running ethereum node on your machine.
We've provided a script to generate a test private network with 3 accounts with some ether:
- "2db685e56b28f87e60fdd62eee66d8b7c5a9ba8e"
- "3fa68075aa987cf3b61ed52b54c936ab2007f38b"
- "f593c5e1899a255ded9a7bb90355cfd12a82bda3"

They can be unlocked with password : 'the_password'.

To start the test network, run: 
- `cd ./nodes_modules/offchainer/test_network`
- `./start.sh`

### Configuration

You can configure the project by modifying `./src/config.json`

### Execution

Generate the SNARKS keys:

run `nodejs offchainer setup`

or use as a nodejs module: 
```js 
const offchainer = require('offchainer');
const config = require('./config.json');
offchainer.setup(config);
```
The owner can deploy the contracts with: 

`nodejs node_modules/offchainer deploy <account> <password> <value> <secret_inputs> <arg1> <arg2> etc.`

or use as a nodejs module: 
```js 
offchainer.deploy(config, account, password, value, secret, arg1, arg2);
```

This will generate 2 files in the folder `instances` a public file that can be shared with the users, and a key file that needs to stay private.

The owner can start listening for private computations requests with: 

`nodejs node_modules/offchainer listen <account> <password> <instance_pub> <instance_key>`

or use as a nodejs module: 
```js 
offchainer.listen(config, account, password, instance_pub, instance_key);
```

The user can interact with the contract using:

`nodejs node_modules/offchainer call <account> <password>  <instance_pub> <method_name> <value> <arg1> <arg2> etc.`

or use as a nodejs module: 
```js 
offchainer.call(config, account, password, instance_pub, method_name, value, arg1, arg2);
```





