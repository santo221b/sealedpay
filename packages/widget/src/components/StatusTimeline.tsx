/**
 * The in-flight view: a calm four-step timeline. Each step explains what is
 * happening in plain words — this is where "confidential" becomes legible.
 */
import { motion } from "framer-motion";

import type { FlowPhase } from "../hooks/useDisperseFlow";
import { Spinner } from "./ui";

const STEPS: { key: FlowPhase; title: string; detail: string }[] = [
  { key: "encrypting", title: "Encrypting amounts", detail: "Every amount is encrypted in your browser — the network never sees a number." },
  { key: "authorizing", title: "Authorizing", detail: "Granting the disperse contract a 1-hour permission to move your tokens." },
  { key: "dispersing", title: "Dispersing", detail: "One transaction delivers every encrypted amount." },
  { key: "confirming", title: "Confirming delivery", detail: "Reading the on-chain event that proves who was paid." },
];

export function StatusTimeline({ phase }: { phase: FlowPhase }) {
  const activeIndex = STEPS.findIndex((s) => s.key === phase);

  return (
    <div className="flex flex-col gap-0.5 py-2" role="status" aria-live="polite">
      {STEPS.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{ scale: state === "active" ? 1.1 : 1 }}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  state === "done"
                    ? "bg-[var(--dk-accent)] text-[var(--dk-accent-text)]"
                    : state === "active"
                      ? "border-2 border-[var(--dk-accent)] text-[var(--dk-accent)]"
                      : "border-2 border-[var(--dk-border)] text-[var(--dk-muted)]"
                }`}
              >
                {state === "done" ? "✓" : state === "active" ? <Spinner /> : i + 1}
              </motion.div>
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 flex-1 ${state === "done" ? "bg-[var(--dk-accent)]" : "bg-[var(--dk-border)]"}`} />
              )}
            </div>
            <div className={`pb-4 ${state === "todo" ? "opacity-40" : ""}`}>
              <p className="text-sm font-semibold text-[var(--dk-text)]">{step.title}</p>
              {state === "active" && (
                <motion.p
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-0.5 text-xs text-[var(--dk-muted)]"
                >
                  {step.detail}
                </motion.p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
