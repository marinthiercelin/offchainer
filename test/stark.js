
const { instantiateScript } = require('@guildofweavers/genstark');

// define a STARK for this computation
const fooStark = instantiateScript('./computation.txt');

const input = 7n;
const secret = 9n;
const output = input + secret;
console.log(input, secret, output)
// create a proof that if we start computation at 1, we end up at 127 after 64 steps
const assertions = [
    { register: 0, step: 0,  value: input },  // value at first step is 1
    { register: 1, step: 0,  value: secret },  // value at first step is 1
    { register: 0, step: 63 , value: output }   // value at last step is 127
];

const proof = fooStark.prove(assertions, [[input], [secret]]);

// verify that if we start at 1 and run the computation for 64 steps, we get 127
const result = fooStark.verify(assertions, proof);
console.log(result); // true