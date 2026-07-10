/**
 * Onboarding — rebuilt from docs/design/extracted/onboarding.md (values and
 * copy verbatim from the design prototype), now in two variants that share
 * every screen:
 *
 *   employer: welcome · name · role · avatar · wallet · fund · all set
 *   employee: welcome · name · how-it-works · avatar · your wallet · all set
 *
 * Auth happens BEFORE this flow (the landing page's Privy login), so the
 * wallet step confirms the signed-in wallet — the email-embedded one Privy
 * created, or a connected external wallet — rather than opening a connect
 * modal. Employees skip funding entirely: revealing pay is a gasless
 * signature. `finish()` persists name + avatar (design-mandated localStorage
 * keys) and hands off to the dashboard/portal.
 */
import { DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID, useTokenMeta } from "@dispersekit/widget";
import { useConnectWallet, usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { setPreferExternal } from "../lib/activeWallet";

import { SealLogo } from "../design/SealLogo";
import { saveIdentity } from "../lib/prefs";
import { THEME_COLORS, setThemeColor } from "../lib/themeColor";
import { useFundWallet, useUnfundedWallet } from "../lib/wallet";

const EASE = [0.22, 1, 0.36, 1] as const;
const EXIT_EASE = [0.4, 0, 1, 1] as const;
export const AVATARS = ["/avatars/avatar-1.svg", "/avatars/avatar-2.svg", "/avatars/avatar-3.svg", "/avatars/avatar-4.svg", "/avatars/avatar-profile.svg"];

export type OnboardingVariant = "employer" | "employee";

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

export function Onboarding({
  onDone,
  variant = "employer",
  initialName = "",
  initialAvatar = "",
}: {
  onDone: () => void;
  variant?: OnboardingVariant;
  initialName?: string;
  initialAvatar?: string;
}) {
  const reduced = useReducedMotion();
  const employee = variant === "employee";
  // employer: welcome · name · role · avatar · wallet · fund · all set (7)
  // employee: welcome · name · how-it-works · avatar · wallet · all set (6)
  const TOTAL = employee ? 6 : 7;
  useEffect(() => setThemeColor(THEME_COLORS.onboarding), []);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  // Pre-filled when signing back in (returning user) so it is a quick
  // welcome-back click-through; blank for a genuine first run.
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);

  // Auth already happened on the landing page — the wallet step CONFIRMS the
  // signed-in wallet (embedded or external) instead of opening a connect modal.
  const { address, isConnected, chain } = useAccount();
  const { user } = usePrivy();
  // Deliberately connecting an external wallet (funded employer): remember it as
  // the preferred signer; useActiveWalletSync then makes it the active wallet.
  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => setPreferExternal(wallet.address),
  });
  const { switchChain, isPending: switching } = useSwitchChain();
  const onSepolia = chain?.id === SEPOLIA_CHAIN_ID;
  const walletReady = isConnected && onSepolia;
  const embedded = user?.wallet?.walletClientType === "privy";
  const email = user?.email?.address;

  // Onboarding-local error toast: wallet + funding errors surface here (never
  // inline in a block) and auto-dismiss after a few seconds.
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(t);
  }, [toast]);
  const showToast = (msg: string) => setToast((p) => ({ msg, n: (p?.n ?? 0) + 1 }));

  const first = name.trim().split(" ")[0] || "";
  const nameComma = first ? `, ${first}.` : ".";
  const welcome = useDecryptScramble("Welcome to SealedPay", 280);

  const canContinue = (
    employee
      ? [true, first.length > 0, true, Boolean(avatar), walletReady, true]
      : [true, first.length > 0, true, Boolean(avatar), walletReady, true, true]
  )[step];
  const continueLabel = step === 0 ? "Get started" : step === TOTAL - 1 ? "Go to dashboard" : "Continue";

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
              className={`flex flex-1 flex-col justify-center ${step === 0 || step === TOTAL - 1 ? "items-center text-center" : ""}`}
            >
              {step === 0 && <StepWelcome welcome={welcome} employee={employee} />}
              {step === 1 && <StepName name={name} setName={setName} />}
              {step === 2 && <StepRole nameComma={nameComma} employee={employee} />}
              {step === 3 && <StepAvatar avatar={avatar} setAvatar={setAvatar} />}
              {step === 4 && (
                <StepWallet
                  employee={employee}
                  embedded={Boolean(embedded)}
                  email={email}
                  isConnected={isConnected}
                  onSepolia={onSepolia}
                  switching={switching}
                  address={address}
                  onUseDifferent={() => connectWallet()}
                  onSwitch={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
                  onSkip={finish}
                  allowSkip={ALLOW_DEMO_DATA && !employee}
                />
              )}
              {!employee && step === 5 && <StepFund onError={showToast} />}
              {step === TOTAL - 1 && <StepAllSet nameComma={nameComma} avatar={avatar || AVATARS[0]} employee={employee} />}
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

      {/* Error toast (wallet + funding errors), top-center, auto-dismiss */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.n}
            initial={reduced ? false : { opacity: 0, x: "-50%", y: -14 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: "-50%", y: -14 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed top-6 z-[90] flex items-center gap-2.5"
            style={{ left: "50%", maxWidth: "90vw", background: "rgba(30,16,14,0.94)", border: "1px solid rgba(224,110,98,0.5)", borderRadius: 999, padding: "11px 20px", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}
          >
            <span className="shrink-0" style={{ width: 7, height: 7, borderRadius: "50%", background: "#eb8f85" }} aria-hidden />
            <span style={{ fontSize: 12.5, color: "#f2d5d0", lineHeight: 1.4 }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attribution */}
      <p className="absolute inset-x-0 text-center" style={{ bottom: 26, fontSize: 11, color: "rgba(233,244,238,0.55)", textShadow: "0 1px 5px rgba(6,20,14,0.55)" }}>
        SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(233,244,238,0.28)", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps disperse · Zama FHE
      </p>
    </div>
  );
}

/* ── Steps ───────────────────────────────────────────────────────────────── */

function StepWelcome({ welcome, employee }: { welcome: string; employee: boolean }) {
  return (
    <>
      <Item i={0} center>
        <div className="relative mb-2 flex items-center justify-center" style={{ width: 128, height: 128 }}>
          {/* Same treatment as the landing seal: silhouette drop-shadow glow
              breathing alongside the subtle 2px float. */}
          <div
            className="dc-floaty"
            style={{
              filter: "drop-shadow(0 0 12px rgba(90,200,150,0.26))",
              animation: "sp-floaty-subtle 5s ease-in-out infinite, sp-seal-glow 3.4s ease-in-out infinite",
            }}
          >
            <SealLogo size={92} />
          </div>
        </div>
      </Item>
      <Item i={1}>
        <p className="mt-5" style={eyebrow(400)}>
          {employee ? "Confidential pay" : "Confidential payroll"}
        </p>
      </Item>
      <Item i={2}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.15, letterSpacing: "0.2px", minHeight: 40 }}>
          {welcome}
        </h1>
      </Item>
      <Item i={3}>
        <p className="mt-3.5" style={{ fontSize: 15, fontWeight: 400, color: "#9db3aa", maxWidth: 400, lineHeight: 1.55 }}>
          {employee
            ? "Your salary arrives encrypted on-chain. Only the account tied to your email can decrypt it."
            : "Run payroll for your whole team in a single transaction. Salaries remain encrypted on-chain, end to end."}
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
          Your name
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa", lineHeight: 1.5 }}>
          It appears on your workspace profile.
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

function StepRole({ nameComma, employee }: { nameComma: string; employee: boolean }) {
  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>{employee ? "How it works" : "Your role"}</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29, lineHeight: 1.25 }}>
          {employee ? `Only you can see your pay${nameComma}` : `You’re the payroll administrator${nameComma}`}
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-4" style={{ fontSize: 14.5, color: "#9db3aa", lineHeight: 1.6 }}>
          {employee ? (
            <>
              Your employer seals every salary with Zama FHE before it touches the chain. The transaction is public ·
              the amounts are not. Revealing yours takes <span style={{ color: "#cfe0d8" }}>one signature</span> from
              the wallet tied to your email.
            </>
          ) : (
            <>
              Salaries are encrypted on-chain with Zama FHE before they settle. You approve{" "}
              <span style={{ color: "#cfe0d8" }}>one transaction</span> and every employee is paid without a single
              amount being exposed.
            </>
          )}
        </p>
      </Item>
      <Item i={3}>
        {/* Info card (no acknowledgment tick — that was compliance theater):
            employee = the email-wallet explainer, employer = the environment. */}
        <div
          className="mt-[22px] flex w-full items-start gap-3.5 text-left"
          style={{ background: "rgba(110,196,186,0.17)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 20, padding: "18px 20px" }}
        >
          <svg className="mt-px shrink-0" width="24" height="24" viewBox="0 0 48 48" fill="#78e9c0" aria-hidden>
            <path d="M24 2C11.85 2 2 11.85 2 24s9.85 22 22 22 22-9.85 22-22S36.15 2 24 2zm3 33a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V23a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2zm-3-17a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
          </svg>
          <span style={{ fontSize: 13.5, color: "#c2d0c9", lineHeight: 1.55 }}>
            {employee ? (
              <>
                Your pay arrives in a wallet <span style={{ color: "#f2f7f4", fontWeight: 600 }}>created from your email</span>{" "}
                · no extension, no seed phrase. Sign in on any device and your payments are there, sealed until you
                reveal them.
              </>
            ) : (
              <>
                SealedPay runs on <span style={{ color: "#f2f7f4", fontWeight: 600 }}>Sepolia testnet</span> · payroll
                settles with free test funds, and every transaction is verifiable on Etherscan.
              </>
            )}
          </span>
        </div>
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
          Choose a profile picture
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa" }}>
          It appears next to your name across SealedPay.
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
                style={{ width: 92, height: 92, borderRadius: "50%", padding: 4, background: selected ? "linear-gradient(135deg, #5fe3ab, #2f9d74)" : "rgba(255,255,255,0.08)" }}
                animate={{ scale: selected ? 1.15 : 1 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                aria-pressed={selected}
                aria-label="Avatar"
              >
                <img src={src} alt="Avatar" className="block h-full w-full rounded-full object-cover" style={{ background: "rgba(236,238,237,0.4)" }} />
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
  employee,
  embedded,
  email,
  isConnected,
  onSepolia,
  switching,
  address,
  onUseDifferent,
  onSwitch,
  onSkip,
  allowSkip,
}: {
  employee: boolean;
  embedded: boolean;
  email?: string;
  isConnected: boolean;
  onSepolia: boolean;
  switching: boolean;
  address?: `0x${string}`;
  onUseDifferent: () => void;
  onSwitch: () => void;
  onSkip: () => void;
  allowSkip: boolean;
}) {
  const reduced = useReducedMotion();
  const walletReady = isConnected && onSepolia;
  const shortDisplay = address ? `${address.slice(0, 10)}…${address.slice(-8)}` : "";
  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>{employee ? "Your wallet" : "Payroll wallet"}</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29 }}>
          {employee ? "Where your salary arrives" : "Your payroll wallet"}
        </h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa", lineHeight: 1.5 }}>
          {employee
            ? "This wallet was created from your email when you signed in. Payments sent to it stay sealed · only your signature can reveal them."
            : embedded
              ? "This wallet was created from your email · payroll settles from it on Sepolia. You can also connect an existing funded wallet instead."
              : "Payroll settles from your connected wallet on Sepolia. Test funds are free to mint · gas requires a small amount of Sepolia ETH from any faucet."}
        </p>
      </Item>
      <Item i={3}>
        <div className="mt-[26px]">
          {/* The signed-in wallet, confirmed. Privy restores the session before
              this renders, so the pending state is a brief settle at most. */}
          {!isConnected && (
            <div className="flex items-center justify-center gap-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cfdcd6", fontSize: 15, borderRadius: 15, padding: "16px 0" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin 0.7s linear infinite" }} />
              Preparing your wallet
            </div>
          )}
          {isConnected && !onSepolia && (
            <motion.button
              type="button"
              onClick={onSwitch}
              disabled={switching}
              whileHover={reduced || switching ? undefined : { scale: 1.02 }}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 font-medium disabled:cursor-not-allowed"
              style={{ background: "#5fe3ab", color: "#08331f", fontSize: 15, borderRadius: 85, padding: "16px 0", opacity: switching ? 0.7 : 1 }}
            >
              {switching && <span aria-hidden style={{ width: 16, height: 16, borderRadius: "50%", border: "2.2px solid rgba(8,51,31,0.25)", borderTopColor: "#08331f", animation: "dc-spin .7s linear infinite" }} />}
              {switching ? "Switching" : "Switch to Sepolia"}
            </motion.button>
          )}
          {walletReady && (
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="flex items-center gap-[13px]"
              style={{ background: "rgba(110,196,186,0.14)", border: "1px solid rgba(95,230,175,0.35)", borderRadius: 86, padding: "16px 18px" }}
            >
              <span className="flex shrink-0 items-center justify-center" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(95,230,175,0.18)" }}>
                {embedded ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="m3 8 7.9 5.3a2 2 0 0 0 2.2 0L21 8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold" style={{ fontSize: 14, color: "#eef4f1" }}>
                  {embedded ? (email ? `Created from ${email}` : "Created from your email") : "Wallet connected"}
                </span>
                <span className="tnum mt-0.5 block" style={{ fontSize: 12, color: "#9db3aa" }}>{shortDisplay} · Sepolia</span>
              </span>
            </motion.div>
          )}
          {/* Employers can settle from an already-funded external wallet instead. */}
          {!employee && walletReady && (
            <button
              type="button"
              onClick={onUseDifferent}
              className="mt-3.5 w-full cursor-pointer text-center transition-colors hover:text-[#cfe0d8]"
              style={{ fontSize: 12.5, color: "#9db3aa", background: "none" }}
            >
              {embedded ? "Use MetaMask or another wallet instead" : "Connect a different wallet"}
            </button>
          )}
          {allowSkip && !walletReady && (
            <button
              type="button"
              onClick={onSkip}
              className="mt-3.5 w-full cursor-pointer text-center"
              style={{ fontSize: 12.5, color: "#9db3aa", background: "none", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Continue with sample data
            </button>
          )}
        </div>
      </Item>
    </>
  );
}

/**
 * Dedicated funding step (step 5), shown on its own so a fresh employer starts
 * with a payroll balance. Content adapts to the wallet: the fund form when it
 * is empty, a receipt after a mint, an "already funded" note for a returning
 * employer, or a brief balance check. Funding is optional — Continue proceeds
 * regardless — and mint errors surface as a toast, never inline.
 */
const FUND_PRESETS = ["10000", "25000", "100000"] as const;

function StepFund({ onError }: { onError: (msg: string) => void }) {
  const reduced = useReducedMotion();
  const { address } = useAccount();
  const { empty, refresh } = useUnfundedWallet();
  const { decimals } = useTokenMeta(DEMO_TOKEN_ADDRESS);
  const [amount, setAmount] = useState<string>("25000");
  const [funded, setFunded] = useState<string | null>(null);
  const { fund, phase, busy } = useFundWallet(
    decimals,
    ({ amountText }) => {
      setFunded(amountText);
      void refresh();
    },
    onError,
  );

  const pretty = Number(amount).toLocaleString("en-US");
  const label = phase === "minting" ? "Minting on-chain" : phase === "confirming" ? "Confirm in your wallet" : `Add ${pretty} cUSDd`;
  // funded (just minted) → receipt; empty false → already has funds; undefined
  // → still reading the balance; true → the fund form.
  const view = funded ? "funded" : empty === false ? "already" : empty === undefined ? "checking" : "form";

  return (
    <>
      <Item i={0}>
        <p style={eyebrow()}>Fund</p>
      </Item>
      <Item i={1}>
        <h1 className="mt-3" style={{ fontWeight: 700, fontSize: 29 }}>Add payroll funds</h1>
      </Item>
      <Item i={2}>
        <p className="mt-3" style={{ fontSize: 14, color: "#9db3aa", lineHeight: 1.5 }}>
          Mint test cUSDd to fund your first payroll. You can top up at any time from the dashboard.
        </p>
      </Item>
      <Item i={3}>
        <div className="mt-[26px]">
          {view === "funded" ? (
            <FundReceipt title="Payroll funded" sub={`${Number(funded).toLocaleString("en-US")} cUSDd is ready to disperse.`} reduced={Boolean(reduced)} />
          ) : view === "already" ? (
            <FundReceipt title="Wallet already funded" sub="You have cUSDd ready to disperse. Top up anytime from the dashboard." reduced={Boolean(reduced)} />
          ) : view === "checking" ? (
            <div className="flex items-center gap-2.5" style={{ color: "#9db3aa", fontSize: 13 }}>
              <span aria-hidden style={{ width: 16, height: 16, borderRadius: "50%", border: "2.2px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }} />
              Checking your balance
            </div>
          ) : (
            <FundControls amount={amount} setAmount={setAmount} onFund={() => void fund(amount)} label={label} busy={busy} decimals={decimals} reduced={Boolean(reduced)} address={address} />
          )}
        </div>
      </Item>
    </>
  );
}

function FundControls({
  amount,
  setAmount,
  onFund,
  label,
  busy,
  decimals,
  reduced,
  address,
}: {
  amount: string;
  setAmount: (v: string) => void;
  onFund: () => void;
  label: string;
  busy: boolean;
  decimals: number | undefined;
  reduced: boolean;
  address?: `0x${string}`;
}) {
  const [copied, setCopied] = useState(false);
  const copyAddress = () => {
    if (!address) return;
    try {
      void navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.42, ease: EASE }}
    >
      <div className="flex gap-[9px]">
        {FUND_PRESETS.map((v) => {
          const on = amount === v;
          return (
            <button
              key={v}
              type="button"
              disabled={busy}
              onClick={() => setAmount(v)}
              className="flex-1 cursor-pointer rounded-full disabled:cursor-not-allowed"
              style={{ fontSize: 13, padding: "11px 0", background: on ? "rgba(95,230,175,0.16)" : "rgba(255,255,255,0.05)", border: `1px solid ${on ? "rgba(95,230,175,0.5)" : "rgba(255,255,255,0.1)"}`, color: on ? "#78e9c0" : "#cfdcd6" }}
            >
              {Number(v).toLocaleString("en-US")}
            </button>
          );
        })}
      </div>

      <motion.button
        type="button"
        disabled={busy || decimals === undefined}
        whileHover={reduced || busy ? undefined : { scale: 1.02 }}
        whileTap={reduced || busy ? undefined : { scale: 0.98 }}
        onClick={onFund}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 font-medium disabled:cursor-not-allowed"
        style={{ background: "#5fe3ab", color: "#08331f", fontSize: 15, borderRadius: 85, padding: "15px 0", opacity: busy || decimals === undefined ? 0.7 : 1 }}
      >
        {busy && <span aria-hidden style={{ width: 16, height: 16, borderRadius: "50%", border: "2.2px solid rgba(8,51,31,0.25)", borderTopColor: "#08331f", animation: "dc-spin .7s linear infinite" }} />}
        {label}
      </motion.button>

      <p style={{ fontSize: 11.5, color: "#7f9a8f", marginTop: 11, paddingLeft: 7, lineHeight: 1.5 }}>
        Gas requires a small amount of Sepolia ETH.{" "}
        <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer" style={{ color: "#5fe3ab", textDecoration: "none" }}>
          Get it free
        </a>
        {address ? (
          <>
            {" "}for{" "}
            <button type="button" onClick={copyAddress} className="tnum cursor-pointer transition-colors hover:text-[#cfe0d8]" style={{ color: "#9db3aa", background: "none" }} title="Copy address">
              {copied ? "copied ✓" : `${address.slice(0, 6)}…${address.slice(-4)}`}
            </button>
            ,
          </>
        ) : (
          ","
        )}{" "}
        or fund later from the dashboard.
      </p>
    </motion.div>
  );
}

function FundReceipt({ title, sub, reduced }: { title: string; sub: string; reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex items-center gap-[14px]"
      style={{ background: "rgba(95,230,175,0.10)", border: "1px solid rgba(95,230,175,0.3)", borderRadius: 18, padding: "18px 20px" }}
    >
      <span className="flex shrink-0 items-center justify-center" style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(95,230,175,0.18)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold" style={{ fontSize: 15, color: "#eef4f1" }}>{title}</span>
        <span className="block" style={{ fontSize: 12.5, color: "#9db3aa", marginTop: 2 }}>{sub}</span>
      </span>
    </motion.div>
  );
}

function StepAllSet({ nameComma, avatar, employee }: { nameComma: string; avatar: string; employee: boolean }) {
  const chips = employee
    ? (["Wallet ready", "Payments arrive sealed", "Reveal any time"] as const)
    : (["Wallet connected", "Sample team loaded", "6 months of history"] as const);
  return (
    <>
      <Item i={0} center>
        <div className="relative mb-1.5" style={{ width: 96, height: 96 }}>
          <span className="absolute inset-0 rounded-full" style={{ background: "rgba(95,230,175,0.14)", border: "1px solid rgba(95,230,175,0.3)" }} />
          <img src={avatar} alt="You" className="absolute rounded-full object-cover" style={{ inset: 6, width: 84, height: 84, background: "rgba(236,238,237,0.4)" }} />
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
          {employee
            ? "Your portal is ready. Reveal your balance, review every payment, and export payslips."
            : "Your workspace is ready. Review your team, run payroll, and verify every payout on-chain."}
        </p>
      </Item>
      <Item i={4}>
        <div className="mt-[22px] flex flex-wrap justify-center gap-2.5">
          {chips.map((label, i) => (
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
