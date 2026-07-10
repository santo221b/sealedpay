/**
 * Orphan-run recovery.
 *
 * If the browser closes between "payout transaction broadcast" and
 * "confirmation recorded", the money may have moved with no local trace, the
 * exact state that invites an accidental second run. The shell persists a
 * pending record the moment the engine exposes the tx hash; on the next visit
 * this hook offers recovery: re-fetch the receipt, parse the same
 * DirectDistribution event the live flow uses, and write the history row that
 * would have been written. Composes only exported engine APIs.
 *
 * Records are kept in a txHash-keyed LIST so a second run in the same session
 * can never clobber an earlier, still-unrecovered pending record.
 */
import { disperseAbi } from "@dispersekit/widget";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { parseEventLogs } from "viem";
import { usePublicClient } from "wagmi";

import type { PayoutRun } from "./history";

// Per-tenant: a pending record belongs to the employer who broadcast it, so it
// must never surface for a DIFFERENT account that signs in on the same browser.
const KEY_PREFIX = "dispersekit.payroll.pendingRuns.v2:";
const keyFor = (userId: string) => KEY_PREFIX + userId;

export interface PendingRunRecord {
  txHash: `0x${string}`;
  /** Positional names, aligned with the submitted recipient order. */
  names: string[];
  totalText: string;
  startedAt: string;
}

function loadList(userId: string): PendingRunRecord[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as PendingRunRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveList(userId: string, list: PendingRunRecord[]) {
  localStorage.setItem(keyFor(userId), JSON.stringify(list));
}

/** Record a broadcast run (idempotent by txHash; never clobbers other records). */
export function savePendingRun(userId: string, record: PendingRunRecord) {
  const list = loadList(userId);
  if (list.some((r) => r.txHash === record.txHash)) return;
  saveList(userId, [...list, record]);
}
/** Drop one record once its run is confirmed + recorded (or dismissed). */
export function clearPendingRun(userId: string, txHash: `0x${string}`) {
  saveList(userId, loadList(userId).filter((r) => r.txHash !== txHash));
}

export function useOrphanRun(addRun: (run: Omit<PayoutRun, "id" | "date">) => void) {
  const publicClient = usePublicClient();
  const { user } = usePrivy();
  const userId = user?.id ?? "anon";
  const [list, setList] = useState<PendingRunRecord[]>(() => loadList(userId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  // Reload the (per-tenant) list whenever the signed-in account changes, so a
  // previous employer's pending record can't surface for a new one.
  useEffect(() => {
    setList(loadList(userId));
  }, [userId]);

  /** The oldest record NOT belonging to the run currently in flight. */
  const orphanFor = useCallback(
    (liveTxHash?: `0x${string}`) => list.find((r) => r.txHash !== liveTxHash),
    [list],
  );

  const dismiss = useCallback(
    (txHash: `0x${string}`) => {
      clearPendingRun(userId, txHash);
      setList(loadList(userId));
    },
    [userId],
  );

  const recover = useCallback(
    async (record: PendingRunRecord) => {
      if (!publicClient) return;
      setBusy(true);
      setMessage(undefined);
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: record.txHash });
        const [event] = parseEventLogs({ abi: disperseAbi, logs: receipt.logs, eventName: "DirectDistribution" });
        if (!event) {
          setMessage("The transaction is on-chain but paid nothing out, it likely failed. Safe to dismiss.");
          return;
        }
        addRun({
          txHash: record.txHash,
          employeeCount: event.args.recipients.length,
          totalText: record.totalText,
          entries: event.args.recipients.map((address, i) => ({
            name: record.names[i] ?? "",
            address,
            requested: event.args.requested[i],
            transferred: event.args.transferred[i],
          })),
        });
        clearPendingRun(userId, record.txHash);
        setList(loadList(userId));
      } catch {
        setMessage("Not confirmed yet (or the RPC cannot see it). Try again shortly, or check Etherscan.");
      } finally {
        setBusy(false);
      }
    },
    [publicClient, addRun, userId],
  );

  return { orphanFor, recover, dismiss, busy, message };
}
