/**
 * One-off cUSDd faucet mint. Usage:
 *   node scripts/mint.mjs [amount=100] [toAddress=signer]
 * Mints `amount` cUSDd (6 decimals) to `toAddress` via the open faucet.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { Contract, formatUnits, JsonRpcProvider, parseUnits, Wallet } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "../../../.env"), quiet: true });
dotenv.config({ path: path.join(here, "../.env"), quiet: true });

const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY missing from .env");
const TOKEN = process.env.VITE_CTOKEN_ADDRESS ?? "0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1";

const AMOUNT = process.argv[2] ?? "100"; // cUSDd, human units
const provider = new JsonRpcProvider(RPC);
const signer = new Wallet(PRIVATE_KEY, provider);
const TO = process.argv[3] ?? signer.address;

const token = new Contract(TOKEN, ["function mint(address to, uint64 amount)"], signer);

const gas = await provider.getBalance(signer.address);
console.log("Signer      :", signer.address);
console.log("Sepolia ETH :", formatUnits(gas, 18));
console.log("Token       :", TOKEN);
console.log(`Minting     : ${AMOUNT} cUSDd -> ${TO}`);
if (gas === 0n) throw new Error("Signer has 0 Sepolia ETH — fund it before minting (gas).");

const tx = await token.mint(TO, parseUnits(AMOUNT, 6));
console.log("tx hash     :", tx.hash);
const rc = await tx.wait();
console.log("confirmed   : block", rc.blockNumber, "| status", rc.status);
console.log("Etherscan   : https://sepolia.etherscan.io/tx/" + tx.hash);
