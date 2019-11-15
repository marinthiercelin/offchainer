const NaiveExampleRequester = artifacts.require("NaiveExampleRequester");
const NaiveExampleHolder = artifacts.require("NaiveExampleHolder");

module.exports = function(deployer) {
  deployer.deploy(NaiveExampleHolder, 9)
  .then(() => deployer.deploy(NaiveExampleRequester, NaiveExampleHolder.address));
};
