/**
 * Notifications panel — the bell popover (dashboard handoff §Side rail).
 *
 * Rendered by the Rail, which positions it anchored beside the bell icon
 * (left ~50 / top ~-7) and provides the outside-click catcher. This component
 * is just the frosted card, unfolding from its top-left corner.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { tokens } from "../../design/tokens";
import type { NotificationsPanelProps } from "../contracts";

export function NotificationsPanel({ open, onClose, notifs, onRead, onMarkAllRead }: NotificationsPanelProps) {
  const reduced = useReducedMotion();
  const unread = notifs.filter((n) => !n.read).length;

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
            aria-label="Notifications"
            className="cursor-auto overflow-hidden text-left"
            style={{
              width: 270,
              borderRadius: 27,
              border: "1px solid rgba(255,255,255,0.11)",
              background: "rgba(52,92,72,0.21)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              padding: 20,
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[7px]">
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f7f4" }}>Notifications</h3>
                <span
                  className="tnum"
                  style={{
                    background: "#5fe3ab",
                    color: "#0b1512",
                    fontSize: 9,
                    fontWeight: 400,
                    borderRadius: tokens.radius.pill,
                    padding: "2px 7px",
                  }}
                >
                  {unread > 0 ? `${unread} new` : "All read"}
                </span>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="cursor-pointer select-none hover:underline"
                  style={{ fontSize: 10, color: "#78e9c0" }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div
              className="mt-[9px] flex flex-col gap-1 overflow-y-auto overflow-x-hidden"
              style={{ maxHeight: "min(56vh, 400px)" }}
            >
              {notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.read) onRead(n.id);
                  }}
                  className="flex cursor-pointer items-start gap-[9px] rounded-full text-left transition-colors hover:bg-[rgba(95,230,175,0.1)]"
                  style={{ padding: 7 }}
                >
                  <span
                    className="mt-1 shrink-0 rounded-full"
                    style={{ width: 7, height: 7, background: n.read ? "rgba(157,179,170,0.35)" : n.color }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block" style={{ fontSize: 11, fontWeight: 600, color: n.read ? "#9db3aa" : "#e8f0ec" }}>
                      {n.title}
                    </span>
                    <span className="block" style={{ fontSize: 10, color: "#9db3aa", marginTop: 1 }}>
                      {n.sub}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
