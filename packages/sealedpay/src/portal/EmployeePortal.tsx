/**
 * EmployeePortal — the employee's dedicated dashboard ("I get paid").
 *
 * Same skin as the employer dashboard, repurposed:
 *   left  — Payments received: every confidential transfer the chain indexed
 *           to the signed-in wallet, revealed with one signature; per-payment
 *           payslip export once revealed.
 *   right — the confidential-balance hero (the employee's counterpart of the
 *           Payroll Wallet card), wallet details, and "Your employer" from
 *           the SealedPay backend (rosters that contain this login email).
 *
 * All real: the scan reads ConfidentialTransfer logs, the reveal is a gasless
 * EIP-712 user-decryption via Zama — works with the email-embedded wallet on
 * any browser, Safari included. Errors surface as service-named toasts; every
 * async surface has an empty, loading, and failed state.
 */
import { formatAmount } from "@dispersekit/widget";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { zeroAddress } from "viem";

import { LogoutModal } from "../dashboard/modals/LogoutModal";
import { Toast } from "../dashboard/modals/Toast";
import type { ToastState } from "../dashboard/contracts";
import { RevealAmount } from "../design/RevealAmount";
import { SealLogo } from "../design/SealLogo";
import { PadlockGlyph, ReceiptCheckGlyph } from "../design/icons";
import { tokens } from "../design/tokens";
import { api, type Employment } from "../lib/api";
import { useMyPay, type MyPayment } from "../lib/myPay";
import { loadIdentity } from "../lib/prefs";
import { shortHash, shortWallet } from "../lib/seed";
import { THEME_COLORS, setThemeColor } from "../lib/themeColor";
import { exportPayslip } from "./payslip";

const EASE = [0.22, 1, 0.36, 1] as const;
const GRADIENT = "linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)";

