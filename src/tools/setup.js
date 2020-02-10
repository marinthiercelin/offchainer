const ZokratesSetup = require('../offchain/verifiable_computation/zokrates/setup_zokrates');
const {supported_commitments} = require('./init');

module.exports.functionality  = async function(config){
    const setup_values = config.setup_values;
    const setup = new ZokratesSetup(config, setup_values);
    let commitment_scheme;
    if(!(config.commitment_scheme in supported_commitments)){
        throw `Unknown config.commitment_scheme ${config.commitment_scheme}, needs to be ${Object.keys(supported_commitments).join("|")}`;
    }else{
        commitment_scheme = new supported_commitments[config.commitment_scheme]();
    }
    await setup.generate(commitment_scheme);
}