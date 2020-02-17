const fs = require('fs');
const AbstractSuiteWithCommitment = require('../AbstractSuiteWithCommitment');
const Web3 = require('web3');
const exec_command = require('../../helpers/exec_command');
const Path = require('path');


/**
 * Class that uses the Zokrates library 
 * to make verifiable computations.
 */
module.exports = class ZokratesSuite extends AbstractSuiteWithCommitment {

    /**
     * 
     * @param {string} zokrates_file_name the path to the zokrates computation file, without the .zok extension
     * @param {string} build_directory the path to the directory where auxiliary files are generated.
     */
    constructor(config, setup, secret_inputs, commitment_scheme, commitment_pair){
        super(config, secret_inputs, commitment_scheme, commitment_pair);
        this.setup = setup;
        this.setup_values = setup.getSetupValues();
    }

    getCommitmentPair(){
        return this.commitment_pair;
    }

    getHolderContractArgs(){
        return [...this.commitment_scheme.getHolderArgs(this.commitment_pair), this.setup_values.verifier_address];
    }

    // make the computation and generate a proof of correctness
    async computeAndProve(public_inputs){
        let tmp_dir = fs.mkdtempSync(this.setup_values.setup_dir+"/tmp");
        let witness_file = `${tmp_dir}/witness`;
        let witness_cmd = 
            `zokrates compute-witness --light `+
                `--abi_spec ${this.setup_values.zokrates_abi} `+
                `-i ${this.setup_values.compiled_file} -o ${witness_file} `+
                `-a ${this.secret_inputs.join(" ")} ${public_inputs.join(" ")} `+
                this.commitment_scheme.getZokratesArgs(this.commitment_pair);
        await exec_command(witness_cmd);
        let proof_file = `${tmp_dir}/proof.json`;
        let proof_cmd = 
            `zokrates generate-proof `+
                `-i ${this.setup_values.compiled_file} `+
                `-w ${witness_file} `+
                `-s ${this.config.proving_scheme} `+
                `-p ${this.setup_values.proving_key_file} `+
                `-j ${proof_file}`;
        await exec_command(proof_cmd);
        let formatted = formatZokratesOutput(proof_file);
        deleteFolderRecursive(tmp_dir);
        return formatted;
    } 

}

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file, index) => {
      const curPath = Path.join(path, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function formatZokratesOutput(proof_file){
    let proof_json = JSON.parse(fs.readFileSync(proof_file));
    let input_len = proof_json.inputs.length;
    let output_hex = proof_json.inputs[input_len-1];
    return {output:output_hex, proof: proof_json.proof};
}