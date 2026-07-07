/**
 * Toast (modals.md §12, data-assets §5) — slides in from top-center; the
 * shell owns the 4200ms auto-dismiss timer and keys re-fires by toast.id.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { CheckGlyph } from "../../design/icons";
import type { ToastState } from "../contracts";

export function Toast({ toast }: { toast: ToastState | null }) {
  const reduced = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center" style={{ top: 22 }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role={toast.kind === "err" ? "alert" : "status"}
            aria-live={toast.kind === "err" ? "assertive" : "polite"}
            className="pointer-events-auto flex items-center gap-2.5"
            style={{
              borderRadius: 999,
              padding: "11px 20px",
              backdropFilter: "blur(14px)",
              boxShadow: "0 18px 44px -16px rgba(0,0,0,0.55)",
              border: `1px solid ${toast.kind === "ok" ? "rgba(95,230,175,0.45)" : "rgba(224,122,106,0.5)"}`,
              background: toast.kind === "ok" ? "rgba(24,58,44,0.92)" : "rgba(60,34,30,0.92)",
            }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { opacity: 0, y: -14, scale: 0.96, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
            }
            transition={{ duration: reduced ? 0.12 : 0.34, ease: [0.2, 1.06, 0.3, 1] }}
          >
            {toast.kind === "ok" ? (
              <CheckGlyph size={20} color="#5fe3ab" />
            ) : (
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{ width: 19, height: 19, background: "rgba(224,122,106,0.9)", color: "#3a1a15", fontSize: 11, fontWeight: 700 }}
                aria-hidden
              >
                !
              </span>
            )}
            <span style={{ fontSize: 12.6, fontWeight: 600, color: "#f2f7f4" }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