/** Block time as e.g. "7 Jul 2:10pm" (local time). */
function fmtPaymentTime(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${h}:${m}${ampm}`;
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

export function EmployeePortal({ onLoggedOut, onSwitchDoor }: { onLoggedOut: () => void; onSwitchDoor: () => void }) {
  const reduced = useReducedMotion();
  const pay = useMyPay();
  const { user, logout } = usePrivy();
  const identity = loadIdentity();
  const jobs = useEmployments();
  const sym = pay.symbol ?? "cUSDd";
  const email = user?.email?.address;
  const embedded = user?.wallet?.walletClientType === "privy";

  useEffect(() => setThemeColor(THEME_COLORS.dashboard), []);

  /* ── toast (top-center), same pattern as the employer dashboard ─────────── */
  const [toast, setToastState] = useState<ToastState | null>(null);
  const toastTimer = useRef<number>(undefined);
  const showToast = useCallback((kind: "ok" | "err", msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToastState({ kind, msg, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToastState(null), 4200);
  }, []);

  // Scan the chain the moment the wallet is live — the only action left for
  // the employee is Reveal. Errors from the hook surface as toasts (deduped).
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

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = usePortalProfile((msg) => showToast("err", msg));
  const fmt = (v: bigint) => (pay.decimals !== undefined ? formatAmount(v, pay.decimals) : undefined);
  const revealed = pay.phase === "revealed";

  const payslip = (p: MyPayment) => {
    if (p.amount === undefined || pay.decimals === undefined) return;
    exportPayslip({
      payment: p,
      amountText: formatAmount(p.amount, pay.decimals),
      symbol: sym,
      recipient: pay.me ?? "",
      recipientName: identity.name,
      employerName: jobs.employments?.find((j) => j.employerAddress?.toLowerCase() === p.from.toLowerCase())?.employerName,
    });
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden" style={{ background: tokens.bg.app, fontFamily: "'Manrope', sans-serif", color: tokens.text.heading }}>
      {/* Fixed background glows (same coordinates as the employer dashboard) */}
      <div className="pointer-events-none absolute" style={{ left: "90%", top: "45%", width: 760, height: 760, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.36), rgba(0,0,0,0) 66%)", filter: "blur(30px)" }} />
      <div className="pointer-events-none absolute" style={{ left: "-1%", top: "70%", width: 520, height: 520, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.22), rgba(0,0,0,0) 66%)", filter: "blur(34px)" }} />

      {/* Top bar */}
      <div className="z-20 flex items-center justify-between" style={{ padding: "20px 32.4px 10px" }}>
        <div className="flex items-center" style={{ gap: 9 }}>
          <SealLogo size={31} />
          <span style={{ fontWeight: 500, fontSize: 14.5 }}>SealedPay</span>
          <span aria-hidden style={{ color: "rgba(255,255,255,0.16)", padding: "0 2px" }}>·</span>
          <span style={{ fontSize: 12.5, color: tokens.text.muted }}>My pay</span>
        </div>
        <div className="relative flex items-center" style={{ gap: 12 }}>
          {email && (
            <span className="hidden sm:block" style={{ fontSize: 12, color: tokens.text.muted }}>
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="cursor-pointer rounded-full transition-transform hover:scale-105"
            aria-label="Profile menu"
            style={{ width: 38, height: 38, padding: 2, background: menuOpen ? "linear-gradient(135deg, #5fe3ab, #2f9d74)" : "rgba(255,255,255,0.1)" }}
          >
            <img src={identity.avatar} alt="You" className="h-full w-full rounded-full object-cover" style={{ background: "rgba(20,40,32,0.6)" }} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col overflow-hidden"
                  style={{ background: "#131e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)", padding: 6 }}
                >
                  <div style={{ padding: "10px 12px 8px" }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>{identity.name || "You"}</p>
                    {email && <p className="truncate" style={{ fontSize: 11, color: tokens.text.muted, marginTop: 2 }}>{email}</p>}
                  </div>
                  <MenuItem
                    label="Switch to employer view"
                    onClick={() => {
                      setMenuOpen(false);
                      onSwitchDoor();
                    }}
                  />
                  <MenuItem
                    label="Log out"
                    tone="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      setLogoutOpen(true);
                    }}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Body — same two-column grid as the employer dashboard */}
      <div className="slim-scroll min-h-0 flex-1 overflow-y-auto" style={{ padding: "18px 32.4px 21.6px" }}>
        <div className="mx-auto grid" style={{ maxWidth: 1200, gridTemplateColumns: "1fr 368.28px", gap: 25.2, alignItems: "start" }}>
          {/* ── LEFT: payments received ─────────────────────────────────────── */}
          <main className="min-w-0">
            <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: EASE }}>
              <h1 style={{ fontWeight: 500, fontSize: 34, letterSpacing: 0.4, margin: 0 }}>
                {identity.name ? `Your pay, ${identity.name.split(" ")[0]}` : "Your pay"}
              </h1>
              <p style={{ fontSize: 13, color: tokens.text.muted, marginTop: 7, lineHeight: 1.55, maxWidth: 560 }}>
                Every payment below arrived encrypted on-chain. Reveal them with one signature · decrypted locally, only
                your wallet can read the amounts.
              </p>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduced ? 0 : 0.06, ease: EASE }}
              className="mt-6"
              style={{ background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, borderRadius: 18, padding: "20px 22px" }}
            >
              <div className="flex items-center justify-between">
                <div style={{ fontWeight: 400, fontSize: 16 }}>Payments received</div>
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

              {/* States: preparing wallet → scanning skeleton → empty → rows */}
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
                            onClick={() => payslip(p)}
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
            </motion.div>

            {/* Privacy note under the list (mirrors the employer's footer tone) */}
            {revealed && (
              <motion.p
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
                style={{ fontSize: 11.5, color: tokens.text.muted, marginTop: 14, lineHeight: 1.55 }}
              >
                Decrypted locally after your signature. These amounts never appear on-chain or on any server. Only your
                wallet can read them.
              </motion.p>
            )}
          </main>

          {/* ── RIGHT: balance hero + wallet details + employer ─────────────── */}
          <aside className="flex flex-col" style={{ gap: 18 }}>
            {/* Confidential balance hero (the employee's Payroll Wallet card) */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduced ? 0 : 0.05, ease: EASE }}
              className="relative overflow-hidden"
              style={{ borderRadius: 18, background: GRADIENT, padding: 22 }}
            >
              <div aria-hidden className="absolute rounded-full" style={{ width: 153, height: 153, top: -45, right: -36, background: "rgba(255,255,255,0.10)" }} />
              <div className="relative z-[1]" style={{ fontSize: 12, color: "rgba(240,250,245,0.85)" }}>Your confidential balance</div>
              <div className="relative z-[1] flex items-baseline" style={{ gap: 9, fontWeight: 700, fontSize: 30, color: "#fff", marginTop: 8 }}>
                <RevealAmount
                  value={pay.balance !== undefined ? fmt(pay.balance) : undefined}
                  revealed={pay.balance !== undefined && pay.decimals !== undefined}
                  pending={pay.phase === "revealing"}
                  label="balance"
                  tabular={false}
                />
                <span style={{ fontSize: 15 }}>{sym}</span>
              </div>
              <div className="relative z-[1] tnum" style={{ fontSize: 11, color: "rgba(240,250,245,0.75)", marginTop: 6 }}>
                {pay.me ? shortWallet(pay.me) : "···"} · Sepolia
              </div>
            </motion.div>

            {/* Reveal — the one action; hidden once revealed */}
            {pay.ready && pay.phase !== "revealed" && (
              <motion.button
                type="button"
                onClick={() => void pay.reveal()}
                disabled={pay.phase === "revealing" || pay.payments === undefined}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: reduced ? 0 : 0.1, ease: EASE }}
                whileHover={reduced || pay.phase === "revealing" ? undefined : { scale: 1.01 }}
                whileTap={reduced || pay.phase === "revealing" ? undefined : { scale: 0.99 }}
                className="flex w-full items-center justify-center gap-2 rounded-full text-center disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "#f5f8f6", color: "#14503b", fontSize: 14, fontWeight: 500, padding: "14px 0" }}
              >
                {pay.phase === "revealing" ? (
                  <span aria-hidden style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(20,80,59,0.25)", borderTopColor: "#14503b", animation: "dc-spin .7s linear infinite" }} />
                ) : (
                  <PadlockGlyph size={14} color="#14503b" />
                )}
                {pay.phase === "revealing" ? "Decrypting with your signature" : "Reveal my pay"}
              </motion.button>
            )}

            {/* Wallet details */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduced ? 0 : 0.12, ease: EASE }}
              style={{ background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, borderRadius: 18, padding: "18px 20px" }}
            >
              <div style={{ fontWeight: 400, fontSize: 14.5 }}>Wallet details</div>
              <DetailRow label="Address" value={pay.me ? shortWallet(pay.me) : "···"} mono />
              <DetailRow label="Network" value="Sepolia testnet" />
              <DetailRow label="Type" value={embedded ? "Created from your email" : "Connected wallet"} />
              {embedded && (
                <p style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 10, lineHeight: 1.5 }}>
                  No extension, no seed phrase · signing in with your email on any device restores this wallet.
                </p>
              )}
            </motion.div>

            {/* Your employer(s) — from the SealedPay backend */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduced ? 0 : 0.18, ease: EASE }}
              style={{ background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, borderRadius: 18, padding: "18px 20px" }}
            >
              <div className="flex items-center justify-between">
                <div style={{ fontWeight: 400, fontSize: 14.5 }}>{(jobs.employments?.length ?? 0) > 1 ? "Your employers" : "Your employer"}</div>
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
            </motion.div>

            {/* In-app notification preferences (synced to the profile) */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduced ? 0 : 0.24, ease: EASE }}
              style={{ background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, borderRadius: 18, padding: "18px 20px" }}
            >
              <div style={{ fontWeight: 400, fontSize: 14.5 }}>Notifications</div>
              <PrefRow
                label="New payments"
                sub="Alert in-app when pay arrives"
                on={profile.prefs.payments}
                onToggle={() => profile.toggle("payments")}
              />
              <PrefRow
                label="Verifications"
                sub="Alert when a payment is verified"
                on={profile.prefs.verifications}
                onToggle={() => profile.toggle("verifications")}
              />
            </motion.div>
          </aside>
        </div>

        <p className="text-center" style={{ fontSize: 11, color: "rgba(233,244,238,0.62)", paddingTop: 35, paddingBottom: 9 }}>
          SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps disperse · Zama FHE
        </p>
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
      <Toast toast={toast} />
    </div>
  );
}

/* ── Small pieces ────────────────────────────────────────────────────────── */

function MenuItem({ label, onClick, tone }: { label: string; onClick: () => void; tone?: "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-[10px] text-left transition-colors hover:bg-[rgba(255,255,255,0.06)]"
      style={{ fontSize: 12.5, color: tone === "danger" ? "#eb9a8d" : "#cfe0d8", padding: "9px 12px" }}
    >
      {label}
    </button>
  );
}

function CenterNote({ icon, title, sub, spinner }: { icon: React.ReactNode; title: string; sub: string; spinner?: boolean }) {
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

function PrefRow({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-center justify-between" style={{ marginTop: 13 }}>
      <span className="min-w-0">
        <span className="block" style={{ fontSize: 12, color: "#e2ede8" }}>{label}</span>
        <span className="block" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>{sub}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className="relative shrink-0 cursor-pointer"
        style={{ width: 36, height: 21, borderRadius: 999, background: on ? "#3bbf8e" : "rgba(255,255,255,0.12)", transition: "background .2s" }}
      >
        <motion.span
          className="absolute rounded-full"
          style={{ top: 2.5, width: 16, height: 16, background: "#fff" }}
          animate={{ left: on ? 17.5 : 2.5 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 550, damping: 32 }}
        />
      </button>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ marginTop: 11 }}>
      <span style={{ fontSize: 11.5, color: tokens.text.muted }}>{label}</span>
      <span className={mono ? "tnum" : undefined} style={{ fontSize: 11.5, color: "#cfe0d8" }}>
        {value}
      </span>
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
