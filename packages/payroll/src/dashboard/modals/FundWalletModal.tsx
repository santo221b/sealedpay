/**
 * Fund Wallet modal (modals.md §2) — centered glass modal on ModalShell.
 * Amount is local state; confirm calls the shell's REAL faucet mint via onFund.
 *
 * Three phases drive the UI: idle (the form), confirming (awaiting the wallet
 * signature — button spinner), and minting (the tx is on-chain — the whole
 * modal switches to a non-interactive "transferring funds" view, and closing
 * is locked so the deposit is never abandoned mid-flight).
 */
import { useEffect, useState } from "react";

import { DepositBoxGlyph } from "../../design/icons";
import { ModalShell, StaggerItem } from "../../design/kit2";
import type { FundWalletModalProps } from "../contracts";

export function FundWalletModal({ open, onClose, employerShort, employerFull, busy, phase, onFund }: FundWalletModalProps) {
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setCopied(false);
    }
  }, [open]);

  function copyAddress() {
    if (!employerFull) return;
    try {
      void navigator.clipboard.writeText(employerFull);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  const valid = amount.trim().length > 0;
  const locked = phase === "minting";
  const shownAmount = /^\d+(\.\d+)?$/.test(amount.trim())
    ? Number(amount.trim()).toLocaleString("en-US", { maximumFractionDigits: 6 })
    : amount.trim();

  return (
    <ModalShell open={open} onClose={locked ? () => {} : onClose} width={387} labelledBy="fund-wallet-title">
      {phase === "minting" ? (
        <div className="text-center" style={{ padding: "40px 27px 34px" }}>
          <div className="relative mx-auto flex items-center justify-center" style={{ width: 68, height: 68 }}>
            <span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(95,230,175,0.14)", animation: "dc-glowpulse 2.2s ease-in-out infinite" }}
            />
            <DepositBoxGlyph size={30} color="#78e9c0" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4", marginTop: 13 }}>Transferring funds</h2>
          <p className="mx-auto" style={{ fontSize: 12.6, color: "#9db3aa", marginTop: 8, lineHeight: 1.55, maxWidth: 300 }}>
            Sending {shownAmount || "your"} cUSDd to your wallet. This settles on Sepolia in a few seconds.
          </p>
          <div
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cfdcd6", fontSize: 13, fontWeight: 600, padding: "12.6px 0" }}
          >
            <span
              aria-hidden
              style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }}
            />
            Minting on-chain
          </div>
        </div>
      ) : (
        <div style={{ padding: 27 }}>
          <StaggerItem index={0}>
            <h2 id="fund-wallet-title" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
              Fund wallet
            </h2>
            <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 5, lineHeight: 1.5 }}>
              Top up the payroll wallet so the next run has enough cUSDd.
            </p>
          </StaggerItem>

          <StaggerItem index={1}>
            <div className="mt-5">
              <label style={{ display: "block", fontSize: 10, color: "#9db3aa", marginBottom: 5 }} htmlFor="fund-amount">
                Amount (cUSDd)
              </label>
              <input
                id="fund-amount"
                placeholder="5,000"
                inputMode="decimal"
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 11,
                  padding: "10px 13px",
                  color: "#e8f0ec",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 10.5, color: "#7f9a8f", marginTop: 7, paddingLeft: 5, lineHeight: 1.45 }}>
                A real Sepolia mint, so it needs a little test ETH for gas.{" "}
                <a
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#5fe3ab", textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  Get Sepolia ETH
                </a>
              </p>
            </div>
          </StaggerItem>

          <StaggerItem index={2}>
            <div
              className="mt-3.5 flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.04)", borderRadius: 13, padding: "11px 13px" }}
            >
              <span style={{ fontSize: 12, color: "#e8f0ec" }}>To</span>
              <span className="flex items-center" style={{ gap: 8 }}>
                <span className="tnum" style={{ fontSize: 12, color: "#9db3aa" }}>
                  {employerShort}
                </span>
                {employerFull && (
                  <button
                    type="button"
                    onClick={copyAddress}
                    aria-label={copied ? "Address copied" : "Copy wallet address"}
                    title={copied ? "Copied" : "Copy address"}
                    className="flex shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                    style={{ width: 26, height: 26, border: "1px solid rgba(255,255,255,0.1)", color: copied ? "#78e9c0" : "#9db3aa" }}
                  >
                    {copied ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                )}
              </span>
            </div>
          </StaggerItem>

          <StaggerItem index={3}>
            <div className="flex gap-[11px]" style={{ marginTop: 23 }}>
              {/* While the wallet signature is pending, drop Cancel and let the
                  confirm button take the full width (its label needs the room). */}
              {!busy && (
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
              )}
              <button
                type="button"
                onClick={() => {
                  if (valid && !busy) void onFund(amount);
                }}
                disabled={!valid || busy}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-center transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: "#f5f8f6",
                  color: "#14503b",
                  fontSize: 12.6,
                  fontWeight: 500,
                  padding: "11px 0",
                  opacity: !valid && !busy ? 0.45 : 1,
                }}
              >
                {busy && (
                  <span
                    aria-hidden
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      border: "2.2px solid rgba(20,80,59,0.25)",
                      borderTopColor: "#14503b",
                      animation: "dc-spin .7s linear infinite",
                    }}
                  />
                )}
                {phase === "confirming" ? "Confirm in your wallet" : "Fund wallet"}
              </button>
            </div>
          </StaggerItem>
        </div>
      )}
    </ModalShell>
  );
}
