/**
 * Phase C throwaway test bench — proves the browser round-trip step by step:
 * connect → boot FHE → mint → authorize operator → encrypt+disperse → decrypt.
 *
 * Superseded by <DisperseWidget /> for real use; kept because it doubles as a
 * manual integration harness against live Sepolia. Plain viem on purpose —
 * it demonstrates the lib/ helpers carry no wagmi/RainbowKit assumptions.
 */
import { useRef, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  parseEventLogs,
  parseUnits,
  type Chain,
} from "viem";
import { sepolia } from "viem/chains";

import { demoTokenAbi, disperseAbi, erc7984Abi } from "../lib/contracts/abis";
import { DEMO_TOKEN_ADDRESS, disperseAddressFor } from "../lib/contracts/addresses";
import { userDecryptHandles, type DecryptRequest } from "../lib/fhe/decrypt";
import { encryptAmounts } from "../lib/fhe/encrypt";
import { getFhevmInstance, type FhevmInstance } from "../lib/fhe/instance";

// RainbowKit already declares `window.ethereum`; grab a typed alias instead.
const injectedProvider = () => (window as { ethereum?: import("viem").EIP1193Provider }).ethereum;

type LogLine = { kind: "info" | "ok" | "err"; text: string };

export function TestBench() {
  const [account, setAccount] = useState<`0x${string}`>();
  const [instance, setInstance] = useState<FhevmInstance>();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  // Default: disperse to yourself twice — a solo wallet can test the full loop.
  const [rows, setRows] = useState("self, 1.25\nself, 3.5");
  const lastReceipt = useRef<{ txHash: `0x${string}`; recipients: `0x${string}`[]; requested: `0x${string}`[]; transferred: `0x${string}`[] }>(undefined);

  const chain: Chain = sepolia;
  const token = DEMO_TOKEN_ADDRESS;
  const disperse = disperseAddressFor(chain.id);

  const say = (kind: LogLine["kind"], text: string) => setLog((l) => [...l, { kind, text }]);

  function clients() {
    const provider = injectedProvider();
    if (!provider) throw new Error("No injected wallet found");
    const publicClient = createPublicClient({ chain, transport: custom(provider) });
    const walletClient = createWalletClient({ chain, transport: custom(provider), account });
    return { publicClient, walletClient };
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    say("info", `▶ ${label}…`);
    try {
      await fn();
    } catch (e) {
      say("err", `✗ ${label}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const connect = () =>
    run("connect wallet", async () => {
      const provider = injectedProvider();
      if (!provider) throw new Error("No injected wallet found");
      const [addr] = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
      const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
      if (parseInt(chainIdHex, 16) !== chain.id) {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chain.id.toString(16)}` }],
        });
      }
      setAccount(getAddress(addr));
      say("ok", `✓ connected ${addr} on Sepolia`);
    });

  const boot = () =>
    run("boot FHE instance (WASM + relayer keys)", async () => {
      // Works without a wallet: encryption only needs a Sepolia read connection.
      const network = injectedProvider() ?? "https://ethereum-sepolia-rpc.publicnode.com";
      const inst = await getFhevmInstance(network);
      setInstance(inst);
      say("ok", "✓ FHE instance ready");
    });

  const mint = () =>
    run("mint 1,000 demo tokens (open faucet)", async () => {
      if (!token) throw new Error("VITE_CTOKEN_ADDRESS not set — deploy the demo token first");
      const { publicClient, walletClient } = clients();
      const hash = await walletClient.writeContract({
        address: token,
        abi: demoTokenAbi,
        functionName: "mint",
        args: [account!, parseUnits("1000", 6)],
        account: account!,
        chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      say("ok", `✓ minted — tx ${hash}`);
    });

  const authorize = () =>
    run("setOperator (1 hour)", async () => {
      if (!token) throw new Error("VITE_CTOKEN_ADDRESS not set");
      const { publicClient, walletClient } = clients();
      const until = Math.floor(Date.now() / 1000) + 3600;
      const hash = await walletClient.writeContract({
        address: token,
        abi: erc7984Abi,
        functionName: "setOperator",
        args: [disperse, until],
        account: account!,
        chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      say("ok", `✓ disperse contract authorized until +1h — tx ${hash}`);
    });

  const doDisperse = () =>
    run("encrypt + disperse (direct mode)", async () => {
      if (!token) throw new Error("VITE_CTOKEN_ADDRESS not set");
      if (!instance) throw new Error("Boot the FHE instance first");
      const { publicClient, walletClient } = clients();

      const parsed = rows
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => {
          const [addr, amount] = r.split(",").map((s) => s.trim());
          return {
            address: addr === "self" ? account! : getAddress(addr),
            amount: parseUnits(amount, 6),
          };
        });

      say("info", `encrypting ${parsed.length} amounts client-side…`);
      const enc = await encryptAmounts({
        instance,
        disperseAddress: disperse,
        senderAddress: account!,
        amounts: parsed.map((p) => p.amount),
      });
      say("ok", "✓ encrypted — single proof covers all amounts");

      const gasFee = await publicClient.readContract({
        address: disperse,
        abi: disperseAbi,
        functionName: "getGasFee",
        args: [account!],
      });
      say("info", `gas fee: ${formatUnits(gasFee, 18)} ETH × ${parsed.length} recipients`);

      const toHex = (u8: Uint8Array) =>
        `0x${Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: disperse,
        abi: disperseAbi,
        functionName: "disperseConfidentialTokenDirect",
        args: [token, parsed.map((p) => p.address), enc.amountHandles.map(toHex), toHex(enc.inputProof)],
        value: gasFee * BigInt(parsed.length),
        account: account!,
        chain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const [event] = parseEventLogs({ abi: disperseAbi, logs: receipt.logs, eventName: "DirectDistribution" });
      if (!event) throw new Error("DirectDistribution event not found in receipt");
      lastReceipt.current = {
        txHash: hash,
        recipients: [...event.args.recipients],
        requested: [...event.args.requested],
        transferred: [...event.args.transferred],
      };
      say("ok", `✓ dispersed in one tx — ${hash}`);
      say("info", `amounts on-chain are opaque handles, e.g. ${event.args.transferred[0].slice(0, 26)}…`);
    });

  const decrypt = () =>
    run("user-decrypt my own amounts (EIP-712)", async () => {
      if (!instance) throw new Error("Boot the FHE instance first");
      if (!token) throw new Error("VITE_CTOKEN_ADDRESS not set");
      const last = lastReceipt.current;
      if (!last) throw new Error("Run a disperse first");
      const { walletClient } = clients();

      // I can decrypt entries where I'm the recipient (transferred → token
      // scope). As the sender I can also audit what I requested (disperse scope).
      const mine: DecryptRequest[] = [];
      last.recipients.forEach((r, i) => {
        if (getAddress(r) === account) mine.push({ handle: last.transferred[i], contractAddress: token });
      });
      last.requested.forEach((h) => mine.push({ handle: h, contractAddress: disperse }));

      const results = await userDecryptHandles({
        instance,
        requests: mine,
        userAddress: account!,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signTypedData: (args) => walletClient.signTypedData({ ...args, account: account! } as any),
      });

      last.recipients.forEach((r, i) => {
        if (getAddress(r) === account) {
          const v = results[last.transferred[i]];
          say("ok", `✓ received (as recipient ${i}): ${formatUnits(v, 6)} cUSDd`);
        }
      });
      last.requested.forEach((h, i) => {
        say("info", `  requested[${i}] decrypts to ${formatUnits(results[h], 6)} (sender audit view)`);
      });
    });

  const button =
    "rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-orange-600";

  return (
    <div className="mx-auto max-w-3xl p-6 font-mono text-sm">
      <h1 className="mb-1 text-lg font-bold">DisperseKit test bench (Phase C throwaway)</h1>
      <p className="mb-4 text-neutral-500">
        token: {token ?? "⚠ set VITE_CTOKEN_ADDRESS"} · disperse: {disperse}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button className={button} disabled={busy} onClick={connect}>1. connect</button>
        <button className={button} disabled={busy} onClick={boot}>2. boot FHE</button>
        <button className={button} disabled={busy || !account || !token} onClick={mint}>3. mint</button>
        <button className={button} disabled={busy || !account || !token} onClick={authorize}>4. authorize</button>
        <button className={button} disabled={busy || !instance || !token} onClick={doDisperse}>5. disperse</button>
        <button className={button} disabled={busy || !instance} onClick={decrypt}>6. decrypt mine</button>
      </div>

      <label className="mb-1 block text-neutral-600">recipients (`address, amount` per line; `self` = you)</label>
      <textarea
        className="mb-4 w-full rounded-lg border border-neutral-300 p-2"
        rows={3}
        value={rows}
        onChange={(e) => setRows(e.target.value)}
      />

      <div className="rounded-lg bg-neutral-900 p-3 text-neutral-100">
        {log.length === 0 && <div className="text-neutral-500">log output appears here…</div>}
        {log.map((l, i) => (
          <div key={i} className={l.kind === "err" ? "text-red-400" : l.kind === "ok" ? "text-green-400" : ""}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
