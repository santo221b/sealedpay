/**
 * SealedPay — confidential payroll on-chain, per the design handoff.
 *
 * This shell owns ALL state and every piece of real wiring; everything under
 * src/dashboard/** is presentation. The confidential-disperse engine
 * (@dispersekit/widget) is frozen: the only calls are its exported APIs.
 *
 * Real wiring (per the handoff's Real-vs-Simulated list):
 * - wallet connect, addresses and Etherscan links are real
 * - the Run Payroll steps are the real encrypt → authorize → disperse →
 *   verify flow (see dashboard/RunPayrollModal.tsx, THE SEAM)
 * - the wallet balance is the employer's actual encrypted-balance handle,
 *   revealed by a real one-signature user decryption; Fund Wallet is a real
 *   faucet mint; Payroll runway derives from the decrypted balance
 * - employee payment-history rows for live runs decrypt REAL ciphertext
 *   handles stored at confirmation time
 * - history, activity, chart caps and notifications reflect real runs on top
 *   of the design's intended seed data
 */
import {
  DEMO_TOKEN_ADDRESS,
  DisperseProviders,
  SEPOLIA_CHAIN_ID,
  formatAmount,
  useDisperseFlow,
  useTokenMeta,
  type DeliveryResult,
} from "@dispersekit/widget";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";

import type { DashboardData, NavIndex, PopupKind, Person, ToastState } from "./dashboard/contracts";
import { Rail } from "./dashboard/Rail";
import { RunPayrollModal } from "./dashboard/RunPayrollModal";
import { TopBar } from "./dashboard/TopBar";
import { WalletSidebar } from "./dashboard/WalletSidebar";
import { AddEmployeeModal } from "./dashboard/modals/AddEmployeeModal";
import { FundWalletModal } from "./dashboard/modals/FundWalletModal";
import { LogoutModal } from "./dashboard/modals/LogoutModal";
import { NotificationsPanel } from "./dashboard/modals/NotificationsPanel";
import { PermissionPrompt } from "./dashboard/modals/PermissionPrompt";
import { ProfilePopup } from "./dashboard/modals/ProfilePopup";
import { ReminderModal } from "./dashboard/modals/ReminderModal";
import { SearchPalette } from "./dashboard/modals/SearchPalette";
import { SettingsPanel } from "./dashboard/modals/SettingsPanel";
import { SignedOutScreen } from "./dashboard/modals/SignedOutScreen";
import { Toast } from "./dashboard/modals/Toast";
import { EmployeeView } from "./dashboard/screens/EmployeeView";
import { Home } from "./dashboard/screens/Home";
import { Insights } from "./dashboard/screens/Insights";
import { Team } from "./dashboard/screens/Team";
import { tokens } from "./design/tokens";
import { validateEmployee, useEmployees } from "./lib/employees";
import { useHistory } from "./lib/history";
import { useNotifications } from "./lib/notifications";
import { savePendingRun, useOrphanRun } from "./lib/orphan";
import { loadIdentity } from "./lib/prefs";
import { useSettings } from "./lib/prefs";
import { rosterToRows } from "./lib/roster";
import { SEEDED_KEY, SEED_EMPLOYEES, fmtAmount, shortWallet } from "./lib/seed";
import { useVerifyRun } from "./lib/verifyRun";
import { activityRows, employeeRows, encryptedAmountsCount, toPerson, toRunViews } from "./lib/views";
import { useFundWallet, useWalletBalance } from "./lib/wallet";
import { Onboarding } from "./onboarding/Onboarding";
import { sealedTheme } from "./theme";

const TOKEN = DEMO_TOKEN_ADDRESS;

/** Card-style compact amount per the design ("4.5K"). */
function compactAmount(v: number): string {
  if (v >= 1000) {
    const k = Math.round((v / 1000) * 10) / 10;
    return `${k % 1 === 0 ? k.toFixed(0) : k}K`;
  }
  return fmtAmount(v);
}

export function App() {
  const [onboarded, setOnboarded] = useState(() => loadIdentity().onboarded);
  return (
    <DisperseProviders theme={sealedTheme}>
      {onboarded ? <Dashboard /> : <Onboarding onDone={() => setOnboarded(true)} />}
    </DisperseProviders>
  );
}

