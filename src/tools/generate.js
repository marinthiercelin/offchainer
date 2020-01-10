const exec_command = require('../offchain/helpers/exec_command');
const fs = require('fs');
const commitment_scheme = require('../offchain/commitment/HashBasedCommitment');
module.exports = async function(){
    const config = JSON.parse(fs.readFileSync('./src/config.json'));
    const setup_values = config.setup_values;
    if (!fs.existsSync(setup_values.setup_dir)){
        fs.mkdirSync(setup_values.setup_dir, {recursive:true});
    }
    commitment_scheme.addCommitmentToZokrates(setup_values.original_zokrates_file, setup_values.modified_zokrates_file);
    try{
        let compile_cmd = `zokrates compile --light -i ${setup_values.modified_zokrates_file} -o ${setup_values.compiled_file};`;
        await exec_command(compile_cmd);
        let setup_cmd = `zokrates setup --light -i ${setup_values.compiled_file} -v ${setup_values.verification_key_file} -p ${setup_values.proving_key_file};`;
        await exec_command(setup_cmd);
        let export_verifier_cmd = `zokrates export-verifier -i ${setup_values.verification_key_file} -o ${setup_values.verifier_contract}`;
        await exec_command(export_verifier_cmd);
    }catch(e){
        console.log(e)
    }
}