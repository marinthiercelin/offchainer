const fs = require('fs');
const path = require('path');
const exec_command = require('../offchain/helpers/exec_command');
const template_dir = path.resolve(__dirname+'/../templates');
const MerkleTreeCommitment = require('../offchain/commitment/MerkleTreeCommitment');
const HashChainCommitment = require('../offchain/commitment/HashChainCommitment');
const SimpleHashCommitment = require('../offchain/commitment/SimpleHashCommitment');

const supported_commitments = {merkle:MerkleTreeCommitment, chain: HashChainCommitment, simple: SimpleHashCommitment};

module.exports.supported_commitments = supported_commitments;

module.exports.functionality = async function(config, proj_name, commitment_scheme='simple', nb_priv_inputs='1', nb_pub_inputs='1', ...args){
    const config_path = './offchainer_config.json'
    if (!args.includes('--force') && fs.existsSync(config_path)){
        throw `Already initiated (init ${proj_name} --force to overwrite)`;
    }
    if(!proj_name){
        throw "You need to provide a name"
    }
    if(!(commitment_scheme in supported_commitments)){
        throw `Commitment scheme needs to be [${Object.keys(supported_commitments).join("|")}], received ${commitment_scheme}`;
    }
    const src_dir = './src';
    fs.mkdirSync(src_dir, { recursive: true });
    copyTemplate('interfaces.sol', src_dir+'/interfaces.sol');
    copyTemplate('zokrates.sol', src_dir+`/${proj_name}_onchain.sol`);
    copyTemplate('f_computation.zok', src_dir+`/${proj_name}_offchain.zok`);
    copyTemplate('offchainer_config.json', config_path);
    let proj_name_template = "__PROJECT_NAME__";
    await setTemplateValue(src_dir+`/${proj_name}_onchain.sol`, proj_name_template, proj_name);
    await setTemplateValue(config_path, proj_name_template, proj_name);

    let nb_pub_template = "__NB_PUB_INPUTS__";
    await setTemplateValue(src_dir+'/interfaces.sol', nb_pub_template, nb_pub_inputs);
    await setTemplateValue(src_dir+`/${proj_name}_onchain.sol`, nb_pub_template, nb_pub_inputs);
    await setTemplateValue(src_dir+`/${proj_name}_offchain.zok`, nb_pub_template, nb_pub_inputs);
    await setTemplateValue(config_path, nb_pub_template, nb_pub_inputs);

    let nb_priv_template = "__NB_PRIV_INPUTS__";
    await setTemplateValue(src_dir+'/interfaces.sol', nb_priv_template, nb_priv_inputs);
    await setTemplateValue(src_dir+`/${proj_name}_onchain.sol`, nb_priv_template, nb_priv_inputs);
    await setTemplateValue(src_dir+`/${proj_name}_offchain.zok`, nb_priv_template, nb_priv_inputs);
    await setTemplateValue(config_path, nb_priv_template, nb_priv_inputs);
    
    let commitment_scheme_template = "__COMMITMENT_SCHEME__";
    await setTemplateValue(config_path, commitment_scheme_template, commitment_scheme);

    let commitment_size_template = "__COMMITMENT_SIZE__";
    await setTemplateValue(src_dir+'/interfaces.sol', commitment_size_template, supported_commitments[commitment_scheme].getCommitmentBitSize(nb_priv_inputs)/128);

}

function copyTemplate(source, destination){
    copyFile(path.resolve(template_dir+'/'+source), path.resolve(destination));
}

async function setTemplateValue(file, template, value){
    const cmd = `sed -i -e "s/${template}/${value}/g" ${file}`;
    await exec_command(cmd);
}

function copyFile(source, destination){
    fs.copyFile(source, destination, (err) => {
        if (err) throw err;
    });
}