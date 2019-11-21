var LocalOffChainHolder = require('./holder/LocalOffChainHolder');
var OffChainHolderDeployer = require('./holder/LocalOffChainHolder');
var RequesterDeployer = require('./requester/RequesterDeployer');
var RequesterUI = require('./requester/RequesterUI');
var UnverifiedComputationSuite =  require('./verifiable_computation/UnverifiedComputationSuite');
var ZokratesSuite =  require('./verifiable_computation/ZokratesSuite');
var HashBasedCommitment = require('./commitment/HashBasedCommitment');

module.exports.holder = {};
module.exports.holder.LocalOffChainHolder = LocalOffChainHolder;
module.exports.holder.OffChainHolderDeployer = OffChainHolderDeployer;

module.exports.requester = {};
module.exports.requester.RequesterDeployer = RequesterDeployer;
module.exports.requester.RequesterUI = RequesterUI;

module.exports.verifiable_computation = {};
module.exports.verifiable_computation.UnverifiedComputationSuite = UnverifiedComputationSuite;
module.exports.verifiable_computation.ZokratesSuite = ZokratesSuite;

module.exports.commitment = {};
module.exports.commitment.HashBasedCommitment = HashBasedCommitment;
