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
  isValidAmountText,
  useDisperseFlow,
  useTokenMeta,
  type DeliveryResult,
} from "@dispersekit/widget";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, useDisconnect } from "wagmi";

import type { DashboardData, NavIndex, PopupKind, Person, ToastState } from "./dashboard/contracts";
import { Rail } from "./dashboard/Rail";
import { RunPayrollModal } from "./dashboard/RunPayrollModal";
import { TourOverlay, TOUR_STEPS, TOUR_DEFAULT_ON, type TourStep } from "./dashboard/TourOverlay";
import { TopBar } from "./dashboard/TopBar";
import { WalletControl } from "./dashboard/WalletControl";
import { EmployeeSidebar } from "./dashboard/EmployeeSidebar";
import { WalletSidebar } from "./dashboard/WalletSidebar";
import { AddEmployeeModal } from "./dashboard/modals/AddEmployeeModal";
import { FundWalletModal } from "./dashboard/modals/FundWalletModal";
import { LogoutModal } from "./dashboard/modals/LogoutModal";
import { NotificationsPanel } from "./dashboard/modals/NotificationsPanel";
import { PermissionPrompt } from "./dashboard/modals/PermissionPrompt";
import { ProfilePopup } from "./dashboard/modals/ProfilePopup";
import { ReminderModal } from "./dashboard/modals/ReminderModal";
import { RecipientNoticeModal } from "./dashboard/modals/RecipientNoticeModal";
import { SettingsPanel } from "./dashboard/modals/SettingsPanel";
import { Toast } from "./dashboard/modals/Toast";
import { EmployeeView } from "./dashboard/screens/EmployeeView";
import { Home } from "./dashboard/screens/Home";
import { MyPay } from "./dashboard/screens/MyPay";
import { Insights } from "./dashboard/screens/Insights";
import { Team } from "./dashboard/screens/Team";
import { tokens } from "./design/tokens";
import { validateEmployee, useEmployees, type Employee } from "./lib/employees";
import { useHistory } from "./lib/history";
import { useNotifications } from "./lib/notifications";
import { savePendingRun, useOrphanRun } from "./lib/orphan";
import { THEME_COLORS, setThemeColor } from "./lib/themeColor";
import { clearOnboarded, loadIdentity, loadSamplesCleared, loadTourSeen, setSamplesClearedPref, setTourSeenPref } from "./lib/prefs";
import { useSettings } from "./lib/prefs";
import { rosterToRows } from "./lib/roster";
import { SEEDED_KEY, SEED_EMPLOYEES, fmtAmount, midWallet, shortWallet } from "./lib/seed";
import { useVerifyRun } from "./lib/verifyRun";
import { activityRows, employeeRows, encryptedAmountsCount, toPerson, toRunViews, type FundingEvent } from "./lib/views";
import { useFundWallet, useWalletBalance } from "./lib/wallet";
import { Onboarding } from "./onboarding/Onboarding";
import { sealedTheme } from "./theme";

const TOKEN = DEMO_TOKEN_ADDRESS;
// Real deposits persist across reloads (cleared by Reset demo, which wipes the
// dispersekit.payroll.* keys). They are just display metadata — no secrets.
const FUNDINGS_KEY = "dispersekit.payroll.fundings.v1";

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
  // A ?view=mypay deep link opens the recipient view directly — shareable, works
  // on any device, and needs no employer login (the real recipient use case).
  const [recipient, setRecipient] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("view") === "mypay";
    } catch {
      return false;
    }
  });
  // Logout un-onboards you (clears the flag, keeps the identity), so it lands
  // back on the onboarding front door — pre-filled for a returning employer,
  // blank on a genuine first run.
  const identity = loadIdentity();
  const returning = identity.name.trim().length > 0;
  return (
    <DisperseProviders theme={sealedTheme} appName="SealedPay">
      {recipient ? (
        <MyPay onExit={() => setRecipient(false)} />
      ) : onboarded ? (
        <Dashboard onViewMyPay={() => setRecipient(true)} onLoggedOut={() => { clearOnboarded(); setOnboarded(false); }} />
      ) : (
        <Onboarding
          onDone={() => setOnboarded(true)}
          initialName={returning ? identity.name : ""}
          initialAvatar={returning ? identity.avatar : ""}
        />
      )}
    </DisperseProviders>
  );
}

