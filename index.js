const init = require('./src/tools/init');
const generate = require('./src/tools/generate');
const deploy = require('./src/tools/deploy');
const listen = require('./src/tools/listen');


module.exports.init = init;
module.exports.generate = generate;
module.exports.deploy = deploy;
module.exports.listen = listen;
module.exports.call = require('./src/tools/call');

async function main(){
    if(process.argv.length > 2){
        const cmd = process.argv[2];
        const call = module.exports[cmd];
        if(call){
            try{
                const args = process.argv.slice(3);
                await call(...args);            
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