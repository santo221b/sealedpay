/**
 * Payout history + "next payout due" — server-backed per employer.
 *
 * History rows are written ONLY from the flow's onDispersed callback, i.e.
 * after delivery is confirmed from the on-chain event — never optimistically.
 * The SealedPay backend (/api/runs) is the source of truth (multi-device);
 * a per-tenant localStorage copy paints instantly, mutations sync with a
 * debounced PUT, and sync failures surface via `syncError` (the shell toasts).
 * "Next due" is display-only information: nothing in this app schedules or
 * triggers a payout; the sole trigger is the employer clicking the button.
 */
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, type RunRecord } from "./api";

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

const CACHE_PREFIX = "dispersekit.payroll.history.v2:";
const NEXT_DUE_KEY = "dispersekit.payroll.nextDue.v1";
const SYNC_DEBOUNCE_MS = 700;

function loadCache(userId: string): PayoutRun[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + userId) ?? "[]") as PayoutRun[];
  } catch {
    return [];
  }
}

/** Server shape ↔ app shape (the record's dateISO is the app's date). */
const toRecord = (r: PayoutRun): RunRecord => ({
  id: r.id,
  txHash: r.txHash,
  dateISO: r.date,
  employeeCount: r.employeeCount,
  totalText: r.totalText,
  verified: r.verified,
  entries: r.entries ?? [],
});
const fromRecord = (r: RunRecord): PayoutRun => ({
  id: r.id,
  date: r.dateISO,
  txHash: r.txHash,
  employeeCount: r.employeeCount,
  totalText: r.totalText,
  verified: r.verified,
  entries: r.entries,
});

export function useHistory() {
  const { user, ready, authenticated } = usePrivy();
  const userId = ready && authenticated ? (user?.id ?? null) : null;

  const [runs, setRuns] = useState<PayoutRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const syncTimer = useRef<number>(undefined);
  const loadedFor = useRef<string>(undefined);
  const dirty = useRef(false);

  /* Load: instant cache paint, then the server truth. A payout run is money —
     the merge is by txHash union (server ∪ cache), never overwrite, so a run
     recorded offline is never lost to a stale server copy. */
  useEffect(() => {
    if (!userId || loadedFor.current === userId) return;
    loadedFor.current = userId;
    setLoaded(false);
    // ALWAYS reset on a tenant switch (never show the previous account's runs),
    // and drop any unflushed dirty payload so it can't PUT into the new tenant.
    dirty.current = false;
    window.clearTimeout(syncTimer.current);
    const cached = loadCache(userId);
    setRuns(cached);
    let cancelled = false;
    void (async () => {
      try {
        const { runs: server } = await api.getRuns();
        if (cancelled) return;
        const serverRuns = (server ?? []).map(fromRecord);
        // Merge over LIVE state (functional update), not the stale `cached`
        // closure — a run recorded by addRun WHILE this fetch was in flight
        // (e.g. orphan recovery) is in `prev` and must survive. A payout is
        // money; losing it here would be unrecoverable once the pending record
        // is cleared.
        setRuns((prev) => {
          const merged = new Map<string, PayoutRun>();
          for (const r of serverRuns) merged.set(r.txHash, r);
          for (const r of prev) if (!merged.has(r.txHash)) merged.set(r.txHash, r);
          const list = [...merged.values()].sort((a, b) => b.date.localeCompare(a.date));
          if (list.length !== serverRuns.length) dirty.current = true; // prev had runs the server lacked → push back
          return list;
        });
      } catch (e) {
        if (!cancelled) setSyncError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* Cache + debounced PUT after mutations. */
  useEffect(() => {
    if (!userId || !loaded) return;
    try {
      localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(runs));
    } catch {
      /* best-effort cache */
    }
    if (!dirty.current) return;
    const flush = () => {
      dirty.current = false;
      api
        .putRuns(runs.map(toRecord))
        .then(() => setSyncError(undefined))
        .catch((e: unknown) => {
          // Re-arm so the failed payload retries on the next mutation / hide,
          // rather than being silently dropped (a payout must not be lost).
          dirty.current = true;
          setSyncError(e instanceof Error ? e.message : String(e));
        });
    };
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(flush, SYNC_DEBOUNCE_MS);
    // A recorded payout is money — flush the moment the tab hides rather than
    // risking the debounce window (cache + txHash-union merge backstop a kill).
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current) {
        window.clearTimeout(syncTimer.current);
        flush();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [runs, userId, loaded]);
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  const addRun = useCallback((run: Omit<PayoutRun, "id" | "date">) => {
    dirty.current = true;
    setRuns((list) => {
      // Idempotent by txHash: one on-chain payout is one history row, even if a
      // confirmation is retried or an orphan record is recovered after the fact.
      if (list.some((r) => r.txHash === run.txHash)) return list;
      return [{ ...run, id: crypto.randomUUID(), date: new Date().toISOString() }, ...list];
    });
  }, []);

  /** Called when the decrypt-verify step confirms every salary moved in full. */
  const markVerified = useCallback((txHash: `0x${string}`, ok: boolean) => {
    dirty.current = true;
    setRuns((list) => list.map((r) => (r.txHash === txHash ? { ...r, verified: ok } : r)));
  }, []);

  return { runs, loaded, syncError, addRun, markVerified };
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
