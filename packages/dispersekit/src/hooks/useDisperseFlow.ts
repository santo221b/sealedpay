/**
 * The disperse state machine — everything on-chain and cryptographic lives
 * here; components only render phases.
 *
 * Phases: input → review → encrypting → authorizing → dispersing →
 * confirming → delivered (→ verifying → verified within delivered).
 *
 * Design decisions worth knowing:
 * - The disperse runs through the official TokenOps SDK
 *   (`@tokenops/sdk/fhe-disperse`, direct mode) against the same audited
 *   `DisperseConfidential` singleton. The SDK validates the batch, encrypts
 *   every amount under one proof (through our relayer-sdk, adapted), pays the
 *   anti-spam gas fee, submits `disperseConfidentialTokenDirect`, and returns
 *   the per-recipient requested/transferred handles. Encryption and
 *   user-decryption everywhere else still use our relayer-sdk directly.
 * - Delivery is VERIFIED, never assumed: confidential transfers silently move
 *   an encrypted zero when the sender's balance is short, so after the tx we
 *   decrypt the `transferred` handles (the sender holds ACL on them) and
 *   compare against what was requested.
 * - A broadcast payout is never abandoned. The disperse tx hash is captured the
 *   instant the SDK broadcasts it (a thin wallet proxy over `writeContract`);
 *   if the SDK's own receipt-wait then fails, we resolve from the hash rather
 *   than return to review (which would invite a double send): a confirmed
 *   delivery finishes, a revert returns to review, and a still-unconfirmed tx
 *   stays in `confirming` with a retry. This also arms the orphan-recovery net.
 */
