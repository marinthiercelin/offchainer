const LocalOffChainHolder = require('./src/offchain/holder/LocalOffChainHolder');
const OffChainHolderDeployer = require('./src/offchain/holder/LocalOffChainHolder');
const RequesterUI = require('./src/offchain/requester/RequesterUI');
const UnverifiedComputationSuite =  require('./src/offchain/verifiable_computation/unverified/UnverifiedComputationSuite');
const ZokratesSuite =  require('./src/offchain/verifiable_computation/zokrates/suite_zokrates');
const ZokratesSetup =  require('./src/offchain/verifiable_computation/zokrates/setup_zokrates');
const HashBasedCommitment = require('./src/offchain/commitment/HashBasedCommitment');
const ContractDeployer = require('./src/offchain/helpers/ContractDeployer');
const SolidityCompiler = require('./src/offchain/helpers/solidity_compiler');
const path = require("path");

module.exports.holder = {};
module.exports.holder.LocalOffChainHolder = LocalOffChainHolder;
module.exports.holder.OffChainHolderDeployer = OffChainHolderDeployer;

module.exports.requester = {};
module.exports.requester.RequesterUI = RequesterUI;

module.exports.verifiable_computation = {};
module.exports.verifiable_computation.unverified = {};
module.exports.verifiable_computation.unverified.Suite = UnverifiedComputationSuite;
module.exports.verifiable_computation.unverified.HolderContractPath = path.resolve(__dirname+"/src/onchain/verifiable_computation/unverified_holder.sol");
module.exports.verifiable_computation.unverified.HolderContractName = "UnverifiedOffchainHolder";

module.exports.verifiable_computation.zokrates = {};
module.exports.verifiable_computation.zokrates.Setup = ZokratesSetup;
module.exports.verifiable_computation.zokrates.Suite = ZokratesSuite;
module.exports.verifiable_computation.zokrates.HolderContractPath = path.resolve(__dirname+"/src/onchain/verifiable_computation/zokrates_holder.sol");
module.exports.verifiable_computation.zokrates.HolderContractName = "ZokratesOffChainHolder";

module.exports.commitment = {};
module.exports.commitment.HashBasedCommitment = HashBasedCommitment;

module.exports.helpers = {};
module.exports.helpers.ContractDeployer = ContractDeployer;
module.exports.helpers.SolidityCompiler = SolidityCompiler;


