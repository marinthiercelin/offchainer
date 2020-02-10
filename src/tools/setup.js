const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const MerkleTreeCommitment = require('../offchain/commitment/MerkleTreeCommitment');
const HashChainCommitment = require('../offchain/commitment/HashChainCommitment');

module.exports = async function(config){
    const setup_values = config.setup_values;
    const setup = new ZokratesSetup(config, setup_values);
    let commitment_scheme;
    if(config.commitment_scheme === 'merkle'){
        commitment_scheme = new MerkleTreeCommitment();
    }else if(config.commitment_scheme === 'chain'){
        commitment_scheme = new HashChainCommitment();
    }else{
        throw `Unknown config.commitment_scheme ${config.commitment_scheme}, needs to be merkle or chain`;
    }
    await setup.generate(commitment_scheme);
}