import { ConfidentialDisperseClient, setOperator, type Encryptor } from "@tokenops/sdk/fhe-disperse";
import { useCallback, useMemo, useRef, useState } from "react";
import { getAddress, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { disperseAbi, erc7984Abi } from "../lib/contracts/abis";
import { disperseAddressFor } from "../lib/contracts/addresses";
import { userDecryptHandles } from "../lib/fhe/decrypt";
import { getFhevmInstance, type FhevmInstance } from "../lib/fhe/instance";
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

// Resilience budgets. These bound the awaits that can otherwise hang FOREVER —
// the ones that go through the Zama relayer over browser `fetch` (no built-in
// timeout). viem RPC reads and waitForTransactionReceipt already self-time-out
// (10s transport / 180s receipt), so they're not wrapped here.
const RELAYER_WARM_TIMEOUT_MS = 45_000; // getFhevmInstance: fetch FHE key + CRS
const AUTHORIZE_TIMEOUT_MS = 150_000; // the operator-grant wallet prompt (idempotent, no funds)
const VERIFY_TIMEOUT_MS = 60_000; // post-delivery decrypt round-trip (read-only)

// ERC-7984 stores operator expiry privately (isOperator only returns a bool),
// so we remember the `until` of grants WE made this session. An untracked
// grant (from a previous session) has unknown expiry → re-grant to be safe.
const sessionGrants = new Map<string, number>();
const grantKey = (token: string, sender: string, operator: string) => `${token}:${sender}:${operator}`.toLowerCase();

function hasFreshGrant(token: string, sender: string, operator: string): boolean {
  const until = sessionGrants.get(grantKey(token, sender, operator));
  return until !== undefined && until - Date.now() / 1000 > OPERATOR_MARGIN_SECONDS;
}

// A mined transaction receipt is FINAL: a revert (operator grant expired mid-
// flow, wrong fee, contract revert) or an event-less confirmation can never be
// retried into a delivery. `terminal` tags such failures so execute() routes
// them to a recoverable state instead of the "stay in confirming + retry"
// branch — which is correct ONLY for a genuinely-unconfirmed broadcast (an RPC
// hiccup where the tx may still succeed). Retrying a mined receipt just re-reads
// the same final receipt and re-throws, stranding the modal forever.
function terminal(message: string): Error {
  const err = new Error(message) as Error & { terminal?: boolean };
  err.terminal = true;
  return err;
}
function isTerminal(e: unknown): boolean {
  return e instanceof Error && (e as Error & { terminal?: boolean }).terminal === true;
}

/**
 * Bound an await that could otherwise hang forever. JS can't cancel the
 * underlying promise, so this only stops US waiting — use it ONLY where a late
 * resolution is harmless: read-only reads, decryptions, or a signature/grant
 * that moves no funds. NEVER wrap the money-moving disperse write, whose late
 * approval would broadcast and orphan the payout. The message deliberately
 * omits reject/denied/cancel so isRejection() won't soften a real timeout into
 * "cancelled" and swallow it.
 */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Was a wallet prompt cancelled? The TokenOps SDK wraps a rejection in its own
 * error type (e.g. `TokenOpsContractError` / `WalletRejectedError`) with the
 * underlying viem "User rejected the request" attached as `.cause`, so a
 * top-level message check misses it — walk the whole cause chain.
 */
function isRejection(e: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; i < 6 && cur; i++) {
    if (cur && typeof cur === "object") {
      const o = cur as { name?: unknown; message?: unknown; shortMessage?: unknown; code?: unknown; cause?: unknown };
      parts.push(String(o.name ?? ""), String(o.message ?? ""), String(o.shortMessage ?? ""), String(o.code ?? ""));
      cur = o.cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return /reject|denied|cancel/i.test(parts.join(" "));
}

/**
 * Adapt our relayer-sdk FHEVM instance to the `@tokenops/sdk` `Encryptor` shape,
 * so the TokenOps disperse client encrypts through the SAME relayer the rest of
 * the app uses (one FHE stack — no second Zama SDK, no wallet-switch caching to
 * get wrong). The disperse flow only ever produces `euint64` amount inputs.
 */
function makeEncryptor(instance: FhevmInstance): Encryptor {
  return {
    async encrypt({ values, contractAddress, userAddress }) {
      const input = instance.createEncryptedInput(getAddress(contractAddress), getAddress(userAddress));
      for (const v of values) {
        if (v.type !== "euint64") throw new Error(`Unexpected FHE input type "${v.type}" in disperse`);
        input.add64(BigInt(v.value as bigint));
      }
      const { handles, inputProof } = await input.encrypt();
      return { handles, inputProof };
    },
  };
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
  // Synchronous re-entrancy latch: a second execute() before the first settles
  // (double-click, StrictMode, a host re-firing) would broadcast twice. State
  // updates are async, so guard with a ref set before the first await.
  const executingRef = useRef(false);

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
      // (Checks the SDK-wrapped error's whole cause chain, not just the top.)
      const rejected = isRejection(e);
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
      // waitForTransactionReceipt RESOLVES on a reverted tx (it only rejects
      // when the tx never mines) — so inspect status: a revert moved nothing.
      if (receipt.status === "reverted")
        throw terminal("The payout transaction reverted on-chain, so no funds moved. You can safely run it again.");
      const [event] = parseEventLogs({ abi: disperseAbi, logs: receipt.logs, eventName: "DirectDistribution" });
      if (!event) throw terminal("The transaction confirmed but no distribution event was emitted, so it could not be verified.");
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
    if (executingRef.current) return; // a run is already in flight — never broadcast twice
    if (!token || !disperse) return fail(new Error("No token or disperse contract configured"), "review");
    if (!sender || !walletClient || !publicClient) return fail(new Error("Connect a wallet first"), "review");
    if (rows.length === 0) return fail(new Error("No recipients"), "input");
    executingRef.current = true;
    setError(undefined);

    // Capture the disperse tx hash the instant the SDK broadcasts it, by
    // wrapping the wallet's writeContract. The SDK's disperse() waits for the
    // receipt internally and, on an RPC hiccup there, throws WITHOUT the hash —
    // so without this we could abandon an in-flight payout to review and, on a
    // re-run, pay everyone twice. Setting pendingTxHash here also arms orphan
    // recovery. Only the disperse write is captured (setOperator uses the real
    // wallet below), and for direct mode disperse() makes exactly one write.
    let dispersedTxHash: `0x${string}` | undefined;
    const captureWallet = new Proxy(walletClient, {
      get(target, prop, receiver) {
        if (prop === "writeContract") {
          return async (params: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const orig = target.writeContract as any;
            const hash = (await orig.call(target, params)) as `0x${string}`;
            dispersedTxHash = hash;
            setPendingTxHash(hash);
            return hash;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    try {
      // 1. Warm the relayer instance (the heavy step) while the encrypting
      //    animation plays; the TokenOps client encrypts through it in step 3.
      //    (The SDK validates recipient count / bounds inside disperse().)
      setPhase("encrypting");
      // Warming the relayer fetches the FHE key + CRS over `fetch` (no built-in
      // timeout). Bound it so a dead relayer fails to review — nothing has
      // broadcast yet, so a late resolution is harmless.
      const instance = await withTimeout(
        getFhevmInstance(FHE_NETWORK),
        RELAYER_WARM_TIMEOUT_MS,
        "Couldn't reach the Zama encryption service in time. Check your connection and try again.",
      );
      const client = new ConfidentialDisperseClient({
        publicClient,
        walletClient: captureWallet,
        chainId,
        address: disperse, // pin to the singleton we target (env-overridable)
        encryptor: makeEncryptor(instance),
      });

      // 2. Time-boxed operator grant via the SDK — the standard ERC-7984 approval
      //    direct-mode disperse needs (uses the REAL wallet so its hash isn't
      //    captured). Skipped for a fresh grant we made.
      setPhase("authorizing");
      const isOperator = await publicClient.readContract({
        address: token,
        abi: erc7984Abi,
        functionName: "isOperator",
        args: [sender, disperse],
      });
      if (!isOperator || !hasFreshGrant(token, sender, disperse)) {
        const until = Math.floor(Date.now() / 1000) + OPERATOR_TTL_SECONDS;
        // Bound the authorize prompt so an unanswered wallet request can't hang
        // the flow forever. Safe to time out: the grant moves no funds and is
        // idempotent, so a late approval just leaves a harmless operator grant a
        // re-run detects. (The disperse write below is deliberately NOT bounded.)
        await withTimeout(
          setOperator({ publicClient, walletClient, account: sender, token, spender: disperse, deadline: BigInt(until) }),
          AUTHORIZE_TIMEOUT_MS,
          "The authorization wasn't confirmed in time. Approve it in your wallet, then run payroll again.",
        );
        sessionGrants.set(grantKey(token, sender, disperse), until);
      }

      // 3. Disperse through the TokenOps SDK. `disperse()` validates the batch,
      //    encrypts every amount under one proof (via our encryptor), computes
      //    the gas fee, submits `disperseConfidentialTokenDirect`, waits for the
      //    receipt, and returns per-recipient requested/transferred handles.
      setPhase("dispersing");
      const result = await client.disperse({
        token,
        mode: "direct",
        recipients: rows.map((r) => r.address as `0x${string}`),
        amounts: amountsRef.current,
        account: sender,
      });
      const dist = result.distributions[0];
      if (!dist) throw new Error("The disperse confirmed but no distribution was found in the receipt.");
      const delivery: DeliveryResult = {
        txHash: result.hash,
        recipients: [...dist.recipients] as `0x${string}`[],
        requested: [...dist.requested] as `0x${string}`[],
        transferred: [...dist.transferred] as `0x${string}`[],
      };
      setDelivery(delivery);
      setPhase("delivered");
      onDispersed?.(delivery);
    } catch (e) {
      if (dispersedTxHash && !isRejection(e)) {
        // The payout WAS broadcast (funds may be moving) but the SDK's own
        // confirmation wait failed. Returning to review would invite a DOUBLE
        // send, so resolve it ourselves from the hash: a confirmed delivery
        // recovers to the finale, a revert is terminal (nothing moved → review),
        // and a still-unconfirmed tx stays in `confirming` with a retry.
        setPhase("confirming");
        try {
          await confirmDelivery(dispersedTxHash);
        } catch (e2) {
          if (isTerminal(e2)) {
            setPendingTxHash(undefined);
            fail(e2, "review");
          } else {
            setError(
              `The payout transaction was sent (${dispersedTxHash.slice(0, 10)}…) but confirmation failed: ${
                e2 instanceof Error ? e2.message : String(e2)
              }`,
            );
          }
        }
      } else {
        // Pre-broadcast failure (wallet rejection, encryption, validation) —
        // nothing moved, safe to return to review.
        fail(e, "review");
      }
    } finally {
      // Release the latch whether we ended in delivered, confirming, or review —
      // the confirming state re-broadcasts nothing (retryConfirmation only reads
      // the captured hash), so re-enabling execute() here can't double-send.
      executingRef.current = false;
    }
  }, [token, disperse, sender, walletClient, publicClient, chainId, rows, fail, onDispersed, confirmDelivery]);

  const retryConfirmation = useCallback(async () => {
    if (!pendingTxHash) return;
    setError(undefined);
    try {
      await confirmDelivery(pendingTxHash);
    } catch (e) {
      if (isTerminal(e)) {
        // A reverted / event-less receipt is FINAL — retrying just re-reads the
        // same failure forever, stranding the modal (confirming blocks close).
        // Nothing moved, so return to review (a re-run is legitimate) — the same
        // routing execute()'s catch uses.
        setPendingTxHash(undefined);
        fail(e, "review");
      } else {
        setError(
          `Still couldn't confirm ${pendingTxHash.slice(0, 10)}…: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }, [pendingTxHash, confirmDelivery, fail]);

  /**
   * Post-delivery audit: decrypt what actually moved and flag any silent
   * zeroes. One EIP-712 signature; only the sender sees the values.
   */
  const verifyDelivery = useCallback(async () => {
    if (!delivery || !sender || !walletClient || !token || !disperse) return;
    setVerifying(true);
    setError(undefined);
    try {
      // This runs AFTER the payout is confirmed on-chain and is strictly
      // read-only, but both the signature prompt and the relayer's userDecrypt
      // go over channels with no timeout — a stalled relayer or an unanswered
      // prompt would otherwise pin `verifying` true forever (the reported
      // "Verifying delivery · 0/2" freeze). Bound the whole thing: on timeout
      // the finale still shows the payment as delivered and offers a retry.
      const results = await withTimeout(
        (async () => {
          const instance = await getFhevmInstance(FHE_NETWORK);
          return userDecryptHandles({
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
        })(),
        VERIFY_TIMEOUT_MS,
        "Couldn't reach the Zama decryption service to verify amounts. The payment already went through. You can retry the check.",
      );
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
    executingRef.current = false;
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
