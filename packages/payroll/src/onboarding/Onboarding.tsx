/**
 * Onboarding — 6 steps, rebuilt from docs/design/extracted/onboarding.md
 * (values and copy verbatim from the design prototype).
 *
 * Real wiring: step 4 uses the actual wallet (RainbowKit modal + wagmi state)
 * instead of the prototype's 1250ms simulated connect; the connected chip
 * shows the real address. Everything else is presentation. `finish()`
 * persists name + avatar (design-mandated localStorage keys) and hands off
 * to the dashboard.
 */
import { useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID, useTokenMeta } from "@dispersekit/widget";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";

import { DepositBoxGlyph } from "../design/icons";
import { SealLogo } from "../design/SealLogo";
import { saveIdentity } from "../lib/prefs";
import { THEME_COLORS, setThemeColor } from "../lib/themeColor";
import { useFundWallet, useUnfundedWallet } from "../lib/wallet";

const EASE = [0.22, 1, 0.36, 1] as const;
const EXIT_EASE = [0.4, 0, 1, 1] as const;
const TOTAL = 6;
export const AVATARS = ["/avatars/avatar-1.svg", "/avatars/avatar-2.svg", "/avatars/avatar-3.svg", "/avatars/avatar-profile.svg"];

/**
 * The "Skip for now, explore with demo data" escape hatch on the wallet step
 * is hidden by default (a real payroll always connects a wallet). Opt in with
 * ?allowDemoData (or =true / =1) to expose it for a no-wallet walkthrough.
 */
const ALLOW_DEMO_DATA = (() => {
  try {
    const v = new URLSearchParams(window.location.search).get("allowDemoData");
    return v !== null && v !== "false" && v !== "0";
  } catch {
    return false;
  }
})();

/* ── Welcome decrypt-scramble (exact prototype parameters) ───────────────── */

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
    let cache: string[] = [];
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

/* ── Per-step staggered item (opacity 0 / y20 → 0; 560ms; 50 + i*75ms) ───── */

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

const eyebrow = (weight = 600) =>
  ({ fontSize: 12, fontWeight: weight, letterSpacing: "0.4px", color: "#78e9c0" }) as const;

/** Stage swap: fade in 320ms; exit slides ∓16px along the travel direction. */
const stageVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32 } },
  exit: (dir: number) =>
    reduced
      ? { opacity: 0, transition: { duration: 0.1 } }
      : { opacity: 0, y: dir > 0 ? -16 : 16, transition: { duration: 0.24, ease: EXIT_EASE } },
});

/* ── The component ───────────────────────────────────────────────────────── */

