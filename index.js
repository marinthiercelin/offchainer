const init = require('./src/tools/init');
const setup = require('./src/tools/setup');
const deploy = require('./src/tools/deploy');
const listen = require('./src/tools/listen');
const call = require('./src/tools/call');

module.exports.init = init.functionality;
module.exports.setup = setup.functionality;
module.exports.deploy = deploy.functionality;
module.exports.listen = listen.functionality;
module.exports.call = call.functionality;

function breakDownList(arg){
    var list_reg = /^(?:\s*\[([^\]]*)\]\s*)$/;
    if(typeof arg === "string" && arg.search(list_reg) >= 0){
        let list_body = arg.match(list_reg)[1];
        let elements = list_body.split(/\s*,\s*/);
        return elements.map(x => x.trim())
    }
    return arg
}

function readArgs(args){
    var args_string = args.join(" ");
    var args_reg = /(?:\s*\[([^\]]*)\]\s*)|([^\[\]\s]+)/g
    args = args_string.match(args_reg);
    return args ? args.map(breakDownList): [];
}

async function main(){
    if(process.argv.length > 2){
        const cmd = process.argv[2];
        const call = module.exports[cmd];
        if(call){
            try{
                const fs = require('fs');
                const config_path = './offchainer_config.json'
                var config = '';
                if (fs.existsSync(config_path)) {
                    config = JSON.parse(fs.readFileSync(config_path));
                }
                var args = process.argv.slice(3);
                
                await call(config, ...readArgs(args));            
            }catch(e){
                console.error(e);
                process.exit(1);
            }
            return;
        }
    }
    console.log(`Choose an option in ${Object.keys(module.exports).join(", ")}`)
}

main().finally(() => {console.log("bye!"); process.exit(0);});