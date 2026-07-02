/**
 * Connectivity + account check: proves your .env / Hardhat vars reach Sepolia
 * and shows which deployer account is loaded and whether it's funded.
 *
 *   npx hardhat run scripts/rpc-check.ts --network sepolia
 */
import { ethers, network, getNamedAccounts } from "hardhat";

async function main() {
  const block = await ethers.provider.getBlockNumber();
  const url = (network.config as { url?: string }).url ?? "";
  // Never print the API key embedded in the RPC URL.
  console.log(`network=${network.name} block=${block} via=${url.replace(/\/v2\/.*$/, "/v2/***")}`);

  const { deployer } = await getNamedAccounts();
  const balance = await ethers.provider.getBalance(deployer);
  console.log(`deployer=${deployer} balance=${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) {
    console.log("⚠ deployer has no ETH — fund it before `npm run deploy:sepolia`");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