export function Onboarding({ onDone, initialName = "", initialAvatar = "" }: { onDone: () => void; initialName?: string; initialAvatar?: string }) {
  const reduced = useReducedMotion();
  useEffect(() => setThemeColor(THEME_COLORS.onboarding), []);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  // Pre-filled when signing back in (returning employer) so it is a quick
  // welcome-back click-through; blank for a genuine first run.
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [understood, setUnderstood] = useState(false);

  // Real wallet state replaces the prototype's simulated connect.
  const { address, isConnected, chain } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { openChainModal } = useChainModal();
  const onSepolia = chain?.id === SEPOLIA_CHAIN_ID;
  const walletReady = isConnected && onSepolia;

  const first = name.trim().split(" ")[0] || "";
  const nameComma = first ? `, ${first}.` : ".";
  const welcome = useDecryptScramble("Welcome to SealedPay", 280);

  const canContinue = [true, first.length > 0, understood, Boolean(avatar), walletReady, true][step];
  const continueLabel = step === 0 ? "Let's get started" : step === 5 ? "Let's go" : "Continue";

  function go(next: number) {
    if (next < 0 || next >= TOTAL) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }
  function finish() {
    saveIdentity(name.trim(), avatar || AVATARS[0]);
    onDone();
  }

  const digit = String(step + 1).padStart(2, "0").slice(-1);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden p-10"
      style={{
        color: "#e8f0ec",
        fontFamily: "'Manrope', sans-serif",
        background:
          "radial-gradient(135% 82% at 50% 124%, rgba(78,206,152,0.6), rgba(46,148,116,0.14) 40%, rgba(0,0,0,0) 66%), linear-gradient(180deg, #070c0a 0%, #0a110e 48%, #0c1712 100%)",
      }}
    >
      {/* Aurora blobs */}
      <div
        className="dc-aurora pointer-events-none absolute rounded-full"
        style={{ bottom: "-22%", left: "8%", width: "62%", height: "72%", background: "radial-gradient(circle, rgba(78,206,152,0.13), rgba(0,0,0,0) 70%)", filter: "blur(46px)", animation: "dc-aurora-1 17s ease-in-out infinite", zIndex: 0 }}
      />
      <div
        className="dc-aurora pointer-events-none absolute rounded-full"
        style={{ bottom: "-14%", right: "6%", width: "52%", height: "62%", background: "radial-gradient(circle, rgba(46,148,116,0.11), rgba(0,0,0,0) 70%)", filter: "blur(56px)", animation: "dc-aurora-2 22s ease-in-out infinite", zIndex: 0 }}
      />

      {/* Ghost step numeral (two digits; only the units digit flips) */}
      <div
        aria-hidden
        className="tnum pointer-events-none absolute select-none"
        style={{ top: "50%", right: "9%", transform: "translateY(-50%)", fontWeight: 800, fontSize: 300, lineHeight: 1, letterSpacing: "-0.05em", color: "rgba(120,233,192,0.055)", perspective: 900, zIndex: 0 }}
      >
        <span>0</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={digit}
            className="inline-block"
            style={{ transformOrigin: "center center", backfaceVisibility: "hidden" }}
            initial={reduced ? false : { rotateX: -90, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { rotateX: [-90, 12, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 0.36, ease: EASE, times: [0, 0.72, 1] }}
          >
            {digit}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Card container (offset left per the design; no glass of its own) */}
      <motion.div
        className="relative w-full"
        style={{ maxWidth: 540, marginLeft: "9%", zIndex: 2 }}
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.62, ease: EASE }}
      >
        {/* Progress bar */}
        <div className="mb-[30px] flex items-center gap-1.5">
          {Array.from({ length: TOTAL }, (_, i) => {
            const filled = i <= step;
            const clickable = i < step;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Step ${i + 1}`}
                disabled={!clickable}
                onClick={() => clickable && go(i)}
                className={`relative flex-1 overflow-hidden transition-[height,filter] duration-[400ms] ${clickable ? "cursor-pointer hover:brightness-[1.4]" : "cursor-default"}`}
                style={{ height: filled ? 3 : 2, borderRadius: 999, background: "rgba(255,255,255,0.1)" }}
              >
                <motion.span
                  className="absolute inset-0"
                  style={{ transformOrigin: "left center", background: "linear-gradient(90deg, #2f9d74, #78e9c0)", borderRadius: 999 }}
                  initial={false}
                  animate={{ scaleX: filled ? 1 : 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE }}
                >
                  {i === step && (
                    <span
                      className="dc-sheen pointer-events-none absolute inset-0"
                      style={{ background: "linear-gradient(100deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 62%)", animation: "dc-step-sheen 1.5s ease-in-out infinite" }}
                    />
                  )}
                </motion.span>
              </button>
            );
          })}
        </div>

        {/* Content stage */}
        <div className="flex flex-col" style={{ minHeight: 328 }}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stageVariants(Boolean(reduced))}
              initial="initial"
              animate="enter"
              exit="exit"
              className={`flex flex-1 flex-col justify-center ${step === 0 || step === 5 ? "items-center text-center" : ""}`}
            >
              {step === 0 && <StepWelcome welcome={welcome} />}
              {step === 1 && <StepName name={name} setName={setName} />}
              {step === 2 && <StepRole nameComma={nameComma} understood={understood} setUnderstood={setUnderstood} />}
              {step === 3 && <StepAvatar avatar={avatar} setAvatar={setAvatar} />}
              {step === 4 && (
                <StepWallet
                  isConnected={isConnected}
                  onSepolia={onSepolia}
                  connecting={connectModalOpen ?? false}
                  address={address}
                  onConnect={() => openConnectModal?.()}
                  onSwitch={() => openChainModal?.()}
                  onSkip={finish}
                  allowSkip={ALLOW_DEMO_DATA}
                />
              )}
              {step === 5 && <StepAllSet nameComma={nameComma} avatar={avatar || AVATARS[0]} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-[26px] flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="cursor-pointer select-none rounded-full px-[18px] py-[11px] text-sm transition-colors hover:bg-white/5 hover:text-[#e8f0ec]"
              style={{ color: "#9db3aa" }}
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <motion.button
            type="button"
            whileHover={reduced ? undefined : { scale: 1.03 }}
            onClick={() => {
              if (!canContinue) return;
              if (step === TOTAL - 1) finish();
              else go(step + 1);
            }}
            className="flex select-none items-center gap-2 rounded-full font-medium"
            style={{ background: "#5fe3ab", color: "#08331f", fontSize: 14.5, padding: "13px 26px", opacity: canContinue ? 1 : 0.4, cursor: canContinue ? "pointer" : "not-allowed" }}
          >
            {continueLabel}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </motion.button>
        </div>
      </motion.div>

      {/* Attribution */}
      <p className="absolute inset-x-0 text-center" style={{ bottom: 22, fontSize: 11, color: "rgba(233,244,238,0.62)", textShadow: "0 1px 5px rgba(6,20,14,0.55)" }}>
        SealedPay · Powered by DisperseKit · TokenOps disperse · Zama FHE
      </p>
    </div>
  );
}

/* ── Steps ───────────────────────────────────────────────────────────────── */

function StepWelcome({ welcome }: { welcome: string }) {
  return (
    <>
      <Item i={0} center>
        <div className="relative mb-2 flex items-center justify-center" style={{ width: 128, height: 128 }}>
          <div
            className="dc-glow absolute rounded-full"
            style={{ inset: -14, background: "radial-gradient(circle, rgba(90,200,150,0.12), rgba(0,0,0,0) 72%)", animation: "dc-glowpulse 3.4s ease-in-out infinite" }}
          />
          <div className="dc-floaty" style={{ animation: "dc-floaty 5s ease-in-out infinite" }}>
            <SealLogo size={92} />
          </div>
        </div>
      </Item>
      <Item i={1}>
        <p className="mt-5" style={eyebrow(400)}>
          Confidential payroll
        </p>
      </Item>
      <Item i={2}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.15, letterSpacing: "0.2px", minHeight: 40 }}>
          {welcome}
        </h1>
      </Item>
      <Item i={3}>
        <p className="mt-3.5" style={{ fontSize: 15, fontWeight: 400, color: "#9db3aa", maxWidth: 400, lineHeight: 1.55 }}>
          Pay your whole team in one transaction. Salaries stay encrypted, on-chain, end to end.
        </p>
      </Item>
    </>
  );
}

function StepName({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>Get started</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29, lineHeight: 1.2 }}>
          First, what should we call you?
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa", lineHeight: 1.5 }}>
          We’ll use your name to personalize the workspace.
        </p>
      </Item>
      <Item i={3}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your first name"
          autoFocus
          className="mt-[26px] w-full outline-none transition-[border]"
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 98,
            padding: "17px 22px",
            color: "#f2f7f4",
            fontSize: 17,
            fontFamily: "'Manrope', sans-serif",
            backdropFilter: "blur(22px) saturate(1.3)",
            WebkitBackdropFilter: "blur(22px) saturate(1.3)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), inset 0 -1px 0 0 rgba(0,0,0,0.15), 0 10px 30px -14px rgba(0,0,0,0.55)",
          }}
          onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(95,230,175,0.6)")}
          onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)")}
        />
      </Item>
    </>
  );
}

function StepRole({ nameComma, understood, setUnderstood }: { nameComma: string; understood: boolean; setUnderstood: (v: boolean) => void }) {
  const reduced = useReducedMotion();
  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>Your role</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29, lineHeight: 1.25 }}>
          You’re the payroll administrator{nameComma}
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-4" style={{ fontSize: 14.5, color: "#9db3aa", lineHeight: 1.6 }}>
          You run confidential payroll for a team of 5. Salaries are encrypted on-chain with Zama FHE. You approve{" "}
          <span style={{ color: "#cfe0d8" }}>one transaction</span>, and everyone gets paid without exposing a single
          amount.
        </p>
      </Item>
      <Item i={3}>
        <button
          type="button"
          onClick={() => setUnderstood(!understood)}
          className="mt-[22px] flex w-full cursor-pointer select-none items-start gap-3.5 text-left"
          style={{ background: "rgba(110,196,186,0.17)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 20, padding: "18px 20px" }}
          aria-pressed={understood}
        >
          <motion.span
            className="mt-px flex shrink-0 items-center justify-center transition-[background,border]"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: understood ? "#5fe3ab" : "rgba(255,255,255,0.05)",
              border: understood ? "1px solid rgba(0,0,0,0)" : "1px solid rgba(255,255,255,0.18)",
            }}
            animate={understood && !reduced ? { scale: [1, 1.22, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: understood ? 1 : 0, transition: "opacity .18s" }} aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.span>
          <span style={{ fontSize: 13.5, color: "#c2d0c9", lineHeight: 1.55 }}>
            We’ve pre-loaded a demo team and{" "}
            <span style={{ color: "#f2f7f4", fontWeight: 600 }}>6 months of payroll history</span> so you can explore
            right away. Any real payroll you run settles live on Sepolia, and those transactions appear here in the UI
            with their own Etherscan links, on top of the sample data.
          </span>
        </button>
      </Item>
    </>
  );
}

function StepAvatar({ avatar, setAvatar }: { avatar: string; setAvatar: (v: string) => void }) {
  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>Your profile</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29 }}>
          Choose your avatar
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa" }}>
          Pick a face for your admin profile.
        </p>
      </Item>
      <Item i={3}>
        <div className="mt-7 flex justify-center gap-[15px]">
          {AVATARS.map((src) => {
            const selected = avatar === src;
            return (
              <motion.button
                key={src}
                type="button"
                onClick={() => setAvatar(src)}
                className="relative cursor-pointer"
                style={{ width: 104, height: 104, borderRadius: "50%", padding: 4, background: selected ? "linear-gradient(135deg, #5fe3ab, #2f9d74)" : "rgba(255,255,255,0.08)" }}
                animate={{ scale: selected ? 1.15 : 1 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                aria-pressed={selected}
                aria-label="Avatar"
              >
                <img src={src} alt="Avatar" className="block h-full w-full rounded-full object-cover" style={{ background: "rgba(20,40,32,0.6)" }} />
                {selected && (
                  <span className="absolute flex items-center justify-center" style={{ bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%", background: "#5fe3ab", border: "3px solid #101915" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </Item>
    </>
  );
}

function StepWallet({
  isConnected,
  onSepolia,
  connecting,
  address,
  onConnect,
  onSwitch,
  onSkip,
  allowSkip,
}: {
  isConnected: boolean;
  onSepolia: boolean;
  connecting: boolean;
  address?: `0x${string}`;
  onConnect: () => void;
  onSwitch: () => void;
  onSkip: () => void;
  allowSkip: boolean;
}) {
  const reduced = useReducedMotion();
  const walletReady = isConnected && onSepolia;
  const short = address ? `${address.slice(0, 10)}${address.slice(-8)}` : "";
  const shortDisplay = address ? `${address.slice(0, 10)}…${address.slice(-8)}` : "";
  void short;
  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>Connect</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29 }}>
          Connect your wallet
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa", lineHeight: 1.5 }}>
          Payroll settles from your wallet on the Sepolia testnet. It is all free test money; you just need a little
          Sepolia ETH for gas, from any faucet.
        </p>
      </Item>
      <Item i={3}>
        <div className="mt-[26px]">
          {!isConnected && !connecting && (
            <motion.button
              type="button"
              onClick={onConnect}
              whileHover={reduced ? undefined : { scale: 1.02 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 font-medium"
              style={{ background: "#5fe3ab", color: "#08331f", fontSize: 15, borderRadius: 85, padding: "16px 0" }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="6" width="20" height="13" rx="2.5" />
                <path d="M16 12h.01" />
                <path d="M2 9h16a2 2 0 0 1 2 2" />
              </svg>
              Connect wallet
            </motion.button>
          )}
          {!isConnected && connecting && (
            <div className="flex items-center justify-center gap-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cfdcd6", fontSize: 15, borderRadius: 15, padding: "16px 0" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin 0.7s linear infinite" }} />
              Connecting
            </div>
          )}
          {isConnected && !onSepolia && (
            <motion.button
              type="button"
              onClick={onSwitch}
              whileHover={reduced ? undefined : { scale: 1.02 }}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 font-medium"
              style={{ background: "#5fe3ab", color: "#08331f", fontSize: 15, borderRadius: 85, padding: "16px 0" }}
            >
              Switch to Sepolia
            </motion.button>
          )}
          {isConnected && onSepolia && (
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="flex items-center gap-[13px]"
              style={{ background: "rgba(110,196,186,0.14)", border: "1px solid rgba(95,230,175,0.35)", borderRadius: 86, padding: "16px 18px" }}
            >
              <span className="flex shrink-0 items-center justify-center" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(95,230,175,0.18)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold" style={{ fontSize: 14, color: "#eef4f1" }}>
                  Wallet connected
                </span>
                <span className="tnum mt-0.5 block" style={{ fontSize: 12, color: "#9db3aa" }}>
                  {shortDisplay} · Sepolia
                </span>
              </span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
            </motion.div>
          )}
          {walletReady && <FundStep />}
          {allowSkip && !walletReady && (
            <button
              type="button"
              onClick={onSkip}
              className="mt-3.5 w-full cursor-pointer text-center"
              style={{ fontSize: 12.5, color: "#9db3aa", background: "none", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Skip for now, explore with demo data
            </button>
          )}
        </div>
      </Item>
    </>
  );
}

/**
 * Inline funding on the connect step, shown only when the connected wallet has
 * never been funded (zero confidential-balance handle — no signature needed).
 * Optional: the Continue button stays enabled, so it never blocks onboarding.
 */
const FUND_PRESETS = ["10000", "25000", "100000"] as const;

function FundStep() {
  const reduced = useReducedMotion();
  const { empty, refresh } = useUnfundedWallet();
  const { decimals } = useTokenMeta(DEMO_TOKEN_ADDRESS);
  const [amount, setAmount] = useState<string>("25000");
  const [funded, setFunded] = useState<string | null>(null);
  const { fund, phase, busy, error } = useFundWallet(decimals, ({ amountText }) => {
    setFunded(amountText);
    void refresh();
  });

  if (funded) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3.5 flex items-center gap-[13px]"
        style={{ background: "rgba(95,230,175,0.10)", border: "1px solid rgba(95,230,175,0.3)", borderRadius: 16, padding: "14px 16px" }}
      >
        <span className="flex shrink-0 items-center justify-center" style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(95,230,175,0.18)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold" style={{ fontSize: 13.5, color: "#eef4f1" }}>Payroll funded</span>
          <span className="block" style={{ fontSize: 11.5, color: "#9db3aa", marginTop: 1 }}>
            {Number(funded).toLocaleString("en-US")} cUSDd is ready to disperse.
          </span>
        </span>
      </motion.div>
    );
  }

  // Only prompt a genuinely empty wallet; a returning employer keeps their balance.
  if (empty !== true) return null;

  const pretty = Number(amount).toLocaleString("en-US");
  const label = phase === "minting" ? "Minting on-chain" : phase === "confirming" ? "Confirm in your wallet" : `Add ${pretty} cUSDd`;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="mt-3.5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 15px" }}
    >
      <div className="flex items-center gap-2.5">
        <DepositBoxGlyph size={17} color="#78e9c0" />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>Add payroll funds</span>
      </div>
      <p style={{ fontSize: 11.5, color: "#9db3aa", marginTop: 6, lineHeight: 1.5 }}>
        Your wallet holds no cUSDd yet. Mint test funds so you can run your first payroll right away.
      </p>

      <div className="flex gap-[7px]" style={{ marginTop: 11 }}>
        {FUND_PRESETS.map((v) => {
          const on = amount === v;
          return (
            <button
              key={v}
              type="button"
              disabled={busy}
              onClick={() => setAmount(v)}
              className="flex-1 cursor-pointer rounded-full disabled:cursor-not-allowed"
              style={{ fontSize: 11.5, padding: "7px 0", background: on ? "rgba(95,230,175,0.16)" : "rgba(255,255,255,0.05)", border: `1px solid ${on ? "rgba(95,230,175,0.5)" : "rgba(255,255,255,0.08)"}`, color: on ? "#78e9c0" : "#cfdcd6" }}
            >
              {Number(v).toLocaleString("en-US")}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2.5 rounded-xl p-2.5" style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 11 }}>
          {error}
        </p>
      )}

      <motion.button
        type="button"
        disabled={busy || decimals === undefined}
        whileHover={reduced || busy ? undefined : { scale: 1.02 }}
        whileTap={reduced || busy ? undefined : { scale: 0.98 }}
        onClick={() => void fund(amount)}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 font-medium disabled:cursor-not-allowed"
        style={{ background: "#5fe3ab", color: "#08331f", fontSize: 13.5, borderRadius: 85, padding: "12px 0", opacity: busy || decimals === undefined ? 0.7 : 1 }}
      >
        {busy && <span aria-hidden style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(8,51,31,0.25)", borderTopColor: "#08331f", animation: "dc-spin .7s linear infinite" }} />}
        {label}
      </motion.button>

      <p style={{ fontSize: 10.5, color: "#7f9a8f", marginTop: 8, lineHeight: 1.45 }}>
        You can also fund later from the dashboard.
      </p>
    </motion.div>
  );
}

function StepAllSet({ nameComma, avatar }: { nameComma: string; avatar: string }) {
  return (
    <>
      <Item i={0} center>
        <div className="relative mb-1.5" style={{ width: 96, height: 96 }}>
          <span className="absolute inset-0 rounded-full" style={{ background: "rgba(95,230,175,0.14)", border: "1px solid rgba(95,230,175,0.3)" }} />
          <img src={avatar} alt="You" className="absolute rounded-full object-cover" style={{ inset: 6, width: 84, height: 84, background: "rgba(20,40,32,0.6)" }} />
          <span className="absolute flex items-center justify-center" style={{ bottom: 0, right: 0, width: 30, height: 30, borderRadius: "50%", background: "#5fe3ab", border: "3px solid #101915" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>
      </Item>
      <Item i={1}>
        <p className="mt-[18px]" style={eyebrow(400)}>
          All set
        </p>
      </Item>
      <Item i={2}>
        <h1 className="mt-2" style={{ fontWeight: 700, fontSize: 31 }}>
          You’re all set{nameComma}
        </h1>
      </Item>
      <Item i={3}>
        <p className="mt-3" style={{ fontSize: 14.5, color: "#9db3aa", maxWidth: 380, lineHeight: 1.55 }}>
          Your workspace is ready. Everything below is live. Reveal amounts, run payroll, explore the team.
        </p>
      </Item>
      <Item i={4}>
        <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
          {(["Wallet connected", "Team of 5 loaded", "6 months history"] as const).map((label, i) => (
            <span key={label} className="flex items-center gap-1.5" style={{ border: "1px solid rgba(95,230,175,0.5)", color: "#78e9c0", fontSize: 12, borderRadius: 999, padding: "6px 13px" }}>
              {i === 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />}
              {label}
            </span>
          ))}
        </div>
      </Item>
    </>
  );
}
