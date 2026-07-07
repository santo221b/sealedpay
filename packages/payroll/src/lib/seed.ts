/**
 * Pre-loaded sample data — intended by the design ("a demo team of 8 and
 * 6 months of payroll history", acknowledged during onboarding).
 *
 * Real-wiring choices (flagged in docs/PROGRESS.md):
 * - Seed employees carry REAL, valid Sepolia addresses (well-known dev
 *   accounts) so a real payroll run against the seed roster settles on-chain.
 *   The design's truncated wallet strings were display-only.
 * - Seed history rows link to REAL Sepolia transactions from this project's
 *   earlier live runs (the design's Jul row already referenced one of them).
 * - Live runs from useHistory() merge ON TOP of these constants everywhere
 *   (chart, activity, per-employee history), exactly as the design specifies.
 */
import type { Employee } from "./employees";

export const SEEDED_KEY = "sealedpay_seeded.v1";

/** Design seed roster (names/roles/salaries verbatim; addresses real dev accounts). */
export const SEED_EMPLOYEES: (Omit<Employee, "id"> & { seedIndex: number; joined: string; historyStart: number })[] = [
  { name: "Priya Sharma", role: "Engineer", dept: "Engineering", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", salary: "850", seedIndex: 0, joined: "Feb 2026", historyStart: 0 },
  { name: "Arjun Mehta", role: "Engineer", dept: "Engineering", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", salary: "780", seedIndex: 1, joined: "Feb 2026", historyStart: 0 },
  { name: "Mei Lin", role: "Backend Engineer", dept: "Engineering", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", salary: "720", seedIndex: 2, joined: "Feb 2026", historyStart: 0 },
  { name: "Daniel Okafor", role: "Platform Engineer", dept: "Engineering", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", salary: "650", seedIndex: 3, joined: "Apr 2026", historyStart: 2 },
  { name: "Sofia Reyes", role: "Product Designer", dept: "Design", address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", salary: "560.5", seedIndex: 4, joined: "Feb 2026", historyStart: 0 },
  { name: "Elena Petrova", role: "Brand Designer", dept: "Design", address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9", salary: "420", seedIndex: 5, joined: "May 2026", historyStart: 3 },
  { name: "Rohan Gupta", role: "Operations Lead", dept: "Operations", address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", salary: "320", seedIndex: 6, joined: "Feb 2026", historyStart: 0 },
  { name: "Marcus Chen", role: "Community Manager", dept: "Operations", address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", salary: "200", seedIndex: 7, joined: "Jun 2026", historyStart: 4 },
];

export interface SeedRun {
  month: string;
  date: string;
  dateFull: string;
  paid: number;
  total: number; // cUSDd, human units
  tx: `0x${string}`;
}

/** Six seeded months; tx hashes are REAL Sepolia transactions from this repo's live runs. */
export const SEED_HISTORY: SeedRun[] = [
  { month: "Feb", date: "Feb 28", dateFull: "Feb 28, 2026", paid: 6, total: 3750.5, tx: "0xd0621b616329a6e7ce035bd0d08736a9e642755c12b39144e5a5d3da3e54b2e1" },
  { month: "Mar", date: "Mar 31", dateFull: "Mar 31, 2026", paid: 6, total: 3750.5, tx: "0xc8d190a014015a8fe8aca9af82b49db44e61fd46a5ff2cece98033e81a6fe154" },
  { month: "Apr", date: "Apr 30", dateFull: "Apr 30, 2026", paid: 7, total: 4400.5, tx: "0x2a6640127ef5c52f01e36dd35de8ece9d0e4f6497de25cee66304abcb110cd76" },
  { month: "May", date: "May 31", dateFull: "May 31, 2026", paid: 7, total: 4400.5, tx: "0x782a7c9020eedb3c825e4ad10d94982e4561f553c09d90924dae4ce9534b6961" },
  { month: "Jun", date: "Jun 30", dateFull: "Jun 30, 2026", paid: 8, total: 4500.5, tx: "0x33a473738c638a8d45b272f46c020e45f847c115f06f03979579a560c0e19908" },
  { month: "Jul", date: "Jul 5", dateFull: "Jul 5, 2026", paid: 8, total: 4500.5, tx: "0xc3968e095187455c002e13f3a2e28c4cad132f3fd421ecf242bc3310f6e2e025" },
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
  { id: 1, title: "Payroll delivered", sub: "8 employees paid · verified · Just now", color: "#3bbf8e", read: false, tone: "ok" },
  { id: 2, title: "Authorization expiring", sub: "operator access ends in 45 min · 1 h ago", color: "#e3b25f", read: false, tone: "warn" },
  { id: 3, title: "Upcoming payout", sub: "Jul 31 · 8 employees scheduled · Yesterday", color: "#9db3aa", read: false, tone: "info" },
];

/** Design number formatting: 850 / 560.5 / 4,500.5 / 25,303. */
export function fmtAmount(v: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/** Design wallet display: 0x + 4 chars + ellipsis + last 4 (e.g. 0x8626…1799). */
export function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
