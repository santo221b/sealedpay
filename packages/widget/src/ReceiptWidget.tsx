/**
 * <ReceiptWidget /> — the recipient's side of the story.
 *
 * Tokens arrive by push; there is nothing to claim. This widget answers the
 * recipient's only question — "what did I get?" — privately: it finds
 * incoming confidential transfers (ERC-7984 indexes the recipient AND the
 * ciphertext handle in the event), then decrypts them plus the current
 * balance with a single EIP-712 signature. Nobody else can perform this read.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseAbiItem, zeroHash } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { AccountChip, ConnectGate } from "./components/ConnectGate";
import { PrivacyBadge } from "./components/PrivacyBadge";
import { Button, Card, CipherChip, LockIcon, Spinner } from "./components/ui";
import { useTokenMeta } from "./hooks/useTokenMeta";
import { DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID } from "./lib/contracts/addresses";
import { erc7984Abi } from "./lib/contracts/abis";
import { userDecryptHandles } from "./lib/fhe/decrypt";
import { getFhevmInstance } from "./lib/fhe/instance";
import { formatAmount } from "./lib/format";
import { short } from "./lib/parse";
import { DisperseProviders } from "./providers";
import { themeToCssVars, type DisperseTheme } from "./theme";

export interface ReceiptWidgetProps {
  token?: `0x${string}`;
  chainId?: number;
  theme?: DisperseTheme;
  title?: string;
  /** How far back to look for incoming transfers. Default ~100k blocks. */
  lookbackBlocks?: bigint;
  walletConnectProjectId?: string;
}

interface IncomingTransfer {
  txHash: `0x${string}`;
  from: `0x${string}`;
  handle: `0x${string}`;
  blockNumber: bigint;
}

const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";
const TRANSFER_EVENT = parseAbiItem(
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
);

export function ReceiptWidget(props: ReceiptWidgetProps) {
  return (
    <DisperseProviders theme={props.theme} walletConnectProjectId={props.walletConnectProjectId}>
      <ReceiptBody {...props} />
    </DisperseProviders>
  );
}

