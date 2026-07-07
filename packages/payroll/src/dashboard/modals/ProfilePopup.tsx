/**
 * Profile popup (modals.md §8) — centered small card: large avatar with the
 * hover lift + tilt + green glow, big name, role line, wallet chip.
 */
import { motion, useReducedMotion } from "framer-motion";

import { ModalShell } from "../../design/kit2";
import type { ProfilePopupProps } from "../contracts";

export function ProfilePopup({ open, onClose, name, avatar, employerShort, onViewMyPay }: ProfilePopupProps) {
  const reduced = useReducedMotion();
  return (
    <ModalShell open={open} onClose={onClose} width={342} labelledBy="profile-name">
      <div className="flex flex-col items-center text-center" style={{ padding: 35 }}>
        <motion.img
          src={avatar}
          alt=""
          draggable={false}
          whileHover={
            reduced
              ? undefined
              : { scale: 1.06, rotate: -2.5, filter: "drop-shadow(0 10px 24px rgba(52,211,153,0.35))" }
          }
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="cursor-pointer rounded-full object-cover"
          style={{ width: 250, height: 250, maxWidth: "100%", background: "transparent" }}
        />
        <h2 id="profile-name" style={{ fontSize: 34, fontWeight: 700, color: "#f2f7f4", marginTop: 18, letterSpacing: 0.3 }}>
          {name}
        </h2>
        <p style={{ fontSize: 12.6, color: "#9db3aa", marginTop: 5 }}>Payroll administrator</p>
        {employerShort && (
          <span
            className="tnum inline-flex items-center gap-[6px] rounded-full"
            style={{
              border: "1px solid rgba(95,230,175,0.55)",
              color: "#78e9c0",
              fontSize: 11,
              padding: "5px 13px",
              marginTop: 14,
            }}
          >
            <span className="rounded-full" style={{ width: 6, height: 6, background: "#34d399" }} aria-hidden />
            {employerShort}
          </span>
        )}
        <motion.button
          type="button"
          onClick={onViewMyPay}
          whileHover={reduced ? undefined : { scale: 1.03 }}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          className="cursor-pointer rounded-full"
          style={{ marginTop: 22, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8f0ec", fontSize: 12.6, fontWeight: 500, padding: "11px 26px" }}
        >
          View my pay as an employee
        </motion.button>
      </div>
    </ModalShell>
  );
}
