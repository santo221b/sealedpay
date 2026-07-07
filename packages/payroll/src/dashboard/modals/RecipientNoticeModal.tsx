/**
 * Recipient-view notice — a one-off explainer shown before jumping into the
 * recipient's "My pay" screen (from Settings or the pay finale). It makes
 * explicit that this door is a TESTING convenience: a real product would never
 * let an employer open an employee's private pay.
 */
import { ModalShell, StaggerItem } from "../../design/kit2";

export function RecipientNoticeModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onClose} width={392} labelledBy="recipient-notice-title">
      <div style={{ padding: 27 }}>
        <StaggerItem index={0}>
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 43, height: 43, background: "rgba(95,230,175,0.12)", border: "1px solid rgba(95,230,175,0.22)" }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 3h6" />
              <path d="M10 3v6.5L5.4 17.6A2 2 0 0 0 7.2 20.6h9.6a2 2 0 0 0 1.8-3L14 9.5V3" />
              <path d="M8 14.5h8" />
            </svg>
          </span>
        </StaggerItem>

        <StaggerItem index={1}>
          <h2 id="recipient-notice-title" style={{ fontSize: 19, fontWeight: 700, color: "#f2f7f4", marginTop: 14 }}>
            A testing shortcut
          </h2>
        </StaggerItem>

        <StaggerItem index={2}>
          <p style={{ fontSize: 12.5, color: "#9db3aa", marginTop: 8, lineHeight: 1.6 }}>
            This opens the recipient&rsquo;s My pay view. In a real product it would not be here, because an employer
            can never open an employee&rsquo;s private pay. It is included only to make testing the recipient flow
            easy, without a second wallet or device.
          </p>
        </StaggerItem>

        <StaggerItem index={3}>
          <div className="flex gap-[11px]" style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-full text-center font-medium transition-colors hover:bg-[rgba(95,230,175,0.1)]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "#e8f0ec", fontSize: 12.6, padding: "11px 0" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 cursor-pointer rounded-full text-center font-medium transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 12.6, padding: "11px 0" }}
            >
              Continue
            </button>
          </div>
        </StaggerItem>
      </div>
    </ModalShell>
  );
}
