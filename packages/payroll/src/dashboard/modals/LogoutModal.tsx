/**
 * Logout modal (modals.md §7) — centered, with the warning-red OUTLINED
 * confirm (DangerOutlineButton restyled to the spec's pill recipe).
 */
import { DangerOutlineButton, ModalShell } from "../../design/kit2";
import { LogoutGlyph } from "../../design/icons";
import { tokens } from "../../design/tokens";
import type { LogoutModalProps } from "../contracts";

export function LogoutModal({ open, onClose, onConfirm }: LogoutModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} width={342} labelledBy="logout-title">
      <div style={{ padding: 25 }}>
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 43, height: 43, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <LogoutGlyph size={18} color="#e8f0ec" glow={false} />
        </span>
        <h2 id="logout-title" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4", marginTop: 14 }}>
          Log out?
        </h2>
        <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 5, lineHeight: 1.5 }}>
          You’ll be signed out of SealedPay on this device.
        </p>

        <div className="flex gap-[11px]" style={{ marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-full text-center font-semibold transition-colors hover:bg-[rgba(95,230,175,0.1)]"
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
          <DangerOutlineButton
            onClick={onConfirm}
            className="flex-1 cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.97]"
            style={{
              borderRadius: tokens.radius.pill,
              background: tokens.warn.dangerBg,
              border: `1px solid ${tokens.warn.dangerBorder}`,
              color: tokens.warn.dangerText,
              fontSize: 12.6,
              fontWeight: 600,
              padding: "11px 0",
            }}
          >
            Log out
          </DangerOutlineButton>
        </div>
      </div>
    </ModalShell>
  );
}
