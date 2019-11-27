const { exec } = require('child_process');

module.exports = function (cmd){
    return new Promise((resolve, reject)=>{
        exec(cmd, (err, stdout, stderr) => {
            if(err){
                reject({error:err, stdout:stdout, stderr:stderr});
            }else{
                resolve({stdout:stdout, stderr:stderr});
            }
        })
    });
}