/**
 * First-run guided tour — a spotlight coachmark walkthrough.
 *
 * Dims the app, haloes one element at a time, and floats a tooltip beside it.
 * The tour drives the app through the real flows: it navigates between screens,
 * opens an employee's card, and opens Settings, rippling a click on the element
 * it activates first (so the auto-navigation reads as a deliberate click) and
 * then highlighting the real destination.
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
  /** Switch to this screen (0 = Home, 1 = Team) before the step shows. */
  nav?: number;
  /** Open the first employee's card (EmployeeView) before the step shows. */
  openEmployee?: boolean;
  /** Open the Settings popover before the step shows. */
  openSettings?: boolean;
  /** data-tour of the element the tour "clicks" (ripples) entering this step. */
  clickAnchor?: string;
  /** data-tour of the element to spotlight. Omit for a centered card. */
  target?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    nav: 0,
    title: "A quick tour",
    body: "You are all set. Here is a quick guided tour of the dashboard, about 40 seconds, so you know where everything is.",
  },
  {
    nav: 0,
    target: "tour-home-chart",
    title: "Sample data, to start",
    body: "The dashboard is pre-loaded with a sample team and history so you can explore. Any real payout you run shows up here on the chart.",
  },
  {
    nav: 0,
    target: "tour-wallet-fund",
    title: "Fund your wallet",
    body: "Add testnet cUSDd and a little Sepolia gas here. New funds appear right away, and your balance stays encrypted.",
  },
  {
    nav: 0,
    target: "tour-home-team-donut",
    title: "Your team at a glance",
    body: "Your people, split by department.",
  },
  {
    nav: 1,
    clickAnchor: "tour-rail-nav-1",
    target: "tour-team-run-payroll",
    title: "Run payroll",
    body: "On the Team page, pay everyone at once in one confidential transfer. Amounts are encrypted before they leave your browser.",
  },
  {
    nav: 1,
    target: "tour-team-roster",
    title: "Your team",
    body: "Your roster. To pay someone on their own, open their card.",
  },
  {
    openEmployee: true,
    clickAnchor: "tour-team-employee",
    target: "tour-employee-pay",
    title: "Pay one person",
    body: "From a card, send a one-off payment, handy for a quick test. Only they can read their own amount.",
  },
  {
    target: "tour-rail-settings",
    title: "Settings",
    body: "The rest lives here in Settings.",
  },
  {
    openSettings: true,
    clickAnchor: "tour-rail-settings",
    target: "tour-settings-panel",
    title: "Clear the samples",
    body: "Ready for your own data? Clear the sample team and history from here.",
  },
  {
    nav: 0,
    title: "That's the tour",
    body: "Fund your wallet, add your team, and run your first payroll. That is the whole loop.",
  },
];

const SCRIM = "rgba(6,12,10,0.79)";
const RING_SPRING = { type: "spring", stiffness: 240, damping: 30 } as const;
const TIP_SPRING = { type: "spring", stiffness: 300, damping: 32 } as const;
const PAD = -1;
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
  const [radius, setRadius] = useState(16);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(170);

  // Measure the target, tracking scroll + resize so the spotlight follows.
  useEffect(() => {
    let raf = 0;
    let settleRaf = 0;
    let tries = 0;
    let settleN = 0;
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
    // Track the target's own entrance (popover scale, screen slide, smooth
    // scroll) for a beat, so the halo lands on the settled bounds.
    const settle = () => {
      remeasure();
      settleN += 1;
      if (settleN < 40) settleRaf = requestAnimationFrame(settle);
    };
    const start = () => {
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRadius(parseFloat(getComputedStyle(el).borderRadius) || 14);
        settle();
      } else if (tries < 90) {
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
      cancelAnimationFrame(settleRaf);
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

  // Halo hugs the target (tiny PAD) and matches its corner radius, so the
  // element itself reads as gently glowing rather than boxed.
  const haloRadius = rect ? Math.min(radius + PAD, (rect.height + PAD * 2) / 2) : 18;

  const tipStyle: CSSProperties = {
    position: "absolute",
    width: TIP_W,
    maxWidth: "calc(100vw - 32px)",
    background: "rgba(16,30,24,0.95)",
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

      {/* Dim + subtle halo hugging the target, or a full scrim for centered steps. */}
      {rect ? (
        <motion.div
          className="pointer-events-none absolute"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
          transition={RING_SPRING}
          style={{ borderRadius: haloRadius, boxShadow: `0 0 22px 0 rgba(95,230,175,0.5), 0 0 0 9999px ${SCRIM}` }}
        />
      ) : (
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }} style={{ background: SCRIM }} />
      )}

      {/* Click ripple — a translucent expanding circle where the tour "clicks". */}
      {ripple && (
        <motion.span
          key={ripple.key}
          initial={{ scale: 0.3, opacity: 0.6 }}
          animate={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.8, ease: motionTokens.easeEnter }}
          className="pointer-events-none absolute"
          style={{ left: ripple.x - 58, top: ripple.y - 58, width: 116, height: 116, borderRadius: 999, background: "radial-gradient(circle, rgba(120,233,192,0.5), rgba(120,233,192,0.12) 58%, rgba(120,233,192,0) 74%)", border: "1.5px solid rgba(120,233,192,0.45)" }}
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
                <motion.button
                  type="button"
                  onClick={onBack}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={motionTokens.springPop}
                  className="rounded-full"
                  style={{ fontSize: 12.5, fontWeight: 400, color: tokens.text.secondary, padding: "7px 13px", background: "transparent", border: "1px solid rgba(255,255,255,0.16)", cursor: "pointer" }}
                >
                  Back
                </motion.button>
              )}
              <motion.button
                type="button"
                onClick={last ? onClose : onNext}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={motionTokens.springPop}
                className="rounded-full"
                style={{ fontSize: 12.5, fontWeight: 400, color: "#08130e", padding: "7px 17px", background: tokens.accent.primary, cursor: "pointer" }}
              >
                {last ? "Done" : "Next"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