function Dashboard({ onViewMyPay, onLoggedOut }: { onViewMyPay: () => void; onLoggedOut: () => void }) {
  /* ── toast (top-center) — also surfaces balance reveal / decrypt errors ── */
  const [toast, setToastState] = useState<ToastState | null>(null);
  const toastTimer = useRef<number>(undefined);
  const showToast = useCallback((kind: "ok" | "err", msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToastState({ kind, msg, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToastState(null), 4200);
  }, []);
  const onRevealError = useCallback((msg: string) => showToast("err", msg), [showToast]);

  /* ── data hooks ────────────────────────────────────────────────────────── */
  const { address: employer } = useAccount();
  const { disconnect } = useDisconnect();
  const { employees, add, update, remove, replaceAll } = useEmployees();
  const [editEmp, setEditEmp] = useState<Employee | null>(null); // employee being edited
  const { runs: liveRuns, addRun, markVerified } = useHistory();
  const { settings, set: setSetting } = useSettings();
  const { notifs, unread, add: addNotif, markRead, markAllRead } = useNotifications();
  const { decimals } = useTokenMeta(TOKEN);
  const balance = useWalletBalance(decimals, onRevealError);
  const retro = useVerifyRun(TOKEN);

  /* ── ui state ──────────────────────────────────────────────────────────── */
  const [nav, setNav] = useState<NavIndex>(0);
  const [empId, setEmpId] = useState<string>();
  const [tab, setTab] = useState("All");
  const [activeBar, setActiveBar] = useState(""); // defaulted to the third-last bar on load (effect below)
  const [popup, setPopup] = useState<PopupKind>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  // Testing-only entry to the recipient view — gated behind a one-off notice so
  // it is clearly a testing convenience, not a real product feature.
  const [recipientNoticeOpen, setRecipientNoticeOpen] = useState(false);
  const requestRecipientView = () => {
    setPopup(null);
    setPayrollOpen(false);
    setRecipientNoticeOpen(true);
  };

  // Keep the browser toolbar tinted to the dashboard (Safari).
  useEffect(() => {
    setThemeColor(THEME_COLORS.dashboard);
  }, []);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  // Real deposits, persisted so the Recent-activity row survives a reload.
  const [fundings, setFundings] = useState<FundingEvent[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FUNDINGS_KEY) ?? "[]") as FundingEvent[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(FUNDINGS_KEY, JSON.stringify(fundings));
  }, [fundings]);
  const [remindOpen, setRemindOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payrollOnlyId, setPayrollOnlyId] = useState<string | null>(null); // pay a single employee
  const [revealMonthly, setRevealMonthly] = useState(false);
  const [empReveal, setEmpReveal] = useState(false);
  const [empRows, setEmpRows] = useState<Record<string, boolean>>({});
  const [permPrompt, setPermPrompt] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* ── first-run guided tour (dormant unless TOUR_DEFAULT_ON or ?tour=1) ──── */
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourRipple, setTourRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const tourRippleId = useRef(0);
  const tourTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tourTimer.current), []);
  // A translucent click pulse centered on a data-tour element, so the tour's
  // auto-clicks read as deliberate before a screen or popover transition.
  const pulseAnchor = (anchor: string) => {
    const el = document.querySelector(`[data-tour="${anchor}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    tourRippleId.current += 1;
    setTourRipple({ x: r.left + r.width / 2, y: r.top + r.height / 2, key: tourRippleId.current });
  };
  // Put the app into the state a step needs (screen, opened employee, Settings
  // popover), rippling the element the step "clicks" when moving forward.
  const applyStepContext = (s: TourStep, doRipple: boolean) => {
    if (doRipple && s.clickAnchor) pulseAnchor(s.clickAnchor);
    if (s.openEmployee) {
      const first = data.people[0]; // the same row the ripple lands on
      if (first) openEmployee(first.id);
    } else if (s.nav !== undefined) {
      setNav(s.nav as NavIndex);
    }
    setPopup(s.openSettings ? "gear" : null);
  };
  useEffect(() => {
    let forced = false;
    try {
      forced = new URLSearchParams(window.location.search).has("tour");
    } catch {
      forced = false;
    }
    if (!(forced || TOUR_DEFAULT_ON)) return;
    if (!forced && loadTourSeen()) return;
    applyStepContext(TOUR_STEPS[0], false);
    setTourStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const advanceTour = (dir: 1 | -1) => {
    if (tourStep === null) return;
    window.clearTimeout(tourTimer.current);
    const next = tourStep + dir;
    if (next < 0) return;
    if (next >= TOUR_STEPS.length) {
      closeTour();
      return;
    }
    const s = TOUR_STEPS[next];
    if (dir === 1 && s.clickAnchor) {
      // Ripple the click, then a beat later perform the screen or popover
      // change, so click -> change -> highlight reads as three beats.
      pulseAnchor(s.clickAnchor);
      tourTimer.current = window.setTimeout(() => {
        applyStepContext(s, false);
        setTourStep(next);
      }, 760);
    } else {
      applyStepContext(s, false);
      setTourStep(next);
    }
  };
  const closeTour = () => {
    window.clearTimeout(tourTimer.current);
    setTourSeenPref(true);
    setTourStep(null);
    setPopup(null);
  };

  const identity = loadIdentity();

  /* ── seed / migrate the demo roster once per seed version ──────────────── */
  // On a new SEEDED_KEY version this REPLACES any prior roster (e.g. the older
  // 8-person seed) with the current SEED_EMPLOYEES — so a roster change lands
  // without the user having to clear localStorage by hand.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (!localStorage.getItem(SEEDED_KEY)) {
      replaceAll(
        SEED_EMPLOYEES.map((s) => ({ name: s.name, role: s.role, dept: s.dept, address: s.address, salary: s.salary })),
      );
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
      // "confirmed" (delivered on-chain), NOT "verified" — verification is a
      // separate decrypt step whose own toast fires from the effect below.
      addNotif({ title: "Payroll delivered", sub: `${result.recipients.length} paid · confirmed · just now`, color: "#5fe3ab", tone: "ok" });
      showToast("ok", `Payroll delivered · ${result.recipients.length} paid · confirmed`);
      setActiveBar(new Date().toLocaleString("en-US", { month: "short" })); // surface the fresh bar
      void balance.refresh();
    },
    [addRun, orphan, addNotif, showToast, balance],
  );
  const onFlowError = useCallback(
    (error: Error) => {
      // Post-broadcast confirmation retries are handled inside the modal.
      if (/transaction was sent/i.test(error.message)) return;
      // Rejections do not reach onError from the engine; handled by the effect
      // below. This path is genuine on-chain / setup failure.
      if (/reject|denied|cancel/i.test(error.message)) return;
      addNotif({ title: "Payroll failed", sub: "no funds moved · retry", color: "#e07a6a", tone: "err" });
      showToast("err", "Payroll failed · no funds moved · retry");
    },
    [addNotif, showToast],
  );
  const flow = useDisperseFlow({ token: TOKEN, chainId: SEPOLIA_CHAIN_ID, onDispersed, onError: onFlowError });

  // A wallet rejection sets flow.error but is NOT routed through onError — give
  // it the same toast + bell the success path gets (deduped by message).
  const toastedFlowErr = useRef<string>(undefined);
  useEffect(() => {
    const e = flow.error;
    if (!e || toastedFlowErr.current === e || /transaction was sent/i.test(e)) return;
    if (/reject|denied|cancel/i.test(e)) {
      toastedFlowErr.current = e;
      addNotif({ title: "Payroll cancelled", sub: "you declined the request · nothing was sent", color: "#e3b25f", tone: "warn" });
      showToast("err", "Payroll cancelled · nothing was sent");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.error]);

  // Re-verifying a past payment (tapping a row in EmployeeView) can be rejected;
  // surface it instead of leaving the row silently masked.
  const toastedRetroErr = useRef<string>(undefined);
  useEffect(() => {
    const e = retro.error;
    const key = e ? `${e.runId}:${e.message}` : undefined;
    if (!e || !key || toastedRetroErr.current === key) return;
    toastedRetroErr.current = key;
    showToast("err", /reject|denied|cancel/i.test(e.message) ? "Reveal cancelled in the wallet" : e.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retro.error]);

  // Persist a recovery record the moment a tx hash exists (orphan safety).
  useEffect(() => {
    if (flow.pendingTxHash && pendingRun.current) {
      savePendingRun({ txHash: flow.pendingTxHash, names: pendingRun.current.names, totalText: pendingRun.current.totalText, startedAt: new Date().toISOString() });
    }
  }, [flow.pendingTxHash]);

  // Immediate post-run verification → history ✓ badge + its OWN toast (only now
  // is a run truly "verified" — the delivery toast said "confirmed").
  const reportedFor = useRef<string>(undefined);
  useEffect(() => {
    if (flow.verification && flow.delivery && reportedFor.current !== flow.delivery.txHash) {
      reportedFor.current = flow.delivery.txHash;
      const n = flow.verification.length;
      const ok = flow.verification.filter((v) => v.ok).length;
      markVerified(flow.delivery.txHash, ok === n);
      if (ok === n) {
        addNotif({ title: "Payroll verified", sub: `${n} salaries decrypted and matched`, color: "#5fe3ab", tone: "ok" });
        showToast("ok", `Verified · ${n} salaries match on-chain`);
      } else {
        addNotif({ title: "Verification mismatch", sub: `${ok} of ${n} amounts matched`, color: "#e07a6a", tone: "err" });
        showToast("err", `Verify mismatch · only ${ok}/${n} matched`);
      }
    }
  }, [flow.verification, flow.delivery, markVerified, addNotif, showToast]);

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
      // Preflight against a KNOWN (revealed) balance: an underfunded run would
      // silently disperse encrypted zero (ERC-7984), so block it before gas.
      if (balance.raw !== undefined && parsed.total > balance.raw) {
        return `Your wallet holds ${formatAmount(balance.raw, decimals)} cUSDd but this run needs ${formatAmount(parsed.total, decimals)}. Fund the wallet first.`;
      }
      pendingRun.current = { totalText: formatAmount(parsed.total, decimals), names: selected.map((p) => p.name) };
      executeWhenReady.current = parsed.rows.length;
      await flow.goToReview(parsed.rows);
      return null;
    },
    [decimals, flow, balance],
  );
  useEffect(() => {
    if (executeWhenReady.current > 0 && flow.phase === "review" && flow.rows.length === executeWhenReady.current) {
      executeWhenReady.current = 0;
      void flow.execute();
    }
  }, [flow.phase, flow.rows, flow]);

  const closePayroll = useCallback(() => {
    setPayrollOpen(false);
    setPayrollOnlyId(null);
    flow.reset();
    void balance.refresh();
  }, [flow, balance]);

  // Employee page: edit a recipient wallet (validate + persist) and pay just one.
  // One-off "Pay {name}" validation — checks an ad-hoc recipient + amount for
  // a single payment WITHOUT persisting anything to the employee roster.
  const validatePayOne = useCallback(
    (recipient: string, amount: string): { recipient: string | null; amount: string | null } => {
      const recipientError = isAddress(recipient.trim())
        ? null
        : "Not a valid address (mixed-case must match its EIP-55 checksum).";
      let amountError: string | null = null;
      if (!isValidAmountText(amount)) {
        amountError = "Amount must be a plain decimal, e.g. 2500.50";
      } else if (Number(amount) <= 0) {
        amountError = "Amount must be greater than zero.";
      } else {
        const fraction = amount.trim().split(".")[1];
        if (decimals !== undefined && fraction && fraction.length > decimals) {
          amountError = `The token supports at most ${decimals} decimal places.`;
        }
      }
      return { recipient: recipientError, amount: amountError };
    },
    [decimals],
  );
  const onPayEmployee = useCallback(() => {
    setPayrollOnlyId(empId ?? null);
    setPayrollOpen(true);
  }, [empId]);

  /* ── derived views ─────────────────────────────────────────────────────── */
  // Sample (demo) data is hidden once the employer clears it, leaving only
  // their real employees, runs, and deposits — so a real transaction never
  // blends into the seed data.
  const [samplesCleared, setSamplesCleared] = useState(() => loadSamplesCleared());
  const clearSamples = () => {
    setSamplesClearedPref(true);
    setSamplesCleared(true);
    setNav(0);
  };
  const people = useMemo(() => {
    const all = employees.map(toPerson);
    return samplesCleared ? all.filter((p) => !p.sample) : all;
  }, [employees, samplesCleared]);
  const runsView = useMemo(() => {
    const all = toRunViews(liveRuns, people);
    return samplesCleared ? all.filter((r) => r.live) : all;
  }, [liveRuns, people, samplesCleared]);
  const activity = useMemo(() => activityRows(runsView, people, fundings, samplesCleared), [runsView, people, fundings, samplesCleared]);

  // Default the highlighted Payout Activity bar to the third-last month, once
  // per page load, so a reload always lands on the same deterministic bar
  // (independent of today's date). User hovers change it after that.
  const didInitBar = useRef(false);
  useEffect(() => {
    if (didInitBar.current || runsView.length === 0) return;
    didInitBar.current = true;
    const seedOldest = runsView.filter((r) => !r.live).map((r) => r.month).reverse();
    const liveOldest = runsView.filter((r) => r.live).map((r) => r.month).reverse();
    const months = [...seedOldest];
    for (const m of liveOldest) if (!months.includes(m)) months.push(m);
    if (months.length) setActiveBar(months[Math.max(0, months.length - 3)]);
  }, [runsView]);
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
    // Key by POSITION, not address: a test roster can share one wallet, so an
    // address key would collapse every recipient onto one entry (last wins).
    for (const [runId, entries] of Object.entries(retro.results)) {
      entries.forEach((e, i) => {
        out[`${runId}:${i}`] = Number(formatUnits(e.transferredAmount, decimals));
      });
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

  const navSel = (nav === 3 ? 1 : nav) as 0 | 1 | 2;
  // The oldest pending record that isn't the run currently in flight.
  const orphanRecord = orphan.orphanFor(flow.pendingTxHash);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden" style={{ background: tokens.bg.app, fontFamily: "'Manrope', sans-serif", color: tokens.text.heading }}>
      {/* Fixed background glows (90% 45% and -1% 70%) */}
      <div className="pointer-events-none absolute" style={{ left: "90%", top: "45%", width: 760, height: 760, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.36), rgba(0,0,0,0) 66%)", filter: "blur(30px)" }} />
      <div className="pointer-events-none absolute" style={{ left: "-1%", top: "70%", width: 520, height: 520, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.22), rgba(0,0,0,0) 66%)", filter: "blur(34px)" }} />

      {/* Top-edge fade behind the top bar, visible once scrolled */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30"
        style={{ height: 96, background: "linear-gradient(180deg, #070c0a 20%, rgba(7,12,10,0) 100%)", opacity: scrolled ? 1 : 0, transition: "opacity .25s" }}
      />

      <TopBar
        profile={data.profile}
        onProfile={() => setProfileOpen(true)}
        onHome={() => { setNav(0); setPopup(null); }}
        walletControl={<WalletControl />}
        search={{
          open: searchOpen,
          query: searchQ,
          setQuery: setSearchQ,
          onOpen: () => setSearchOpen(true),
          onClose: () => {
            setSearchOpen(false);
            setSearchQ("");
          },
          people,
          runs: runsView,
          onPickPerson: (id) => {
            openEmployee(id);
            setSearchOpen(false);
            setSearchQ("");
          },
          onPickRun: (run) => {
            // A payout's one verifiable artifact is its on-chain transaction —
            // open it on Etherscan (also highlights its month on the chart).
            setActiveBar(run.month);
            if (run.url) window.open(run.url, "_blank", "noopener,noreferrer");
            setSearchOpen(false);
            setSearchQ("");
          },
        }}
      />

      {/* Body: the shared left padding aligns the rail's left edge with the
          top-bar logo's left edge (both at 32.4px from the viewport). */}
      <div className="flex min-h-0 flex-1" style={{ paddingLeft: 32.4 }}>
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
        bellOpen={popup === "bell"}
        gearOpen={popup === "gear"}
        onClosePopover={() => setPopup(null)}
        bellPopover={
          <NotificationsPanel open={popup === "bell"} onClose={() => setPopup(null)} notifs={notifs} onRead={markRead} onMarkAllRead={markAllRead} />
        }
        gearPopover={
          <SettingsPanel open={popup === "gear"} onClose={() => setPopup(null)} maskDefault={settings.maskDefault} reminders={settings.reminders} autoverify={settings.autoverify} onToggle={(key, value) => setSetting(key, value)} onViewRecipient={requestRecipientView} onClearSamples={clearSamples} hasSamples={!samplesCleared} />
        }
      />

        {/* The ONLY scrolling element (paddings verbatim from the handoff). */}
        <div
          className="slim-scroll min-h-0 flex-1 overflow-y-auto"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 6)}
          style={{ padding: "97.2px 32.4px 21.6px 25.2px" }}
        >
          <div className="grid" style={{ gridTemplateColumns: "1fr 368.28px", gap: 25.2, alignItems: "start" }}>
            <main className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={nav === 3 ? `emp-${empId}` : nav} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  {nav === 0 && <Home data={data} tab={tab} setTab={setTab} onAddEmployee={() => setAddOpen(true)} />}
                  {nav === 1 && (
                    <Team data={data} onRunPayroll={() => { setPayrollOnlyId(null); setPayrollOpen(true); }} onAddEmployee={() => setAddOpen(true)} onOpenEmployee={openEmployee} />
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
                      onPay={onPayEmployee}
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
                    <button className="rounded-full px-3 py-1.5 font-medium" style={{ background: "#5fe3ab", color: "#0b1512" }} onClick={() => void orphan.recover(orphanRecord)} disabled={orphan.busy}>
                      {orphan.busy ? "Checking" : "Check & record"}
                    </button>
                    <button className="hover:underline" onClick={() => orphan.dismiss(orphanRecord.txHash)}>
                      Dismiss
                    </button>
                    {orphan.message && <span>{orphan.message}</span>}
                  </span>
                </div>
              )}
            </main>

            {/* Right column: Payroll Wallet (nav 0-2) or the employee's Next-payout panel */}
            {nav === 3 && person ? (
              <EmployeeSidebar
                person={person}
                paymentsCount={String(personRows.length).padStart(2, "0")}
                reminderSet={settings.reminderSet}
                onRemind={() => setRemindOpen(true)}
                onEdit={() => {
                  const e = employees.find((x) => x.id === empId);
                  if (e) setEditEmp(e);
                }}
              />
            ) : (
              <WalletSidebar data={data} onFund={() => setFundOpen(true)} activity={activity} />
            )}
          </div>

          <p className="text-center" style={{ fontSize: 11, color: "rgba(233,244,238,0.62)", paddingTop: 35, paddingBottom: 9 }}>
            SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps disperse · Zama FHE
          </p>
        </div>
      </div>

      {/* ── modals & panels ──────────────────────────────────────────────── */}
      {/* Notifications + Settings popovers render inside the Rail, anchored to
          their icons; the search dropdown renders inside the TopBar. */}
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
      <AddEmployeeModal
        open={Boolean(editEmp)}
        onClose={() => setEditEmp(null)}
        initial={editEmp ? { name: editEmp.name, role: editEmp.role ?? "", salary: editEmp.salary, dept: editEmp.dept ?? "Engineering", wallet: editEmp.address } : undefined}
        onAdd={(values) => {
          if (!editEmp) return null;
          const problem = validateEmployee({ name: values.name, role: values.role, dept: values.dept, address: values.wallet, salary: values.salary || "0" }, decimals);
          if (problem) return problem;
          update(editEmp.id, { name: values.name, role: values.role || "Employee", dept: values.dept, address: values.wallet, salary: values.salary || "0" });
          addNotif({ title: "Employee updated", sub: `${values.name.trim()} · ${values.dept}`, color: "#9db3aa", tone: "info" });
          setEditEmp(null);
          return null;
        }}
        onRemove={() => {
          if (editEmp) {
            remove(editEmp.id);
            addNotif({ title: "Employee removed", sub: editEmp.name, color: "#9db3aa", tone: "info" });
          }
          setEditEmp(null);
          setNav(1);
        }}
      />
      <FundWalletModalWired
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        employer={employer}
        decimals={decimals}
        onFail={(m) => showToast("err", m)}
        onFunded={({ amountText, hash }) => {
          const shown = Number(amountText).toLocaleString("en-US", { maximumFractionDigits: 6 });
          setFundings((f) => [{ key: `fund-${hash}`, amountText: shown, url: `https://sepolia.etherscan.io/tx/${hash}` }, ...f].slice(0, 3));
          void balance.refresh();
          showToast("ok", `+${shown} cUSDd added to your wallet`);
          addNotif({ title: "Funds added", sub: `+${shown} cUSDd · faucet mint on Sepolia`, color: "#5fe3ab", tone: "ok" });
          // Close from here so the modal exits straight from the "transferring"
          // view — batched with the phase reset, no flash back to the form.
          setFundOpen(false);
        }}
      />
      <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={() => { setLogoutOpen(false); disconnect(); onLoggedOut(); }} />
      <RecipientNoticeModal open={recipientNoticeOpen} onClose={() => setRecipientNoticeOpen(false)} onConfirm={() => { setRecipientNoticeOpen(false); onViewMyPay(); }} />
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
          showToast("ok", "In-app alerts on");
        }}
        onDismiss={() => {
          localStorage.setItem("sealedpay_notifperm", "denied");
          setPermPrompt(false);
        }}
      />
      <RunPayrollModal open={payrollOpen} people={payrollOnlyId ? people.filter((p) => p.id === payrollOnlyId) : people} flow={flow} decimals={decimals} autoverify={settings.autoverify} onStart={startRun} onClose={closePayroll} onValidatePayOne={payrollOnlyId ? validatePayOne : undefined} balance={payrollOnlyId ? data.balance : undefined} myAddress={employer} onViewMyPay={requestRecipientView} />
      {tourStep !== null && (
        <TourOverlay
          step={TOUR_STEPS[tourStep]}
          index={tourStep}
          total={TOUR_STEPS.length}
          ripple={tourRipple}
          onNext={() => advanceTour(1)}
          onBack={() => advanceTour(-1)}
          onClose={closeTour}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

/** Fund Wallet wired to the real faucet mint. */
function FundWalletModalWired({
  open,
  onClose,
  employer,
  decimals,
  onFunded,
  onFail,
}: {
  open: boolean;
  onClose: () => void;
  employer?: `0x${string}`;
  decimals?: number;
  onFunded: (info: { amountText: string; hash: `0x${string}` }) => void;
  onFail: (msg: string) => void;
}) {
  const fund = useFundWallet(decimals, onFunded, onFail);
  return (
    <FundWalletModal
      open={open}
      onClose={onClose}
      employerShort={employer ? midWallet(employer) : "connect a wallet"}
      employerFull={employer}
      busy={fund.busy}
      phase={fund.phase}
      onFund={async (amount) => {
        // Success closes via onFunded (batched with the phase reset); only a
        // failure keeps the modal open to show the inline error.
        return fund.fund(amount);
      }}
    />
  );
}
