/**
 * Landing — the front page. Trimmed copy (a headline + one line), then a
 * sliding two-panel carousel that floats over the OrbitGraphic: one door is
 * centred, the other peeks from the side and, on hover, leans in. Clicking the
 * peek slides it to centre while the current door slides away — both doors lead
 * to the same Privy email/wallet login; the chosen one only decides which
 * surface you land on.
 */
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { SealLogo } from "../design/SealLogo";
import { THEME_COLORS, setThemeColor } from "../lib/themeColor";
import { saveDoor, type Door } from "../lib/prefs";
import { OrbitGraphic } from "./OrbitGraphic";

const EASE = [0.22, 1, 0.36, 1] as const;
const CARD_W = 316;

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

interface DoorDef {
  door: Door;
  title: string;
  sub: string;
  cta: string;
  icon: ReactNode;
}

const EMPLOYER_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const EMPLOYEE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m3 8 7.9 5.3a2 2 0 0 0 2.2 0L21 8" />
  </svg>
);

const DOORS: DoorDef[] = [
  { door: "employer", title: "I run payroll", sub: "Pay your team confidentially, in one transaction.", cta: "Sign in as employer", icon: EMPLOYER_ICON },
  { door: "employee", title: "I get paid", sub: "See your sealed salary. Only your email can reveal it.", cta: "Sign in as employee", icon: EMPLOYEE_ICON },
];

