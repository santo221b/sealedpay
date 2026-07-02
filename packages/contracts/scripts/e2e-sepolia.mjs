/**
 * Live Sepolia end-to-end proof — the §7 Phase B "Done when":
 * a sender authorizes + disperses through the OFFICIAL TokenOps singleton,
 * and amounts decrypt only for the parties with ACL.
 *
 *   node scripts/e2e-sepolia.mjs        (from packages/contracts)
 *
 * Steps: faucet-mint → setOperator (1h) → encrypt 2 amounts (one proof) →
 * disperseConfidentialTokenDirect{value: fee×2} → parse DirectDistribution →
 * userDecrypt as SENDER (requested + transferred) and as RECIPIENT (their own
 * transferred amount). Recipients are throwaway dev accounts (publicly-known
 * keys) holding only demo faucet tokens.
 */
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import * as dotenv from "dotenv";
import { Contract, formatUnits, Interface, JsonRpcProvider, parseUnits, Wallet } from "ethers";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "../../../.env"), quiet: true });
dotenv.config({ path: path.join(here, "../.env"), quiet: true });

const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY missing from .env");

const TOKEN = process.env.VITE_CTOKEN_ADDRESS ?? "0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1";
const DISPERSE = "0x710dD9885Cc9986EfD234E7719483147a6d8DBb4"; // official TokenOps singleton

// Throwaway recipients: hardhat dev accounts #1 and #2 (keys are public — they
// receive only worthless demo-faucet tokens, and we use #1's key to prove
// recipient-side decryption).
const RECIPIENT_1 = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const RECIPIENT_2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const AMOUNTS = [parseUnits("12.5", 6), parseUnits("7.25", 6)];

const provider = new JsonRpcProvider(RPC);
const sender = new Wallet(PRIVATE_KEY, provider);

const token = new Contract(
  TOKEN,
  [
    "function mint(address to, uint64 amount)",
    "function setOperator(address operator, uint48 until)",
    "function isOperator(address holder, address spender) view returns (bool)",
  ],
  sender,
);
const disperse = new Contract(
  DISPERSE,
  [
    "function disperseConfidentialTokenDirect(address token, address[] recipients, bytes32[] encryptedAmounts, bytes inputProof) payable",
    "function getGasFee(address user) view returns (uint96)",
    "function paused() view returns (bool)",
    "event DirectDistribution(address indexed sender, address[] recipients, bytes32[] requested, bytes32[] transferred)",
  ],
  sender,
);

const hex = (u8) => "0x" + Buffer.from(u8).toString("hex");

/** One-signature userDecrypt for a set of (handle, contract) pairs. */
async function decryptAs(wallet, instance, pairs) {
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const contracts = [...new Set(pairs.map((p) => p.contractAddress))];
  const eip712 = instance.createEIP712(keypair.publicKey, contracts, startTimestamp, durationDays);
  const signature = await wallet.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );
  return instance.userDecrypt(
    pairs,
    keypair.privateKey,
    keypair.publicKey,
    signature,
    contracts,
    wallet.address,
    startTimestamp,
    durationDays,
  );
}

console.log(`sender    ${sender.address}`);
console.log(`token     ${TOKEN}`);
console.log(`disperse  ${DISPERSE} (official TokenOps singleton)`);

if (await disperse.paused()) throw new Error("singleton is paused");

console.log("\n[1/5] faucet mint 1,000 cUSDd…");
await (await token.mint(sender.address, parseUnits("1000", 6))).wait();

console.log("[2/5] setOperator(disperse, +1h)…");
const until = Math.floor(Date.now() / 1000) + 3600;
await (await token.setOperator(DISPERSE, until)).wait();

console.log("[3/5] encrypting 2 amounts client-side (one proof)…");
const instance = await createInstance({ ...SepoliaConfig, network: RPC });
const input = instance.createEncryptedInput(DISPERSE, sender.address);
for (const amount of AMOUNTS) input.add64(amount);
const { handles, inputProof } = await input.encrypt();

console.log("[4/5] disperseConfidentialTokenDirect…");
const fee = await disperse.getGasFee(sender.address);
const tx = await disperse.disperseConfidentialTokenDirect(
  TOKEN,
  [RECIPIENT_1.address, RECIPIENT_2],
  handles.map(hex),
  hex(inputProof),
  { value: fee * 2n },
);
const receipt = await tx.wait();
console.log(`      tx ${receipt.hash}`);

const iface = new Interface(disperse.interface.fragments);
let event;
for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog(log);
    if (parsed?.name === "DirectDistribution") event = parsed;
  } catch { /* other contracts' logs */ }
}
if (!event) throw new Error("DirectDistribution not found");
const [, , requested, transferred] = event.args;

console.log("[5/5] decrypting…");
console.log(`      on-chain, amount[0] is just: ${transferred[0]}`);

// As the SENDER: audit both what was requested and what actually moved.
const senderView = await decryptAs(sender, instance, [
  { handle: requested[0], contractAddress: DISPERSE },
  { handle: requested[1], contractAddress: DISPERSE },
  { handle: transferred[0], contractAddress: TOKEN },
  { handle: transferred[1], contractAddress: TOKEN },
]);
for (let i = 0; i < 2; i++) {
  const req = senderView[requested[i].toLowerCase()] ?? senderView[requested[i]];
  const got = senderView[transferred[i].toLowerCase()] ?? senderView[transferred[i]];
  const ok = req === AMOUNTS[i] && got === AMOUNTS[i];
  console.log(`      sender view [${i}]: requested=${formatUnits(req, 6)} transferred=${formatUnits(got, 6)} ${ok ? "✓" : "✗ MISMATCH"}`);
  if (!ok) process.exit(1);
}

// As RECIPIENT 1: decrypt their own amount — the thing only they can do.
const r1 = RECIPIENT_1.connect(provider);
const recipientView = await decryptAs(r1, instance, [{ handle: transferred[0], contractAddress: TOKEN }]);
const mine = recipientView[transferred[0].toLowerCase()] ?? recipientView[transferred[0]];
console.log(`      recipient view: "you received ${formatUnits(mine, 6)} cUSDd" ${mine === AMOUNTS[0] ? "✓" : "✗"}`);
if (mine !== AMOUNTS[0]) process.exit(1);

console.log(`\n✅ live Sepolia E2E complete — https://sepolia.etherscan.io/tx/${receipt.hash}`);
