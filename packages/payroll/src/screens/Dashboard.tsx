/** Screen A — the overview the app opens on. Stats, next payout, recent runs. */
import { formatAmount } from "@dispersekit/widget";
import { motion } from "framer-motion";

import { AmountCell, CardIcon, EmptyState, ExternalIcon, LockIcon, PButton, SectionCard, Skeleton, StatCard, StatusChip, UsersIcon } from "../components/kit";
import type { Employee } from "../lib/employees";
import type { PayoutRun } from "../lib/history";
import { EXPLORER } from "../theme";

export function Dashboard({
  employees,
  runs,
  nextDue,
  total,
  decimals,
  symbol,
  canRun,
  onRunPayroll,
  onAddTeam,
  onSeeAll,
}: {
  employees: Employee[];
  runs: PayoutRun[];
  nextDue?: Date;
  total?: bigint;
  decimals?: number;
  symbol: string;
  canRun: boolean;
  onRunPayroll: () => void;
  onAddTeam: () => void;
  onSeeAll: () => void;
}) {
  const lastRun = runs[0];
  const daysToNext =
    nextDue !== undefined ? Math.max(0, Math.ceil((nextDue.getTime() - Date.now()) / 86_400_000)) : undefined;

  if (employees.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="Add your team to run your first payroll"
          line="Employees live only in this browser. Salaries never appear on-chain in the clear — that's the whole point."
          cta={<PButton onClick={onAddTeam}>Add your team</PButton>}
        />
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard
            icon={<UsersIcon />}
            label="Headcount"
            value={`${employees.length} employee${employees.length === 1 ? "" : "s"}`}
            sub="active roster"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard
            icon={<LockIcon />}
            label="Monthly payroll"
            value={
              total !== undefined && decimals !== undefined ? (
                <AmountCell value={formatAmount(total, decimals)} suffix={symbol} />
              ) : (
                <Skeleton className="h-5 w-20" />
              )
            }
            sub="encrypted on-chain"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            icon={<CardIcon />}
            label="Next payout"
            value={daysToNext !== undefined ? (daysToNext === 0 ? "due today" : `in ${daysToNext} day${daysToNext === 1 ? "" : "s"}`) : "—"}
            sub={nextDue ? nextDue.toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "set a date in Settings"}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard
            icon={<CardIcon />}
            label="Last run"
            value={lastRun ? new Date(lastRun.date).toLocaleDateString() : "—"}
            sub={
              lastRun ? (
                <StatusChip tone={lastRun.verified === false ? "red" : "green"}>
                  Paid{lastRun.verified && " · ✓ verified"}
                </StatusChip>
              ) : (
                "no payouts yet"
              )
            }
          />
        </motion.div>
      </div>

      {/* Next payout card */}
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-800">
              {nextDue
                ? `Next payout · ${nextDue.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
                : "No payout scheduled"}
            </p>
            <p className="text-xs text-stone-400">
              Monthly cadence · display only — payroll runs when you click, never automatically
            </p>
          </div>
          <PButton onClick={onRunPayroll} disabled={!canRun}>
            <LockIcon /> Run payroll now
          </PButton>
        </div>
        {!canRun && (
          <p className="mt-2 text-xs text-stone-400">Connect a wallet (Sepolia) to run payroll.</p>
        )}
      </SectionCard>

      {/* Recent payouts */}
      <SectionCard
        title="Recent payouts"
        action={
          runs.length > 0 && (
            <button className="text-xs font-medium text-orange-600 hover:underline" onClick={onSeeAll}>
              See all →
            </button>
          )
        }
      >
        {runs.length === 0 ? (
          <p className="py-2 text-sm text-stone-400">Your first run will appear here.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {runs.slice(0, 3).map((run) => (
              <li key={run.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-stone-700">{new Date(run.date).toLocaleDateString()}</span>
                <span className="text-stone-400">{run.employeeCount} paid</span>
                <AmountCell value={run.totalText} suffix={symbol} />
                <span className="flex items-center gap-2">
                  {run.verified && <StatusChip tone="green">✓ verified</StatusChip>}
                  <a
                    className="inline-flex items-center gap-1 font-mono text-xs text-orange-600 hover:underline"
                    href={`${EXPLORER}/tx/${run.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    tx <ExternalIcon />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
