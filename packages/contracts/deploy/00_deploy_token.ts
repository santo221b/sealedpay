import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deploys the demo ERC-7984 confidential token (open faucet) on every network.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const token = await deploy("ConfidentialTokenDemo", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialTokenDemo (cUSDd): ${token.address}`);
};
export default func;
func.id = "deploy_confidential_token_demo";
func.tags = ["ConfidentialTokenDemo"];
