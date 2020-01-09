const fs = require('fs');
const path = require('path');

module.exports = function(...args){
    const dest_dir = './src/'
    if (!args.includes('-f') && fs.existsSync(dest_dir)){
        throw "Already initiated (-f to overwrite)";
    }
    fs.mkdirSync(dest_dir, { recursive: true })
    const template_dir = path.resolve(__dirname+'/../templates')
    fs.readdirSync(template_dir).forEach(file => {
        copyFile(path.resolve(template_dir+'/'+file), path.resolve(dest_dir+file));
    });
}

function copyFile(source, destination){
    fs.copyFile(source, destination, (err) => {
        if (err) throw err;
    });
}