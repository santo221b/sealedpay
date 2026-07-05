/**
 * Confidential Payroll — employer-only dashboard over the frozen DisperseKit
 * engine. Shell owns all shared state (roster, history, THE flow instance) so
 * a payroll run survives navigation between screens.
 *
 * Deliberately absent: employee logins, scheduling/automation (next-due is
 * display-only), taxes/compliance, and any new on-chain code.
 */
import {
  DEMO_TOKEN_ADDRESS,
  DisperseProviders,
  formatAmount,
  LockIcon,
  PrivacyBadge,
  SEPOLIA_CHAIN_ID,
  useDisperseFlow,
  useTokenMeta,
  type DeliveryResult,
} from "@dispersekit/widget";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import { Sidebar, type Screen } from "./components/Sidebar";
import { PButton } from "./components/kit";
import { useEmployees } from "./lib/employees";
import { useHistory, useNextDue } from "./lib/history";
import { rosterToRows } from "./lib/roster";
import { useVerifyRun } from "./lib/verifyRun";
import { Dashboard } from "./screens/Dashboard";
import { Payments } from "./screens/Payments";
import { People } from "./screens/People";
import { Run } from "./screens/Run";
import { Settings } from "./screens/Settings";
import { payrollTheme } from "./theme";
import { themeToCssVars } from "@dispersekit/widget";

const TOKEN = DEMO_TOKEN_ADDRESS;

const TITLES: Record<Screen, { title: string; sub?: string }> = {
  dashboard: { title: "Payroll", sub: "Amounts encrypted on-chain · only you and each employee can see them" },
  people: { title: "Team" },
  payments: { title: "Payments" },
  settings: { title: "Settings" },
  run: { title: "Run payroll", sub: "One transaction · salaries sealed end-to-end" },
};

export function App() {
  return (
    <DisperseProviders theme={payrollTheme}>
      <Shell />
    </DisperseProviders>
  );
}

