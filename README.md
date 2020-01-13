# offchainer
Tools to have ethereum develop smart contract interacting with off-chain data and computation.
Aims at facilitating development of smart contract in scenarios where some data and associated computation
needs to be off-chain, either for privacy or efficiency reasons.
We take computations out of the smart contract, while ensuring correctness, using commitments and zk-proofs.
See the [paper](#/docs/paper.pdf) for a formal description of the goal of this library.

## Dependencies 

### Library dependencies:
- [nodejs](https://github.com/nodesource/distributions/blob/master/README.md#debinstall) v12 or above
- [solc](https://solidity.readthedocs.io/en/v0.5.13/installing-solidity.html#binary-packages) v 0.5.13 to 0.5.16 (Bug with versions 0.6.1)
- [zokrates](https://zokrates.github.io/gettingstarted.html)

### Test network dependencies:
- [geth](https://geth.ethereum.org/docs/install-and-build/installing-geth#install-on-ubuntu-via-ppas)

## Use the library:
### Development
In your project workspace:
- run `npm install git+https://github.com/marinthiercelin/offchainer.git`
- run `nodejs offchainer init <project_name>`
- write your onchain code in `./src/<project_name>_onchain.sol`
- write your offchain code in `./src/<project_name>_offchain.zok`.
- generate the SNARKS keys with:
`nodejs offchainer generate`

### Ethereum network
You need to have a running ethereum node on your machine.
We've provided a script to generate a test private network with 3 accounts with some ether:
- "2db685e56b28f87e60fdd62eee66d8b7c5a9ba8e"
- "3fa68075aa987cf3b61ed52b54c936ab2007f38b"
- "f593c5e1899a255ded9a7bb90355cfd12a82bda3"

They can be unlocked with password : 'the_password'.

To start the test network, run: 
- `cd /nodes_modules/offchainer/test_network`
- `./start.sh`

### Configuration

You can configure the project by modifying `./src/config.json`

### Execution
The owner can deploy the contracts with: 

`nodejs node_modules/offchainer deploy <account> <password> <secret> <arg1> <arg2> etc.`

This will generate 2 files in the folder `instances` a public file that can be shared with the users, and a key file that needs to stay private.

The owner can start listening for private computations requests with: 

`nodejs node_modules/offchainer listen <instance_pub> <instance_key> <account> <password>`

The user can interact with the contract using:

`nodejs node_modules/offchainer call <instance_pub> <account> <password> <method_name> <arg1> <arg2> etc.`







