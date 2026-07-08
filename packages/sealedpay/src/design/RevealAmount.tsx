/**
 * RevealAmount — the app's signature privacy interaction.
 *
 * Masked state is three stars (weight 400). Revealing scrambles every char
 * with random digits (~40ms/frame) and resolves them left-to-right (~60ms
 * stagger); each landing char spring-pops (1 → 1.42 → 0.92 → 1 over ~340ms),
 * then one soft green glow pulse (~640ms). Hiding is a quick blur-to-stars
 * collapse (~230ms). Timings and easings are verbatim from the design
 * handoff's animation inventory. Reduced motion: instant swaps.
 *
 * The component is purely presentational: callers own WHEN a value may be
 * shown (for real-decryption surfaces, flip `revealed` only once the
 * plaintext exists; use `pending` for the in-flight shimmer).
 */
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const SCRAMBLE_FRAME_MS = 40;
const RESOLVE_STAGGER_MS = 60;
// The encrypt "seal" whirs every digit for a visible beat before it collapses
// to the stars, so it reads as the number being scrambled rather than a blink.
const SEAL_FRAME_MS = 55; // digit whir cadence
const SEAL_SCRAMBLE_MS = 760; // how long the number visibly churns before sealing
const HIDE_MS = 230;
const GLOW_MS = 640;
const DIGITS = "0123456789";
const STARS = "***";

function randomDigit() {
  return DIGITS[Math.floor(Math.random() * DIGITS.length)];
}

type Phase = "masked" | "scrambling" | "shown" | "hiding";

