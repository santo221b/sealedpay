import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * The disperse contract.
 *
 * On Sepolia (and mainnet) we do NOT deploy: TokenOps' audited DisperseConfidential
 * singleton is already live and verified, so the widget talks to the official
 * instance directly. We just record its address in `deployments/` so every script
 * and the frontend read addresses the same way regardless of network.
 *
 * On local/mock networks we deploy our own instance from the vendored verified
 * source (contracts/tokenops/), configured to mirror the live Sepolia deployment
 * (gas fee 0.001 ETH per recipient, 5% token fee, batch limits 30/20/5) so tests
 * exercise the exact behavior the widget will meet on Sepolia.
 */
const OFFICIAL_SINGLETON: Record<number, string> = {
  11155111: "0x710dD9885Cc9986EfD234E7719483147a6d8DBb4", // Sepolia
  1: "0x4fC0d28cBe4B82D512Ad0B42F6787480Cc98cC70", // Ethereum mainnet
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, save, getArtifact } = hre.deployments;
  const chainId = Number(await hre.getChainId());

  const official = OFFICIAL_SINGLETON[chainId];
  if (official) {
    const artifact = await getArtifact("DisperseConfidential");
    await save("DisperseConfidential", { address: official, abi: artifact.abi });
    console.log(`DisperseConfidential: using official TokenOps singleton at ${official} (chain ${chainId})`);
    return;
  }

  const disperse = await deploy("DisperseConfidential", {
    from: deployer,
    args: [
      deployer, // admin
      deployer, // fee collector
      {
        gasFeeEnabled: true,
        tokenFeeEnabled: true,
        defaultGasFee: 1_000_000_000_000_000n, // 0.001 ETH per recipient — mirrors live Sepolia
        defaultTokenFee: 500, // 5% bps — mirrors live Sepolia
      },
      30, // maxBatchSizeHolding — live Sepolia value
      20, // maxBatchSizeDirect — live Sepolia value
      5, // maxBatchSizeTokenFee — live Sepolia value
    ],
    log: true,
  });

  console.log(`DisperseConfidential (local instance): ${disperse.address}`);
};
export default func;
func.id = "deploy_disperse_confidential";
func.tags = ["DisperseConfidential"];
