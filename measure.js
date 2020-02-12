const {functionality:init, supported_commitments, supported_hash_functions} = require('offchainer/src/tools/init');
const fs = require('fs');
const exec = require('offchainer/src/offchain/helpers/exec_command');
const sqlite3 = require('sqlite3').verbose();
const { PerformanceObserver, performance } = require('perf_hooks');
const rmfr = require('rmfr');


let constraints_regexp = /Number of constraints: (\d+)/
let mem_regexp = /Maximum resident set size \(([a-zA-Z]+)\): (\d+)/

async function compilation(hash_function_key, commitment_key, nb_private_inputs, file){
    console.log('compilation', file);
    let zokrates_cmd = `zokrates compile --light -i ${file} -o ${file}.compiled --abi_spec ${file}.abi.json`
    let time_cmd = `numactl --physcpubind=+1 /usr/bin/time -v  ${zokrates_cmd}`;
    const start_str = 'Start KeyGen';
    const end_str = 'End KeyGen';
    performance.mark(start_str);
    await exec(time_cmd).then(
        trace =>{
            performance.mark(end_str);
            let constraints_match = trace.stdout.match(constraints_regexp);
            let nb_constraints = constraints_match.length < 2 ? -1 : Number(constraints_match[1]);
            insertDB('nb_constraints', hash_function_key, commitment_key, nb_private_inputs, nb_constraints, 'constraint');
            let mem_match = trace.stderr.match(mem_regexp);
            let mem_unit = mem_match.length < 3 ? undefined : mem_match[1];
            let mem_used = mem_match.length < 3 ? -1 : Number(mem_match[2]);
            insertDB('compilation_memory', hash_function_key, commitment_key, nb_private_inputs, mem_used, mem_unit);
        }
    )
    var stats = fs.statSync(`${file}.compiled`);
    var fileSizeInBytes = stats["size"];
    insertDB('compiled_size', hash_function_key, commitment_key, nb_private_inputs, fileSizeInBytes, 'bytes');
    performance.measure(`compilation_time, ${hash_function_key}, ${commitment_key}, ${nb_private_inputs}`, start_str, end_str);
}

async function keygen(hash_function_key, commitment_key, nb_private_inputs, file){
    console.log('key generation', file);
    let zokrates_cmd = `zokrates setup --light -i ${file}.compiled -v ${file}.ver.key -p ${file}.prove.key`
    let time_cmd = `numactl --physcpubind=+1 /usr/bin/time -v  ${zokrates_cmd}`;
    const start_str = 'Start KeyGen';
    const end_str = 'End KeyGen';
    performance.mark(start_str);
    await exec(time_cmd).then(
        trace =>{
            performance.mark(end_str);
            let mem_match = trace.stderr.match(mem_regexp);
            let mem_unit = mem_match.length < 3 ? undefined : mem_match[1];
            let mem_used = mem_match.length < 3 ? -1 : Number(mem_match[2]);
            insertDB('keygen_memory', hash_function_key, commitment_key, nb_private_inputs, mem_used, mem_unit);
        }
    )
    var stats = fs.statSync(`${file}.ver.key`);
    var fileSizeInBytes = stats["size"];
    insertDB('ver_key_size', hash_function_key, commitment_key, nb_private_inputs, fileSizeInBytes, 'bytes');
    stats = fs.statSync(`${file}.prove.key`);
    fileSizeInBytes = stats["size"];
    insertDB('prove_key_size', hash_function_key, commitment_key, nb_private_inputs, fileSizeInBytes, 'bytes');
    performance.measure(`keygen_time, ${hash_function_key}, ${commitment_key}, ${nb_private_inputs}`, start_str, end_str);
}

async function witness(commitment_scheme, hash_function_key, commitment_key, nb_private_inputs, file){
    console.log('witness', file);
    let secret_inputs = Array(nb_private_inputs).fill(2);
    let commitment_pair = await commitment_scheme.commit(secret_inputs);
    let zokrates_cmd = 
            `zokrates compute-witness --light `+
                `--abi_spec ${file}.abi.json `+
                `-i ${file}.compiled `+
                `-o ${file}.witness `+
                `-a ${secret_inputs.join(" ")} 0 `+
                commitment_scheme.getZokratesArgs(commitment_pair);
    let time_cmd = `numactl --physcpubind=+1 /usr/bin/time -v  ${zokrates_cmd}`;
    const start_str = 'Start witness';
    const end_str = 'End witness';
    performance.mark(start_str);
    await exec(time_cmd).then(
        trace =>{
            performance.mark(end_str);
            let mem_match = trace.stderr.match(mem_regexp);
            let mem_unit = mem_match.length < 3 ? undefined : mem_match[1];
            let mem_used = mem_match.length < 3 ? -1 : Number(mem_match[2]);
            insertDB('witness_memory', hash_function_key, commitment_key, nb_private_inputs, mem_used, mem_unit);
        }
    )
    var stats = fs.statSync(`${file}.witness`);
    var fileSizeInBytes = stats["size"];
    insertDB('witness_size', hash_function_key, commitment_key, nb_private_inputs, fileSizeInBytes, 'bytes');
    performance.measure(`witness_time, ${hash_function_key}, ${commitment_key}, ${nb_private_inputs}`, start_str, end_str);
}

