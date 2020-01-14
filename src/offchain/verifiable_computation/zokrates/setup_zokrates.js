const assert = require('assert');
const web3Connector = require("../../web3/web3Connector");
const fs = require('fs');
const ContractDeployer = require('../../helpers/ContractDeployer');
const solidity_compiler = require('../../helpers/solidity_compiler');
const exec_command = require('../../helpers/exec_command');

module.exports = class ZokratesSetup extends web3Connector.web3ConnectedClass {

    /**
     * 
     * @param {{node_address:string, verbose:bool}} config 
     *  the node_address field should be set to the address and port of the ethereum node interface.
     *  the verbose field should be set to true if status messages need to be printed.
     */
    constructor(config, setup_values){
        super(config);
        this.setup_values = setup_values;
    }

    /**
     * 
     * @param {*} commitment_scheme 
     * @param {*} zokrates_filepath 
     * @param {*} setup_dir 
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} deploy_options 
     */
    async generate(commitment_scheme){
        const setup_values = this.setup_values;
        if (!fs.existsSync(setup_values.setup_dir)){
            fs.mkdirSync(setup_values.setup_dir, {recursive:true});
        }
        commitment_scheme.addCommitmentToZokrates(setup_values.original_zokrates_file, setup_values.modified_zokrates_file);
        try{
            let compile_cmd = `zokrates compile --light --abi_spec ${setup_values.zokrates_abi} -i ${setup_values.modified_zokrates_file} -o ${setup_values.compiled_file};`;
            await exec_command(compile_cmd);
            let setup_cmd = `zokrates setup --light -i ${setup_values.compiled_file} -v ${setup_values.verification_key_file} -p ${setup_values.proving_key_file};`;
            await exec_command(setup_cmd);
            let export_verifier_cmd = `zokrates export-verifier -i ${setup_values.verification_key_file} -o ${setup_values.verifier_contract}`;
            await exec_command(export_verifier_cmd);
        }catch(e){
            console.log(e)
        }
    }

    getSetupValues(){
        return this.setup_values;
    }

    load(json_file){
        this.setup_values = JSON.parse(fs.readFileSync(json_file));
        this.was_setup = true;
    }

    save(json_file){
        fs.writeFileSync(json_file, JSON.stringify(this.setup_values));
    }
}