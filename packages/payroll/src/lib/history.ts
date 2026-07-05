/**
 * Payout history + "next payout due" — browser-local only.
 *
 * History rows are written ONLY from the flow's onDispersed callback, i.e.
 * after delivery is confirmed from the on-chain event — never optimistically.
 * "Next due" is display-only information: nothing in this app schedules or
 * triggers a payout; the sole trigger is the employer clicking the button.
 */
import { useCallback, useEffect, useState } from "react";

/**
 * Per-employee snapshot of a run. Deliberately NO plaintext amounts — only
 * the ciphertext HANDLES from the on-chain event. The employer holds
 * permanent decrypt rights on them, so any past run can be re-verified
 * ("private AND provable") without ever storing a salary in localStorage.
 */
export interface PayoutEntry {
  name: string;
  address: `0x${string}`;
  /** Ciphertext handle of the requested amount (disperse-contract ACL scope). */
  requested: `0x${string}`;
  /** Ciphertext handle of what actually moved (token ACL scope). */
  transferred: `0x${string}`;
}

export interface PayoutRun {
  id: string;
  /** ISO timestamp of the confirmed run. */
  date: string;
  txHash: `0x${string}`;
  employeeCount: number;
  /** Human-readable total, e.g. "5,300.25" (display only). */
  totalText: string;
  /** Set once the employer runs the decrypt-verify step and all rows match. */
  verified?: boolean;
  /** Present for runs recorded after the history upgrade. */
  entries?: PayoutEntry[];
}

const HISTORY_KEY = "dispersekit.payroll.history.v1";
const NEXT_DUE_KEY = "dispersekit.payroll.nextDue.v1";

function loadHistory(): PayoutRun[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as PayoutRun[];
  } catch {
    return [];
  }
}

export function useHistory() {
  const [runs, setRuns] = useState<PayoutRun[]>(loadHistory);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(runs));
  }, [runs]);

  const addRun = useCallback((run: Omit<PayoutRun, "id" | "date">) => {
    setRuns((list) => [{ ...run, id: crypto.randomUUID(), date: new Date().toISOString() }, ...list]);
  }, []);

  /** Called when the decrypt-verify step confirms every salary moved in full. */
  const markVerified = useCallback((txHash: `0x${string}`, ok: boolean) => {
    setRuns((list) => list.map((r) => (r.txHash === txHash ? { ...r, verified: ok } : r)));
  }, []);

  return { runs, addRun, markVerified };
}

/**
 * Display-only next-due date: a manually set date wins; otherwise one month
 * after the most recent run; otherwise nothing.
 */
export function useNextDue(lastRunDate: string | undefined) {
  const [manual, setManual] = useState<string>(() => localStorage.getItem(NEXT_DUE_KEY) ?? "");

  useEffect(() => {
    if (manual) localStorage.setItem(NEXT_DUE_KEY, manual);
    else localStorage.removeItem(NEXT_DUE_KEY);
  }, [manual]);

  let nextDue: Date | undefined;
  if (manual) {
    nextDue = new Date(`${manual}T00:00:00`);
  } else if (lastRunDate) {
    // "+1 month" clamped to the target month's length — naive setMonth would
    // turn Jan 31 into Mar 3.
    const d = new Date(lastRunDate);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const daysInTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, daysInTarget));
    nextDue = d;
  }

  return { nextDue, manual, setManual };
}
