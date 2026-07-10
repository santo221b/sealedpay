/**
 * useMyPay — the RECIPIENT side of a confidential payout.
 *
 * A recipient connects their OWN wallet and, with a single EIP-712 signature,
 * decrypts only what they received — no employer, no server involved. This
 * mirrors the engine's proven ReceiptWidget flow: scan the token's
 * ConfidentialTransfer events indexed to `me`, then userDecrypt the amount
 * handles (token ACL scope). Nobody else can perform this read.
 */
import { DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID, erc7984Abi, getFhevmInstance, userDecryptHandles, useTokenMeta } from "@dispersekit/widget";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, http, parseAbiItem, zeroHash } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";

import { humanizeError } from "./humanizeError";
import { withTimeout } from "./withTimeout";

const TOKEN = DEMO_TOKEN_ADDRESS;
const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";
const TRANSFER_EVENT = parseAbiItem(
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
);
// The wallet's default RPC (thirdweb) caps eth_getLogs ranges and other public
// RPCs reject different params, so the scan tries several until one answers.
const SCAN_RPCS = [
  "https://sepolia.drpc.org",
  "https://sepolia.gateway.tenderly.co",
  "https://1rpc.io/sepolia",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
];
// Recent-first block windows — a freshly received payment is only minutes old,
// so a modest range finds it while staying inside every RPC's limits.
const SCAN_SPANS = [9_000n, 2_000n, 500n];

// The reveal round-trips the Zama relayer over fetch (no built-in timeout) —
// bound it so a stalled relayer surfaces as a calm retryable error instead of
// an infinite "Decrypting" spinner. A late resolution is harmless (read-only).
const REVEAL_TIMEOUT_MS = 60_000;

export interface MyPayment {
  txHash: `0x${string}`;
  from: `0x${string}`;
  handle: `0x${string}`;
  url: string;
  /** Block time in ms (from the log's block); undefined if the block read failed. */
  timestamp?: number;
  /** Set only after the recipient decrypts with their own signature. */
  amount?: bigint;
}

export type MyPayPhase = "idle" | "scanning" | "revealing";

