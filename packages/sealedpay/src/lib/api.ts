/**
 * Client for SealedPay's own backend (Vercel functions under /api).
 *
 * Every call carries the Privy access token (verified server-side), a hard
 * timeout, and maps failures to one calm, service-named sentence — the UI
 * never surfaces a raw fetch error. 404-shaped "nothing there yet" responses
 * are DATA (null), not errors, so empty states render without toasts.
 */
import { getAccessToken } from "@privy-io/react-auth";

const API_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  let token: string | null = null;
  try {
    token = await getAccessToken();
  } catch {
    // getAccessToken throws on a network hiccup during token refresh — that's a
    // connectivity problem, not an expired session, so don't tell the user to
    // sign in again (which they can't while offline).
    throw new ApiError("Couldn't reach the sign-in service to refresh your session. Check your connection and try again.", 0);
  }
  if (!token) throw new ApiError("Your session expired. Sign in again to continue.", 401);

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new ApiError("The SealedPay server took too long to respond. Check your connection and try again.", 0);
    }
    throw new ApiError("Couldn't reach the SealedPay server. Check your connection and try again.", 0);
  }

  if (!res.ok) {
    // The server puts its human-readable reason in { error } — surface it
    // verbatim (it already names the failing service), else a calm fallback.
    let msg = "";
    try {
      const data = (await res.json()) as { error?: string };
      msg = data.error ?? "";
    } catch {
      /* non-JSON error body */
    }
    if (!msg) {
      msg =
        res.status === 401
          ? "Your session expired. Sign in again to continue."
          : res.status >= 500
            ? "The SealedPay server hit a problem. Try again in a moment."
            : "That request didn't go through. Try again.";
    }
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

/* ── Types shared with the server (kept in sync by hand — one source file
      each side, no codegen for a build this size) ─────────────────────────── */

export interface RosterEmployee {
  id: string;
  name: string;
  role?: string;
  dept?: string;
  email?: string;
  address: `0x${string}`;
  salary: string;
  /** Demo-seed row — cleared by "clear demo data", never pregenerated. */
  sample?: boolean;
}

export interface RunEntryRecord {
  name: string;
  address: `0x${string}`;
  requested: `0x${string}`;
  transferred: `0x${string}`;
}

export interface RunRecord {
  id: string;
  txHash: `0x${string}`;
  dateISO: string;
  employeeCount: number;
  totalText: string;
  verified?: boolean;
  entries: RunEntryRecord[];
}

export interface Profile {
  name: string;
  avatar: string;
  /** The employer's last-connected payroll wallet (labels the employee's payments). */
  walletAddress?: `0x${string}`;
  /** In-app notification prefs (employee portal). */
  notifyPayments?: boolean;
  notifyVerifications?: boolean;
  /** The account's surface, written ONCE on first sign-in. An email is either
   * an employer or an employee, never both (enforced by the Gate + server). */
  role?: "employer" | "employee";
  /** Employer only: the company name employees see as their employer. */
  companyName?: string;
}

export interface Employment {
  employerId: string;
  employerName: string;
  /** The employer's company name (what the portal shows when present). */
  employerCompany?: string;
  employerAddress?: `0x${string}`;
  me: { name: string; role?: string; dept?: string; salary: string; address: `0x${string}` };
}

export interface MeResponse {
  email?: string;
  address?: `0x${string}`;
  employments: Employment[];
}

/* ── Endpoints ───────────────────────────────────────────────────────────── */

export const api = {
  /** Employer: the roster. null = nothing stored yet (seed opportunity). */
  getRoster: () => call<{ employees: RosterEmployee[] | null }>("GET", "/api/roster"),
  putRoster: (employees: RosterEmployee[]) => call<{ ok: true }>("PUT", "/api/roster", { employees }),

  /** Employer: recorded payroll runs. */
  getRuns: () => call<{ runs: RunRecord[] | null }>("GET", "/api/runs"),
  putRuns: (runs: RunRecord[]) => call<{ ok: true }>("PUT", "/api/runs", { runs }),

  /** Either side: display profile. Partial updates merge on the server. */
  getProfile: () => call<{ profile: Profile | null }>("GET", "/api/profile"),
  putProfile: (profile: Partial<Profile>) => call<{ ok: true }>("PUT", "/api/profile", { profile }),

  /** Employer: email → pregenerated wallet address (creates the Privy user +
   * embedded wallet if the email has never signed in). Never reveals whether
   * the account pre-existed (no membership enumeration). */
  pregen: (email: string) => call<{ address: `0x${string}` }>("POST", "/api/pregen", { email }),

  /** Employee: who employs me (rosters containing my login email). */
  me: () => call<MeResponse>("GET", "/api/me"),
};