async function proof(hash_function_key, commitment_key, nb_private_inputs, file){
    console.log('proof', file);
    let zokrates_cmd = 
            `zokrates generate-proof `+
                `-w ${file}.witness `+
                `-i ${file}.compiled `+
                `-j ${file}.proof `+
                `-p ${file}.prove.key;`;
    let time_cmd = `numactl --physcpubind=+1 /usr/bin/time -v  ${zokrates_cmd}`;
    const start_str = 'Start proof';
    const end_str = 'End proof';
    performance.mark(start_str);
    await exec(time_cmd).then(
        trace =>{
            performance.mark(end_str);
            let mem_match = trace.stderr.match(mem_regexp);
            let mem_unit = mem_match.length < 3 ? undefined : mem_match[1];
            let mem_used = mem_match.length < 3 ? -1 : Number(mem_match[2]);
            insertDB('proof_memory', hash_function_key, commitment_key, nb_private_inputs, mem_used, mem_unit);
        }
    )
    var stats = fs.statSync(`${file}.proof`);
    var fileSizeInBytes = stats["size"];
    insertDB('proof_size', hash_function_key, commitment_key, nb_private_inputs, fileSizeInBytes, 'bytes');
    performance.measure(`proof_time, ${hash_function_key}, ${commitment_key}, ${nb_private_inputs}`, start_str, end_str);
}

async function main(nb_private_inputs_list, commitments_keys, hash_functions_keys){
    if (!fs.existsSync('./build')){
        fs.mkdirSync('./build', {recursive:true});
    }
    var result = []
    for(var nb_private_inputs of nb_private_inputs_list){
        for(var hash_function_key of hash_functions_keys){
            const hash_function = new supported_hash_functions[hash_function_key]();
            for(var commitment_key of commitments_keys){
                    const proj_name = `${hash_function_key}_${commitment_key}_${nb_private_inputs}`;
                    const original_file = `./src/${proj_name}_offchain.zok`;
                    const modified_file = `./build/${proj_name}_modified.zok`;
                    const commitment_scheme = new supported_commitments[commitment_key](hash_function);
                    await init(undefined, proj_name, hash_function_key, commitment_key, nb_private_inputs, 1, '--force');
                    commitment_scheme.addCommitmentToZokrates(original_file, modified_file);
                    await compilation(hash_function_key, commitment_key, nb_private_inputs, modified_file);
                    await witness(commitment_scheme, hash_function_key, commitment_key, nb_private_inputs, modified_file);
                    await keygen(hash_function_key, commitment_key, nb_private_inputs, modified_file);
                    await proof(hash_function_key, commitment_key, nb_private_inputs, modified_file);
            }
        }
        await rmfr('./build/');
    }
    return result;
}

let table_name = 'Measures'
let db_name = './data/measures.db';

let create_statement = `
    CREATE TABLE IF NOT EXISTS ${table_name}(
        experiment_id INTEGER,
        name TEXT,
        hash TEXT,
        commitment TEXT,
        input_size INTEGER,
        measure FLOAT,
        unit TEXT
    );
`;

let insert_statement = `
        INSERT INTO ${table_name}
        VALUES(?,?,?,?,?,?,?);
`

let db = new sqlite3.Database(db_name);
db.run(create_statement);

exp_id_statement=`SELECT MAX(experiment_id)+1 AS new_exp_id FROM ${table_name};`
let exp_id = 0;
db.get(exp_id_statement, (err, row) =>{if(!err){exp_id=Number(row['new_exp_id'])}});

function insertDB(...args){
    // console.log(args);
    db.run(insert_statement, [exp_id, ...args]);
}

const obs = new PerformanceObserver((items) => {
    let measures = items.getEntries();
    measures.forEach(x=>{
        let splitted = x.name.split(/\s*,\s*/);
        splitted.push(x.duration);
        splitted.push('ms');
        insertDB(...splitted);
    })
    performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });

let max = 100;
let list = Array.from(Array(max).keys()).map(x => x + 1)
main(list , ['simple', 'chain', 'merkle'], ['pedersen','sha256']).finally(() => db.close()).catch(console.log);