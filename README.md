# offChainer
Tools to have ethereum develop smart contract interacting with off-chain data and computation.
Aims at facilitating development of smart contract in scenarios where some data and associated computation
needs to be off-chain, either for privacy or efficiency reasons.
We take computations out of the smart contract, while ensuring correctness, using commitments and zk-proofs.

## dependencies 

### library
- [nodejs](https://github.com/nodesource/distributions/blob/master/README.md#debinstall) v12 or above
- run `npm install`
- [solc](https://solidity.readthedocs.io/en/v0.5.13/installing-solidity.html#binary-packages) v 0.5.13 or above 
- [zokrates](https://zokrates.github.io/gettingstarted.html)

### benchmark

- sqlite3 
- python 
- matplotlib

### test network
- [geth](https://geth.ethereum.org/docs/install-and-build/installing-geth#install-on-ubuntu-via-ppas)
