/**
 * Orphan-run recovery.
 *
 * If the browser closes between "payout transaction broadcast" and
 * "confirmation recorded", the money may have moved with no local trace —
 * the exact state that invites an accidental second run. The shell persists
 * a pending-run record the moment the engine exposes the tx hash, and this
 * hook offers recovery on the next visit: re-fetch the receipt, parse the
 * same DirectDistribution event the live flow uses, and write the history
 * row that would have been written. Composes only exported engine APIs.
 */
import { disperseAbi } from "@dispersekit/widget";
import { useCallback, useState } from "react";
import { parseEventLogs } from "viem";
import { usePublicClient } from "wagmi";

import type { PayoutRun } from "./history";

const KEY = "dispersekit.payroll.pendingRun.v1";

export interface PendingRunRecord {
  txHash: `0x${string}`;
  /** Positional names, aligned with the submitted recipient order. */
  names: string[];
  totalText: string;
  startedAt: string;
}

export function savePendingRun(record: PendingRunRecord) {
  localStorage.setItem(KEY, JSON.stringify(record));
}
export function clearPendingRun() {
  localStorage.removeItem(KEY);
}
function loadPendingRun(): PendingRunRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingRunRecord) : null;
  } catch {
    return null;
  }
}

export function useOrphanRun(addRun: (run: Omit<PayoutRun, "id" | "date">) => void) {
  const publicClient = usePublicClient();
  const [orphan, setOrphan] = useState<PendingRunRecord | null>(loadPendingRun);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  const dismiss = useCallback(() => {
    clearPendingRun();
    setOrphan(null);
  }, []);

  const recover = useCallback(async () => {
    if (!orphan || !publicClient) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: orphan.txHash });
      const [event] = parseEventLogs({ abi: disperseAbi, logs: receipt.logs, eventName: "DirectDistribution" });
      if (!event) {
        setMessage("The transaction is on-chain but paid nothing out — it likely failed. Safe to dismiss.");
        return;
      }
      addRun({
        txHash: orphan.txHash,
        employeeCount: event.args.recipients.length,
        totalText: orphan.totalText,
        entries: event.args.recipients.map((address, i) => ({
          name: orphan.names[i] ?? "—",
          address,
          requested: event.args.requested[i],
          transferred: event.args.transferred[i],
        })),
      });
      clearPendingRun();
      setOrphan(null);
    } catch {
      setMessage("Not confirmed yet (or the RPC can't see it). Try again shortly, or check Etherscan.");
    } finally {
      setBusy(false);
    }
  }, [orphan, publicClient, addRun]);

  return { orphan, recover, dismiss, busy, message };
}
