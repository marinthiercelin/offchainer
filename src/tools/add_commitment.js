const {supported_commitments, supported_hash_functions} = require('./init');

module.exports.functionality  = async function(config){
    const setup_values = config.setup_values;
    let commitment_scheme;
    let hash_function;
    if(!(config.hash_function in supported_hash_functions)){
        throw `Unknown config.hash_function ${config.hash_function}, needs to be ${Object.keys(supported_hash_functions).join("|")}`;
    }else{
        hash_function = new supported_hash_functions[config.hash_function]();
    }
    if(!(config.commitment_scheme in supported_commitments)){
        throw `Unknown config.commitment_scheme ${config.commitment_scheme}, needs to be ${Object.keys(supported_commitments).join("|")}`;
    }else{
        commitment_scheme = new supported_commitments[config.commitment_scheme](hash_function);
    }
    await commitment_scheme.addCommitmentToZokrates(setup_values.original_zokrates_file, setup_values.modified_zokrates_file);
}