const fs = require('fs');
const path = require('path');
const exec_command = require('../offchain/helpers/exec_command');

module.exports = async function(...args){
    // if (!args.includes('-f') && fs.readdirSync(path.resolve('.')).length > 0){
    //     throw "Already initiated (init -f <project_name> to overwrite)";
    // }
    if(args.length == 0){
        throw "You need to provide a name"
    }
    const proj_name = args[args.length -1];
    const src_dir = './src';
    fs.mkdirSync(src_dir, { recursive: true });
    copyTemplate('interfaces.sol', src_dir+'/interfaces.sol');
    copyTemplate('zokrates.sol', src_dir+`/${proj_name}_onchain.sol`);
    copyTemplate('f_computation.zok', src_dir+`/${proj_name}_offchain.sol`);
    copyTemplate('config.json', './config.json');
    let proj_name_template = "__PROJECT_NAME__";
    await setTemplateValue(src_dir+`/${proj_name}_onchain.sol`, proj_name_template, proj_name);
    await setTemplateValue('./config.json', proj_name_template, proj_name);

}

function copyTemplate(source, destination){
    const template_dir = path.resolve(__dirname+'/../templates');
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