function ReceiptBody(props: ReceiptWidgetProps) {
  const chainId = props.chainId ?? SEPOLIA_CHAIN_ID;
  const token = props.token ?? DEMO_TOKEN_ADDRESS;
  const { address: me, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { symbol, decimals } = useTokenMeta(token);

  const [transfers, setTransfers] = useState<IncomingTransfer[]>();
  const [balanceHandle, setBalanceHandle] = useState<`0x${string}`>();
  const [amounts, setAmounts] = useState<Record<`0x${string}`, bigint>>();
  const [balance, setBalance] = useState<bigint>();
  const [phase, setPhase] = useState<"idle" | "scanning" | "revealing" | "revealed">("idle");
  const [error, setError] = useState<string>();

  const cssVars = useMemo(() => themeToCssVars(props.theme), [props.theme]);
  const ready = isConnected && chain?.id === chainId;

  // Everything shown here belongs to one (account, token) pair — a wallet
  // account switch must never keep showing the previous account's money.
  useEffect(() => {
    setTransfers(undefined);
    setBalanceHandle(undefined);
    setAmounts(undefined);
    setBalance(undefined);
    setPhase("idle");
    setError(undefined);
  }, [me, token]);

  const scan = useCallback(async () => {
    if (!publicClient || !me || !token) return;
    setPhase("scanning");
    setError(undefined);
    try {
      const latest = await publicClient.getBlockNumber();
      const lookback = props.lookbackBlocks ?? 100_000n;
      const getLogs = (span: bigint) =>
        publicClient.getLogs({
          address: token,
          event: TRANSFER_EVENT,
          args: { to: me },
          fromBlock: latest > span ? latest - span : 0n,
          toBlock: latest,
        });
      // Public RPCs cap getLogs ranges inconsistently; fall back to a narrower scan.
      const logs = await getLogs(lookback).catch(() => getLogs(9_000n));
      const incoming = logs
        .map((log) => ({
          txHash: log.transactionHash,
          from: log.args.from as `0x${string}`,
          handle: log.args.amount as `0x${string}`,
          blockNumber: log.blockNumber,
        }))
        .reverse();
      setTransfers(incoming);

      const handle = await publicClient.readContract({
        address: token,
        abi: erc7984Abi,
        functionName: "confidentialBalanceOf",
        args: [me],
      });
      setBalanceHandle(handle === zeroHash ? undefined : handle);
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }, [publicClient, me, token, props.lookbackBlocks]);

  const reveal = useCallback(async () => {
    if (!walletClient || !me || !token || !transfers) return;
    setPhase("revealing");
    setError(undefined);
    try {
      const instance = await getFhevmInstance(FHE_NETWORK);
      // Every handle here was produced by the token contract, so one ACL
      // scope — and one signature — covers all of them.
      const requests = [
        ...transfers.map((t) => ({ handle: t.handle, contractAddress: token })),
        ...(balanceHandle ? [{ handle: balanceHandle, contractAddress: token }] : []),
      ];
      if (requests.length === 0) {
        setBalance(0n);
        setAmounts({});
        setPhase("revealed");
        return;
      }
      const results = await userDecryptHandles({
        instance,
        requests,
        userAddress: me,
        signTypedData: (args) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          walletClient.signTypedData({ ...args, account: me } as any),
      });
      setAmounts(results);
      setBalance(balanceHandle ? results[balanceHandle] : 0n);
      setPhase("revealed");
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(/user rejected|denied/i.test(err) ? "Request cancelled in the wallet." : err);
      setPhase("idle");
    }
  }, [walletClient, me, token, transfers, balanceHandle]);

  return (
    <div
      style={{ ...cssVars, fontFamily: "var(--dk-font)" }}
      className="w-full max-w-md rounded-[var(--dk-radius)] border border-[var(--dk-border)] bg-[var(--dk-bg)] p-5 text-[var(--dk-text)] shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold leading-tight">{props.title ?? "My confidential payments"}</h2>
          <p className="text-[11px] text-[var(--dk-muted)]">{symbol ?? "…"} · only you can read these numbers</p>
        </div>
        <div className="flex items-center gap-1.5">
          <AccountChip />
          <PrivacyBadge />
        </div>
      </div>

      {!token && (
        <p className="rounded-[calc(var(--dk-radius)*0.6)] bg-[var(--dk-surface)] p-3 text-xs text-[var(--dk-muted)]">
          No token configured.
        </p>
      )}
      {token && !ready && <ConnectGate />}

      {token && ready && (
        <div className="flex flex-col gap-3">
          {transfers === undefined ? (
            <Button disabled={phase === "scanning"} onClick={() => void scan()}>
              {phase === "scanning" ? <Spinner /> : null}
              {phase === "scanning" ? "Looking for payments…" : "Find my payments"}
            </Button>
          ) : (
            <>
              <AnimatePresence>
                {phase === "revealed" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 20 }}
                    className="rounded-[calc(var(--dk-radius)*0.7)] bg-[var(--dk-surface)] p-4 text-center"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-[var(--dk-muted)]">Your balance</p>
                    <p className="text-2xl font-bold">
                      {balance !== undefined && decimals !== undefined ? formatAmount(balance, decimals) : "—"}{" "}
                      <span className="text-sm font-semibold text-[var(--dk-muted)]">{symbol ?? ""}</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {transfers.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--dk-muted)]">
                  No incoming payments found in the recent history.
                </p>
              ) : (
                <Card className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {transfers.map((t, i) => {
                        const amount = amounts?.[t.handle];
                        return (
                          <tr key={i} className="border-t border-[var(--dk-border)] first:border-t-0">
                            <td className="px-3 py-2 font-mono text-[var(--dk-muted)]" title={t.from}>
                              from {short(t.from)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {amount !== undefined && decimals !== undefined ? (
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="font-mono font-semibold"
                                >
                                  +{formatAmount(amount, decimals)} {symbol ?? ""}
                                </motion.span>
                              ) : (
                                <CipherChip handle={t.handle} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              )}

              {phase !== "revealed" && (
                <Button disabled={phase === "revealing"} onClick={() => void reveal()}>
                  {phase === "revealing" ? <Spinner /> : <LockIcon />}
                  {phase === "revealing" ? "Decrypting…" : "Reveal my amounts"}
                </Button>
              )}
              {phase === "revealed" && (
                <p className="text-center text-[11px] text-[var(--dk-muted)]">
                  Decrypted locally after your signature — the amounts never appear on-chain or on any server.
                </p>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="rounded-[calc(var(--dk-radius)*0.6)] bg-red-50 p-2.5 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-[10px] text-[var(--dk-muted)]/70">
        Powered by DisperseKit · TokenOps disperse · Zama FHE
      </p>
    </div>
  );
}
