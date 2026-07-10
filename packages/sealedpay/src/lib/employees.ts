/**
 * Employee roster — server-backed, per employer (Privy user).
 *
 * The SealedPay backend (Upstash via /api/roster) is the source of truth so an
 * employer sees the same team on every device. A per-tenant localStorage copy
 * paints instantly while the fetch is in flight; every mutation is optimistic
 * with a debounced PUT behind it, and sync failures surface as one calm,
 * deduped message (the shell toasts it).
 *
 * A brand-new tenant (server returns null) is seeded with the demo team ONCE,
 * flagged `sample: true` — "clear demo data" simply removes those rows, which
 * makes the cleared state itself sync across devices.
 *
 * Salaries are stored as the human-entered string ("2500.5") and only
 * converted to base units at payroll time, through the widget's validated
 * parser — so the euint64/rounding/checksum guards apply there, not here.
 */
import { getAddress, isAddress } from "viem";
import { isValidAmountText } from "@dispersekit/widget";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, type RosterEmployee } from "./api";
import { SEED_EMPLOYEES } from "./seed";

export interface Employee {
  id: string;
  name: string;
  /** Optional job title, display only. */
  role?: string;
  /** Team, e.g. Engineering / Design / Operations. */
  dept?: string;
  /** Login email — the payroll identity; the wallet was derived from it. */
  email?: string;
  address: `0x${string}`;
  /** Human units, e.g. "2500.5" (cUSDd). */
  salary: string;
  /** Demo-seed row (clearable, never pregenerated). */
  sample?: boolean;
}

export type EmployeeInput = { name: string; role?: string; dept?: string; email?: string; address: string; salary: string };

const CACHE_PREFIX = "dispersekit.payroll.employees.v2:";

function loadCache(userId: string): Employee[] | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Employee[];
    return parsed.filter(
      (e) => e && typeof e.id === "string" && typeof e.name === "string" && typeof e.address === "string" && typeof e.salary === "string",
    );
  } catch {
    return undefined;
  }
}

/** Checksum when the address is well-formed; otherwise keep exactly what was
 *  entered — address problems surface at run time, never by silent drops. */
function normalizeAddress(address: string): `0x${string}` {
  const trimmed = address.trim();
  return (isAddress(trimmed) ? getAddress(trimmed) : trimmed) as `0x${string}`;
}

/** Validation shared by add + edit. Returns a problem string or null if OK. */
export function validateEmployee(input: EmployeeInput, decimals?: number): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (!isValidAmountText(input.salary)) return "Salary must be a plain decimal, e.g. 2500.50";
  const fraction = input.salary.trim().split(".")[1];
  if (decimals !== undefined && fraction && fraction.length > decimals) {
    return `The token supports at most ${decimals} decimal places.`;
  }
  return null;
}

function fromInput(input: EmployeeInput, extra?: Partial<Employee>): Employee {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    role: input.role?.trim() || undefined,
    dept: input.dept?.trim() || undefined,
    email: input.email?.trim().toLowerCase() || undefined,
    address: normalizeAddress(input.address),
    salary: input.salary.trim(),
    ...extra,
  };
}

const SYNC_DEBOUNCE_MS = 700;

export function useEmployees() {
  const { user, ready, authenticated } = usePrivy();
  const userId = ready && authenticated ? (user?.id ?? null) : null;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const syncTimer = useRef<number>(undefined);
  const loadedFor = useRef<string>(undefined);

  /* Load: instant cache paint, then the server truth; seed a brand-new tenant. */
  useEffect(() => {
    if (!userId || loadedFor.current === userId) return;
    loadedFor.current = userId;
    setLoaded(false);
    // ALWAYS reset on a tenant switch — carrying the previous account's roster
    // in state until the fetch returns would flash tenant A's data at tenant B —
    // and drop any unflushed dirty payload so it can't PUT into the new tenant.
    dirty.current = false;
    window.clearTimeout(syncTimer.current);
    const cached = loadCache(userId);
    setEmployees(cached ?? []);
    let cancelled = false;
    void (async () => {
      try {
        const { employees: server } = await api.getRoster();
        if (cancelled) return;
        if (server === null) {
          // First visit ever for this employer: seed the demo team (sample rows).
          const seeded = SEED_EMPLOYEES.map((s) =>
            fromInput({ name: s.name, role: s.role, dept: s.dept, email: s.email, address: s.address, salary: s.salary }, { sample: true }),
          );
          setEmployees(seeded);
          try {
            await api.putRoster(seeded as RosterEmployee[]);
          } catch (e) {
            if (!cancelled) setSyncError(e instanceof Error ? e.message : String(e));
          }
        } else {
          // A local edit made WHILE the fetch was in flight wins (dirty) — the
          // scheduled PUT reconciles the server; otherwise adopt server truth.
          setEmployees((prev) => (dirty.current ? prev : (server as Employee[])));
        }
      } catch (e) {
        // Offline / server down: the cached roster (if any) stays usable.
        if (!cancelled) setSyncError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* Cache locally + debounce the server PUT after any mutation. */
  const dirty = useRef(false);
  useEffect(() => {
    if (!userId || !loaded) return;
    try {
      localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(employees));
    } catch {
      /* cache is best-effort */
    }
    if (!dirty.current) return; // don't echo the initial load back to the server
    const flush = () => {
      dirty.current = false;
      api
        .putRoster(employees as RosterEmployee[])
        .then(() => setSyncError(undefined))
        .catch((e: unknown) => {
          // Re-arm so a failed sync retries on the next mutation / tab hide.
          dirty.current = true;
          setSyncError(e instanceof Error ? e.message : String(e));
        });
    };
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(flush, SYNC_DEBOUNCE_MS);
    // Tab hidden (switch/close/refresh) → flush NOW instead of losing the
    // debounce window. The local cache + next-load still backstop a hard kill.
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current) {
        window.clearTimeout(syncTimer.current);
        flush();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [employees, userId, loaded]);
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  const mutate = useCallback((fn: (list: Employee[]) => Employee[]) => {
    dirty.current = true;
    setEmployees(fn);
  }, []);

  const add = useCallback((input: EmployeeInput) => mutate((list) => [...list, fromInput(input)]), [mutate]);

  const update = useCallback(
    (id: string, input: EmployeeInput) =>
      mutate((list) =>
        list.map((e) =>
          e.id === id
            ? {
                ...e,
                name: input.name.trim(),
                role: input.role?.trim() || undefined,
                dept: input.dept?.trim() || undefined,
                email: input.email?.trim().toLowerCase() || e.email,
                address: normalizeAddress(input.address),
                salary: input.salary.trim(),
              }
            : e,
        ),
      ),
    [mutate],
  );

  const remove = useCallback((id: string) => mutate((list) => list.filter((e) => e.id !== id)), [mutate]);

  /** Remove the demo rows (per-tenant; syncs across devices like any edit). */
  const clearSamples = useCallback(() => mutate((list) => list.filter((e) => !e.sample)), [mutate]);

  /** Replace the whole roster (kept for edge/migration paths). */
  const replaceAll = useCallback(
    (inputs: EmployeeInput[]) => mutate(() => inputs.map((input) => fromInput(input))),
    [mutate],
  );

  const hasSamples = employees.some((e) => e.sample);

  return { employees, loaded, hasSamples, syncError, add, update, remove, replaceAll, clearSamples };
}
