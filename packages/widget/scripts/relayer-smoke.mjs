/**
 * Relayer connectivity smoke test (no wallet, no funds, no browser).
 *
 *   node packages/widget/scripts/relayer-smoke.mjs
 *
 * Proves from this machine that: (1) the SDK boots, (2) protocol config loads
 * from Sepolia over a public RPC, (3) a real euint64 input encrypts and the
 * Zama relayer accepts it, returning handles + proof — the exact bundle the
 * widget submits to the official TokenOps disperse singleton.
 */
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const DISPERSE_SINGLETON = "0x710dD9885Cc9986EfD234E7719483147a6d8DBb4";
// Any checksummed address works for a smoke test — the proof binds to it, we never send a tx.
const FAKE_SENDER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

console.log(`RPC: ${RPC}`);
console.time("createInstance (on-chain config + relayer keys)");
const instance = await createInstance({ ...SepoliaConfig, network: RPC });
console.timeEnd("createInstance (on-chain config + relayer keys)");

const input = instance.createEncryptedInput(DISPERSE_SINGLETON, FAKE_SENDER);
input.add64(100_000_000n).add64(250_500_000n).add64(5n); // 3 recipient amounts

console.time("encrypt (ZK proof + relayer registration)");
const { handles, inputProof } = await input.encrypt();
console.timeEnd("encrypt (ZK proof + relayer registration)");

const hex = (u8) => "0x" + Buffer.from(u8).toString("hex");
console.log(`handles (${handles.length}):`);
for (const h of handles) console.log("  " + hex(h));
console.log(`inputProof: ${inputProof.length} bytes`);
console.log("\n✅ relayer round-trip OK — encryption pipeline works end to end");
