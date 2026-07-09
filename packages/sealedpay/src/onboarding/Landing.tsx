/**
 * Landing — the two-doors front page.
 *
 * "I run payroll" (employer) and "I get paid" (employee) both lead to the same
 * Privy email/wallet login; the chosen door only decides which surface you land
 * on afterwards. One email can be both — a switcher lives in the profile menu.
 *
 * Visual language is the onboarding's (aurora background, seal logo, the
 * decrypt-scramble headline) so landing → onboarding reads as one flow.
 */
import { usePrivy } from "@privy-io/react-auth";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { SealLogo } from "../design/SealLogo";
import { THEME_COLORS, setThemeColor } from "../lib/themeColor";
import { saveDoor, type Door } from "../lib/prefs";

const EASE = [0.22, 1, 0.36, 1] as const;

const GLYPHS = "*#$%";
function useDecryptScramble(target: string, startDelayMs: number) {
  const reduced = useReducedMotion();
  const [text, setText] = useState(reduced ? target : "");
  useEffect(() => {
    if (reduced) {
      setText(target);
      return;
    }
    const PER = 82;
    const HOLD = 102;
    const FLICKER = 75;
    let raf = 0;
    let start = 0;
    let lastFlicker = -1;
    const cache: string[] = [];
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const t = now - start;
        const flickFrame = Math.floor(t / FLICKER);
        const reroll = flickFrame !== lastFlicker;
        lastFlicker = flickFrame;
        const out = target.split("").map((ch, i) => {
          if (ch === " ") return " ";
          if (t >= i * PER + HOLD) return ch;
          if (reroll || cache[i] === undefined) cache[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          return cache[i];
        });
        setText(out.join(""));
        if (t < target.length * PER + HOLD + 60) raf = requestAnimationFrame(tick);
        else setText(target);
      };
      raf = requestAnimationFrame(tick);
    }, startDelayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, startDelayMs, reduced]);
  return text;
}

function Item({ i, children, center = false }: { i: number; children: ReactNode; center?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.56, delay: reduced ? 0 : 0.05 + i * 0.075, ease: EASE }}
      className={center ? "flex flex-col items-center" : ""}
    >
      {children}
    </motion.div>
  );
}

