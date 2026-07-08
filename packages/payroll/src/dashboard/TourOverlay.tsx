/**
 * First-run guided tour — a spotlight coachmark walkthrough.
 *
 * Dims the app, rings one element at a time, and floats a tooltip beside it.
 * Steps span Home and Team (the tour drives `nav` between them) and cover the
 * demo's whole story: sample data, funding, the org at a glance, running
 * payroll, one-off payments + recipient decryption, and clearing the samples.
 *
 * Gated: `TOUR_DEFAULT_ON` is false, so it stays dormant in the live app. It is
 * previewable at any time with the `?tour=1` query param (see Dashboard). Flip
 * the flag to true to enable it for every first-time visitor after onboarding.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { tokens, motionTokens } from "../design/tokens";

/** Off by default. Set to true to show the tour to first-time visitors. */
export const TOUR_DEFAULT_ON = false;

export interface TourStep {
  /** data-tour value of the element to spotlight. Omit for a centered card. */
  target?: string;
  /** Switch to this screen (0 = Home, 1 = Team) before the step shows. */
  nav?: number;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    nav: 0,
    title: "Welcome to SealedPay",
    body: "A confidential payroll dashboard. Here is a quick tour of how it works. Amounts stay encrypted end to end, and only each recipient can read their own.",
  },
  {
    nav: 0,
    target: "tour-home-chart",
    title: "Sample data, to start",
    body: "The dashboard comes pre-loaded with a sample team and history so you can look around. Every real payout you run lands here on the chart. You can clear the samples anytime from Settings.",
  },
  {
    nav: 0,
    target: "tour-wallet-fund",
    title: "Fund your wallet",
    body: "Add testnet cUSDd and a little Sepolia gas here. Your balance stays encrypted on-chain, and new funds show up right away.",
  },
  {
    nav: 0,
    target: "tour-home-team-donut",
    title: "Your org at a glance",
    body: "Headcount and departments, drawn straight from your roster.",
  },
  {
    nav: 1,
    target: "tour-team-run-payroll",
    title: "Run payroll",
    body: "Pay everyone at once in a single confidential transfer. Amounts are encrypted in the browser before they ever touch the chain.",
  },
  {
    nav: 1,
    target: "tour-team-roster",
    title: "Or pay one person",
    body: "Tap anyone to open their card and send a one-off payment, handy for a quick test. Each recipient signs once to reveal only their own pay.",
  },
  {
    nav: 0,
    target: "tour-rail-settings",
    title: "Clear the samples",
    body: "When you want only your own data, open Settings and clear the sample team and history.",
  },
  {
    nav: 0,
    title: "You are set",
    body: "Fund your wallet, add your team, and run your first confidential payroll. That is the whole loop.",
  },
];

const SCRIM = "rgba(6,12,10,0.74)";
const RING_SPRING = { type: "spring", stiffness: 240, damping: 30 } as const;
const TIP_SPRING = { type: "spring", stiffness: 300, damping: 32 } as const;
const PAD = 10;
const GAP = 14;
const TIP_W = 320;

type Rect = { top: number; left: number; width: number; height: number } | null;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export function TourOverlay({
  step,
  index,
  total,
  ripple,
  onNext,
  onBack,
  onClose,
}: {
  step: TourStep;
  index: number;
  total: number;
  /** A translucent click ripple, retriggered by its `key` (e.g. on nav). */
  ripple?: { x: number; y: number; key: number } | null;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<Rect>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(170);

  // Measure the target, tracking scroll + resize so the spotlight follows.
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const remeasure = () => {
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    const start = () => {
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        remeasure();
      } else if (tries < 60) {
        tries += 1;
        raf = requestAnimationFrame(start);
      } else {
        setRect(null);
      }
    };
    // Wait two frames so a nav-driven screen swap has painted before measuring.
    raf = requestAnimationFrame(() => requestAnimationFrame(start));
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [step.target, index]);

  // Keep the measured tooltip height current so placement never overflows.
  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  });

  const last = index === total - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Position the tooltip in viewport px (so it can glide) and never cut off.
  let top: number;
  let left: number;
  if (!rect) {
    top = vh / 2 - tipH / 2;
    left = vw / 2 - TIP_W / 2;
  } else {
    left = clamp(rect.left + rect.width / 2 - TIP_W / 2, 16, vw - TIP_W - 16);
    const belowTop = rect.top + rect.height + GAP;
    const aboveTop = rect.top - tipH - GAP;
    if (belowTop + tipH <= vh - 12) top = belowTop;
    else if (aboveTop >= 12) top = aboveTop;
    else top = clamp(belowTop, 12, vh - tipH - 12);
  }

  const tipStyle: CSSProperties = {
    position: "absolute",
    width: TIP_W,
    maxWidth: "calc(100vw - 32px)",
    background: "rgba(16,30,24,0.94)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    boxShadow: "0 24px 60px -20px rgba(0,0,0,0.75)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    padding: 18,
  };

  return (
    <motion.div className="fixed inset-0" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: motionTokens.easeEnter }}>
      {/* Click blocker — the tour cannot be skipped, only stepped through. */}
      <div className="absolute inset-0" onMouseDown={(e) => e.preventDefault()} />

      {/* Dim + subtle ring over the target, or a full scrim for centered steps. */}
      {rect ? (
        <motion.div
          className="pointer-events-none absolute"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
          transition={RING_SPRING}
          style={{ borderRadius: 20, boxShadow: `0 0 34px 7px rgba(95,230,175,0.3), 0 0 0 9999px ${SCRIM}` }}
        />
      ) : (
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }} style={{ background: SCRIM }} />
      )}

      {/* Click ripple — a translucent expanding circle where the tour "clicks". */}
      {ripple && (
        <motion.span
          key={ripple.key}
          initial={{ scale: 0, opacity: 0.55 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.65, ease: motionTokens.easeEnter }}
          className="pointer-events-none absolute"
          style={{ left: ripple.x - 34, top: ripple.y - 34, width: 68, height: 68, borderRadius: 999, background: "radial-gradient(circle, rgba(120,233,192,0.55), rgba(120,233,192,0) 70%)" }}
        />
      )}

      {/* Tooltip — glides between steps, content cross-fades. */}
      <motion.div ref={tipRef} initial={false} animate={{ top, left }} transition={TIP_SPRING} style={tipStyle}>
        <motion.div key={index} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: motionTokens.easeEnter }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: tokens.accent.pillText }}>
            Step {index + 1} of {total}
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: tokens.text.heading, marginTop: 7 }}>{step.title}</div>
          <p style={{ fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.55, marginTop: 6 }}>{step.body}</p>
          <div className="flex items-center justify-between" style={{ marginTop: 15 }}>
            <div className="flex items-center" style={{ gap: 4 }}>
              {Array.from({ length: total }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={{ width: i === index ? 16 : 6, backgroundColor: i === index ? tokens.accent.primary : "rgba(255,255,255,0.22)" }}
                  transition={{ duration: 0.25, ease: motionTokens.easeEnter }}
                  style={{ height: 6, borderRadius: 999 }}
                />
              ))}
            </div>
            <div className="flex items-center" style={{ gap: 8 }}>
              {index > 0 && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full"
                  style={{ fontSize: 12.5, fontWeight: 600, color: tokens.text.secondary, padding: "7px 13px", background: "transparent", border: "1px solid rgba(255,255,255,0.16)", cursor: "pointer" }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={last ? onClose : onNext}
                className="rounded-full"
                style={{ fontSize: 12.5, fontWeight: 700, color: "#08130e", padding: "7px 17px", background: tokens.accent.primary, cursor: "pointer" }}
              >
                {last ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