export function useMyPay() {
  const { address: me, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { symbol, decimals } = useTokenMeta(TOKEN);

  const [payments, setPayments] = useState<MyPayment[]>();
  const [balanceHandle, setBalanceHandle] = useState<`0x${string}`>();
  // The decrypted balance stays KEYED to the handle it was decrypted from. If a
  // rescan finds a new balance handle (a payment arrived), the displayed value
  // is stale by definition and derives back to undefined — the UI can never
  // show a revealed balance that contradicts the chain.
  const [decryptedBal, setDecryptedBal] = useState<{ handle: `0x${string}` | undefined; value: bigint }>();
  const [phase, setPhase] = useState<MyPayPhase>("idle");
  const [error, setError] = useState<string>();

  const onSepolia = chain?.id === SEPOLIA_CHAIN_ID;
  const balance = decryptedBal !== undefined && decryptedBal.handle === balanceHandle ? decryptedBal.value : undefined;
  // Revealed is DERIVED from the data, never a stored flag: everything the
  // scan found has a plaintext, and the balance on display matches the chain.
  const revealed = payments !== undefined && payments.every((p) => p.amount !== undefined) && balance !== undefined;

  // A wallet-account switch must never keep showing the previous account's
  // pay — but a TRANSIENT drop must not destroy it either. The active account
  // flips to undefined for a beat on tab refocus (provider re-announce, then
  // the active-wallet sync re-pins the embedded wallet), and decrypted
  // amounts cost a fresh signature to recover. State is keyed to the address
  // that produced it: wipe only when a DIFFERENT address takes over.
  const stateOwner = useRef<`0x${string}` | undefined>(undefined);
  useEffect(() => {
    if (me === undefined || stateOwner.current === me) return;
    const hadOwner = stateOwner.current !== undefined;
    stateOwner.current = me;
    if (!hadOwner) return;
    setPayments(undefined);
    setBalanceHandle(undefined);
    setDecryptedBal(undefined);
    setPhase("idle");
    setError(undefined);
  }, [me]);

  // Backfill missing block times. The scan's per-block read is best-effort —
  // when it fails a row would render dateless, and the UI must never show a
  // tx hash where a date belongs. Public Sepolia RPCs rate-limit HARD (we
  // measured 4 of 5 returning 403 in one sitting), so each lookup RACES all
  // of them in parallel — first success wins, no retry stalls — and a fully
  // blocked moment re-tries a few seconds later, bounded per session.
  const backfillTries = useRef(0);
  useEffect(() => {
    const missing = (payments ?? []).filter((p) => p.timestamp === undefined);
    if (missing.length === 0) {
      backfillTries.current = 0;
      return;
    }
    if (backfillTries.current >= 5) return;
    let cancelled = false;
    let timer: number | undefined;
    const clients = SCAN_RPCS.map((rpc) =>
      createPublicClient({ chain: sepolia, transport: http(rpc, { retryCount: 0, timeout: 8_000 }) }),
    );
    void (async () => {
      const found = new Map<string, number>();
      await Promise.all(
        missing.map(async (p) => {
          try {
            const ts = await Promise.any(
              clients.map(async (client) => {
                const tx = await client.getTransaction({ hash: p.txHash });
                if (tx.blockNumber == null) throw new Error("pending");
                const block = await client.getBlock({ blockNumber: tx.blockNumber });
                return Number(block.timestamp) * 1000;
              }),
            );
            found.set(p.txHash, ts);
          } catch {
            /* every RPC refused — the retry below picks it up */
          }
        }),
      );
      if (cancelled) return;
      if (found.size > 0) {
        setPayments((ps) =>
          ps?.map((p) => (p.timestamp === undefined && found.has(p.txHash) ? { ...p, timestamp: found.get(p.txHash) } : p)),
        );
      } else {
        backfillTries.current += 1;
        // New array identity re-fires this effect for another pass.
        timer = window.setTimeout(() => setPayments((ps) => (ps ? [...ps] : ps)), 9_000);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payments]);

  const scan = useCallback(async () => {
    if (!me) return;
    setPhase("scanning");
    setError(undefined);
    let lastErr: unknown;
    for (const rpc of SCAN_RPCS) {
      const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
      let latest: bigint;
      try {
        latest = await client.getBlockNumber();
      } catch (e) {
        lastErr = e;
        continue;
      }
      for (const span of SCAN_SPANS) {
        try {
          const logs = await client.getLogs({
            address: TOKEN,
            event: TRANSFER_EVENT,
            args: { to: me },
            fromBlock: latest > span ? latest - span : 0n,
            toBlock: latest,
          });
          // Attach each log's block time (same client that answered getLogs) so
          // the recipient sees a human-readable date. Best-effort: a failed
          // block read just leaves that row without a time.
          const blockNos = [...new Set(logs.map((l) => l.blockNumber).filter((b): b is bigint => b != null))];
          const timeByBlock = new Map<bigint, number>();
          await Promise.all(
            blockNos.map(async (bn) => {
              try {
                const blk = await client.getBlock({ blockNumber: bn });
                timeByBlock.set(bn, Number(blk.timestamp) * 1000);
              } catch {
                /* leave this row without a time */
              }
            }),
          );
          const incoming: MyPayment[] = logs
            .map((log) => ({
              txHash: log.transactionHash as `0x${string}`,
              from: log.args.from as `0x${string}`,
              handle: log.args.amount as `0x${string}`,
              url: `https://sepolia.etherscan.io/tx/${log.transactionHash}`,
              timestamp: log.blockNumber != null ? timeByBlock.get(log.blockNumber) : undefined,
            }))
            .reverse();
          // A rescan must never throw away plaintexts the user already
          // decrypted — carry known amounts over by handle. Only genuinely
          // new payments arrive sealed.
          setPayments((prev) => {
            const known = new Map((prev ?? []).map((p) => [p.handle, p.amount] as const));
            return incoming.map((p) => ({ ...p, amount: known.get(p.handle) }));
          });
          const handle = (await client.readContract({
            address: TOKEN,
            abi: erc7984Abi,
            functionName: "confidentialBalanceOf",
            args: [me],
          })) as `0x${string}`;
          setBalanceHandle(handle === zeroHash ? undefined : handle);
          setPhase("idle");
          return;
        } catch (e) {
          lastErr = e;
        }
      }
    }
    setError(lastErr instanceof Error ? (humanizeError(lastErr.message) ?? lastErr.message) : "Could not read your payments right now. Try again in a moment.");
    setPhase("idle");
  }, [me]);

  const reveal = useCallback(async () => {
    if (!walletClient || !me || !payments) return;
    setPhase("revealing");
    setError(undefined);
    try {
      // Only what is still sealed: already-decrypted rows keep their plaintext
      // (a reveal after a rescan signs for just the new arrivals).
      const sealed = payments.filter((p) => p.amount === undefined);
      const needBalance = balance === undefined && balanceHandle !== undefined;
      const requests = [
        ...sealed.map((p) => ({ handle: p.handle, contractAddress: TOKEN })),
        ...(needBalance ? [{ handle: balanceHandle, contractAddress: TOKEN }] : []),
      ];
      if (requests.length === 0) {
        // Nothing on-chain to decrypt: an empty wallet's balance is zero.
        setDecryptedBal({ handle: balanceHandle, value: 0n });
        setPhase("idle");
        return;
      }
      const instance = await withTimeout(
        getFhevmInstance(FHE_NETWORK),
        45_000,
        "Couldn't reach Zama's encryption service in time. Check your connection and try again.",
      );
      // Every handle came from the token contract → one ACL scope, one signature.
      const results = await withTimeout(
        userDecryptHandles({
          instance,
          requests,
          userAddress: me,
          signTypedData: (args) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            walletClient.signTypedData({ ...args, account: me } as any),
        }),
        REVEAL_TIMEOUT_MS,
        "Zama's decryption service took too long to respond. Your pay is safe on-chain · try the reveal again.",
      );
      setPayments((ps) => ps?.map((p) => (p.amount !== undefined ? p : { ...p, amount: results[p.handle] })));
      setDecryptedBal((prev) => {
        if (needBalance) return { handle: balanceHandle, value: results[balanceHandle] };
        if (balanceHandle === undefined) return { handle: undefined, value: 0n };
        return prev;
      });
      setPhase("idle");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(humanizeError(message) ?? message);
      setPhase("idle");
    }
  }, [walletClient, me, payments, balanceHandle, balance]);

  return {
    me,
    symbol,
    decimals,
    connected: isConnected,
    onSepolia,
    ready: isConnected && onSepolia,
    payments,
    balance,
    /** True only when every scanned amount AND the current balance are plaintext. */
    revealed,
    phase,
    error,
    scan,
    reveal,
  };
}