export function Landing({ onEnter }: { onEnter: (door: Door) => void }) {
  const reduced = useReducedMotion();
  const { ready, authenticated, login } = usePrivy();
  useEffect(() => setThemeColor(THEME_COLORS.onboarding), []);
  const headline = useDecryptScramble("Payroll that stays sealed", 280);
  // Remember the chosen door across the async login so the post-auth gate
  // routes to the right surface even after a full redirect/reload.
  const [waiting, setWaiting] = useState<Door | null>(null);

  const enter = (door: Door) => {
    saveDoor(door);
    if (authenticated) {
      onEnter(door);
      return;
    }
    setWaiting(door);
    login();
  };
  // Privy's modal resolves out-of-band; when auth lands, continue through the
  // door that was clicked.
  useEffect(() => {
    if (waiting && authenticated) onEnter(waiting);
  }, [waiting, authenticated, onEnter]);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden p-10"
      style={{
        color: "#e8f0ec",
        fontFamily: "'Manrope', sans-serif",
        background:
          "radial-gradient(135% 82% at 50% 124%, rgba(78,206,152,0.6), rgba(46,148,116,0.14) 40%, rgba(0,0,0,0) 66%), linear-gradient(180deg, #070c0a 0%, #0a110e 48%, #0c1712 100%)",
      }}
    >
      {/* Aurora blobs (same params as onboarding) */}
      <div
        className="dc-aurora pointer-events-none absolute rounded-full"
        style={{ bottom: "-22%", left: "8%", width: "62%", height: "72%", background: "radial-gradient(circle, rgba(78,206,152,0.13), rgba(0,0,0,0) 70%)", filter: "blur(46px)", animation: "dc-aurora-1 17s ease-in-out infinite", zIndex: 0 }}
      />
      <div
        className="dc-aurora pointer-events-none absolute rounded-full"
        style={{ bottom: "-14%", right: "6%", width: "52%", height: "62%", background: "radial-gradient(circle, rgba(46,148,116,0.11), rgba(0,0,0,0) 70%)", filter: "blur(56px)", animation: "dc-aurora-2 22s ease-in-out infinite", zIndex: 0 }}
      />

      <motion.div
        className="relative flex w-full flex-col items-center text-center"
        style={{ maxWidth: 660, zIndex: 2 }}
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.62, ease: EASE }}
      >
        <Item i={0} center>
          <div className="relative mb-2 flex items-center justify-center" style={{ width: 118, height: 118 }}>
            <div
              className="dc-glow absolute rounded-full"
              style={{ inset: -14, background: "radial-gradient(circle, rgba(90,200,150,0.12), rgba(0,0,0,0) 72%)", animation: "dc-glowpulse 3.4s ease-in-out infinite" }}
            />
            <div className="dc-floaty" style={{ animation: "dc-floaty 5s ease-in-out infinite" }}>
              <SealLogo size={86} />
            </div>
          </div>
        </Item>
        <Item i={1}>
          <p className="mt-4" style={{ fontSize: 12, fontWeight: 400, letterSpacing: "0.4px", color: "#78e9c0" }}>
            SealedPay · Confidential payroll
          </p>
        </Item>
        <Item i={2}>
          <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 36, lineHeight: 1.15, letterSpacing: "0.2px", minHeight: 42 }}>
            {headline}
          </h1>
        </Item>
        <Item i={3}>
          <p className="mt-3.5" style={{ fontSize: 15, fontWeight: 400, color: "#9db3aa", maxWidth: 460, lineHeight: 1.55 }}>
            Whole-team payouts in one transaction, every salary encrypted on-chain. Sign in with your email · no
            extension, no seed phrase.
          </p>
        </Item>

        {/* The two doors */}
        <Item i={4}>
          <div className="mt-9 grid w-full gap-4" style={{ gridTemplateColumns: "repeat(2, minmax(240px, 292px))" }}>
            <DoorCard
              title="I run payroll"
              sub="Pay your team confidentially · one transaction, sealed amounts"
              cta="Sign in as employer"
              onClick={() => enter("employer")}
              disabled={!ready}
              busy={waiting === "employer" && !authenticated}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <DoorCard
              title="I get paid"
              sub="See your sealed salary · only your email can reveal it"
              cta="Sign in as employee"
              onClick={() => enter("employee")}
              disabled={!ready}
              busy={waiting === "employee" && !authenticated}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m3 8 7.9 5.3a2 2 0 0 0 2.2 0L21 8" />
                </svg>
              }
            />
          </div>
        </Item>
      </motion.div>

      <p className="absolute inset-x-0 text-center" style={{ bottom: 14, fontSize: 11, color: "rgba(233,244,238,0.62)", textShadow: "0 1px 5px rgba(6,20,14,0.55)" }}>
        SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps disperse · Zama FHE
      </p>
    </div>
  );
}

function DoorCard({
  title,
  sub,
  cta,
  icon,
  onClick,
  disabled,
  busy,
}: {
  title: string;
  sub: string;
  cta: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      whileHover={reduced || disabled ? undefined : { y: -4, scale: 1.015 }}
      whileTap={reduced || disabled ? undefined : { scale: 0.985 }}
      className="flex cursor-pointer flex-col items-start text-left disabled:cursor-not-allowed"
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 22,
        padding: "22px 22px 19px",
        backdropFilter: "blur(22px) saturate(1.3)",
        WebkitBackdropFilter: "blur(22px) saturate(1.3)",
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.10), 0 14px 40px -18px rgba(0,0,0,0.6)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(95,230,175,0.12)", border: "1px solid rgba(95,230,175,0.25)" }}>
        {icon}
      </span>
      <span className="mt-4 block" style={{ fontSize: 18.5, fontWeight: 700, color: "#f2f7f4" }}>
        {title}
      </span>
      <span className="mt-1.5 block" style={{ fontSize: 12.5, color: "#9db3aa", lineHeight: 1.5 }}>
        {sub}
      </span>
      <span className="mt-4 flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: "#78e9c0" }}>
        {busy ? (
          <>
            <span aria-hidden style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }} />
            Signing in
          </>
        ) : (
          <>
            {cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </>
        )}
      </span>
    </motion.button>
  );
}
