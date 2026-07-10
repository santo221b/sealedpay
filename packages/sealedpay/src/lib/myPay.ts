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
import { useCallback, useEffect, useState } from "react";
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

export type MyPayPhase = "idle" | "scanning" | "revealing" | "revealed";

export function useMyPay() {
  const { address: me, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { symbol, decimals } = useTokenMeta(TOKEN);

  const [payments, setPayments] = useState<MyPayment[]>();
  const [balanceHandle, setBalanceHandle] = useState<`0x${string}`>();
  const [balance, setBalance] = useState<bigint>();
  const [phase, setPhase] = useState<MyPayPhase>("idle");
  const [error, setError] = useState<string>();

  const onSepolia = chain?.id === SEPOLIA_CHAIN_ID;

  // A wallet-account switch must never keep showing the previous account's pay.
  useEffect(() => {
    setPayments(undefined);
    setBalanceHandle(undefined);
    setBalance(undefined);
    setPhase("idle");
    setError(undefined);
  }, [me]);

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
          setPayments(incoming);
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
      const instance = await withTimeout(
        getFhevmInstance(FHE_NETWORK),
        45_000,
        "Couldn't reach Zama's encryption service in time. Check your connection and try again.",
      );
      // Every handle came from the token contract → one ACL scope, one signature.
      const requests = [
        ...payments.map((p) => ({ handle: p.handle, contractAddress: TOKEN })),
        ...(balanceHandle ? [{ handle: balanceHandle, contractAddress: TOKEN }] : []),
      ];
      if (requests.length === 0) {
        setBalance(0n);
        setPhase("revealed");
        return;
      }
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
      setPayments((ps) => ps?.map((p) => ({ ...p, amount: results[p.handle] })));
      setBalance(balanceHandle ? results[balanceHandle] : 0n);
      setPhase("revealed");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(humanizeError(message) ?? message);
      setPhase("idle");
    }
  }, [walletClient, me, payments, balanceHandle]);

  return {
    me,
    symbol,
    decimals,
    connected: isConnected,
    onSepolia,
    ready: isConnected && onSepolia,
    payments,
    balance,
    phase,
    error,
    scan,
    reveal,
  };
}
