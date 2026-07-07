/**
 * Settings panel — the gear popover (dashboard handoff §Side rail).
 *
 * Rendered by the Rail, which anchors it beside the gear icon and provides
 * the outside-click catcher. This is just the frosted card (width 252).
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { SettingToggle } from "../../design/kit2";
import { resetDemo } from "../../lib/prefs";
import type { SettingsPanelProps } from "../contracts";

const TOGGLES: { key: "maskDefault" | "reminders" | "autoverify"; label: string }[] = [
  { key: "maskDefault", label: "Mask amounts by default" },
  { key: "reminders", label: "Payout reminders" },
  { key: "autoverify", label: "Auto-verify after payout" },
];

export function SettingsPanel({ open, onClose, maskDefault, reminders, autoverify, onToggle }: SettingsPanelProps) {
  const reduced = useReducedMotion();
  const values = { maskDefault, reminders, autoverify };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-label="Settings"
            className="cursor-auto overflow-hidden text-left"
            style={{
              width: 252,
              borderRadius: 27,
              border: "1px solid rgba(255,255,255,0.11)",
              background: "rgba(52,92,72,0.21)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              padding: "16px 18px",
              transformOrigin: "0 0",
            }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.17 } }
                : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.17, ease: [0.4, 0, 1, 1] } }
            }
            transition={{ duration: reduced ? 0.14 : 0.34, ease: [0.2, 1.06, 0.3, 1] }}
          >
            <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f7f4" }}>Settings</h3>

            <div className="mt-[5px] flex flex-col">
              {TOGGLES.map((t) => (
                <SettingToggle key={t.key} label={t.label} on={values[t.key]} onChange={(on) => onToggle(t.key, on)} />
              ))}
            </div>
            <p style={{ fontSize: 10, color: "#8ba297", lineHeight: 1.4, marginTop: 2 }}>
              Decrypts and confirms each salary with one signature.
            </p>

            {/* Tapered divider — fades to transparent at both ends. */}
            <div
              style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0.16) 78%, transparent)",
                margin: "10px 0",
              }}
            />

            <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
              <span style={{ fontSize: 12, color: "#e8f0ec" }}>Token</span>
              <span style={{ fontSize: 11, color: "#9db3aa" }}>cUSDd</span>
            </div>
            <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
              <span style={{ fontSize: 12, color: "#e8f0ec" }}>Network</span>
              <span style={{ fontSize: 11, color: "#9db3aa" }}>Sepolia Testnet</span>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              className="mt-2 w-full cursor-pointer rounded-full"
              style={{ fontSize: 11, fontWeight: 400, color: "#f0a99d", border: "1px solid rgba(224,122,106,0.4)", background: "rgba(224,122,106,0.08)", padding: "8px 0" }}
            >
              Reset demo
            </button>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
