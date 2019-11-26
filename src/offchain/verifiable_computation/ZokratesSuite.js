const assert = require('assert');
const web3Connector = require("../web3/web3Connector");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const AbstractSuite = require('./AbstractSuite');
const Web3 = require('web3');
const ContractDeployer = require('../web3/ContractDeployer');


function _exec_command(cmd){
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

function fromNumberTo128bitHex(number){
    let hex_str = BigInt(number).toString(16);
    let hex_length = hex_str.length;
    return "0".repeat(128-hex_length)+hex_str;
}

module.exports.ZokratesSetup = class ZokratesSetup extends web3Connector.web3ConnectedClass {

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
     * @param {*} build_dir 
     * @param {{from:string, password:string, unlockDuration:int, gas:Number, gasPrice:Number, value:Number}} deploy_options 
     */
    async init(commitment_scheme, zokrates_filepath, build_dir, deploy_options){
        assert(!this.was_setup, "the suite was already set up");
        let output_prefix = path.basename(zokrates_filepath, '.zok');
        if (!fs.existsSync(build_dir)){
            fs.mkdirSync(build_dir);
        }
        this.setup_values.setup_dir = path.resolve(build_dir + "/"+output_prefix + "_setup");
        if (!fs.existsSync(this.setup_values.setup_dir)){
            fs.mkdirSync(this.setup_values.setup_dir);
        }
        this.setup_values.modified_zokrates_file = `${this.setup_values.setup_dir}/modified.zok`;
        commitment_scheme.addCommitmentToZokrates(zokrates_filepath, this.setup_values.modified_zokrates_file);
        this.setup_values.compiled_file = `${this.setup_values.setup_dir}/compiled`;
        let compile_cmd = `zokrates compile --light -i ${this.setup_values.modified_zokrates_file} -o ${this.setup_values.compiled_file};`;
        await _exec_command(compile_cmd);
        this.setup_values.verification_key_file = `${this.setup_values.setup_dir}/verification.key`;
        this.setup_values.proving_key_file = `${this.setup_values.setup_dir}/proving.key`;
        let setup_cmd = `zokrates setup --light -i ${this.setup_values.compiled_file} -v ${this.setup_values.verification_key_file} -p ${this.setup_values.proving_key_file};`;
        await _exec_command(setup_cmd);
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
        await _exec_command(export_verifier_cmd);
        
        let compile_cmd = `solc --abi --bin --overwrite -o ${this.setup_values.setup_dir} ${this.setup_values.verifier_contract_file}`;
        await _exec_command(compile_cmd);


        let Verifier_abi = JSON.parse(fs.readFileSync(`${this.setup_values.setup_dir}/Verifier.abi`));
        let Verifier_bin = fs.readFileSync(`${this.setup_values.setup_dir}/Verifier.bin`);

        let contractDeployer = new ContractDeployer(this.config);

        this.setup_values.verifier_address = await contractDeployer.deploy(deploy_options, Verifier_abi, Verifier_bin, []);
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
        this._connectWeb3Http();
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

/**
 * Class that uses the Zokrates library 
 * to make verifiable computations.
 */
module.exports.ZokratesSuite = class ZokratesSuite extends AbstractSuite {

    /**
     * 
     * @param {string} zokrates_file_name the path to the zokrates computation file, without the .zok extension
     * @param {string} build_directory the path to the directory where auxiliary files are generated.
     */
    constructor(config, setup, secret, commitment_scheme, commitment_pair=undefined){
        super(secret);
        this.config = config;
        this.setup = setup;
        this.setup_values = setup.getSetupValues();
        this.commitment_scheme = commitment_scheme;
        this._makeCommitment(commitment_pair);
    }

    _makeCommitment(commitment_pair){
        if(typeof this.commitment_pair !=="undefined"){
            this.commitment_pair=commitment_pair;
        }else{
            let hex_str = fromNumberTo128bitHex(this.secret);
            this.commitment_pair=this.commitment_scheme.commit(hex_str);
        }
        this.commitment_ints = this._hexToBigIntArray(this.commitment_pair.commitment, 2).map(x => x.toString());
        this.key_ints = this._hexToBigIntArray(this.commitment_pair.key, 3).map(x => x.toString());
    }

    

    getHolderContractArgs(){
        return [this.commitment_ints, this.setup_values.verifier_address];
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
    async computeAndProve(public_input){
        let key = this.key_ints;
        let comm = this.commitment_ints;
        let witness_file = `${this.setup_values.setup_dir}/witness`;
        let witness_cmd = 
            `zokrates compute-witness --light `+
                `-i ${this.setup_values.compiled_file} -o ${witness_file} `+
                `-a ${this.secret} ${public_input} `+
                `${key[0]} ${key[1]} ${key[2]} `+
                `${comm[0]} ${comm[1]}`;
        await _exec_command(witness_cmd);
        let proof_file = `${this.setup_values.setup_dir}/proof.json`;
        let proof_cmd = 
            `zokrates generate-proof `+
                `-i ${this.setup_values.compiled_file} `+
                `-w ${witness_file} `+
                `-p ${this.setup_values.proving_key_file} `+
                `-j ${proof_file}`;
        await _exec_command(proof_cmd);
        let check_proof = await this.setup.verifyProof(proof_file);
        this.config.verbose && console.log(`The proof check returned ${check_proof}`);
        let formatted = formatZokratesOutput(proof_file);
        return formatted;
    } 

}

function formatZokratesOutput(proof_file){
    let proof_json = JSON.parse(fs.readFileSync(proof_file));
    let input_len = proof_json.inputs.length;
    let output_hex = proof_json.inputs[input_len-1];
    let output = BigInt(output_hex).toString();
    let a = proof_json.proof.a;
    let b = proof_json.proof.b;
    let c = proof_json.proof.c;
    let toOneHex = (list) => list.flat().map(x => x.substring(2)).reduce((a,b)=>a+b); 
    let proof_hex = "0x" + toOneHex(a) + toOneHex(b) + toOneHex(c);
    return {output:output, proof: Web3.utils.hexToBytes(proof_hex)};
}