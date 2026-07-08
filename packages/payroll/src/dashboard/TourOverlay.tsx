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
import { useEffect, useState, type CSSProperties } from "react";
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
type Rect = { top: number; left: number; width: number; height: number } | null;

export function TourOverlay({
  step,
  index,
  total,
  onNext,
  onBack,
  onClose,
}: {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<Rect>(null);

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

  const last = index === total - 1;
  const pad = 8;
  const tipW = 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let tipStyle: CSSProperties;
  if (!rect) {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
  } else {
    const below = rect.top + rect.height / 2 < vh / 2;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(16, Math.min(left, vw - tipW - 16));
    tipStyle = below
      ? { top: rect.top + rect.height + pad + 8, left }
      : { bottom: vh - rect.top + pad + 8, left };
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 200 }}>
      {/* Click blocker — the tour cannot be skipped, only stepped through. */}
      <div className="absolute inset-0" onMouseDown={(e) => e.preventDefault()} />

      {/* Dim: a box-shadow "hole" over the target, or a full scrim for centered steps. */}
      {rect ? (
        <motion.div
          className="pointer-events-none absolute"
          initial={false}
          animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          style={{ borderRadius: 18, boxShadow: `0 0 0 9999px ${SCRIM}`, border: `2px solid ${tokens.accent.primary}` }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: SCRIM }} />
      )}

      {/* Tooltip */}
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={motionTokens.springPop}
        className="absolute"
        style={{
          width: tipW,
          maxWidth: "calc(100vw - 32px)",
          background: "rgba(16,30,24,0.94)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.75)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          padding: 18,
          ...tipStyle,
        }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: tokens.accent.pillText }}>
          Step {index + 1} of {total}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: tokens.text.heading, marginTop: 7 }}>{step.title}</div>
        <p style={{ fontSize: 12.5, color: tokens.text.muted, lineHeight: 1.55, marginTop: 6 }}>{step.body}</p>
        <div className="flex items-center justify-between" style={{ marginTop: 15 }}>
          <div className="flex items-center" style={{ gap: 4 }}>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 999, background: i === index ? tokens.accent.primary : "rgba(255,255,255,0.22)", transition: "width .2s, background .2s" }}
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
    </div>
  );
}