export function Landing({ onEnter }: { onEnter: (door: Door) => void }) {
  const reduced = useReducedMotion();
  const { authenticated } = usePrivy();
  useEffect(() => setThemeColor(THEME_COLORS.onboarding), []);
  const headline = useDecryptScramble("Payroll that stays sealed", 280);

  const [active, setActive] = useState(0); // 0 = employer centred, 1 = employee centred
  const [hoverPeek, setHoverPeek] = useState(false);

  const [waiting, setWaiting] = useState<Door | null>(null);
  const waitingRef = useRef<Door | null>(null);
  const { login } = useLogin({
    onComplete: () => {
      if (waitingRef.current) onEnter(waitingRef.current);
    },
    onError: () => {
      waitingRef.current = null;
      setWaiting(null);
    },
  });

  const enter = (door: Door) => {
    saveDoor(door);
    if (authenticated) {
      onEnter(door);
      return;
    }
    waitingRef.current = door;
    setWaiting(door);
    login();
  };

  // Backstop: onError clears the "Signing in" spinner on a dismissed modal, but
  // if that event is ever missed the card must not spin forever — release it.
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => {
      waitingRef.current = null;
      setWaiting(null);
    }, 120_000);
    return () => window.clearTimeout(t);
  }, [waiting]);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center overflow-hidden"
      style={{
        color: "#e8f0ec",
        fontFamily: "'Manrope', sans-serif",
        background:
          "radial-gradient(120% 70% at 50% 128%, rgba(46,148,116,0.22), rgba(0,0,0,0) 60%), linear-gradient(180deg, #060a08 0%, #080f0c 52%, #0a120f 100%)",
      }}
    >
      <OrbitGraphic />

      {/* Copy — trimmed to a headline + one line */}
      <motion.div
        className="relative z-[2] flex flex-col items-center text-center"
        style={{ marginTop: "12vh", padding: "0 24px" }}
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="relative mb-4 flex items-center justify-center" style={{ width: 96, height: 96 }}>
          <div className="dc-glow absolute rounded-full" style={{ inset: -12, background: "radial-gradient(circle, rgba(90,200,150,0.14), rgba(0,0,0,0) 72%)", animation: reduced ? undefined : "dc-glowpulse 3.4s ease-in-out infinite" }} />
          <div className="dc-floaty" style={{ animation: reduced ? undefined : "dc-floaty 5s ease-in-out infinite" }}>
            <SealLogo size={72} />
          </div>
        </div>
        <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.5px", color: "#78e9c0" }}>SealedPay</p>
        <h1 className="mt-2.5" style={{ fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: "0.2px", minHeight: 44 }}>
          {headline}
        </h1>
        <p className="mt-3" style={{ fontSize: 14.5, color: "#9db3aa" }}>
          Confidential on-chain salaries. Sign in with your email.
        </p>
      </motion.div>

      {/* The sliding two-door carousel, floating over the orbit */}
      <motion.div
        className="relative z-[2]"
        style={{ marginTop: 48, width: CARD_W, height: 250 }}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.62, delay: 0.12, ease: EASE }}
      >
        {DOORS.map((d, i) => {
          const isActive = i === active;
          // With two doors, the inactive one sits on the side away from active.
          const side = i > active ? 1 : -1; // +1 → peeks right, -1 → peeks left
          const x = isActive ? 0 : side * CARD_W * (hoverPeek ? 0.7 : 0.84);
          return (
            <DoorPanel
              key={d.door}
              def={d}
              active={isActive}
              reduced={Boolean(reduced)}
              x={x}
              scale={isActive ? 1 : 0.9}
              opacity={isActive ? 1 : hoverPeek ? 0.72 : 0.44}
              busy={waiting === d.door && !authenticated}
              onPeekEnter={() => !isActive && setHoverPeek(true)}
              onPeekLeave={() => setHoverPeek(false)}
              onPeekClick={() => {
                if (!isActive) {
                  setHoverPeek(false);
                  setActive(i);
                }
              }}
              onCta={() => enter(d.door)}
              hint={side > 0 ? "right" : "left"}
            />
          );
        })}
      </motion.div>

      {/* Which door you're on */}
      <div className="relative z-[2] mt-7 flex items-center gap-2">
        {DOORS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show ${DOORS[i].title}`}
            onClick={() => setActive(i)}
            className="cursor-pointer rounded-full transition-all"
            style={{ width: i === active ? 22 : 7, height: 7, background: i === active ? "#5fe3ab" : "rgba(255,255,255,0.22)" }}
          />
        ))}
      </div>

      <p className="absolute inset-x-0 z-[2] text-center" style={{ bottom: 14, fontSize: 11, color: "rgba(233,244,238,0.55)", textShadow: "0 1px 5px rgba(6,20,14,0.55)" }}>
        SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps disperse · Zama FHE
      </p>
    </div>
  );
}

function DoorPanel({
  def,
  active,
  reduced,
  x,
  scale,
  opacity,
  busy,
  onPeekEnter,
  onPeekLeave,
  onPeekClick,
  onCta,
  hint,
}: {
  def: DoorDef;
  active: boolean;
  reduced: boolean;
  x: number;
  scale: number;
  opacity: number;
  busy: boolean;
  onPeekEnter: () => void;
  onPeekLeave: () => void;
  onPeekClick: () => void;
  onCta: () => void;
  hint: "left" | "right";
}) {
  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{ width: CARD_W, zIndex: active ? 3 : 1, cursor: active ? "default" : "pointer" }}
      initial={false}
      animate={{ x, scale, opacity }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 30, mass: 0.9 }}
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
      onClick={active ? undefined : onPeekClick}
    >
      <div
        className="flex flex-col"
        style={{
          height: 250,
          borderRadius: 24,
          padding: "24px 24px 22px",
          background: active ? "rgba(18,29,26,0.72)" : "rgba(14,22,19,0.6)",
          border: `1px solid ${active ? "rgba(95,230,175,0.28)" : "rgba(255,255,255,0.1)"}`,
          backdropFilter: "blur(20px) saturate(1.25)",
          WebkitBackdropFilter: "blur(20px) saturate(1.25)",
          boxShadow: active ? "0 30px 70px -28px rgba(0,0,0,0.75), inset 0 1px 0 0 rgba(255,255,255,0.08)" : "0 20px 50px -24px rgba(0,0,0,0.7)",
        }}
      >
        <span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(95,230,175,0.12)", border: "1px solid rgba(95,230,175,0.24)" }}>
          {def.icon}
        </span>
        <span className="mt-4 block" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
          {def.title}
        </span>
        <span className="mt-2 block" style={{ fontSize: 12.5, color: "#9db3aa", lineHeight: 1.55 }}>
          {def.sub}
        </span>

        <div className="mt-auto">
          {active ? (
            <motion.button
              type="button"
              onClick={onCta}
              disabled={busy}
              whileHover={reduced || busy ? undefined : { scale: 1.02 }}
              whileTap={reduced || busy ? undefined : { scale: 0.98 }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full font-medium disabled:cursor-not-allowed"
              style={{ background: "#5fe3ab", color: "#08331f", fontSize: 13.5, padding: "12px 0" }}
            >
              {busy ? (
                <>
                  <span aria-hidden style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(8,51,31,0.28)", borderTopColor: "#08331f", animation: "dc-spin .7s linear infinite" }} />
                  Signing in
                </>
              ) : (
                <>
                  {def.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </>
              )}
            </motion.button>
          ) : (
            <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: "#78e9c0", justifyContent: hint === "left" ? "flex-start" : "flex-end" }}>
              {hint === "left" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              )}
              {def.title}
              {hint === "right" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
