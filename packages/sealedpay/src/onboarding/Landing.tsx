/**
 * Landing — the front page. Trimmed copy (a headline + one line), then a
 * sliding two-panel carousel that floats over the OrbitGraphic: one door is
 * centred, the other rests mostly tucked behind it and, on hover, leans
 * outward to reveal more of itself. Clicking the peek slides it to centre
 * while the current door slides away — both doors lead to the same Privy
 * email/wallet login; the chosen one only decides which surface you land on.
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

/**
 * The hero scales as ONE unit from a 1440x900 reference: scale 1 reproduces
 * today's look exactly, larger displays get the identical composition up to
 * 20% bigger, small windows down to 15% smaller. Because everything inside
 * shares the factor, internal proportions can never drift across resolutions.
 */
const heroScale = () =>
  Math.round(Math.min(Math.max(Math.min(window.innerWidth / 1440, window.innerHeight / 900), 0.85), 1.2) * 1000) / 1000;
function useViewportScale() {
  const [scale, setScale] = useState(heroScale);
  useEffect(() => {
    const onResize = () => setScale(heroScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

// Character pool and random casing lifted verbatim from the reference pen
// (codepen.io/creativeocean/pen/JjemXGY).
const GLYPHS = "abcdefghijklmnopqrstuvwxyz1234567890!@#$^&*()…æ_+-=;[]/~`";
const randChar = () => {
  const c = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  return Math.random() > 0.5 ? c : c.toUpperCase();
};
const glyphMask = (s: string) => s.split("").map((ch) => (ch === " " ? " " : randChar())).join("");
function useDecryptScramble(target: string, startDelayMs: number) {
  const reduced = useReducedMotion();
  // Starts as glyph noise (not blank) so the word holds its slot in the line.
  const [text, setText] = useState(() => (reduced ? target : glyphMask(target)));
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
          if (reroll || cache[i] === undefined) cache[i] = randChar();
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
  /** Dimmed, lighter-weight lead-in ("For") — the audience word carries the title. */
  titlePrefix: string;
  titleMain: string;
  sub: string;
  cta: string;
  icon: ReactNode;
}

/* Wallet receiving money — "I run payroll". */
const EMPLOYER_ICON = (
  <svg width="22" height="22" viewBox="0 0 96 96" fill="currentColor" aria-hidden>
    <path d="M86 36v14H72c-5.514 0-10 4.486-10 10s4.486 10 10 10h14v14c0 3.309-2.691 6-6 6H16c-3.309 0-6-2.691-6-6V36c0-3.309 2.691-6 6-6h64c3.309 0 6 2.691 6 6zM72 54h14v12H72c-3.309 0-6-2.691-6-6s2.691-6 6-6zm4 4h-4a2 2 0 0 0 0 4h4a2 2 0 0 0 0-4zM52.172 26 63.95 14.222l-2.172-2.172L47.827 26zM58.95 9.221l-.586-.586c-3.51-3.508-9.219-3.508-12.729 0L28.272 26h13.899zM75.728 26l-8.949-8.95L57.828 26z" />
  </svg>
);
/* ID badge — "I get paid". */
const EMPLOYEE_ICON = (
  <svg width="22" height="22" viewBox="0 0 25 25" fill="currentColor" aria-hidden>
    <path d="M7 2.7c-1.7 0-3 1.4-3 3v15.8c0 1.7 1.3 3 3 3h11c1.7 0 3-1.4 3-3V5.7c0-1.7-1.3-3-3-3h-2.1v1.7c0 1.9-1.5 3.4-3.4 3.4S9.1 6.3 9.1 4.4V2.7zm5.5 8.3c1.2 0 2.2 1 2.2 2.2s-1 2.2-2.2 2.2-2.2-1-2.2-2.2 1-2.2 2.2-2.2zm-2.6 6.1c.2-.2.5-.1.7 0 .6.3 1.2.4 1.9.4s1.4-.2 2-.4c.2-.1.5-.1.7 0 .6.4 1 .9 1.4 1.5.5.9-.1 2.1-1.2 2.1H9.7c-1.1 0-1.7-1.1-1.2-2 .3-.7.8-1.2 1.4-1.6z" />
    <path d="M14 4.4V2c0-.8-.7-1.5-1.5-1.5S11 1.2 11 2v2.4c0 .8.7 1.5 1.5 1.5S14 5.2 14 4.4z" />
  </svg>
);

const DOORS: DoorDef[] = [
  { door: "employer", titlePrefix: "For", titleMain: "Employers", sub: "Run payroll for your whole team in a single confidential transaction.", cta: "Sign in as employer", icon: EMPLOYER_ICON },
  { door: "employee", titlePrefix: "For", titleMain: "Employees", sub: "View your salary and payment history. Only you can decrypt the amounts.", cta: "Sign in as employee", icon: EMPLOYEE_ICON },
];

export function Landing({ onEnter }: { onEnter: (door: Door) => void }) {
  const reduced = useReducedMotion();
  const { authenticated } = usePrivy();
  const pageScale = useViewportScale();
  useEffect(() => setThemeColor(THEME_COLORS.onboarding), []);
  // Only the brand word decodes — the lead-in reads instantly.
  const sealedWord = useDecryptScramble("sealed", 280);

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
    // login() is idempotent (re-opens/refocuses the modal), and the CTA is
    // NEVER disabled — a dismissal that slips past onError must not leave a
    // dead button. A synchronous throw also clears the spinner.
    try {
      login();
    } catch {
      waitingRef.current = null;
      setWaiting(null);
    }
  };

  // Retitle Privy's generic "Log in or sign up" heading to the chosen door
  // ("Employer sign in" / "Employee sign in") so the modal confirms the choice
  // right where the user commits their email. Privy's config only supports a
  // STATIC header, so this rewrites the (structurally stable) h3 the moment
  // the dialog or a lazy-loaded screen renders. The pattern also matches the
  // other door's title so switching doors re-titles a still-open modal.
  useEffect(() => {
    if (!waiting) return;
    const title = waiting === "employer" ? "Employer sign in" : "Employee sign in";
    // Per-door modal avatar (Privy's logo config is just as static as its
    // header): the employer door gets its own face.
    const logo = waiting === "employer" ? "/avatars/avatar-1.svg" : "/avatars/avatar-profile.svg";
    const GENERIC = /log in or sign up|employer sign in|employee sign in/i;
    const rewrite = () => {
      const dlg = document.getElementById("privy-dialog");
      if (!dlg) return;
      for (const h of dlg.querySelectorAll("h3")) {
        if (GENERIC.test(h.textContent ?? "") && h.textContent !== title) h.textContent = title;
      }
      if (dlg.getAttribute("aria-label") !== title) dlg.setAttribute("aria-label", title);
      for (const img of dlg.querySelectorAll('img[src*="/avatars/"]')) {
        if (img.getAttribute("src") !== logo) img.setAttribute("src", logo);
      }
    };
    rewrite();
    const mo = new MutationObserver(rewrite);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [waiting]);

  // Watch the Privy dialog itself: the spinner shows ONLY while the modal is
  // actually in the DOM (checked shortly after opening, then observed). This is
  // sturdier than relying on onError firing for every dismissal path.
  useEffect(() => {
    if (!waiting) return;
    const check = () => {
      if (!document.getElementById("privy-dialog")) {
        waitingRef.current = null;
        setWaiting(null);
      }
    };
    // Give the modal a beat to mount, then verify it exists; afterwards watch
    // for its removal (user dismissed it) with a light interval.
    const first = window.setTimeout(check, 2_500);
    const watch = window.setInterval(check, 1_200);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(watch);
    };
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
      <OrbitGraphic scale={pageScale} />

      {/* Spare height splits above/below the hero in the reference ratio
          (roughly 1:3, matching the old 8.5vh top gap at 900px), so the
          composition sits at the same relative height at every window size. */}
      <div aria-hidden style={{ flexGrow: 1, minHeight: 18 }} />

      {/* The whole hero zooms as one poster — see heroScale. */}
      <div className="relative z-[2] flex flex-col items-center" style={{ zoom: pageScale }}>

      {/* Copy — trimmed to a headline + one line */}
      <motion.div
        className="relative z-[2] flex flex-col items-center text-center"
        style={{ padding: "0 24px" }}
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="relative mb-4 flex items-center justify-center" style={{ width: 96, height: 96 }}>
          {/* The glow is a drop-shadow of the seal itself (silhouette-shaped,
              not radial); float + glow-pulse run as two animations on one
              element. Reduced motion keeps a static shadow. */}
          <div
            className="dc-floaty"
            style={{
              filter: "drop-shadow(0 0 12px rgba(90,200,150,0.26))",
              animation: reduced ? undefined : "sp-floaty-subtle 5s ease-in-out infinite, sp-seal-glow 3.4s ease-in-out infinite",
            }}
          >
            <SealLogo size={72} />
          </div>
        </div>
        <h1 className="mt-1" style={{ fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: "0.2px", minHeight: 44 }}>
          Payroll that stays {sealedWord}
        </h1>
        <p className="mt-3" style={{ fontSize: 14.5, color: "#9db3aa" }}>
          Confidential on-chain payroll.
        </p>
      </motion.div>

      {/* The sliding two-door carousel, floating over the orbit */}
      <motion.div
        className="relative z-[2]"
        style={{ marginTop: 36, width: CARD_W, height: 250 }}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.62, delay: 0.12, ease: EASE }}
      >
        {DOORS.map((d, i) => {
          const isActive = i === active;
          // With two doors, the inactive one sits on the side away from active.
          const side = i > active ? 1 : -1; // +1 → peeks right, -1 → peeks left
          // Rest = mostly tucked behind the centred card; hover slides it
          // OUTWARD so more of it comes into view (never further behind).
          const x = isActive ? 0 : side * CARD_W * (hoverPeek ? 0.9 : 0.76);
          // Low pivot, like a card held in the hand: a modest resting tilt
          // that deepens toward the open side on hover. Active sits flat.
          const rotate = isActive ? 0 : side * (hoverPeek ? 6.5 : 3.8);
          return (
            <DoorPanel
              key={d.door}
              def={d}
              active={isActive}
              reduced={Boolean(reduced)}
              x={x}
              rotate={rotate}
              scale={isActive ? 1 : hoverPeek ? 0.76 : 0.73}
              opacity={isActive ? 1 : hoverPeek ? 0.82 : 0.48}
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
      <div className="relative z-[2] mt-5 flex items-center gap-2">
        {DOORS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Switch to ${DOORS[i].door} sign in`}
            onClick={() => setActive(i)}
            className="cursor-pointer rounded-full transition-all"
            style={{ width: i === active ? 22 : 7, height: 7, background: i === active ? "#5fe3ab" : "rgba(255,255,255,0.22)" }}
          />
        ))}
      </div>

      </div>

      {/* Capped: the dots-to-footer gap never exceeds its designed size —
          on tall windows the leftover slack moves ABOVE the hero instead of
          pooling here as dead space. */}
      <div aria-hidden style={{ flexGrow: 3, minHeight: 40, maxHeight: 230 }} />

      <p className="absolute inset-x-0 z-[2] text-center" style={{ bottom: 26, fontSize: 11 * pageScale, color: "rgba(233,244,238,0.55)", textShadow: "0 1px 5px rgba(6,20,14,0.55)" }}>
        SealedPay · Powered by <a href="https://dispersekit-demo.vercel.app" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(233,244,238,0.28)", textUnderlineOffset: "2px" }}>DisperseKit</a> · TokenOps · Zama FHE
      </p>
    </div>
  );
}

function DoorPanel({
  def,
  active,
  reduced,
  x,
  rotate,
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
  rotate: number;
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
      style={{ width: CARD_W, zIndex: active ? 3 : 1, cursor: active ? "default" : "pointer", transformOrigin: "50% 88%" }}
      initial={false}
      animate={{ x, rotate, scale, opacity }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              // One gentle glide for position/tilt, a slightly livelier spring
              // for scale (a soft pop as a card lands centre), and a tween for
              // opacity — springing opacity is what read as the jerk.
              x: { type: "spring", stiffness: 190, damping: 27, mass: 1 },
              rotate: { type: "spring", stiffness: 190, damping: 27, mass: 1 },
              scale: { type: "spring", stiffness: 290, damping: 18 },
              opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            }
      }
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
      onClick={active ? undefined : onPeekClick}
    >
      <div
        className="sp-glass-card flex flex-col"
        style={{
          height: 244,
          borderRadius: 24,
          padding: "20px 20px 19px",
          background: active ? "rgba(16,27,23,0.55)" : "rgba(12,20,17,0.42)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          boxShadow: active
            ? "0 30px 70px -28px rgba(0,0,0,0.75), 0 0 44px -26px rgba(95,230,175,0.5)"
            : "0 20px 50px -24px rgba(0,0,0,0.7)",
        }}
      >
        <span className="sp-glass-card flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(95,230,175,0.12)", color: "#78e9c0" }}>
          {def.icon}
        </span>
        <span className="mt-4 block" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
          <span style={{ fontWeight: 500, color: "rgba(242,247,244,0.55)" }}>{def.titlePrefix}</span> {def.titleMain}
        </span>
        <span className="mt-2 block" style={{ fontSize: 12.5, color: "#9db3aa", lineHeight: 1.55 }}>
          {def.sub}
        </span>

        <div className="mt-auto">
          {active ? (
            <motion.button
              type="button"
              onClick={onCta}
              whileHover={reduced ? undefined : { scale: 1.02 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full font-medium"
              style={{ background: "#5fe3ab", color: "#08331f", fontSize: 13.5, padding: "12px 0", lineHeight: 1 }}
            >
              {busy ? (
                <>
                  <span aria-hidden style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(8,51,31,0.28)", borderTopColor: "#08331f", animation: "dc-spin .7s linear infinite" }} />
                  Signing in
                </>
              ) : (
                <>
                  {def.cta}
                  <svg className="block shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
              {`${def.titlePrefix} ${def.titleMain}`}
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