function Dashboard() {
  /* ── data hooks ────────────────────────────────────────────────────────── */
  const { address: employer } = useAccount();
  const { employees, add } = useEmployees();
  const { runs: liveRuns, addRun, markVerified } = useHistory();
  const { settings, set: setSetting } = useSettings();
  const { notifs, unread, add: addNotif, markRead, markAllRead } = useNotifications();
  const { decimals } = useTokenMeta(TOKEN);
  const balance = useWalletBalance(decimals);
  const retro = useVerifyRun(TOKEN);

  /* ── ui state ──────────────────────────────────────────────────────────── */
  const [nav, setNav] = useState<NavIndex>(0);
  const [empId, setEmpId] = useState<string>();
  const [tab, setTab] = useState("All");
  const [activeBar, setActiveBar] = useState("May");
  const [popup, setPopup] = useState<PopupKind>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [revealMonthly, setRevealMonthly] = useState(false);
  const [empReveal, setEmpReveal] = useState(false);
  const [empRows, setEmpRows] = useState<Record<string, boolean>>({});
  const [toast, setToastState] = useState<ToastState | null>(null);
  const [permPrompt, setPermPrompt] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toastTimer = useRef<number>(undefined);

  const identity = loadIdentity();

  const showToast = useCallback((kind: "ok" | "err", msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToastState({ kind, msg, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToastState(null), 4200);
  }, []);

  /* ── seed the design's demo team once, on first dashboard visit ────────── */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (!localStorage.getItem(SEEDED_KEY) && employees.length === 0) {
      for (const s of SEED_EMPLOYEES) add({ name: s.name, role: s.role, dept: s.dept, address: s.address, salary: s.salary });
      localStorage.setItem(SEEDED_KEY, "1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── notification permission prompt (design: 900ms after first load) ───── */
  useEffect(() => {
    if (localStorage.getItem("sealedpay_notifperm")) return;
    const t = window.setTimeout(() => setPermPrompt(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  /* ── the frozen engine flow (one instance, owned here) ─────────────────── */
  const orphan = useOrphanRun(addRun);
  const pendingRun = useRef<{ totalText: string; names: string[] }>(undefined);
  const onDispersed = useCallback(
    (result: DeliveryResult) => {
      const meta = pendingRun.current;
      // addRun is idempotent by txHash, so a confirmation retry can't duplicate.
      addRun({
        txHash: result.txHash,
        employeeCount: result.recipients.length,
        totalText: meta?.totalText ?? "",
        entries: result.recipients.map((address, i) => ({
          name: meta?.names[i] ?? "",
          address,
          requested: result.requested[i],
          transferred: result.transferred[i],
        })),
      });
      // Clear this run's pending record from persistence AND in-memory state so
      // the orphan banner can never re-surface it after a confirmed delivery.
      orphan.dismiss(result.txHash);
      addNotif({ title: "Payroll delivered", sub: `${result.recipients.length} paid · verified · just now`, color: "#3bbf8e", tone: "ok" });
      showToast("ok", `Payroll delivered · ${result.recipients.length} paid · verified`);
      void balance.refresh();
    },
    [addRun, orphan, addNotif, showToast, balance],
  );
  const onFlowError = useCallback(
    (error: Error) => {
      // Post-broadcast confirmation retries are handled inside the modal.
      if (/transaction was sent/i.test(error.message)) return;
      addNotif({ title: "Payroll failed", sub: "no funds moved · retry", color: "#e07a6a", tone: "err" });
      showToast("err", "Payroll failed · no funds moved · retry");
    },
    [addNotif, showToast],
  );
  const flow = useDisperseFlow({ token: TOKEN, chainId: SEPOLIA_CHAIN_ID, onDispersed, onError: onFlowError });

  // Persist a recovery record the moment a tx hash exists (orphan safety).
  useEffect(() => {
    if (flow.pendingTxHash && pendingRun.current) {
      savePendingRun({ txHash: flow.pendingTxHash, names: pendingRun.current.names, totalText: pendingRun.current.totalText, startedAt: new Date().toISOString() });
    }
  }, [flow.pendingTxHash]);

  // Immediate post-run verification → history ✓ badge.
  const reportedFor = useRef<string>(undefined);
  useEffect(() => {
    if (flow.verification && flow.delivery && reportedFor.current !== flow.delivery.txHash) {
      reportedFor.current = flow.delivery.txHash;
      markVerified(flow.delivery.txHash, flow.verification.every((v) => v.ok));
    }
  }, [flow.verification, flow.delivery, markVerified]);

  // startRun: selection → validated rows → goToReview, then execute once the
  // engine state reflects the rows (the frozen hook commits state per render).
  const executeWhenReady = useRef(0);
  const startRun = useCallback(
    async (selected: Person[]): Promise<string | null> => {
      if (decimals === undefined) return "Token details are still loading, try again in a second.";
      const pseudo = selected.map((p, i) => ({ id: String(i), name: p.name, address: p.wallet as `0x${string}`, salary: String(p.salary) }));
      const parsed = rosterToRows(pseudo, decimals);
      if (parsed.issues.length > 0) return parsed.namedProblems.join(" · ");
      if (parsed.rows.length === 0) return "Nobody selected.";
      pendingRun.current = { totalText: formatAmount(parsed.total, decimals), names: selected.map((p) => p.name) };
      executeWhenReady.current = parsed.rows.length;
      await flow.goToReview(parsed.rows);
      return null;
    },
    [decimals, flow],
  );
  useEffect(() => {
    if (executeWhenReady.current > 0 && flow.phase === "review" && flow.rows.length === executeWhenReady.current) {
      executeWhenReady.current = 0;
      void flow.execute();
    }
  }, [flow.phase, flow.rows, flow]);

  const closePayroll = useCallback(() => {
    setPayrollOpen(false);
    flow.reset();
    void balance.refresh();
  }, [flow, balance]);

  /* ── derived views ─────────────────────────────────────────────────────── */
  const people = useMemo(() => employees.map(toPerson), [employees]);
  const runsView = useMemo(() => toRunViews(liveRuns), [liveRuns]);
  const activity = useMemo(() => activityRows(runsView), [runsView]);
  const monthlyTotal = useMemo(() => people.reduce((a, p) => a + p.salary, 0), [people]);

  const runwayValue = useMemo(() => {
    if (balance.raw === undefined || decimals === undefined || monthlyTotal <= 0) return undefined;
    const monthlyBase = parseUnits(String(monthlyTotal) as `${number}`, decimals);
    if (monthlyBase === 0n) return undefined;
    return String(balance.raw / monthlyBase).padStart(2, "0");
  }, [balance.raw, decimals, monthlyTotal]);

  const showAll = !settings.maskDefault;

  const data: DashboardData = {
    people,
    runs: runsView,
    monthly: {
      value: compactAmount(monthlyTotal),
      revealed: showAll || revealMonthly,
      toggle: () => setRevealMonthly(true), // design: stays revealed once shown
    },
    runway: {
      value: runwayValue,
      revealed: (showAll || balance.revealed) && runwayValue !== undefined,
      pending: balance.pending,
      toggle: () => {
        if (balance.revealed) balance.hide();
        else void balance.reveal(); // real decryption (one signature) feeds the runway
      },
      hint: balance.revealed ? "tap to hide" : "tap to reveal",
    },
    balance: {
      value: balance.value,
      revealed: (showAll || balance.revealed) && balance.value !== undefined,
      pending: balance.pending,
      toggle: () => (balance.revealed ? balance.hide() : void balance.reveal()),
      error: balance.error,
    },
    encryptedCount: encryptedAmountsCount(runsView),
    employerAddress: employer,
    profile: { name: identity.name || "there", avatar: identity.avatar },
    showAll,
    activeBar,
    setActiveBar,
    reminderSet: settings.reminderSet,
  };

  /* ── employee view wiring (real per-row decryption for live rows) ──────── */
  const person = people.find((p) => p.id === empId);
  const decryptedRows = useMemo(() => {
    const out: Record<string, number | undefined> = {};
    if (decimals === undefined) return out;
    for (const [runId, entries] of Object.entries(retro.results)) {
      for (const e of entries) out[`${runId}:${e.address.toLowerCase()}`] = Number(formatUnits(e.transferredAmount, decimals));
    }
    return out;
  }, [retro.results, decimals]);
  const decryptingMap = useMemo(() => (retro.busyRunId ? { [retro.busyRunId]: true } : {}), [retro.busyRunId]);
  const personRows = useMemo(
    () => (person ? employeeRows(person, liveRuns, decryptedRows, decryptingMap) : []),
    [person, liveRuns, decryptedRows, decryptingMap],
  );

  const openEmployee = useCallback((id: string) => {
    setEmpId(id);
    setEmpReveal(false);
    setEmpRows({});
    setNav(3);
  }, []);

  const toggleRow = useCallback(
    (row: { key: string; live: boolean; amount?: number }) => {
      if (!row.live || row.amount !== undefined) {
        setEmpRows((m) => ({ ...m, [row.key]: !m[row.key] }));
        return;
      }
      // Live row, not yet decrypted: one signature decrypts the whole run's
      // stored handles (the employer holds permanent ACL on them).
      const runId = row.key.split(":")[0];
      const run = liveRuns.find((r) => r.id === runId);
      if (run) {
        void retro.verifyRun(run).then((ok) => {
          // Only consume the reveal when the decrypt actually resolved; a
          // rejected signature or disconnected wallet leaves the row masked
          // (the failure surfaces via retro.error) rather than silently
          // flipping to a blank "revealed" state.
          if (ok === undefined) return;
          markVerified(run.txHash, ok);
          setEmpRows((m) => ({ ...m, [row.key]: true }));
        });
      }
    },
    [liveRuns, retro, markVerified],
  );

  /* ── layout ────────────────────────────────────────────────────────────── */
  if (loggedOut) {
    return <SignedOutScreen name={identity.name || "there"} onSignIn={() => setLoggedOut(false)} />;
  }

  const navSel = (nav === 3 ? 1 : nav) as 0 | 1 | 2;
  // The oldest pending record that isn't the run currently in flight.
  const orphanRecord = orphan.orphanFor(flow.pendingTxHash);

  return (
    <div className="relative flex h-screen w-full overflow-hidden" style={{ background: tokens.bg.app, fontFamily: "'Manrope', sans-serif", color: tokens.text.heading }}>
      {/* Fixed background glows (per the extraction: 90% 45% and -1% 70%) */}
      <div className="pointer-events-none absolute" style={{ left: "90%", top: "45%", width: 760, height: 760, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.36), rgba(0,0,0,0) 66%)", filter: "blur(30px)" }} />
      <div className="pointer-events-none absolute" style={{ left: "-1%", top: "70%", width: 520, height: 520, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.22), rgba(0,0,0,0) 66%)", filter: "blur(34px)" }} />

      <Rail
        navSel={navSel}
        onNav={(n) => {
          setNav(n);
          setPopup(null);
        }}
        onBell={() => setPopup(popup === "bell" ? null : "bell")}
        onGear={() => setPopup(popup === "gear" ? null : "gear")}
        onLogout={() => setLogoutOpen(true)}
        bellUnread={unread > 0}
      />

      <div className="relative min-w-0 flex-1">
        <TopBar
          profile={data.profile}
          onSearchFocus={() => setSearchOpen(true)}
          onBell={() => setPopup(popup === "bell" ? null : "bell")}
          onGear={() => setPopup(popup === "gear" ? null : "gear")}
          onProfile={() => setProfileOpen(true)}
        />

        {/* Top-edge fade, visible only once scrolled */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20"
          style={{ height: 96, background: "linear-gradient(180deg, #0c1310 20%, rgba(12,19,16,0) 100%)", opacity: scrolled ? 1 : 0, transition: "opacity .25s" }}
        />

        {/* The ONLY scrolling element */}
        <div
          className="slim-scroll h-full overflow-y-auto"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 6)}
          style={{ paddingTop: 97 }}
        >
          <div className="mx-auto flex max-w-[1060px] gap-5 px-7 pb-4">
            <main className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={nav === 3 ? `emp-${empId}` : nav} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  {nav === 0 && <Home data={data} tab={tab} setTab={setTab} />}
                  {nav === 1 && (
                    <Team data={data} onRunPayroll={() => setPayrollOpen(true)} onAddEmployee={() => setAddOpen(true)} onOpenEmployee={openEmployee} />
                  )}
                  {nav === 2 && <Insights data={data} />}
                  {nav === 3 && person && (
                    <EmployeeView
                      person={person}
                      rows={personRows}
                      salaryRevealed={showAll || empReveal}
                      onToggleSalary={() => setEmpReveal((r) => !r)}
                      onToggleRow={toggleRow}
                      rowRevealed={(row) => showAll || (empRows[row.key] === true && (!row.live || row.amount !== undefined))}
                      showAll={showAll}
                      paymentsCount={String(personRows.length).padStart(2, "0")}
                      onBack={() => setNav(1)}
                      employerAddress={employer}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {orphanRecord && flow.phase === "input" && (
                <div className="mt-5 rounded-2xl p-3.5" style={{ background: "rgba(224,178,95,0.08)", border: "1px solid rgba(224,178,95,0.35)", color: "#e6c082", fontSize: 12 }}>
                  <p className="mb-2">
                    An earlier payroll run was sent (
                    <a className="underline" href={`https://sepolia.etherscan.io/tx/${orphanRecord.txHash}`} target="_blank" rel="noreferrer">
                      {orphanRecord.txHash.slice(0, 10)}
                    </a>
                    ) but this page closed before it was recorded.
                  </p>
                  <span className="flex items-center gap-3">
                    <button className="rounded-full px-3 py-1.5 font-semibold" style={{ background: "#3bbf8e", color: "#0b1512" }} onClick={() => void orphan.recover(orphanRecord)} disabled={orphan.busy}>
                      {orphan.busy ? "Checking" : "Check & record"}
                    </button>
                    <button className="hover:underline" onClick={() => orphan.dismiss(orphanRecord.txHash)}>
                      Dismiss
                    </button>
                    {orphan.message && <span>{orphan.message}</span>}
                  </span>
                </div>
              )}

              <p className="pt-8 pb-5 text-center" style={{ fontSize: 10, color: "rgba(233,244,238,0.5)" }}>
                SealedPay · Powered by DisperseKit · TokenOps disperse · Zama FHE
              </p>
            </main>

            {nav !== 3 && <WalletSidebar data={data} onFund={() => setFundOpen(true)} activity={activity} />}
          </div>
        </div>
      </div>

      {/* ── modals & panels ──────────────────────────────────────────────── */}
      <NotificationsPanel open={popup === "bell"} onClose={() => setPopup(null)} notifs={notifs} onRead={markRead} onMarkAllRead={markAllRead} />
      <SettingsPanel open={popup === "gear"} onClose={() => setPopup(null)} maskDefault={settings.maskDefault} reminders={settings.reminders} autoverify={settings.autoverify} onToggle={(key, value) => setSetting(key, value)} />
      <AddEmployeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(values) => {
          const problem = validateEmployee({ name: values.name, role: values.role, dept: values.dept, address: values.wallet, salary: values.salary || "0" }, decimals);
          if (problem) return problem;
          add({ name: values.name, role: values.role || "Employee", dept: values.dept, address: values.wallet, salary: values.salary || "0" });
          addNotif({ title: "Employee added", sub: `${values.name.trim()} · ${values.dept}`, color: "#9db3aa", tone: "info" });
          setAddOpen(false);
          return null;
        }}
      />
      <FundWalletModalWired open={fundOpen} onClose={() => setFundOpen(false)} employer={employer} decimals={decimals} onFunded={() => { void balance.refresh(); showToast("ok", "Wallet funded"); addNotif({ title: "Funds deposited", sub: "faucet mint confirmed on Sepolia", color: "#3bbf8e", tone: "ok" }); }} />
      <SearchPalette
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchQ("");
        }}
        query={searchQ}
        setQuery={setSearchQ}
        people={people}
        runs={runsView}
        onPickPerson={(id) => {
          openEmployee(id);
          setSearchOpen(false);
          setSearchQ("");
        }}
        onPickRun={(month) => {
          setNav(0);
          setActiveBar(month);
          setSearchOpen(false);
          setSearchQ("");
        }}
      />
      <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => { setLogoutOpen(false); setLoggedOut(true); }} />
      <ProfilePopup open={profileOpen} onClose={() => setProfileOpen(false)} name={identity.name || "there"} avatar={identity.avatar} employerShort={employer ? shortWallet(employer) : undefined} />
      <ReminderModal
        open={remindOpen}
        onClose={() => setRemindOpen(false)}
        reminderSet={settings.reminderSet}
        onConfirm={() => {
          setSetting("reminderSet", !settings.reminderSet);
          setRemindOpen(false);
        }}
      />
      <PermissionPrompt
        open={permPrompt}
        onEnable={() => {
          localStorage.setItem("sealedpay_notifperm", "granted");
          setPermPrompt(false);
          showToast("ok", "Notifications enabled");
        }}
        onDismiss={() => {
          localStorage.setItem("sealedpay_notifperm", "denied");
          setPermPrompt(false);
        }}
      />
      <RunPayrollModal open={payrollOpen} people={people} flow={flow} decimals={decimals} autoverify={settings.autoverify} onStart={startRun} onClose={closePayroll} />
      <Toast toast={toast} />
    </div>
  );
}

/** Fund Wallet wired to the real faucet mint. */
function FundWalletModalWired({ open, onClose, employer, decimals, onFunded }: { open: boolean; onClose: () => void; employer?: `0x${string}`; decimals?: number; onFunded: () => void }) {
  const fund = useFundWallet(decimals, onFunded);
  return (
    <FundWalletModal
      open={open}
      onClose={onClose}
      employerShort={employer ? shortWallet(employer) : "connect a wallet"}
      busy={fund.busy}
      error={fund.error}
      onFund={async (amount) => {
        const ok = await fund.fund(amount);
        if (ok) onClose();
        return ok;
      }}
    />
  );
}
