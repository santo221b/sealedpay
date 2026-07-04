/**
 * Confidential Payroll — an employer-only dashboard skinned over the
 * DisperseKit engine. Everything payroll-specific (roster, history, next-due)
 * is browser-local; everything on-chain/cryptographic is the shared engine,
 * imported unchanged from @dispersekit/widget (see RunPayroll.tsx — THE SEAM).
 *
 * Deliberately NOT here: employee logins, scheduling/automation (next-due is
 * display-only; the sole payout trigger is the button), or any new contract.
 */
import {
  AccountChip,
  ConnectGate,
  DisperseProviders,
  DEMO_TOKEN_ADDRESS,
  PrivacyBadge,
  useTokenMeta,
} from "@dispersekit/widget";
import { useCallback } from "react";

import { EmployeeManager } from "./components/EmployeeManager";
import { PayoutHistory } from "./components/PayoutHistory";
import { RunPayroll } from "./components/RunPayroll";
import { useEmployees } from "./lib/employees";
import { useHistory, useNextDue } from "./lib/history";

const TOKEN = DEMO_TOKEN_ADDRESS;

export function App() {
  return (
    <DisperseProviders>
      <Dashboard />
    </DisperseProviders>
  );
}

function Dashboard() {
  const { employees, add, update, remove } = useEmployees();
  const { runs, addRun, markVerified } = useHistory();
  const { nextDue, manual, setManual } = useNextDue(runs[0]?.date);
  const { symbol, decimals } = useTokenMeta(TOKEN);

  const onRunConfirmed = useCallback(
    (run: { txHash: `0x${string}`; employeeCount: number; totalText: string }) => addRun(run),
    [addRun],
  );

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="font-bold">Confidential Payroll</h1>
            <p className="text-[11px] text-neutral-400">salaries encrypted end-to-end · powered by DisperseKit</p>
          </div>
          <div className="flex items-center gap-2">
            <AccountChip />
            <PrivacyBadge
              copy={{
                hiddenBody:
                  "Every salary and the payroll total — encrypted in your browser. Only you (the employer) and each employee can ever decrypt an amount, and employees see only their own.",
                visibleBody:
                  "Employee wallet addresses and that a payroll run happened. What each person earns stays sealed.",
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-6">
        {/* Wallet gate renders nothing once connected on Sepolia. */}
        <ConnectGate />

        <EmployeeManager
          employees={employees}
          decimals={decimals}
          symbol={symbol ?? "cUSDd"}
          onAdd={add}
          onUpdate={update}
          onRemove={remove}
        />

        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-neutral-800">Next payout due</h2>
              <p className="text-sm text-neutral-500">
                {nextDue
                  ? nextDue.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                  : "— (runs monthly from your last payout, or set a date)"}
                <span className="ml-2 text-xs text-neutral-400">
                  display only — payouts run only when you click the button
                </span>
              </p>
            </div>
            <label className="text-xs text-neutral-500">
              set manually:{" "}
              <input
                type="date"
                className="rounded-lg border border-neutral-300 px-2 py-1"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            </label>
          </div>
        </section>

        <RunPayroll
          employees={employees}
          token={TOKEN}
          onRunConfirmed={onRunConfirmed}
          onVerificationResult={markVerified}
        />

        <PayoutHistory runs={runs} symbol={symbol ?? "cUSDd"} />
      </main>
    </div>
  );
}
