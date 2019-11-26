var LocalOffChainHolder = require('./holder/LocalOffChainHolder');
var OffChainHolderDeployer = require('./holder/LocalOffChainHolder');
var RequesterUI = require('./requester/RequesterUI');
var UnverifiedComputationSuite =  require('./verifiable_computation/UnverifiedComputationSuite');
var {ZokratesSuite, ZokratesSetup}=  require('./verifiable_computation/ZokratesSuite');
var HashBasedCommitment = require('./commitment/HashBasedCommitment');
var ContractDeployer = require('./web3/ContractDeployer');

module.exports.holder = {};
module.exports.holder.LocalOffChainHolder = LocalOffChainHolder;
module.exports.holder.OffChainHolderDeployer = OffChainHolderDeployer;

module.exports.requester = {};
module.exports.requester.RequesterUI = RequesterUI;

module.exports.verifiable_computation = {};
module.exports.verifiable_computation.unverified = {};
module.exports.verifiable_computation.unverified.Suite = UnverifiedComputationSuite;
module.exports.verifiable_computation.zokrates = {};
module.exports.verifiable_computation.zokrates.Setup = ZokratesSetup;
module.exports.verifiable_computation.zokrates.Suite = ZokratesSuite;

module.exports.commitment = {};
module.exports.commitment.HashBasedCommitment = HashBasedCommitment;

module.exports.ContractDeployer = ContractDeployer;
