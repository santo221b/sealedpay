/**
 * Switch-to-employee notice — a one-off explainer shown before switching to
 * the employee surface (from Settings or the pay finale). Since email login,
 * this is a real product feature: the employee view shows THE SIGNED-IN
 * ACCOUNT's own pay — never someone else's (private pay stays private).
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
            Switch to the employee view
          </h2>
        </StaggerItem>

        <StaggerItem index={2}>
          <p style={{ fontSize: 12.5, color: "#9db3aa", marginTop: 8, lineHeight: 1.6 }}>
            This switches to the employee surface for YOUR account · the pay received by the wallet you are signed
            in with. An employer can never open an employee&rsquo;s private pay; every reveal needs that person&rsquo;s
            own signature.
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
              Switch view
            </button>
          </div>
        </StaggerItem>
      </div>
    </ModalShell>
  );
}
