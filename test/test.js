const { instantiateScript }= require('@guildofweavers/genstark');
const assert = require('assert');

const fibStark = instantiateScript(Buffer.from(`
define Fibonacci over prime field (2^32 - 3 * 2^25 + 1) {
    secret input startValue: element[1];
    secret input sec: element[1];
    transition 2 registers {
        for each (startValue, sec) {
            init { yield [startValue, sec]; }
            for steps [1..1] {
                a0 <- $r0 + $r1;
                yield [a0, $r1];
            }
        }
    }
    enforce 2 constraints {
        for all steps {
            enforce transition($r) = $n;
        }
    }
}`));

// TESTING
// ================================================================================================
// set up inputs and assertions
const val = 8n;
const secret = 9n;
const result = val+secret;
const inputs = [[val],[secret]];                              // step 0 and 1 in Fibonacci sequence are 1
const assertions = [
    { step: 0, register: 0, value: val },            // value at the first step is 1
    { step: 0, register: 1, value: secret },            // value at the second step is 1
    { step: 1, register: 0, value: result }   // value at the last step is equal to result
];

// prove that the assertions hold if we execute Fibonacci computation
let proof = fibStark.prove(assertions, inputs);
console.log('-'.repeat(20));

// serialize the proof
let start = Date.now();
const buf = fibStark.serialize(proof);
console.log(`Proof serialized in ${Date.now() - start} ms; size: ${Math.round(buf.byteLength / 1024 * 100) / 100} KB`);
assert(buf.byteLength === fibStark.sizeOf(proof));
console.log('-'.repeat(20));

// deserialize the proof to make sure everything serialized correctly
start = Date.now();
proof = fibStark.parse(buf);
console.log(`Proof parsed in ${Date.now() - start} ms`);
console.log('-'.repeat(20));

// verify the proof
fibStark.verify(assertions, proof);
console.log('-'.repeat(20));