/**
 * Fund Wallet modal (modals.md §2) — centered glass modal on ModalShell.
 * Amount is local state; confirm calls the shell's REAL faucet mint via
 * onFund (busy spinner while in flight, error rendered inline). The confirm
 * is hard-gated on a non-empty amount (spec gap #5).
 */
import { useEffect, useState } from "react";

import { ModalShell, StaggerItem } from "../../design/kit2";
import type { FundWalletModalProps } from "../contracts";

export function FundWalletModal({ open, onClose, employerShort, busy, error, onFund }: FundWalletModalProps) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) setAmount("");
  }, [open]);

  const valid = amount.trim().length > 0;

  return (
    <ModalShell open={open} onClose={onClose} width={387} labelledBy="fund-wallet-title">
      <div style={{ padding: 27 }}>
        <StaggerItem index={0}>
          <h2 id="fund-wallet-title" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
            Fund wallet
          </h2>
          <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 5, lineHeight: 1.5 }}>
            Top up the payroll wallet so the next run has enough cUSDd.
          </p>
          <p style={{ fontSize: 11, color: "#7f9a8f", marginTop: 6, lineHeight: 1.5 }}>
            This is a real Sepolia mint, so you need a little test ETH for gas.{" "}
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#5fe3ab", textDecoration: "none" }}
            >
              Get Sepolia ETH
            </a>
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
          </div>
        </StaggerItem>

        <StaggerItem index={2}>
          <div
            className="mt-3.5 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.04)", borderRadius: 13, padding: "11px 13px" }}
          >
            <span style={{ fontSize: 12, color: "#e8f0ec" }}>To</span>
            <span className="tnum" style={{ fontSize: 12, color: "#9db3aa" }}>
              {employerShort}
            </span>
          </div>
        </StaggerItem>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl p-2.5"
            style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 11.5 }}
          >
            {error}
          </p>
        )}

        <StaggerItem index={3}>
          <div className="flex gap-[11px]" style={{ marginTop: 23 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 cursor-pointer rounded-full text-center font-semibold transition-colors hover:bg-[rgba(95,230,175,0.1)] disabled:opacity-45"
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
              onClick={() => {
                if (valid && !busy) void onFund(amount);
              }}
              disabled={!valid || busy}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-center transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "#f5f8f6",
                color: "#14503b",
                fontSize: 12.6,
                fontWeight: 700,
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
              Fund wallet
            </button>
          </div>
        </StaggerItem>
      </div>
    </ModalShell>
  );
}
