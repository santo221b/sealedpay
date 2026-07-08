/**
 * Payout reminder modal (modals.md §9 + data-assets §7) — set / unset copy
 * variants verbatim; confirm calls onConfirm (the shell toggles + closes).
 */
import { ModalShell } from "../../design/kit2";
import { BellGlyph } from "../../design/icons";
import type { ReminderModalProps } from "../contracts";

export function ReminderModal({ open, onClose, reminderSet, onConfirm }: ReminderModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} width={342} labelledBy="reminder-title">
      <div style={{ padding: 25 }}>
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 43, height: 43, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <BellGlyph size={18} color="#e8f0ec" glow={false} />
        </span>
        <h2 id="reminder-title" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4", marginTop: 14 }}>
          Payout reminder
        </h2>
        <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 5, lineHeight: 1.5 }}>
          {reminderSet
            ? "Reminder is on for Jul 29, two days before the Jul 31 run. You can remove it anytime."
            : "Get a nudge on Jul 29, two days before the Jul 31 payroll run."}
        </p>

        <div className="flex gap-[11px]" style={{ marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-full text-center font-medium transition-colors hover:bg-[rgba(95,230,175,0.1)]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#e8f0ec",
              fontSize: 12.6,
              padding: "11px 0",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-full text-center transition-transform hover:scale-[1.03] active:scale-[0.97]"
            style={{ background: "#f5f8f6", color: "#14503b", fontSize: 12.6, fontWeight: 500, padding: "11px 0" }}
          >
            {reminderSet ? "Remove reminder" : "Set reminder"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
