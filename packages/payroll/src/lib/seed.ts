/**
 * Pre-loaded sample data — a demo team of 5 and 6 months of payroll history,
 * acknowledged during onboarding.
 *
 * Real-wiring choices (flagged in docs/PROGRESS.md):
 * - Test-flow roster: all 5 seed employees share ONE wallet (the connected
 *   employer's own address) so an end-to-end run can be exercised from the UI
 *   without funding five separate wallets — the disperse becomes a verifiable
 *   self-payment. Swap TEST_WALLET / add per-employee addresses for a real team.
 * - Seed history rows link to REAL Sepolia transactions from this project's
 *   earlier live runs (the design's Jul row already referenced one of them).
 * - Live runs from useHistory() merge ON TOP of these constants everywhere
 *   (chart, activity, per-employee history), exactly as the design specifies.
 */
import type { Employee } from "./employees";

// Bump this when the seed roster changes — the dashboard replaces any prior
// roster with the current SEED_EMPLOYEES once per version (see App seed effect).
export const SEEDED_KEY = "sealedpay_seeded.v2";

/**
 * Shared recipient for the test roster — the project wallet that holds the
 * demo cUSDd. Connect THIS wallet as the employer so a run pays it back to
 * itself and every amount decrypts for you.
 */
const TEST_WALLET = "0x3F9eEc56BC421da1decF8D03C50798882F943Fc3";

/** Test roster: 5 named employees, all sharing TEST_WALLET; salaries sum to 90 (fits a 100 cUSDd balance). */
export const SEED_EMPLOYEES: (Omit<Employee, "id"> & { seedIndex: number; joined: string; historyStart: number })[] = [
  { name: "Lewis Hamilton", role: "Engineer", dept: "Engineering", address: TEST_WALLET, salary: "24", seedIndex: 0, joined: "Feb 2026", historyStart: 0 },
  { name: "Max Verstappen", role: "Backend Engineer", dept: "Engineering", address: TEST_WALLET, salary: "20", seedIndex: 1, joined: "Feb 2026", historyStart: 0 },
  { name: "Charles Leclerc", role: "Product Designer", dept: "Design", address: TEST_WALLET, salary: "18", seedIndex: 2, joined: "Feb 2026", historyStart: 0 },
  { name: "Satoshi Nakamoto", role: "Protocol Architect", dept: "Engineering", address: TEST_WALLET, salary: "16", seedIndex: 3, joined: "Feb 2026", historyStart: 0 },
  { name: "Lionel Messi", role: "Community Manager", dept: "Operations", address: TEST_WALLET, salary: "12", seedIndex: 4, joined: "Feb 2026", historyStart: 0 },
];

export interface SeedRun {
  month: string;
  date: string;
  dateFull: string;
  tx: `0x${string}`;
}

/**
 * Six seeded months — the immutable facts only (dates + REAL Sepolia tx hashes
 * from this repo's live runs). Paid-count and total are NOT stored here: they
 * are derived from the roster in views.ts so the charts and the per-employee
 * history can never disagree.
 */
export const SEED_HISTORY: SeedRun[] = [
  { month: "Feb", date: "Feb 28", dateFull: "Feb 28, 2026", tx: "0xd0621b616329a6e7ce035bd0d08736a9e642755c12b39144e5a5d3da3e54b2e1" },
  { month: "Mar", date: "Mar 31", dateFull: "Mar 31, 2026", tx: "0xc8d190a014015a8fe8aca9af82b49db44e61fd46a5ff2cece98033e81a6fe154" },
  { month: "Apr", date: "Apr 30", dateFull: "Apr 30, 2026", tx: "0x2a6640127ef5c52f01e36dd35de8ece9d0e4f6497de25cee66304abcb110cd76" },
  { month: "May", date: "May 31", dateFull: "May 31, 2026", tx: "0x782a7c9020eedb3c825e4ad10d94982e4561f553c09d90924dae4ce9534b6961" },
  { month: "Jun", date: "Jun 30", dateFull: "Jun 30, 2026", tx: "0x33a473738c638a8d45b272f46c020e45f847c115f06f03979579a560c0e19908" },
  { month: "Jul", date: "Jul 5", dateFull: "Jul 5, 2026", tx: "0xc3968e095187455c002e13f3a2e28c4cad132f3fd421ecf242bc3310f6e2e025" },
];

export interface SeedNotification {
  id: number;
  title: string;
  sub: string;
  color: string;
  read: boolean;
  tone: "ok" | "warn" | "info" | "err";
}

export const SEED_NOTIFS: SeedNotification[] = [
  { id: 1, title: "Payroll delivered", sub: "8 employees paid · verified · Just now", color: "#5fe3ab", read: false, tone: "ok" },
  { id: 2, title: "Authorization expiring", sub: "operator access ends in 45 min · 1 h ago", color: "#e3b25f", read: false, tone: "warn" },
  { id: 3, title: "Upcoming payout", sub: "Jul 31 · 8 employees scheduled · Yesterday", color: "#9db3aa", read: false, tone: "info" },
];

/** Design summary formatting: 850 / 560.5 / 4,500.5 / 25,303 (1 decimal). */
export function fmtAmount(v: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/**
 * Full-precision formatting for real, exact amounts (a decrypted salary or a
 * dispersed total). Trailing zeros are trimmed, so seed values render the same
 * as fmtAmount, but a real 6-decimal cUSDd amount is never rounded away.
 */
export function fmtAmountFull(v: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
}

/** Design wallet display: 0x + 4 chars + ellipsis + last 4 (e.g. 0x8626…1799). */
export function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Middle-truncate a long 0x string (e.g. a 66-char tx hash) for tidy display. */
export function shortHash(hash: string): string {
  return hash.length <= 20 ? hash : `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
