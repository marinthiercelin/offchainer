const assert = require('assert');
const web3Connector = require("../web3/web3Connector");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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
        if (!fs.existsSync(this.build_directory)){
            fs.mkdirSync(this.build_directory);
        }
        this.modified_zokrates_file = `${this.build_directory}/${this.output_prefix}_with_commitment.zok`;
        this.commitment_scheme.addCommitmentToZokrates(zokrates_filepath, this.modified_zokrates_file);
        this.compiled_file = `${this.build_directory}/${this.output_prefix}`;
        let compile_cmd = `zokrates compile --light -i ${this.modified_zokrates_file} -o ${this.compiled_file};`;
        await this._exec_command(compile_cmd);
        this.verification_key_file = `${this.build_directory}/${this.output_prefix}_verification.key`;
        this.proving_key_file = `${this.build_directory}/${this.output_prefix}_proving.key`;
        let setup_cmd = `zokrates setup --light -i ${this.compiled_file} -v ${this.verification_key_file}  -p ${this.proving_key_file};`;
        await this._exec_command(setup_cmd);
        this.was_setup = true;
    }

    async deployVerifierContract(deploy_options){
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
        await this.web3.eth.personal.unlockAccount(deploy_options.account, deploy_options.password, deploy_options.unlockDuration);
        let BN256G2ContractInstance = await BN256G2ContractTx.send({
            from: deploy_options.account,
            gas: deploy_options.gas,
            gasPrice: deploy_options.gasPrice,
        });
        let BN256G2ContractAddress = BN256G2ContractInstance.options.address;
        let link_BN256G2_cmd = `solc ${verifier_contract_file} --overwrite --libraries BN256G2:${BN256G2ContractAddress} --bin -o ${this.build_directory}`;
        await this._exec_command(link_BN256G2_cmd);

        let Pairing_abi = JSON.parse(fs.readFileSync(`${this.build_directory}/Pairing.abi`));
        let Pairing_bin = fs.readFileSync(`${this.build_directory}/Pairing.bin`);
        let PairingContractObject = new this.web3.eth.Contract(Pairing_abi);
        let PairingContractTx = PairingContractObject.deploy({data:Pairing_bin});
        await this.web3.eth.personal.unlockAccount(deploy_options.account, deploy_options.password, deploy_options.unlockDuration);
        let PairingContractInstance = await PairingContractTx.send({
            from: deploy_options.account,
            gas: deploy_options.gas,
            gasPrice: deploy_options.gasPrice,
        });
        let PairingContractAddress = PairingContractInstance.options.address;
        let link_pairing_cmd = `solc ${verifier_contract_file} --overwrite --libraries Pairing:${PairingContractAddress} --bin -o ${this.build_directory}`;
        await this._exec_command(link_pairing_cmd);

        let Verifier_abi = JSON.parse(fs.readFileSync(`${this.build_directory}/Verifier.abi`));
        let Verifier_bin = fs.readFileSync(`${this.build_directory}/Verifier.bin`);
        let VerifierContractObject = new this.web3.eth.Contract(Verifier_abi);
        let VerifierContractTx = VerifierContractObject.deploy({data: Verifier_bin});
        await this.web3.eth.personal.unlockAccount(deploy_options.account, deploy_options.password, deploy_options.unlockDuration);
        let VerifierContractInstance = await VerifierContractTx.send({
            from: deploy_options.account,
            gas: deploy_options.gas,
            gasPrice: deploy_options.gasPrice,
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

    usePastSetup(zokrates_filepath, build_directory){
        assert(!this.was_setup, "the suite was already set up");
        this.build_directory = build_directory;
        this.zokrates_filepath = zokrates_filepath;
        this.output_prefix = path.basename(zokrates_filepath, '.zok');
        this.modified_zokrates_file = `${this.build_directory}/${this.output_prefix}_with_commitment.zok`;
        this.compiled_file = `${this.build_directory}/${this.output_prefix}`;
        this.verification_key_file = `${this.build_directory}/${this.output_prefix}_verification.key`;
        this.proving_key_file = `${this.build_directory}/${this.output_prefix}_proving.key`;
        this.was_setup = true;
    }

    usePastVerifierContract(address){
        assert(this.was_setup, "the suite wasn't set up");
        assert(!this.deployed, "the verifier contract was already deployed");
        this.verifier_address = address;
        this.deployed = true;
    }

    usePastVerifierContract(address){
        assert(this.was_setup, "the suite wasn't set up");
        assert(!this.deployed, "the verifier contract was already deployed");
        this.verifier_address = address;
        this.deployed = true;
        return this.verifier_address;
    }


    /**
     * @param {int} value value to commit to, max 128bits to work with Zokrates.
     */
    _commit(value){
        assert(this.was_setup, "the suite wasn't set up");
        assert(this.deployed, "the verifier contract wasn't deployed");
        return this.commitment_scheme.commit(BigInt(value).toString(16));
    }

    verificationData(secret){
        assert(this.was_setup, "the suite wasn't set up");
        assert(this.deployed, "the verifier contract wasn't deployed");
        let commitment_pair = this._commit(secret);
        let commitment_ints = this._hexToBigIntArray(commitment_pair.commitment, 2);
        let commitment_bns = commitment_ints.map(x => x.toString());
        let key_ints = this._hexToBigIntArray(commitment_pair.key, 3);
        return {
            verifier_material : [commitment_bns, this.verifier_address],
            prover_material: {commitment:commitment_ints, key:key_ints}
        }
    }

    _hexToBigIntArray(hexstr, divide_in){
        if(hexstr[0]==='0' && hexstr==='x'){
            hexstr = hexstr.substring(2);
        }
        if(hexstr.length % divide_in !== 0){
            throw "Cannot divide the hex_str equally";
        }
        let bigIntLen = hexstr.length/divide_in;
        let indexes = [...Array(divide_in).keys()];
        let substrings = indexes.map(i => '0x'+hexstr.substring(i*bigIntLen, (i+1)*bigIntLen));
        let result = substrings.map(str => BigInt(str));
        return result;
    }


    // make the computation and generate a proof of correctness
    async computeAndProve(secret, input, prover_material){
        assert(this.was_setup, "the suite wasn't set up");
        assert(this.deployed, "the verifier contract wasn't deployed");
        let key = prover_material.key;
        let comm = prover_material.commitment;
        let witness_file = `${this.build_directory}/${this.output_prefix}_witness`;
        let witness_cmd = 
        `zokrates compute-witness --light `+
            `-i ${this.compiled_file} -o ${witness_file} `+
            `-a ${secret} ${input} `+
            `${key[0]} ${key[1]} ${key[2]} `+
            `${comm[0]} ${comm[1]}`;
        await this._exec_command(witness_cmd);
        let proof_file = `${this.build_directory}/${this.output_prefix}_proof.json`;
        let proof_cmd = `zokrates generate-proof `+
        `-i ${this.compiled_file} `+
        `-w ${witness_file} `+
        `-p ${this.proving_key_file} `+
        `-j ${proof_file}`;
        await this._exec_command(proof_cmd);
        let proof_json = JSON.parse(fs.readFileSync(proof_file));
        let input_len = proof_json.inputs.length;
        let output_hex = proof_json.inputs[input_len-1];
        let output = this.web3.utils.toBN(output_hex).toString();
        let a = proof_json.proof.a;
        let b = proof_json.proof.b;
        let c = proof_json.proof.c;
        let toOneHex = (list) => list.flat().map(x => x.substring(2)).reduce((a,b)=>a+b); 
        let proof_hex = "0x" + toOneHex(a) + toOneHex(b) + toOneHex(c);
        let check_proof = await this.verifyProof(proof_file);
        console.log(`The proof check returned ${check_proof}`);
        return {output:output, proof: this.web3.utils.hexToBytes(proof_hex)};
    }

    async verifyProof(proof_file){
        let Verifier_abi = JSON.parse(fs.readFileSync(`${this.build_directory}/Verifier.abi`));
        this._connectWeb3Http();
        let verifier_instance = await new this.web3.eth.Contract(Verifier_abi, this.verifier_address);
        let proof_json = JSON.parse(fs.readFileSync(proof_file));
        // proof_json.inputs[proof_json.inputs.length -1] = "0x0000000000000000000000000000000000000000000000000000000000000011"
        let checkTx = verifier_instance.methods.verifyTx(
            proof_json.proof.a, 
            proof_json.proof.b, 
            proof_json.proof.c, 
            proof_json.inputs
        );
        console.log(checkTx);
        console.log(this.web3.utils.sha3(`verifyTx(uint256[2],uint256[2][2],uint256[2],uint256[4])`).substr(0, 10));
        let check_result = await checkTx.call();
        return check_result;
    }

}


