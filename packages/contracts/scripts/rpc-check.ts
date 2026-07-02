/**
 * Connectivity check: proves your .env / Hardhat vars reach Sepolia.
 *
 *   npx hardhat run scripts/rpc-check.ts --network sepolia
 */
import { ethers, network } from "hardhat";

async function main() {
  const block = await ethers.provider.getBlockNumber();
  const url = (network.config as { url?: string }).url ?? "";
  // Never print the API key embedded in the RPC URL.
  console.log(`network=${network.name} block=${block} via=${url.replace(/\/v2\/.*$/, "/v2/***")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
