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
    constructor(config){
        super(config);
        this.was_setup = false;
        this.setup_values = {};
    }

    /**
     * 
     * @param {*} commitment_scheme 
     * @param {*} zokrates_filepath 
     * @param {*} setup_dir 
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} deploy_options 
     */
    async init(commitment_scheme, zokrates_filepath, setup_dir, deploy_options){
        assert(!this.was_setup, "the suite was already set up");
        this.setup_values.setup_dir = setup_dir;
        if (!fs.existsSync(this.setup_values.setup_dir)){
            fs.mkdirSync(this.setup_values.setup_dir, {recursive:true});
        }
        this.setup_values.modified_zokrates_file = `${this.setup_values.setup_dir}/modified.zok`;
        commitment_scheme.addCommitmentToZokrates(zokrates_filepath, this.setup_values.modified_zokrates_file);
        this.setup_values.compiled_file = `${this.setup_values.setup_dir}/compiled`;
        let compile_cmd = `zokrates compile --light -i ${this.setup_values.modified_zokrates_file} -o ${this.setup_values.compiled_file};`;
        await exec_command(compile_cmd);
        this.setup_values.verification_key_file = `${this.setup_values.setup_dir}/verification.key`;
        this.setup_values.proving_key_file = `${this.setup_values.setup_dir}/proving.key`;
        let setup_cmd = `zokrates setup --light -i ${this.setup_values.compiled_file} -v ${this.setup_values.verification_key_file} -p ${this.setup_values.proving_key_file};`;
        await exec_command(setup_cmd);
        await this._deployVerifier(deploy_options);
        this.was_setup = true;
        return this.setup_values;
    }

    async usePastSetup(setup_values){
        assert(!this.was_setup, "the suite was already set up");
        this.setup_values = setup_values;
        this.was_setup = true;
    }

    async _deployVerifier(deploy_options){
        this.setup_values.verifier_contract_file = `${this.setup_values.setup_dir}/verifier.sol`;
        let export_verifier_cmd = `zokrates export-verifier -i ${this.setup_values.verification_key_file} -o ${this.setup_values.verifier_contract_file}`;
        await exec_command(export_verifier_cmd);

        let verifier = await solidity_compiler.getCompiledContract(
            true,
            'Verifier', 
            this.setup_values.verifier_contract_file, 
            this.setup_values.setup_dir
        );

        let contractDeployer = new ContractDeployer(this.config);
        this.config.verbose && console.log("Deploying the verifier contract");
        this.setup_values.verifier_address = await contractDeployer.deploy(deploy_options, verifier.abi, verifier.bin);
    }

    getSetupValues(){
        assert(this.was_setup, "the suite wasn't set up");
        return this.setup_values;
    }

    load(json_file){
        assert(!this.was_setup, "the suite was already set up");
        this.setup_values = JSON.parse(fs.readFileSync(json_file));
        this.was_setup = true;
    }

    save(json_file){
        assert(this.was_setup, "the suite wasn't set up");
        fs.writeFileSync(json_file, JSON.stringify(this.setup_values));
    }

    async verifyProof(proof_file){
        assert(this.was_setup, "the suite wasn't set up");
        let Verifier_abi = JSON.parse(fs.readFileSync(`${this.setup_values.setup_dir}/Verifier.abi`));
        this._connectWeb3Ws();
        let verifier = await new this.web3.eth.Contract(Verifier_abi, this.setup_values.verifier_address);
        let proof_json = JSON.parse(fs.readFileSync(proof_file));
        let checkTx = verifier.methods.verifyTx(
            proof_json.proof.a, 
            proof_json.proof.b, 
            proof_json.proof.c, 
            proof_json.inputs
        );
        let check_result = await checkTx.call();
        return check_result;
    }
}