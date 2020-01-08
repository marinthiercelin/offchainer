const exec_command = require('../offchain/helpers/exec_command');
const fs = require('fs');
const commitment_scheme = require('../offchain/commitment/HashBasedCommitment');
module.exports = async function(){
    const build_dir = './build/'
    fs.mkdirSync(build_dir, { recursive: true })
    commitment_scheme.addCommitmentToZokrates('./src/f_computation.zok', './build/modified.zok');
    let compile_cmd = `zokrates compile --light -i ./build/modified.zok -o ./build/compiled;`;
    await exec_command(compile_cmd);
    let setup_cmd = `zokrates setup --light -i  ./build/compiled -v ./build/verification.key -p ./build/proving.key;`;
    await exec_command(setup_cmd);
    let export_verifier_cmd = `zokrates export-verifier -i ./build/verification.key -o ./build/verifier.sol`;
    await exec_command(export_verifier_cmd);
}