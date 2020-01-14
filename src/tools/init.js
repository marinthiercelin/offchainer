const fs = require('fs');
const path = require('path');
const exec_command = require('../offchain/helpers/exec_command');
const template_dir = path.resolve(__dirname+'/../templates');

module.exports = async function(config, proj_name, ...args){
    const config_path = './offchainer_config.json'
    if (!args.includes('--force') && fs.existsSync(config_path)){
        throw `Already initiated (init ${proj_name} --force to overwrite)`;
    }
    if(proj_name == ''){
        throw "You need to provide a name"
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