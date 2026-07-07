/**
 * Notification-permission prompt (modals.md §10, data-assets §5) — in-app
 * glass prompt, fixed top-right, no scrim. The shell owns the 900ms-after-
 * load trigger and the granted/denied state.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { BellGlyph } from "../../design/icons";
import type { PermissionPromptProps } from "../contracts";

export function PermissionPrompt({ open, onEnable, onDismiss }: PermissionPromptProps) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Turn on in-app alerts?"
          className="fixed z-[80]"
          style={{
            top: 74,
            right: 28,
            width: 308,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.11)",
            background: "rgba(52,92,72,0.28)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            boxShadow: "0 24px 60px -24px rgba(0,0,0,0.6)",
            padding: 18,
          }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0.14 } }
              : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.17, ease: [0.4, 0, 1, 1] } }
          }
          transition={{ duration: reduced ? 0.14 : 0.34, ease: [0.2, 1.06, 0.3, 1] }}
        >
          <div className="flex items-start gap-[11px]">
            <span
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 34, height: 34, background: "rgba(95,230,175,0.14)" }}
            >
              <BellGlyph size={17} color="#78e9c0" glow={false} />
            </span>
            <div className="min-w-0">
              <h3 style={{ fontSize: 13.5, fontWeight: 600, color: "#f2f7f4" }}>Turn on in-app alerts?</h3>
              <p style={{ fontSize: 11, color: "#9db3aa", marginTop: 3, lineHeight: 1.45 }}>
                Show a heads-up inside the app when payroll is delivered or needs attention.
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex gap-[9px]">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 cursor-pointer rounded-full text-center transition-colors hover:bg-[rgba(255,255,255,0.1)]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#cfdcd6",
                fontSize: 12,
                fontWeight: 500,
                padding: "8.5px 0",
              }}
            >
              Not now
            </button>
            <motion.button
              type="button"
              onClick={onEnable}
              whileHover={reduced ? undefined : { scale: 1.03 }}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className="flex-1 cursor-pointer rounded-full text-center"
              style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 12, fontWeight: 600, padding: "8.5px 0" }}
            >
              Enable
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
