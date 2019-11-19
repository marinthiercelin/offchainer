var LocalSecretHolder = require('./holder/LocalSecretHolder');
var UnverifiedComputationSuite =  require('./verifiable_computation/UnverifiedComputationSuite');

module.exports.LocalSecretHolder = LocalSecretHolder;
module.exports.verifiable_computation = {
    UnverifiedComputationSuite:UnverifiedComputationSuite,
};