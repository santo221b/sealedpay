/**
 * Derivations that merge the design's seed data with REAL run history into
 * the view shapes the dashboard screens render. Pure functions, no IO.
 */
import type { Person, PayRow, RunView, ActivityRow } from "../dashboard/contracts";
import type { Employee } from "./employees";
import type { PayoutRun } from "./history";
import { SEED_EMPLOYEES, SEED_HISTORY, fmtAmount } from "./seed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toPerson(e: Employee): Person {
  const seed = SEED_EMPLOYEES.find((s) => s.address.toLowerCase() === e.address.toLowerCase());
  return {
    id: e.id,
    name: e.name,
    role: e.role ?? "Employee",
    dept: e.dept ?? "Engineering",
    wallet: e.address,
    salary: Number.parseFloat(e.salary) || 0,
    joined: seed?.joined ?? "Jul 2026",
  };
}

/** Live runs (newest first) followed by seeded months (newest first). */
export function toRunViews(live: PayoutRun[]): RunView[] {
  const liveViews: RunView[] = live.map((r) => {
    const d = new Date(r.date);
    const month = MONTHS[d.getMonth()];
    const day = d.getDate();
    return {
      id: r.id,
      month,
      date: `${month} ${day}`,
      dateFull: `${month} ${day}, ${d.getFullYear()}`,
      paid: r.employeeCount,
      total: Number.parseFloat(r.totalText.replace(/,/g, "")) || 0,
      tx: r.txHash,
      url: `https://sepolia.etherscan.io/tx/${r.txHash}`,
      live: true,
      verified: r.verified,
    };
  });
  const seedViews: RunView[] = SEED_HISTORY.slice()
    .reverse()
    .map((h) => ({
      id: `seed-${h.month}`,
      month: h.month,
      date: h.date,
      dateFull: h.dateFull,
      paid: h.paid,
      total: h.total,
      tx: h.tx,
      url: `https://sepolia.etherscan.io/tx/${h.tx}`,
      live: false,
      verified: true,
    }));
  return [...liveViews, ...seedViews];
}

/**
 * An employee's payment history: their live rows (runs whose entries include
 * their wallet) first, then their seeded months. Live-row amounts stay
 * undefined until really decrypted; seed rows carry the sample salary.
 */
export function employeeRows(
  person: Person,
  live: PayoutRun[],
  decrypted: Record<string, number | undefined>,
  decrypting: Record<string, boolean>,
): PayRow[] {
  const liveRows: PayRow[] = [];
  for (const r of live) {
    const entry = r.entries?.find((e) => e.address.toLowerCase() === person.wallet.toLowerCase());
    if (!entry) continue;
    const d = new Date(r.date);
    const key = `${r.id}:${person.wallet.toLowerCase()}`;
    liveRows.push({
      key,
      date: `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      tx: r.txHash,
      url: `https://sepolia.etherscan.io/tx/${r.txHash}`,
      amount: decrypted[key],
      live: true,
      decrypting: decrypting[r.id] === true,
    });
  }
  const seed = SEED_EMPLOYEES.find((s) => s.address.toLowerCase() === person.wallet.toLowerCase());
  const seedRows: PayRow[] = seed
    ? SEED_HISTORY.slice(seed.historyStart)
        .slice()
        .reverse()
        .map((h) => ({
          key: `seed-${h.month}-${seed.seedIndex}`,
          date: h.dateFull,
          tx: h.tx,
          url: `https://sepolia.etherscan.io/tx/${h.tx}`,
          amount: person.salary,
          live: false,
        }))
    : [];
  return [...liveRows, ...seedRows];
}

/** Recent-activity panel: live runs prepend and push seeded base rows off. */
export function activityRows(runs: RunView[]): ActivityRow[] {
  const liveRuns = runs.filter((r) => r.live).slice(0, 4);
  const rows: ActivityRow[] = liveRuns.map((r) => ({
    key: r.id,
    title: "Payroll run",
    sub: `${r.date} · ${r.paid} paid · ${fmtAmount(r.total)} cUSDd`,
    pill: "Verified",
    url: r.url,
    icon: "run",
  }));
  const n = liveRuns.length;
  if (n < 4) rows.push({ key: "base0", title: "Payroll run", sub: "Jul 5 · 8 paid · 4,500.5 cUSDd", pill: "Verified", url: `https://sepolia.etherscan.io/tx/${SEED_HISTORY[5].tx}`, icon: "run" });
  if (n < 3) rows.push({ key: "base1", title: "Employee added", sub: "Priya Sharma · Engineering", pill: "Active", icon: "person" });
  if (n < 2) rows.push({ key: "base2", title: "Operator authorized", sub: "expires in 1 h", pill: "Pending", icon: "key" });
  if (n < 1) rows.push({ key: "base3", title: "Funds deposited", sub: "Jul 3 · 5,000 cUSDd", pill: "Verified", icon: "deposit" });
  return rows;
}

/** Privacy scorecard: every per-recipient amount ever encrypted (seed + live). */
export function encryptedAmountsCount(runs: RunView[]): number {
  return runs.reduce((a, r) => a + r.paid, 0);
}
