/**
 * EmployeePortal — the employee's dashboard ("I get paid"), built as a TRUE
 * SIBLING of the employer dashboard: the same shell (TopBar, left icon rail
 * with bell + gear popovers, footer), the same two-column grid, the same
 * Payout-Activity-style bar chart (here: salary received by month), and the
 * same right-rail wallet card (the Payroll Wallet, repurposed as My Wallet
 * with Reveal in place of Fund). Two rail pages: Home and Payslips.
 *
 * All real: the scan reads ConfidentialTransfer logs, the reveal is a gasless
 * EIP-712 user-decryption via Zama — works with the email-embedded wallet on
 * any browser, Safari included. Errors surface as service-named toasts; every
 * async surface has an empty, loading, and failed state.
 */
import { formatAmount, SEPOLIA_CHAIN_ID } from "@dispersekit/widget";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { zeroAddress } from "viem";
import { useSwitchChain } from "wagmi";

import { Rail, type RailNavItem } from "../dashboard/Rail";
import { TopBar } from "../dashboard/TopBar";
import { WalletControl } from "../dashboard/WalletControl";
import { WalletSidebar } from "../dashboard/WalletSidebar";
import { LogoutModal } from "../dashboard/modals/LogoutModal";
import { NotificationsPanel } from "../dashboard/modals/NotificationsPanel";
import { ProfilePopup } from "../dashboard/modals/ProfilePopup";
import { Toast } from "../dashboard/modals/Toast";
import { yScale } from "../dashboard/screens/Home";
import type { ActivityRow, NotificationItem, ToastState } from "../dashboard/contracts";
import { RevealAmount } from "../design/RevealAmount";
import { HomeNav, PadlockGlyph, ReceiptCheckGlyph } from "../design/icons";
import { GlassCard, SettingToggle } from "../design/kit2";
import { tokens } from "../design/tokens";
import { api, type Employment } from "../lib/api";
import { useMyPay, type MyPayment } from "../lib/myPay";
import { loadIdentity } from "../lib/prefs";
import { fmtAmount, shortHash, shortWallet } from "../lib/seed";
import { THEME_COLORS, setThemeColor } from "../lib/themeColor";
import { exportPayslip } from "./payslip";

const EASE = [0.22, 1, 0.36, 1] as const;
const CH = 112; // chart height px (same as the employer's Payout Activity)
const BAR_COLOR = "#8fd7c0";
const SCAFFOLD_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const PLACEHOLDER_H = 26;

type MyPay = ReturnType<typeof useMyPay>;

