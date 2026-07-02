/**
 * The disperse state machine — everything on-chain and cryptographic lives
 * here; components only render phases.
 *
 * Phases: input → review → encrypting → authorizing → dispersing →
 * confirming → delivered (→ verifying → verified within delivered).
 *
 * Design decisions worth knowing:
 * - Direct mode (`disperseConfidentialTokenDirect`): one wallet signature per
 *   disperse (plus a one-time operator grant), no funds held by the contract,
 *   no subtotals to get wrong. The live singleton caps it at 20 recipients.
 * - Delivery is VERIFIED, never assumed: confidential transfers silently move
 *   an encrypted zero when the sender's balance is short, so after the tx we
 *   decrypt the `transferred` handles (the sender holds ACL on them) and
 *   compare against what was requested.
 * - A broadcast transaction is never abandoned: if confirmation fails (RPC
 *   hiccup), the flow stays in `confirming` with the tx hash on display and a
 *   retry — going back to review there would invite a double payout.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { disperseAbi, erc7984Abi } from "../lib/contracts/abis";
import { disperseAddressFor } from "../lib/contracts/addresses";
import { userDecryptHandles } from "../lib/fhe/decrypt";
import { encryptAmounts } from "../lib/fhe/encrypt";
import { getFhevmInstance } from "../lib/fhe/instance";
import type { RecipientRow } from "../lib/parse";

export type FlowPhase =
  | "input"
  | "review"
  | "encrypting"
  | "authorizing"
  | "dispersing"
  | "confirming"
  | "delivered";

export interface DeliveryResult {
  txHash: `0x${string}`;
  recipients: `0x${string}`[];
  /** Ciphertext handles of what the sender asked to send (disperse ACL scope). */
  requested: `0x${string}`[];
  /** Ciphertext handles of what actually moved (token ACL scope). */
  transferred: `0x${string}`[];
}

export interface VerificationEntry {
  address: `0x${string}`;
  requestedAmount: bigint;
  transferredAmount: bigint;
  ok: boolean;
}

export interface DisperseFlow {
  phase: FlowPhase;
  error?: string;
  rows: RecipientRow[];
  total: bigint;
  /** Anti-spam fee the singleton charges, in wei per recipient. */
  gasFeePerRecipient?: bigint;
  maxRecipients?: number;
  delivery?: DeliveryResult;
  verification?: VerificationEntry[];
  verifying: boolean;
  operatorAlreadySet?: boolean;
  /** Set the moment a disperse tx is broadcast — survives confirmation failures. */
  pendingTxHash?: `0x${string}`;
  goToReview: (rows: RecipientRow[]) => Promise<void>;
  backToInput: () => void;
  execute: () => Promise<void>;
  retryConfirmation: () => Promise<void>;
  verifyDelivery: () => Promise<void>;
  reset: () => void;
}

// The FHE instance only needs read access to Sepolia; a fixed public RPC keeps
// behavior identical whether or not a wallet is connected.
const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";
const OPERATOR_TTL_SECONDS = 3600; // time-boxed, not unlimited
// Re-grant when a tracked grant has less than this left — a grant made ~55
// minutes ago would pass isOperator at review time and expire mid-flow.
const OPERATOR_MARGIN_SECONDS = 600;

// ERC-7984 stores operator expiry privately (isOperator only returns a bool),
// so we remember the `until` of grants WE made this session. An untracked
// grant (from a previous session) has unknown expiry → re-grant to be safe.
const sessionGrants = new Map<string, number>();
const grantKey = (token: string, sender: string, operator: string) => `${token}:${sender}:${operator}`.toLowerCase();

function hasFreshGrant(token: string, sender: string, operator: string): boolean {
  const until = sessionGrants.get(grantKey(token, sender, operator));
  return until !== undefined && until - Date.now() / 1000 > OPERATOR_MARGIN_SECONDS;
}