export function RevealAmount({
  value,
  revealed,
  pending = false,
  onToggle,
  keepLock = false,
  className = "",
  charClassName = "",
  label = "amount",
  tabular = true,
}: {
  /** Formatted plaintext, e.g. "4.5K" or "22,350.50". Undefined = unknown yet. */
  value: string | undefined;
  revealed: boolean;
  /** True while a real decryption is in flight — shimmers the stars. */
  pending?: boolean;
  onToggle?: () => void;
  /** Wallet-balance / salary-hero variant: a lock drifts open on reveal. */
  keepLock?: boolean;
  className?: string;
  charClassName?: string;
  label?: string;
  /** Tabular figures (monospaced digits). Off for large display numbers. */
  tabular?: boolean;
}) {
  const reduced = useReducedMotion();
  const num = tabular ? "tnum " : "";
  const [phase, setPhase] = useState<Phase>(revealed && value !== undefined ? "shown" : "masked");
  const [resolvedCount, setResolvedCount] = useState(revealed && value !== undefined ? (value?.length ?? 0) : 0);
  const [, setFrame] = useState(0); // ticks re-randomize the unresolved chars
  const [glow, setGlow] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearInterval(t);
    timers.current = [];
  }, []);

  useEffect(() => {
    clearTimers();
    if (revealed && value !== undefined) {
      if (reduced) {
        setPhase("shown");
        setResolvedCount(value.length);
        return;
      }
      setPhase("scrambling");
      setResolvedCount(0);
      const scramble = window.setInterval(() => setFrame((f) => f + 1), SCRAMBLE_FRAME_MS);
      const resolver = window.setInterval(() => {
        setResolvedCount((n) => {
          if (n + 1 >= value.length) {
            clearTimers();
            setPhase("shown");
            setGlow(true);
            window.setTimeout(() => setGlow(false), GLOW_MS);
          }
          return n + 1;
        });
      }, RESOLVE_STAGGER_MS);
      timers.current = [scramble, resolver];
    } else if (!revealed) {
      if (reduced || phase === "masked") {
        setPhase("masked");
        setResolvedCount(0);
        return;
      }
      setPhase("hiding");
      const t = window.setTimeout(() => {
        setPhase("masked");
        setResolvedCount(0);
      }, HIDE_MS);
      timers.current = [t as unknown as number];
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, value, reduced]);

  const showChars = phase === "scrambling" || phase === "shown";
  const chars = value ?? "";

  const content =
    showChars && value !== undefined ? (
      <motion.span
        key="value"
        className={`${num}inline-flex`}
        animate={
          glow && !reduced
            ? { textShadow: ["0 0 0px rgba(120,233,192,0)", "0 0 18px rgba(120,233,192,0.75)", "0 0 0px rgba(120,233,192,0)"] }
            : { textShadow: "0 0 0px rgba(120,233,192,0)" }
        }
        transition={{ duration: GLOW_MS / 1000 }}
      >
        {chars.split("").map((ch, i) => {
          const isResolved = phase === "shown" || i < resolvedCount;
          return isResolved ? (
            <motion.span
              key={`r${i}`}
              className={charClassName}
              initial={reduced ? false : { scale: 1 }}
              animate={reduced ? {} : { scale: [1, 1.42, 0.92, 1] }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ) : (
            <span key={`s${i}`} className={`${charClassName} opacity-80`}>
              {/\d/.test(ch) || /[a-zA-Z]/.test(ch) ? randomDigit() : ch}
            </span>
          );
        })}
      </motion.span>
    ) : (
      <motion.span
        key="stars"
        className={`${num}inline-flex font-normal ${pending && !reduced ? "animate-pulse" : ""}`}
        initial={false}
        animate={phase === "hiding" && !reduced ? { filter: ["blur(6px)", "blur(0px)"] } : { filter: "blur(0px)" }}
        transition={{ duration: HIDE_MS / 1000, ease: [0.4, 0, 1, 1] }}
      >
        {STARS}
      </motion.span>
    );

  const lockShown = keepLock;
  const revealedNow = showChars && value !== undefined;

  const inner = (
    <>
      {content}
      {lockShown && (
        <motion.span
          aria-hidden
          initial={false}
          animate={
            reduced
              ? { opacity: revealedNow ? 0 : 1 }
              : revealedNow
                ? { x: 10, rotate: 28, opacity: 0 }
                : { x: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex"
        >
          <LockGlyph />
        </motion.span>
      )}
    </>
  );

  // Display-only (no toggle): render a span so it can safely nest inside a
  // clickable row/card without producing a <button> inside a <button>.
  if (!onToggle) {
    return <span className={`inline-flex items-center gap-2 ${className}`}>{inner}</span>;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={revealedNow ? `Hide ${label}` : `Reveal ${label}`}
      title={revealedNow ? `Hide ${label}` : `Reveal ${label}`}
      className={`inline-flex cursor-pointer items-center gap-2 ${className}`}
    >
      {inner}
    </button>
  );
}

/**
 * SealAmount — the reverse: a real value scrambles and settles to stars.
 * Used by the Run Payroll encrypting step. `sealed` flips it; the parent
 * cascades cards ~720ms apart per the design.
 */
export function SealAmount({
  value,
  sealed,
  className = "",
}: {
  value: string;
  sealed: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"clear" | "scrambling" | "sealed">(sealed ? "sealed" : "clear");
  const [, setFrame] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) {
      window.clearInterval(t);
      window.clearTimeout(t);
    }
    timers.current = [];
  }, []);

  useEffect(() => {
    clearTimers();
    if (!sealed) {
      setPhase("clear");
      return;
    }
    if (reduced) {
      setPhase("sealed");
      return;
    }
    setPhase("scrambling");
    // Whir every digit for the beat, then snap to the sealed stars.
    const whir = window.setInterval(() => setFrame((f) => f + 1), SEAL_FRAME_MS);
    const settle = window.setTimeout(() => {
      window.clearInterval(whir);
      setPhase("sealed");
    }, SEAL_SCRAMBLE_MS);
    timers.current = [whir, settle];
    return clearTimers;
  }, [sealed, value, reduced, clearTimers]);

  if (phase === "clear") return <span className={`tnum ${className}`}>{value}</span>;
  if (phase === "sealed")
    return (
      <motion.span
        className={`tnum font-normal ${className}`}
        initial={reduced ? false : { scale: 0.82, opacity: 0.4 }}
        // Same green glow pulse the reveal fires the instant a value lands — here
        // it fires the instant the amount seals, so the sealing reads as a beat.
        animate={
          reduced
            ? { opacity: 1 }
            : {
                scale: 1,
                opacity: 1,
                textShadow: ["0 0 0px rgba(120,233,192,0)", "0 0 18px rgba(120,233,192,0.75)", "0 0 0px rgba(120,233,192,0)"],
              }
        }
        transition={{ duration: 0.64, ease: [0.22, 1, 0.36, 1] }}
      >
        {STARS}
      </motion.span>
    );
  // Scrambling: re-randomize each digit every frame; keep separators (",", ".",
  // "K", "$") stable so it still reads as the salary being churned, not noise.
  return (
    <span className={`tnum ${className}`} style={{ opacity: 0.9 }}>
      {value.split("").map((ch, i) => (
        <span key={i}>{/\d/.test(ch) ? randomDigit() : ch}</span>
      ))}
    </span>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 opacity-80" aria-hidden>
      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
    </svg>
  );
}
