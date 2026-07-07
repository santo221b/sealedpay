/**
 * Derivations that merge the design's seed data with REAL run history into
 * the view shapes the dashboard screens render. Pure functions, no IO.
 */
import type { Person, PayRow, RunView, ActivityRow } from "../dashboard/contracts";
import type { Employee } from "./employees";
import type { PayoutRun } from "./history";
import { SEED_EMPLOYEES, SEED_HISTORY, fmtAmount } from "./seed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Seed metadata for a roster member, matched by NAME. The roster may share a
 * single wallet (test flow), so an address match would collapse everyone onto
 * one seed row — the name is the stable identity. Returns undefined for
 * user-added employees (they carry no seeded history).
 */
function seedByName(name: string) {
  return SEED_EMPLOYEES.find((s) => s.name === name);
}

export function toPerson(e: Employee): Person {
  const seed = seedByName(e.name);
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

/**
 * Live runs (newest first) followed by seeded months (newest first).
 *
 * Seed months are the design's real dates + tx hashes, but their paid-count
 * and total are DERIVED from the current roster — not the old hardcoded
 * numbers — so the Payout Activity / Insights charts always agree with the
 * per-employee payment history. Each seeded month pays every roster member
 * whose seed entry started on/before it; the total is the sum of their salaries.
 */
export function toRunViews(live: PayoutRun[], people: Person[]): RunView[] {
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
  const seedViews: RunView[] = SEED_HISTORY.map((h, i) => {
    const roster = people.filter((p) => {
      const meta = seedByName(p.name);
      return meta !== undefined && meta.historyStart <= i;
    });
    return {
      id: `seed-${h.month}`,
      month: h.month,
      date: h.date,
      dateFull: h.dateFull,
      paid: roster.length,
      total: roster.reduce((sum, p) => sum + p.salary, 0),
      tx: h.tx,
      url: `https://sepolia.etherscan.io/tx/${h.tx}`,
      live: false,
      verified: true,
    };
  }).reverse(); // newest first
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
    // Match by NAME and key by POSITION — the roster may share one wallet, so an
    // address match/key would collide every recipient onto the same entry.
    const idx = r.entries?.findIndex((e) => e.name === person.name) ?? -1;
    if (idx < 0) continue;
    const d = new Date(r.date);
    const key = `${r.id}:${idx}`;
    liveRows.push({
      key,
      date: `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      tx: r.txHash,
      url: `https://sepolia.etherscan.io/tx/${r.txHash}`,
      amount: decrypted[key],
      live: true,
      verified: r.verified === true,
      decrypting: decrypting[r.id] === true,
    });
  }
  const seed = seedByName(person.name);
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
          verified: true,
        }))
    : [];
  return [...liveRows, ...seedRows];
}

/**
 * Recent-activity panel: live runs prepend and push seeded base rows off. The
 * base rows are derived from the current roster / newest seeded run so they
 * never contradict the charts or name an employee who no longer exists.
 */
export function activityRows(runs: RunView[], people: Person[]): ActivityRow[] {
  const liveRuns = runs.filter((r) => r.live).slice(0, 4);
  const rows: ActivityRow[] = liveRuns.map((r) => ({
    key: r.id,
    title: "Payroll run",
    sub: `${r.date} · ${r.paid} paid · ${fmtAmount(r.total)} cUSDd`,
    // Only "Verified" once the decrypt-verify step confirmed it; else "Pending".
    pill: r.verified ? "Verified" : "Pending",
    url: r.url,
    icon: "run",
  }));
  const n = liveRuns.length;
  const latestSeed = runs.find((r) => !r.live);
  const newest = people[people.length - 1];
  if (n < 4 && latestSeed)
    rows.push({ key: "base0", title: "Payroll run", sub: `${latestSeed.date} · ${latestSeed.paid} paid · ${fmtAmount(latestSeed.total)} cUSDd`, pill: "Verified", url: latestSeed.url, icon: "run" });
  if (n < 3 && newest)
    rows.push({ key: "base1", title: "Employee added", sub: `${newest.name} · ${newest.dept}`, pill: "Active", icon: "person" });
  if (n < 2) rows.push({ key: "base2", title: "Operator authorized", sub: "expires in 1 h", pill: "Pending", icon: "key" });
  if (n < 1) rows.push({ key: "base3", title: "Funds deposited", sub: "demo faucet", pill: "Verified", icon: "deposit" });
  return rows;
}

/** Privacy scorecard: every per-recipient amount ever encrypted (seed + live). */
export function encryptedAmountsCount(runs: RunView[]): number {
  return runs.reduce((a, r) => a + r.paid, 0);
}