function Shell() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const { isConnected, chain } = useAccount();
  const { employees, add, update, remove } = useEmployees();
  const { runs, addRun, markVerified } = useHistory();
  const { nextDue, manual, setManual } = useNextDue(runs[0]?.date);
  const { symbol: rawSymbol, decimals } = useTokenMeta(TOKEN);
  const symbol = rawSymbol ?? "cUSDd";
  const retro = useVerifyRun(TOKEN);
  const [openAddSignal, setOpenAddSignal] = useState(0);
  const [runWarnings, setRunWarnings] = useState<string[]>([]);
  const [runProblems, setRunProblems] = useState<string[]>([]);
  // Snapshot taken when a run starts, consumed when delivery confirms.
  const pendingRun = useRef<{ totalText: string; names: Map<string, string> }>(undefined);

  const onDispersed = useCallback(
    (result: DeliveryResult) => {
      const meta = pendingRun.current;
      addRun({
        txHash: result.txHash,
        employeeCount: result.recipients.length,
        totalText: meta?.totalText ?? "",
        // Ciphertext handles only — provable later, never plaintext.
        entries: result.recipients.map((address, i) => ({
          name: meta?.names.get(address.toLowerCase()) ?? "—",
          address,
          requested: result.requested[i],
          transferred: result.transferred[i],
        })),
      });
    },
    [addRun],
  );

  const flow = useDisperseFlow({ token: TOKEN, chainId: SEPOLIA_CHAIN_ID, onDispersed });

  // Relay the immediate post-run verification into history's ✓ badge.
  const reportedFor = useRef<string>(undefined);
  useEffect(() => {
    if (flow.verification && flow.delivery && reportedFor.current !== flow.delivery.txHash) {
      reportedFor.current = flow.delivery.txHash;
      markVerified(flow.delivery.txHash, flow.verification.every((v) => v.ok));
    }
  }, [flow.verification, flow.delivery, markVerified]);

  const canRun = isConnected && chain?.id === SEPOLIA_CHAIN_ID && employees.length > 0 && decimals !== undefined && Boolean(TOKEN);

  const total = useMemo(() => {
    if (decimals === undefined || employees.length === 0) return undefined;
    try {
      return rosterToRows(employees, decimals).total;
    } catch {
      return undefined;
    }
  }, [employees, decimals]);

  /** The only path into the run screen: parse the roster, hand rows to the engine. */
  const startRun = useCallback(() => {
    if (decimals === undefined) return;
    const parsed = rosterToRows(employees, decimals);
    setRunProblems(parsed.namedProblems);
    setRunWarnings(parsed.warnings);
    if (parsed.issues.length > 0 || parsed.rows.length === 0) {
      setScreen("people"); // problems are fixed on the roster, show them there
      return;
    }
    pendingRun.current = {
      totalText: formatAmount(parsed.total, decimals),
      names: new Map(employees.map((e) => [e.address.toLowerCase(), e.name])),
    };
    void flow.goToReview(parsed.rows);
    setScreen("run");
  }, [employees, decimals, flow]);

  const finishRun = useCallback(() => {
    flow.reset();
    setScreen("dashboard");
  }, [flow]);

  const retroVerify = useCallback(
    (run: Parameters<typeof retro.verifyRun>[0]) => {
      void retro.verifyRun(run).then((allOk) => {
        if (allOk !== undefined) markVerified(run.txHash, allOk);
      });
    },
    [retro, markVerified],
  );

  const header = TITLES[screen];
  const runInProgress = flow.phase !== "input" && screen !== "run";

  return (
    <div style={themeToCssVars(payrollTheme) as React.CSSProperties} className="flex min-h-screen bg-stone-50 text-stone-900">
      <Sidebar screen={screen} onNav={setScreen} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur">
          <div className="flex items-center justify-between gap-6 px-8 py-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold">{header.title}</h1>
              {header.sub && (
                <p className="flex items-center gap-1 truncate text-[11px] text-stone-400">
                  <LockIcon className="h-3 w-3 shrink-0 text-orange-500" /> <span className="truncate">{header.sub}</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {screen !== "run" && (
                // Hidden on very narrow widths — the Dashboard card carries the CTA there.
                <PButton onClick={startRun} disabled={!canRun} className="hidden sm:inline-flex">
                  <LockIcon /> Run payroll
                </PButton>
              )}
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
          {runInProgress && (
            <button
              className="block w-full bg-orange-600 px-8 py-1.5 text-left text-xs font-medium text-white"
              onClick={() => setScreen("run")}
            >
              A payroll run is in progress — tap to return to it
            </button>
          )}
        </header>

        <main className="px-8 py-6">
          {runProblems.length > 0 && screen === "people" && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600">
              <p className="mb-1 font-semibold">Fix these before running payroll:</p>
              {runProblems.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {screen === "dashboard" && (
                <Dashboard
                  employees={employees}
                  runs={runs}
                  nextDue={nextDue}
                  total={total}
                  decimals={decimals}
                  symbol={symbol}
                  canRun={canRun}
                  onRunPayroll={startRun}
                  onAddTeam={() => {
                    setScreen("people");
                    setOpenAddSignal((s) => s + 1);
                  }}
                  onSeeAll={() => setScreen("payments")}
                />
              )}
              {screen === "people" && (
                <People
                  employees={employees}
                  decimals={decimals}
                  symbol={symbol}
                  onAdd={add}
                  onUpdate={update}
                  onRemove={remove}
                  openAddSignal={openAddSignal}
                />
              )}
              {screen === "payments" && (
                <Payments
                  runs={runs}
                  symbol={symbol}
                  decimals={decimals}
                  canVerify={isConnected && chain?.id === SEPOLIA_CHAIN_ID}
                  busyRunId={retro.busyRunId}
                  verifyError={retro.error}
                  verified={retro.results}
                  onVerifyRun={retroVerify}
                  onRunPayroll={startRun}
                  canRun={canRun}
                />
              )}
              {screen === "settings" && <Settings manual={manual} setManual={setManual} nextDue={nextDue} symbol={symbol} />}
              {screen === "run" && (
                <Run flow={flow} employees={employees} decimals={decimals} symbol={symbol} warnings={runWarnings} onDone={finishRun} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
