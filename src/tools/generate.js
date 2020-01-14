const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const commitment_scheme = require('../offchain/commitment/HashBasedCommitment');

module.exports = async function(config){
    const setup_values = config.setup_values;
    const setup = new ZokratesSetup(config, setup_values);
    await setup.generate(commitment_scheme);
}