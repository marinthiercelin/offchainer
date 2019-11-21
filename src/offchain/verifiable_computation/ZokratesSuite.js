const assert = require('assert');
const web3Connector = require("../web3/web3Connector");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const bigInt = require("big-integer");

/**
 * Class that uses the Zokrates library 
 * to make verifiable computations.
 */
module.exports = class ZokratesSuite extends web3Connector.web3ConnectedClass {

    /**
     * 
     * @param {string} zokrates_file_name the path to the zokrates computation file, without the .zok extension
     * @param {string} build_directory the path to the directory where auxiliary files are generated.
     */
    constructor(config, commitment_scheme){
        super(config);
        this.commitment_scheme = commitment_scheme;
        this.config = config;
        this.was_setup = false;
        this.deployed = false;
    }

    async freshSetUp(zokrates_filepath, build_directory){
        assert(!this.was_setup, "the suite was already set up");
        this.build_directory = build_directory;
        this.zokrates_filepath = zokrates_filepath;
        this.output_prefix = path.basename(zokrates_filepath, '.zok');
        this.modified_zokrates_file = `${this.build_directory}/${this.output_prefix}_with_commitment.zok`;
        this.commitment_scheme.addCommitmentToZokrates(zokrates_filepath, this.modified_zokrates_file);
        if (!fs.existsSync(this.build_directory)){
            fs.mkdirSync(this.build_directory);
        }
        this.compiled_file = `${this.build_directory}/${this.output_prefix}`;
        // let compile_cmd = `zokrates compile --light -i ${this.modified_zokrates_file} -o ${this.compiled_file};`;
        let compile_cmd = `zokrates compile --light -i ${this.zokrates_filepath} -o ${this.compiled_file};`;
        await this._exec_command(compile_cmd);
        this.verification_key_file = `${this.build_directory}/${this.output_prefix}_verification.key`;
        this.proving_key_file = `${this.build_directory}/${this.output_prefix}_proving.key`;
        let setup_cmd = `zokrates setup --light -i ${this.compiled_file} -v ${this.verification_key_file}  -p ${this.proving_key_file};`;
        await this._exec_command(setup_cmd);
        this.was_setup = true;
    }

    async deployVerifierContract(){
        assert(this.was_setup, "the suite wasn't set up");
        assert(!this.deployed, "the verifier contract was already deployed");
        let verifier_contract_file = `${this.build_directory}/${this.output_prefix}_verifier.sol`;
        let export_verifier_cmd = `zokrates export-verifier -i ${this.verification_key_file} -o ${verifier_contract_file}`;
        await this._exec_command(export_verifier_cmd);
        let compile_cmd = `solc --abi --bin --overwrite -o ${this.build_directory} ${verifier_contract_file}`;
        await this._exec_command(compile_cmd);
        this._connectWeb3Http();

        let BN256G2_abi = JSON.parse(fs.readFileSync(`${this.build_directory}/BN256G2.abi`));
        let BN256G2_bin = fs.readFileSync(`${this.build_directory}/BN256G2.bin`);
        let BN256G2ContractObject = new this.web3.eth.Contract(BN256G2_abi);
        let BN256G2ContractTx = BN256G2ContractObject.deploy({
            data:BN256G2_bin
        });
        this._unlockAccount();
        let BN256G2ContractInstance = await BN256G2ContractTx.send({
            from:this.config.account,
            gas: this.config.gas,
            gasPrice: this.config.gasPrice,
        });
        let BN256G2ContractAddress = BN256G2ContractInstance.options.address;
        let link_BN256G2_cmd = `solc ${verifier_contract_file} --overwrite --libraries BN256G2:${BN256G2ContractAddress} --bin -o ${this.build_directory}`;
        await this._exec_command(link_BN256G2_cmd);

        let Pairing_abi = JSON.parse(fs.readFileSync(`${this.build_directory}/Pairing.abi`));
        let Pairing_bin = fs.readFileSync(`${this.build_directory}/Pairing.bin`);
        let PairingContractObject = new this.web3.eth.Contract(Pairing_abi);
        let PairingContractTx = PairingContractObject.deploy({data:Pairing_bin});
        await this._unlockAccount();
        let PairingContractInstance = await PairingContractTx.send({
            from:this.config.account,
            gas: this.config.gas,
            gasPrice: this.config.gasPrice,
        });
        let PairingContractAddress = PairingContractInstance.options.address;
        let link_pairing_cmd = `solc ${verifier_contract_file} --overwrite --libraries Pairing:${PairingContractAddress} --bin -o ${this.build_directory}`;
        await this._exec_command(link_pairing_cmd);

        let Verifier_abi = JSON.parse(fs.readFileSync(`${this.build_directory}/Verifier.abi`));
        let Verifier_bin = fs.readFileSync(`${this.build_directory}/Verifier.bin`);
        let VerifierContractObject = new this.web3.eth.Contract(Verifier_abi);
        let VerifierContractTx = VerifierContractObject.deploy({data: Verifier_bin});
        await this._unlockAccount();
        let VerifierContractInstance = await VerifierContractTx.send({
            from:this.config.account,
            gas: this.config.gas,
            gasPrice: this.config.gasPrice,
        });
        this.verifier_address = VerifierContractInstance.options.address;
        this.deployed = true;
        return this.verifier_address;
    }

    _exec_command(cmd){
        return new Promise((resolve, reject)=>{
            exec(cmd, (err, stdout, stderr) => {
                if(err){
                    reject(err)
                }else{
                    resolve(stdout);
                }
            })
        });
    }

    usePastSetup(compiled_file, proving_key_file, verification_key_file){
        assert(!this.was_setup, "the suite was already set up");
        this.compiled_file = compiled_file;
        this.proving_key_file = proving_key_file;
        this.verification_key_file = verification_key_file;
        this.was_setup = true;
    }

    usePastVerifierContract(address){
        assert(this.was_setup, "the suite wasn't set up");
        assert(!this.deployed, "the verifier contract was already deployed");
        this.verifier_address = address;
        this.deployed = true;
    }

    /**
     * @param {int} value value to commit to
     */
    commit(value){
        assert(this.was_setup, "the suite wasn't set up");
        assert(this.deployed, "the verifier contract wasn't deployed");
        return this.commitment_scheme.commit(bigInt(value));
    }

    verificationData(){
        assert(this.was_setup, "the suite wasn't set up");
        assert(this.deployed, "the verifier contract wasn't deployed");
        return this.verifier_address;
    }

    // make the computation and generate a proof of correctness
    computeAndProve(secret, input, commitment_pair){
        assert(this.was_setup, "the suite wasn't set up");
        assert(this.deployed, "the verifier contract wasn't deployed");
        return {output:this.computeOutput(secret, input), proof:"0x00000000000000000000000000000000"}
    }

}