/** Block time as e.g. "7 Jul 2:10pm" (local time). */
function fmtPaymentTime(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${h}:${m}${ampm}`;
}

/** "5 Jul, 2026" for the Last-payment stat card. */
function fmtPaymentDate(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
}

/**
 * Server profile: pushes the onboarding identity up once (so the employer's
 * roster name and this profile agree), and owns the in-app notification
 * preferences with optimistic toggles + a debounced PUT.
 */
function usePortalProfile(onError: (msg: string) => void) {
  const identity = loadIdentity();
  const [prefs, setPrefs] = useState({ payments: true, verifications: true });
  const pushed = useRef(false);
  const syncTimer = useRef<number>(undefined);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    void (async () => {
      try {
        const { profile } = await api.getProfile();
        setPrefs({
          payments: profile?.notifyPayments ?? true,
          verifications: profile?.notifyVerifications ?? true,
        });
        // First visit (or a fresher local identity): push name + avatar up.
        if (identity.name && (!profile || profile.name !== identity.name || profile.avatar !== identity.avatar)) {
          await api.putProfile({
            name: identity.name,
            avatar: identity.avatar,
            notifyPayments: profile?.notifyPayments ?? true,
            notifyVerifications: profile?.notifyVerifications ?? true,
          });
        }
      } catch {
        /* profile is display metadata — quiet failure, defaults stay on */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(
    (key: "payments" | "verifications") => {
      setPrefs((p) => {
        const next = { ...p, [key]: !p[key] };
        window.clearTimeout(syncTimer.current);
        syncTimer.current = window.setTimeout(() => {
          api
            .putProfile({
              name: identity.name || "You",
              avatar: identity.avatar,
              notifyPayments: next.payments,
              notifyVerifications: next.verifications,
            })
            .catch((e: unknown) => onError(e instanceof Error ? e.message : String(e)));
        }, 600);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onError],
  );
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  return { prefs, toggle };
}

/** Employments from the SealedPay backend, with quiet failure (inline note). */
function useEmployments() {
  const [employments, setEmployments] = useState<Employment[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await api.me();
      setEmployments(res.employments);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { employments, error, loading, reload: load };
}
type Jobs = ReturnType<typeof useEmployments>;

/* ── Shell ───────────────────────────────────────────────────────────────── */

export function EmployeePortal({ onLoggedOut, onSwitchDoor }: { onLoggedOut: () => void; onSwitchDoor: () => void }) {
  const pay = useMyPay();
  const { user, logout } = usePrivy();
  const identity = loadIdentity();
  const jobs = useEmployments();
  const sym = pay.symbol ?? "cUSDd";
  const email = user?.email?.address;
  const embedded = user?.wallet?.walletClientType === "privy";

  useEffect(() => setThemeColor(THEME_COLORS.dashboard), []);

  /* nav + chrome state (mirrors the employer shell) */
  const [nav, setNav] = useState<0 | 1>(0);
  const [popup, setPopup] = useState<"bell" | "gear" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  /* toast (top-center), same pattern as the employer dashboard */
  const [toast, setToastState] = useState<ToastState | null>(null);
  const toastTimer = useRef<number>(undefined);
  const showToast = useCallback((kind: "ok" | "err", msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToastState({ kind, msg, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToastState(null), 4200);
  }, []);

  // Scan the chain the moment the wallet is live. Errors surface as toasts
  // (deduped so a retry loop does not stack them).
  useEffect(() => {
    if (pay.ready && pay.payments === undefined && pay.phase === "idle") void pay.scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.ready, pay.me]);
  const toastedErr = useRef<string>(undefined);
  useEffect(() => {
    if (!pay.error) {
      toastedErr.current = undefined;
      return;
    }
    if (toastedErr.current === pay.error) return;
    toastedErr.current = pay.error;
    showToast("err", pay.error);
  }, [pay.error, showToast]);

  const profile = usePortalProfile((msg) => showToast("err", msg));
  const fmt = (v: bigint) => (pay.decimals !== undefined ? formatAmount(v, pay.decimals) : undefined);
  const revealed = pay.phase === "revealed";

  const onPayslip = (p: MyPayment) => {
    if (p.amount === undefined || pay.decimals === undefined) return;
    const opened = exportPayslip({
      payment: p,
      amountText: formatAmount(p.amount, pay.decimals),
      symbol: sym,
      recipient: pay.me ?? "",
      recipientName: identity.name,
      employerName: jobs.employments?.find((j) => j.employerAddress?.toLowerCase() === p.from.toLowerCase())?.employerName,
    });
    if (!opened) showToast("err", "Allow pop-ups for this site to download your payslip.");
  };

  /* ── bell: notifications derived from real payments ─────────────────────── */
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const notifs = useMemo<NotificationItem[]>(() => {
    const rows: NotificationItem[] = profile.prefs.payments
      ? (pay.payments ?? []).slice(0, 8).map((p, i) => ({
          id: i + 1,
          title: p.from === zeroAddress ? "Test funds received" : "Salary payment received",
          sub: `${p.timestamp ? `${fmtPaymentTime(p.timestamp)} · ` : ""}${shortHash(p.txHash)}`,
          color: "#5fe3ab",
          read: readIds.has(i + 1),
          tone: "ok",
        }))
      : [];
    if (rows.length === 0) {
      rows.push({
        id: 0,
        title: "Welcome to SealedPay",
        sub: "Payments to your wallet appear here.",
        color: "#8b7cf6",
        read: readIds.has(0),
        tone: "info",
      });
    }
    return rows;
  }, [pay.payments, readIds, profile.prefs.payments]);
  const unread = notifs.filter((n) => !n.read).length;
  const markRead = (id: number) => setReadIds((s) => new Set(s).add(id));
  const markAllRead = () => setReadIds(new Set(notifs.map((n) => n.id)));

  /* ── right rail: the Payroll Wallet card repurposed ─────────────────────── */
  const [balShown, setBalShown] = useState(true);
  const sidebarData = {
    showAll: false,
    balance: {
      value: pay.balance !== undefined ? fmt(pay.balance) : undefined,
      revealed: revealed && balShown && pay.balance !== undefined,
      pending: pay.phase === "revealing",
      toggle: () => {
        if (revealed) setBalShown((s) => !s);
        else void pay.reveal();
      },
    },
    employerAddress: pay.me,
  };
  const sidebarAction = revealed
    ? {
        label: "Rescan",
        aria: "Rescan payments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14503b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        ),
        onClick: () => void pay.scan(),
        busy: pay.phase === "scanning",
      }
    : {
        label: "Reveal",
        aria: "Reveal my pay",
        icon: <PadlockGlyph size={15} color="#14503b" />,
        onClick: () => void pay.reveal(),
        busy: pay.phase === "revealing",
      };
  const activity = useMemo<ActivityRow[]>(
    () =>
      (pay.payments ?? []).slice(0, 4).map((p) => ({
        key: p.txHash + p.handle,
        title: p.from === zeroAddress ? "Test funds" : "Salary payment",
        sub: `${p.timestamp ? `${fmtPaymentTime(p.timestamp)} · ` : ""}${shortHash(p.txHash)}`,
        pill: "Verified" as const,
        url: p.url,
        icon: p.from === zeroAddress ? ("deposit" as const) : ("run" as const),
      })),
    [pay.payments],
  );

  const railItems: RailNavItem[] = [
    { label: "Home", Icon: HomeNav },
    { label: "Payslips", Icon: ({ size, color }) => <ReceiptCheckGlyph size={size} color={color} /> },
  ];

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden" style={{ background: tokens.bg.app, fontFamily: "'Manrope', sans-serif", color: tokens.text.heading }}>
      {/* Fixed background glows (same coordinates as the employer dashboard) */}
      <div className="pointer-events-none absolute" style={{ left: "90%", top: "45%", width: 760, height: 760, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.36), rgba(0,0,0,0) 66%)", filter: "blur(30px)" }} />
      <div className="pointer-events-none absolute" style={{ left: "-1%", top: "70%", width: 520, height: 520, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.22), rgba(0,0,0,0) 66%)", filter: "blur(34px)" }} />

      {/* Top-edge fade behind the top bar, visible once scrolled */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30"
        style={{ height: 96, background: "linear-gradient(180deg, #070c0a 20%, rgba(7,12,10,0) 100%)", opacity: scrolled ? 1 : 0, transition: "opacity .25s" }}
      />

      <TopBar
        profile={{ name: identity.name || "You", avatar: identity.avatar }}
        onProfile={() => setProfileOpen(true)}
        onHome={() => {
          setNav(0);
          setPopup(null);
        }}
        walletControl={<WalletControl />}
      />

      {/* Body: same alignment as the employer (rail left edge at 32.4px). */}
      <div className="flex min-h-0 flex-1" style={{ paddingLeft: 32.4 }}>
        <Rail
          navSel={nav}
          items={railItems}
          onNav={(n) => {
            setNav(n === 1 ? 1 : 0);
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
            <EmployeeSettingsPanel
              open={popup === "gear"}
              onClose={() => setPopup(null)}
              prefs={profile.prefs}
              onToggle={profile.toggle}
              embedded={embedded}
              onSwitchDoor={onSwitchDoor}
            />
          }
        />

        {/* The ONLY scrolling element (paddings verbatim from the employer). */}
        <div
          className="slim-scroll min-h-0 flex-1 overflow-y-auto"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 6)}
          style={{ padding: "97.2px 32.4px 21.6px 25.2px" }}
        >
          <div className="grid" style={{ gridTemplateColumns: "1fr 368.28px", gap: 25.2, alignItems: "start" }}>
            <main className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={nav} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  {nav === 0 ? (
                    <HomeScreen pay={pay} jobs={jobs} sym={sym} fmt={fmt} email={email} identity={identity} onPayslip={onPayslip} />
                  ) : (
                    <PayslipsScreen pay={pay} sym={sym} fmt={fmt} onPayslip={onPayslip} />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Right column: My Wallet — the Payroll Wallet card, repurposed */}
            <WalletSidebar
              data={sidebarData}
              onFund={() => undefined}
              activity={activity}
              title="My Wallet"
              action={sidebarAction}
              emptyNote={{ title: "No activity yet", sub: "Payments to this wallet will appear here." }}
            />
          </div>

          <p className="text-center" style={{ fontSize: 11, color: "rgba(233,244,238,0.62)", paddingTop: 35, paddingBottom: 9 }}>
            SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps disperse · Zama FHE
          </p>
        </div>
      </div>

      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          void logout();
          onLoggedOut();
        }}
      />
      <ProfilePopup open={profileOpen} onClose={() => setProfileOpen(false)} name={identity.name || "there"} avatar={identity.avatar} employerShort={pay.me ? shortWallet(pay.me) : undefined} />
      <Toast toast={toast} />
    </div>
  );
}

/* ── HOME screen: chart + payments + employer/stat cards ─────────────────── */

function HomeScreen({
  pay,
  jobs,
  sym,
  fmt,
  email,
  identity,
  onPayslip,
}: {
  pay: MyPay;
  jobs: Jobs;
  sym: string;
  fmt: (v: bigint) => string | undefined;
  email?: string;
  identity: { name: string; avatar: string };
  onPayslip: (p: MyPayment) => void;
}) {
  const lastPay = pay.payments?.[0];
  const totalReceived = useMemo(() => {
    if (!pay.payments || pay.payments.some((p) => p.amount === undefined)) return undefined;
    return pay.payments.reduce((s, p) => s + (p.amount ?? 0n), 0n);
  }, [pay.payments]);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, lineHeight: 1.06, margin: 0 }}>
        {identity.name ? `My pay, ${identity.name.split(" ")[0]}` : "My pay"}
      </h1>

      <SalaryChartCard pay={pay} sym={sym} />

      <PaymentsCard pay={pay} jobs={jobs} sym={sym} fmt={fmt} onPayslip={onPayslip} />

      {/* Bottom row — mirrors the employer's Team + stat cards */}
      <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr", gap: 20 }}>
        <GlassCard className="flex flex-col" style={{ padding: "16px 23px" }}>
          <div className="flex items-center justify-between">
            <div style={{ fontWeight: 400, fontSize: 17 }}>{(jobs.employments?.length ?? 0) > 1 ? "Your employers" : "Your employer"}</div>
            {jobs.error && (
              <button type="button" onClick={() => void jobs.reload()} className="cursor-pointer hover:underline" style={{ fontSize: 10.5, color: "#9db3aa" }}>
                Retry
              </button>
            )}
          </div>
          {jobs.loading ? (
            <div className="mt-3 flex items-center gap-2" style={{ fontSize: 12, color: tokens.text.muted }}>
              <span aria-hidden style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }} />
              Checking your employment
            </div>
          ) : jobs.error ? (
            <p style={{ fontSize: 11.5, color: tokens.text.muted, marginTop: 10, lineHeight: 1.5 }}>{jobs.error}</p>
          ) : !jobs.employments || jobs.employments.length === 0 ? (
            <p style={{ fontSize: 11.5, color: tokens.text.muted, marginTop: 10, lineHeight: 1.5 }}>
              No employer has added {email ? <span style={{ color: "#cfe0d8" }}>{email}</span> : "your email"} yet.
              Once they do, your role and salary appear here.
            </p>
          ) : (
            <div className="mt-2 flex flex-col" style={{ gap: 2 }}>
              {jobs.employments.map((j) => (
                <EmploymentRow key={j.employerId} job={j} sym={sym} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Last payment + Total received (the employee's Monthly payroll / Last run) */}
        <div className="flex flex-col" style={{ gap: 20 }}>
          <GlassCard className="flex-1" style={{ padding: "13.5px 22px" }}>
            <div style={{ fontWeight: 400, fontSize: 17 }}>Last payment</div>
            <div className="tnum whitespace-nowrap" style={{ fontWeight: 700, fontSize: 27, marginTop: 7 }}>
              {lastPay ? (lastPay.timestamp ? fmtPaymentDate(lastPay.timestamp) : shortHash(lastPay.txHash)) : "None yet"}
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 9 }}>
              <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
                {lastPay
                  ? lastPay.from === zeroAddress
                    ? "Faucet mint · Test funds"
                    : `from ${shortWallet(lastPay.from)}`
                  : "Payments land here automatically"}
              </span>
              <LockPuck locked={false} />
            </div>
          </GlassCard>

          <GlassCard className="flex-1" style={{ padding: "13.5px 22px" }}>
            <div style={{ fontWeight: 400, fontSize: 17 }}>Total received</div>
            <span className="flex items-baseline whitespace-nowrap" style={{ gap: 6, fontWeight: 700, fontSize: 27, marginTop: 7 }}>
              <RevealAmount
                value={totalReceived !== undefined ? fmt(totalReceived) : undefined}
                revealed={totalReceived !== undefined}
                pending={pay.phase === "revealing"}
                label="total received"
                tabular={false}
              />
              <span style={{ fontSize: 16 }}>{sym}</span>
            </span>
            <div className="flex items-center justify-between" style={{ marginTop: 9 }}>
              <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
                {pay.payments ? `${pay.payments.length} payments` : "Scanning the chain"}
              </span>
              <LockPuck locked={totalReceived === undefined} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/* ── The Salary received chart — same bones as the employer's Payout Activity.
     Until the amounts are revealed, months with payments render as hatched
     bars (heights hint at payment count, never at amounts). ───────────────── */

function SalaryChartCard({ pay, sym }: { pay: MyPay; sym: string }) {
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const revealed = pay.phase === "revealed";

  // Hover-intent, same 300ms beat as the employer chart.
  const HOVER_INTENT_MS = 300;
  const hoverTimer = useRef<number | undefined>(undefined);
  const armActive = (m: string) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setActiveBar(m), HOVER_INTENT_MS);
  };
  const cancelActive = () => window.clearTimeout(hoverTimer.current);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const chart = useMemo(() => {
    const months = [...SCAFFOLD_MONTHS];
    const buckets = new Map<string, { count: number; total: number }>();
    const nowMonth = new Date().toLocaleString("en-US", { month: "short" });
    for (const p of pay.payments ?? []) {
      const m = p.timestamp ? new Date(p.timestamp).toLocaleString("en-US", { month: "short" }) : nowMonth;
      if (!months.includes(m)) months.push(m);
      const b = buckets.get(m) ?? { count: 0, total: 0 };
      b.count += 1;
      if (p.amount !== undefined && pay.decimals !== undefined) b.total += Number(p.amount) / 10 ** pay.decimals;
      buckets.set(m, b);
    }
    const maxTotal = Math.max(...months.map((m) => buckets.get(m)?.total ?? 0), 0);
    const { niceMax, labels } = yScale(maxTotal > 0 ? maxTotal : 15000);
    return { months, buckets, niceMax, labels };
  }, [pay.payments, pay.decimals]);

  const scanned = pay.payments !== undefined;

  return (
    <GlassCard style={{ padding: "20px 23px 16px 23px" }}>
      <div className="flex items-center justify-between">
        <div style={{ fontWeight: 400, fontSize: 17 }}>Salary received</div>
        {scanned && !revealed && pay.payments!.length > 0 && (
          <span className="flex items-center" style={{ gap: 5, fontSize: 10.5, color: tokens.text.muted }}>
            <PadlockGlyph size={10} color="#9db3aa" />
            Sealed until you reveal
          </span>
        )}
      </div>

      {scanned && pay.payments!.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center" style={{ height: CH + 44, gap: 4 }}>
          <span className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "rgba(95,230,175,0.1)", border: "1px solid rgba(95,230,175,0.18)", marginBottom: 6 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 3v18h18" />
              <rect x="7" y="12" width="3" height="5" rx="1" />
              <rect x="12.5" y="8" width="3" height="9" rx="1" />
              <rect x="18" y="5" width="3" height="12" rx="1" />
            </svg>
          </span>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: tokens.text.secondary }}>No payments yet</div>
          <div style={{ fontSize: 11.5, color: tokens.text.muted, maxWidth: 250, lineHeight: 1.5 }}>
            Once your employer runs payroll, your months fill in here.
          </div>
        </div>
      ) : (
        <>
          <div className="flex" style={{ gap: 13, marginTop: 16 }}>
            {/* Y axis — blank while the amounts are still sealed */}
            <div
              className="flex shrink-0 flex-col justify-between"
              style={{ height: CH, fontSize: 10, color: "#8ba297", paddingBottom: 2, width: 29 }}
            >
              {chart.labels.map((l, i) => (
                <span key={i} className="tnum">
                  {revealed ? l : ""}
                </span>
              ))}
            </div>

            {/* Bars */}
            <div
              className="relative grid flex-1 items-end"
              style={{ gridTemplateColumns: `repeat(${chart.months.length},1fr)`, gap: 20, height: CH }}
            >
              {chart.months.map((m) => {
                const b = chart.buckets.get(m);
                const hasData = (b?.count ?? 0) > 0;
                const active = activeBar === m;
                // Sealed bars hint at HOW MANY payments landed (public on-chain
                // anyway), never at the amounts.
                const height = !hasData
                  ? PLACEHOLDER_H
                  : revealed
                    ? Math.max(((b?.total ?? 0) / chart.niceMax) * CH, 3)
                    : Math.min(PLACEHOLDER_H + (b?.count ?? 0) * 9, 64);
                const tip = !hasData
                  ? "No payments"
                  : revealed
                    ? `${fmtAmount(Math.round(b?.total ?? 0))} ${sym} · ${b?.count} received`
                    : `${b?.count} received · Reveal to see amounts`;
                return (
                  <div
                    key={m}
                    className="relative flex cursor-pointer flex-col items-center justify-end"
                    style={{ height: CH }}
                    onMouseEnter={() => armActive(m)}
                    onMouseLeave={() => {
                      cancelActive();
                      setActiveBar(null);
                    }}
                  >
                    <div className="relative flex flex-col-reverse" style={{ width: 54 }}>
                      <div
                        className={active && hasData && revealed ? "" : "hatch"}
                        style={{
                          width: 54,
                          height,
                          borderRadius: 14,
                          transformOrigin: "bottom",
                          transition: "background .25s, height .4s",
                          background: active && hasData && revealed ? BAR_COLOR : undefined,
                        }}
                      />
                      {active && (
                        <>
                          {/* glass tooltip (same skin as the employer chart) */}
                          <div
                            className="absolute z-[3] whitespace-nowrap"
                            style={{
                              bottom: "calc(100% + 22px)",
                              left: "50%",
                              transform: "translateX(-64%)",
                              background: "rgba(57,70,67,0.82)",
                              backdropFilter: "blur(9px)",
                              WebkitBackdropFilter: "blur(9px)",
                              border: "1px solid rgba(255,255,255,0.14)",
                              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.16), inset 0 -1px 0 0 rgba(255,255,255,0.04)",
                              color: "#cfd8d6",
                              fontSize: 11,
                              fontWeight: 400,
                              borderRadius: tokens.radius.pill,
                              padding: "6px 11px",
                            }}
                          >
                            {tip}
                          </div>
                          {/* halo ring marker */}
                          <div
                            aria-hidden
                            className="absolute z-[3] rounded-full"
                            style={{
                              top: -13,
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: 24,
                              height: 24,
                              border: "5px solid #f5f8f6",
                              background: "transparent",
                              boxShadow:
                                "0 0 9px 2.7px rgba(240,248,232,0.30), 0 0 23.4px 9px rgba(240,248,232,0.12), inset 0 0 8.1px 1.8px rgba(245,252,248,0.40)",
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month labels */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${chart.months.length},1fr)`, gap: 20, marginLeft: 41, marginTop: 7 }}
          >
            {chart.months.map((m) => (
              <div key={m} className="text-center" style={{ fontSize: 10, color: "#8ba297" }}>
                {m}
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}

/* ── Payments received (list card with the full state ladder) ────────────── */

function PaymentsCard({
  pay,
  jobs,
  sym,
  fmt,
  onPayslip,
}: {
  pay: MyPay;
  jobs: Jobs;
  sym: string;
  fmt: (v: bigint) => string | undefined;
  onPayslip: (p: MyPayment) => void;
}) {
  const reduced = useReducedMotion();
  const { switchChain, isPending: switchingChain } = useSwitchChain();

  return (
    <GlassCard style={{ padding: "20px 22px" }}>
      <div className="flex items-center justify-between">
        <div style={{ fontWeight: 400, fontSize: 17 }}>Payments received</div>
        <div className="flex items-center gap-3">
          {pay.payments !== undefined && (
            <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
              {pay.payments.length} found
            </span>
          )}
          <button
            type="button"
            onClick={() => void pay.scan()}
            disabled={pay.phase === "scanning" || !pay.ready}
            className="cursor-pointer rounded-full transition-colors hover:bg-[rgba(255,255,255,0.07)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontSize: 11.5, color: "#cfe0d8", border: "1px solid rgba(255,255,255,0.13)", padding: "6px 13px" }}
          >
            {pay.phase === "scanning" ? "Scanning" : "Rescan"}
          </button>
        </div>
      </div>

      {/* States: wrong-network → preparing wallet → scan error →
          scanning skeleton → empty → rows */}
      {pay.connected && !pay.onSepolia ? (
        <div className="mt-2 flex flex-col items-center text-center" style={{ padding: "28px 20px" }}>
          <span className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "rgba(224,122,106,0.14)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eb9a8d" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 9v4" /><path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </span>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#eef4f1", marginTop: 13 }}>Wrong network</p>
          <p style={{ fontSize: 12, color: tokens.text.muted, marginTop: 5, maxWidth: 320, lineHeight: 1.55 }}>
            Your pay lives on Sepolia. Switch networks to see and reveal it.
          </p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
            disabled={switchingChain}
            className="mt-4 cursor-pointer rounded-full font-medium disabled:opacity-60"
            style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 12.5, padding: "9px 20px" }}
          >
            {switchingChain ? "Switching" : "Switch to Sepolia"}
          </button>
        </div>
      ) : !pay.ready ? (
        <CenterNote
          icon={<PadlockGlyph size={22} color="#78e9c0" />}
          title="Preparing your wallet"
          sub="Your email wallet is connecting. This takes a moment on first sign-in."
          spinner
        />
      ) : pay.error && pay.payments === undefined ? (
        <div className="mt-2 flex flex-col items-center text-center" style={{ padding: "28px 20px" }}>
          <span className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "rgba(224,122,106,0.12)" }}>
            <PadlockGlyph size={22} color="#eb9a8d" />
          </span>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#eef4f1", marginTop: 13 }}>Couldn't read your payments</p>
          <p style={{ fontSize: 12, color: tokens.text.muted, marginTop: 5, maxWidth: 340, lineHeight: 1.55 }}>{pay.error}</p>
          <button
            type="button"
            onClick={() => void pay.scan()}
            className="mt-4 cursor-pointer rounded-full font-medium"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)", color: "#cfe0d8", fontSize: 12.5, padding: "9px 20px" }}
          >
            Try again
          </button>
        </div>
      ) : pay.payments === undefined ? (
        <div className="mt-4 flex flex-col" style={{ gap: 7 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="dc-shimmer" style={{ height: 56, borderRadius: 14, background: "rgba(255,255,255,0.04)", animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      ) : pay.payments.length === 0 ? (
        <CenterNote
          icon={<ReceiptCheckGlyph size={22} />}
          title="No payments yet"
          sub={
            jobs.employments && jobs.employments.length > 0
              ? "You're on the payroll · your first payment will appear here the moment it lands."
              : "Once your employer adds you and runs payroll, payments appear here automatically."
          }
        />
      ) : (
        <div className="mt-3 flex flex-col" style={{ gap: 4 }}>
          <AnimatePresence initial={false}>
            {pay.payments.map((p, i) => (
              <motion.div
                key={p.txHash + p.handle}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: reduced ? 0 : Math.min(i * 0.045, 0.4), ease: EASE }}
                className="group flex items-center"
                style={{ gap: 12, padding: "9px 6px", borderRadius: 12 }}
              >
                <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: tokens.accent.puckBg, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <ReceiptCheckGlyph size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: 13, fontWeight: 500, color: "#eef4f1" }}>
                    {p.from === zeroAddress ? "Faucet mint · Test funds" : `from ${shortWallet(p.from)}`}
                  </span>
                  <span className="tnum block whitespace-nowrap" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>
                    {p.timestamp ? `${fmtPaymentTime(p.timestamp)} · ` : ""}
                    {shortHash(p.txHash)} ·{" "}
                    <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#4ecba0", textDecoration: "none" }}>
                      Etherscan
                    </a>
                  </span>
                </span>
                {p.amount !== undefined && (
                  <button
                    type="button"
                    onClick={() => onPayslip(p)}
                    className="cursor-pointer rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    title="Download payslip"
                    style={{ fontSize: 10.5, color: "#9db3aa", border: "1px solid rgba(255,255,255,0.13)", padding: "5px 11px" }}
                  >
                    Payslip
                  </button>
                )}
                <span className="flex items-center" style={{ gap: 4, fontSize: 13.5, fontWeight: 500, color: "#eef4f1" }}>
                  {p.from !== zeroAddress && <span style={{ color: "#78e9c0" }}>+</span>}
                  <RevealAmount
                    value={p.amount !== undefined ? fmt(p.amount) : undefined}
                    revealed={p.amount !== undefined && pay.decimals !== undefined}
                    pending={pay.phase === "revealing"}
                    label="payment amount"
                  />
                  <span>{sym}</span>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {pay.phase === "revealed" && (
        <p className="text-center" style={{ fontSize: 11.5, color: tokens.text.muted, marginTop: 14, lineHeight: 1.55 }}>
          Decrypted locally after your signature. These amounts never appear on-chain or on any server. Only your
          wallet can read them.
        </p>
      )}
    </GlassCard>
  );
}

/* ── PAYSLIPS screen: export each revealed payment ───────────────────────── */

function PayslipsScreen({
  pay,
  sym,
  fmt,
  onPayslip,
}: {
  pay: MyPay;
  sym: string;
  fmt: (v: bigint) => string | undefined;
  onPayslip: (p: MyPayment) => void;
}) {
  const reduced = useReducedMotion();
  const revealed = pay.phase === "revealed";
  const exportable = (pay.payments ?? []).filter((p) => p.amount !== undefined);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, lineHeight: 1.06, margin: 0 }}>
        Payslips
      </h1>

      <GlassCard style={{ padding: "20px 22px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Your payslips</div>
          {pay.payments !== undefined && (
            <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
              {exportable.length} ready
            </span>
          )}
        </div>
        <p style={{ fontSize: 11.5, color: tokens.text.muted, lineHeight: 1.5, marginTop: 5, maxWidth: 480 }}>
          Every payment exports as a payslip PDF once revealed. Amounts decrypt locally with your signature and never
          leave this browser.
        </p>

        {!pay.ready ? (
          <CenterNote
            icon={<PadlockGlyph size={22} color="#78e9c0" />}
            title="Preparing your wallet"
            sub="Your email wallet is connecting. This takes a moment on first sign-in."
            spinner
          />
        ) : pay.payments === undefined ? (
          <div className="mt-4 flex flex-col" style={{ gap: 7 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="dc-shimmer" style={{ height: 56, borderRadius: 14, background: "rgba(255,255,255,0.04)", animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        ) : pay.payments.length === 0 ? (
          <CenterNote
            icon={<ReceiptCheckGlyph size={22} />}
            title="No payslips yet"
            sub="Once your employer runs payroll, each payment shows up here ready to export."
          />
        ) : !revealed ? (
          <div className="mt-2 flex flex-col items-center text-center" style={{ padding: "28px 20px" }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "rgba(95,230,175,0.1)" }}>
              <PadlockGlyph size={22} color="#78e9c0" />
            </span>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#eef4f1", marginTop: 13 }}>
              {pay.payments.length} {pay.payments.length === 1 ? "payment" : "payments"} sealed
            </p>
            <p style={{ fontSize: 12, color: tokens.text.muted, marginTop: 5, maxWidth: 340, lineHeight: 1.55 }}>
              Reveal your pay with one signature to unlock payslip export.
            </p>
            <button
              type="button"
              onClick={() => void pay.reveal()}
              disabled={pay.phase === "revealing"}
              className="mt-4 flex cursor-pointer items-center gap-2 rounded-full font-medium disabled:cursor-wait disabled:opacity-70"
              style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 12.5, padding: "9px 20px" }}
            >
              {pay.phase === "revealing" && (
                <span aria-hidden style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(11,21,18,0.25)", borderTopColor: "#0b1512", animation: "dc-spin .7s linear infinite" }} />
              )}
              {pay.phase === "revealing" ? "Decrypting with your signature" : "Reveal my pay"}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col" style={{ gap: 4 }}>
            {exportable.map((p, i) => (
              <motion.div
                key={p.txHash + p.handle}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: reduced ? 0 : Math.min(i * 0.045, 0.4), ease: EASE }}
                className="flex items-center"
                style={{ gap: 12, padding: "9px 6px", borderRadius: 12 }}
              >
                <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: tokens.accent.puckBg, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <ReceiptCheckGlyph size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: 13, fontWeight: 500, color: "#eef4f1" }}>
                    {p.timestamp ? fmtPaymentTime(p.timestamp) : shortHash(p.txHash)}
                  </span>
                  <span className="tnum block whitespace-nowrap" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>
                    {p.from === zeroAddress ? "Faucet mint · Test funds" : `from ${shortWallet(p.from)}`} ·{" "}
                    <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#4ecba0", textDecoration: "none" }}>
                      Etherscan
                    </a>
                  </span>
                </span>
                <span className="tnum" style={{ fontSize: 13.5, fontWeight: 500, color: "#eef4f1" }}>
                  {p.amount !== undefined ? fmt(p.amount) : ""} {sym}
                </span>
                <button
                  type="button"
                  onClick={() => onPayslip(p)}
                  className="cursor-pointer rounded-full transition-colors hover:bg-[rgba(95,230,175,0.14)]"
                  style={{ fontSize: 11, fontWeight: 500, color: "#78e9c0", border: "1px solid rgba(95,230,175,0.35)", padding: "6px 14px" }}
                >
                  Payslip
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ── Employee settings — the gear popover (same frame as the employer's) ─── */

function EmployeeSettingsPanel({
  open,
  onClose,
  prefs,
  onToggle,
  embedded,
  onSwitchDoor,
}: {
  open: boolean;
  onClose: () => void;
  prefs: { payments: boolean; verifications: boolean };
  onToggle: (key: "payments" | "verifications") => void;
  embedded: boolean;
  onSwitchDoor: () => void;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="panel"
          role="dialog"
          aria-label="Settings"
          className="cursor-auto overflow-hidden text-left"
          style={{
            width: 252,
            borderRadius: 27,
            border: "1px solid rgba(255,255,255,0.11)",
            background: "rgba(52,92,72,0.21)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "16px 18px",
            transformOrigin: "0 0",
          }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0.17 } }
              : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.17, ease: [0.4, 0, 1, 1] } }
          }
          transition={{ duration: reduced ? 0.14 : 0.34, ease: [0.2, 1.06, 0.3, 1] }}
        >
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f7f4" }}>Settings</h3>

          <div className="mt-[5px] flex flex-col">
            <SettingToggle label="New payment alerts" on={prefs.payments} onChange={() => onToggle("payments")} />
            <SettingToggle label="Verification alerts" on={prefs.verifications} onChange={() => onToggle("verifications")} />
          </div>
          <p style={{ fontSize: 10, color: "#8ba297", lineHeight: 1.4, marginTop: 2 }}>
            In-app alerts when pay arrives or a payment is verified.
          </p>

          {/* Tapered divider — fades to transparent at both ends. */}
          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0.16) 78%, transparent)",
              margin: "10px 0",
            }}
          />

          <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
            <span style={{ fontSize: 12, color: "#e8f0ec" }}>Token</span>
            <span style={{ fontSize: 11, color: "#9db3aa" }}>cUSDd</span>
          </div>
          <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
            <span style={{ fontSize: 12, color: "#e8f0ec" }}>Network</span>
            <span style={{ fontSize: 11, color: "#9db3aa" }}>Sepolia Testnet</span>
          </div>
          <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
            <span style={{ fontSize: 12, color: "#e8f0ec" }}>Wallet</span>
            <span style={{ fontSize: 11, color: "#9db3aa" }}>{embedded ? "From your email" : "External"}</span>
          </div>

          <button
            type="button"
            onClick={onSwitchDoor}
            className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full transition-colors hover:bg-[rgba(255,255,255,0.07)]"
            style={{ fontSize: 11.5, fontWeight: 500, color: "#cfdcd6", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", padding: "8px 0" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 3 4 7l4 4" />
              <path d="M4 7h16" />
              <path d="m16 21 4-4-4-4" />
              <path d="M20 17H4" />
            </svg>
            Switch to employer view
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Small pieces ────────────────────────────────────────────────────────── */

function LockPuck({ locked }: { locked: boolean }) {
  return (
    <span
      className="flex items-center justify-center rounded-full"
      title={locked ? "Encrypted until revealed" : "Verified on-chain"}
      style={{
        width: 28,
        height: 28,
        background: "rgba(95,230,175,0.14)",
        border: "1px solid rgba(95,230,175,0.35)",
        color: tokens.accent.pillText,
      }}
    >
      {locked ? (
        <PadlockGlyph size={11} />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

function CenterNote({ icon, title, sub, spinner }: { icon: ReactNode; title: string; sub: string; spinner?: boolean }) {
  return (
    <div className="mt-2 flex flex-col items-center text-center" style={{ padding: "30px 20px" }}>
      <span className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "rgba(95,230,175,0.1)" }}>
        {spinner ? (
          <span aria-hidden style={{ width: 18, height: 18, borderRadius: "50%", border: "2.4px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }} />
        ) : (
          icon
        )}
      </span>
      <p style={{ fontSize: 14, fontWeight: 500, color: "#eef4f1", marginTop: 13 }}>{title}</p>
      <p style={{ fontSize: 12, color: tokens.text.muted, marginTop: 5, maxWidth: 340, lineHeight: 1.55 }}>{sub}</p>
    </div>
  );
}

function EmploymentRow({ job, sym }: { job: Employment; sym: string }) {
  const [salaryShown, setSalaryShown] = useState(false);
  return (
    <div className="flex items-center" style={{ gap: 11, padding: "8px 0" }}>
      <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 34, height: 34, background: "rgba(59,191,142,0.18)", fontSize: 11, fontWeight: 800, color: "#d3ecdd" }}>
        {(job.employerName || "E").slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate" style={{ fontSize: 12.5, fontWeight: 600, color: "#eef4f1" }}>
          {job.employerName || (job.employerAddress ? shortWallet(job.employerAddress) : "Employer")}
        </span>
        <span className="block" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>
          {job.me.role ?? "Employee"}
          {job.me.dept ? ` · ${job.me.dept}` : ""}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setSalaryShown((s) => !s)}
        className="tnum cursor-pointer text-right"
        title={salaryShown ? "Hide salary" : "Show salary"}
        style={{ fontSize: 12, fontWeight: 600, color: "#cfe0d8" }}
      >
        {salaryShown ? `${Number(job.me.salary).toLocaleString("en-US")} ${sym}/mo` : "*** / mo"}
      </button>
    </div>
  );
}