export function useDisperseFlow(options: {
  token: `0x${string}` | undefined;
  chainId: number;
  onDispersed?: (result: DeliveryResult) => void;
  onError?: (error: Error) => void;
}): DisperseFlow {
  const { token, chainId, onDispersed, onError } = options;
  const { address: sender } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [phase, setPhase] = useState<FlowPhase>("input");
  const [error, setError] = useState<string>();
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [gasFeePerRecipient, setGasFee] = useState<bigint>();
  const [maxRecipients, setMaxRecipients] = useState<number>();
  const [operatorAlreadySet, setOperatorAlreadySet] = useState<boolean>();
  const [delivery, setDelivery] = useState<DeliveryResult>();
  const [verification, setVerification] = useState<VerificationEntry[]>();
  const [verifying, setVerifying] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}`>();
  // Amounts in row order, kept out of state to avoid re-render churn mid-flow.
  const amountsRef = useRef<bigint[]>([]);

  // No deployment on this chain is a configuration state, not an exception —
  // the widget renders a friendly card instead of crashing the host app.
  const disperse = useMemo(() => {
    try {
      return disperseAddressFor(chainId);
    } catch {
      return undefined;
    }
  }, [chainId]);

  const total = useMemo(() => rows.reduce((acc, r) => acc + r.amount, 0n), [rows]);

  const fail = useCallback(
    (e: unknown, backTo: FlowPhase) => {
      const err = e instanceof Error ? e : new Error(String(e));
      // Wallet rejections read like failures but are user choices — soften them.
      const rejected = /user rejected|denied/i.test(err.message);
      setError(rejected ? "Request cancelled in the wallet." : err.message);
      setPhase(backTo);
      if (!rejected) onError?.(err);
    },
    [onError],
  );

  const goToReview = useCallback(
    async (nextRows: RecipientRow[]) => {
      if (!publicClient || !disperse) return;
      setError(undefined);
      setRows(nextRows);
      amountsRef.current = nextRows.map((r) => r.amount);
      setPhase("review");
      // Fee + batch cap + operator status are display data — fetch after the
      // transition so review renders instantly.
      try {
        const [fee, cap, operator] = await Promise.all([
          sender
            ? publicClient.readContract({ address: disperse, abi: disperseAbi, functionName: "getGasFee", args: [sender] })
            : Promise.resolve(undefined),
          publicClient.readContract({ address: disperse, abi: disperseAbi, functionName: "maxBatchSizeDirect" }),
          sender && token
            ? publicClient.readContract({ address: token, abi: erc7984Abi, functionName: "isOperator", args: [sender, disperse] })
            : Promise.resolve(undefined),
        ]);
        if (fee !== undefined) setGasFee(BigInt(fee));
        setMaxRecipients(Number(cap) || undefined);
        if (operator !== undefined && sender && token) {
          setOperatorAlreadySet(operator && hasFreshGrant(token, sender, disperse));
        }
      } catch {
        // Non-fatal: review still works; execute() re-checks what it needs.
      }
    },
    [publicClient, sender, token, disperse],
  );

  /** Confirmation + event parsing, shared by execute() and retryConfirmation(). */
  const confirmDelivery = useCallback(
    async (txHash: `0x${string}`) => {
      if (!publicClient) throw new Error("No network connection");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const [event] = parseEventLogs({ abi: disperseAbi, logs: receipt.logs, eventName: "DirectDistribution" });
      if (!event) throw new Error("Transaction confirmed but no DirectDistribution event was emitted");
      const result: DeliveryResult = {
        txHash,
        recipients: [...event.args.recipients],
        requested: [...event.args.requested],
        transferred: [...event.args.transferred],
      };
      setDelivery(result);
      setPhase("delivered");
      onDispersed?.(result);
    },
    [publicClient, onDispersed],
  );

  const execute = useCallback(async () => {
    if (!token || !disperse) return fail(new Error("No token or disperse contract configured"), "review");
    if (!sender || !walletClient || !publicClient) return fail(new Error("Connect a wallet first"), "review");
    if (rows.length === 0) return fail(new Error("No recipients"), "input");
    setError(undefined);

    let txHash: `0x${string}` | undefined;
    try {
      // 0. The batch cap is admin-mutable on the live singleton — re-check at
      //    execution time, falling back to the known live value if the read fails.
      const cap = await publicClient
        .readContract({ address: disperse, abi: disperseAbi, functionName: "maxBatchSizeDirect" })
        .then((v) => Number(v) || Infinity)
        .catch(() => 20);
      if (rows.length > cap) {
        throw new Error(`This batch has ${rows.length} recipients but the contract accepts ${cap} per transaction — split the list.`);
      }

      // 1. Encrypt every amount client-side under one proof.
      setPhase("encrypting");
      const instance = await getFhevmInstance(FHE_NETWORK);
      const enc = await encryptAmounts({
        instance,
        disperseAddress: disperse,
        senderAddress: sender,
        amounts: amountsRef.current,
      });

      // 2. Grant the disperse contract a time-boxed operator permission.
      //    Skipped only for a grant WE made recently — expiry of older grants
      //    is unreadable on-chain, and one expiring mid-flow reverts the tx.
      setPhase("authorizing");
      const isOperator = await publicClient.readContract({
        address: token,
        abi: erc7984Abi,
        functionName: "isOperator",
        args: [sender, disperse],
      });
      if (!isOperator || !hasFreshGrant(token, sender, disperse)) {
        const until = Math.floor(Date.now() / 1000) + OPERATOR_TTL_SECONDS;
        const authHash = await walletClient.writeContract({
          address: token,
          abi: erc7984Abi,
          functionName: "setOperator",
          args: [disperse, until],
          account: sender,
        });
        await publicClient.waitForTransactionReceipt({ hash: authHash });
        sessionGrants.set(grantKey(token, sender, disperse), until);
      }

      // 3. One transaction pays everyone.
      setPhase("dispersing");
      const fee = await publicClient.readContract({
        address: disperse,
        abi: disperseAbi,
        functionName: "getGasFee",
        args: [sender],
      });
      const toHex = (u8: Uint8Array) =>
        `0x${Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
      txHash = await walletClient.writeContract({
        address: disperse,
        abi: disperseAbi,
        functionName: "disperseConfidentialTokenDirect",
        args: [token, rows.map((r) => r.address), enc.amountHandles.map(toHex), toHex(enc.inputProof)],
        value: BigInt(fee) * BigInt(rows.length),
        account: sender,
      });
      setPendingTxHash(txHash);

      // 4. Confirm delivery from the event — not from optimism.
      setPhase("confirming");
      await confirmDelivery(txHash);
    } catch (e) {
      if (txHash) {
        // The payout is already in flight — returning to review here would
        // invite a second send. Stay in confirming; the UI offers a retry.
        setError(
          `The payout transaction was sent (${txHash.slice(0, 10)}…) but confirmation failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      } else {
        fail(e, "review");
      }
    }
  }, [token, disperse, sender, walletClient, publicClient, rows, fail, confirmDelivery]);

  const retryConfirmation = useCallback(async () => {
    if (!pendingTxHash) return;
    setError(undefined);
    try {
      await confirmDelivery(pendingTxHash);
    } catch (e) {
      setError(
        `Still couldn't confirm ${pendingTxHash.slice(0, 10)}…: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }, [pendingTxHash, confirmDelivery]);

  /**
   * Post-delivery audit: decrypt what actually moved and flag any silent
   * zeroes. One EIP-712 signature; only the sender sees the values.
   */
  const verifyDelivery = useCallback(async () => {
    if (!delivery || !sender || !walletClient || !token || !disperse) return;
    setVerifying(true);
    setError(undefined);
    try {
      const instance = await getFhevmInstance(FHE_NETWORK);
      const results = await userDecryptHandles({
        instance,
        requests: [
          ...delivery.transferred.map((handle) => ({ handle, contractAddress: token })),
          ...delivery.requested.map((handle) => ({ handle, contractAddress: disperse })),
        ],
        userAddress: sender,
        signTypedData: (args) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          walletClient.signTypedData({ ...args, account: sender } as any),
      });
      setVerification(
        delivery.recipients.map((address, i) => {
          const requestedAmount = results[delivery.requested[i]];
          const transferredAmount = results[delivery.transferred[i]];
          return { address, requestedAmount, transferredAmount, ok: transferredAmount === requestedAmount };
        }),
      );
    } catch (e) {
      fail(e, "delivered");
    } finally {
      setVerifying(false);
    }
  }, [delivery, sender, walletClient, token, disperse, fail]);

  const backToInput = useCallback(() => {
    setPhase("input");
    setError(undefined);
  }, []);

  const reset = useCallback(() => {
    setPhase("input");
    setError(undefined);
    setRows([]);
    setDelivery(undefined);
    setVerification(undefined);
    setPendingTxHash(undefined);
    amountsRef.current = [];
  }, []);

  return {
    phase,
    error,
    rows,
    total,
    gasFeePerRecipient,
    maxRecipients,
    delivery,
    verification,
    verifying,
    operatorAlreadySet,
    pendingTxHash,
    goToReview,
    backToInput,
    execute,
    retryConfirmation,
    verifyDelivery,
    reset,
  };
}
