/**
 * EMPLOYEE VIEW screen (dashboard-screens.md §5 + §7.2 stat cards).
 * Title, Connected chip + Back ghost button, Salary hero gradient card
 * (Reveal toggle + keepLock RevealAmount), 3 stat cards, Payment history
 * (6 visible then internal scroll, per-row reveal with real Etherscan
 * links). Presentation only.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { RevealAmount } from "../../design/RevealAmount";
import { CheckGlyph, ChevronLeftGlyph, PadlockGlyph, ReceiptCheckGlyph } from "../../design/icons";
import { GhostButton, GlassCard } from "../../design/kit2";
import { tokens } from "../../design/tokens";
import { fmtAmountFull, shortHash, shortWallet } from "../../lib/seed";
import type { EmployeeViewProps } from "../contracts";

const GRADIENT = "linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)";

export function EmployeeView({
  person,
  rows,
  salaryRevealed,
  onToggleSalary,
  onToggleRow,
  rowRevealed,
  showAll,
  onBack,
  employerAddress,
  onUpdateAddress,
  onPay,
}: EmployeeViewProps) {
  const reduced = useReducedMotion();
  const salaryShown = showAll || salaryRevealed;

  // Editable recipient wallet — lets a judge point this employee at their own
  // address and pay just this one person (persists on every valid edit).
  const [addr, setAddr] = useState(person.wallet);
  const [addrErr, setAddrErr] = useState<string | null>(null);
  useEffect(() => {
    setAddr(person.wallet);
    setAddrErr(null);
  }, [person.id, person.wallet]);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Title */}
      <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, margin: 0 }}>
        {person.name}
      </h1>

      {/* Connected chip + Back */}
      <div className="flex items-center justify-between" style={{ gap: 13 }}>
        <span
          className="tnum flex select-none items-center"
          style={{
            gap: 7,
            background: tokens.glass.card,
            boxShadow: tokens.glass.cardShadow,
            color: tokens.text.muted,
            fontWeight: 400,
            fontSize: 13,
            borderRadius: tokens.radius.pill,
            padding: "10px 22px",
          }}
        >
          <span
            className="rounded-full"
            style={{ width: 6, height: 6, background: employerAddress ? tokens.accent.liveDot : tokens.text.dimmest }}
          />
          {employerAddress ? `Connected · ${shortWallet(employerAddress)}` : "Not connected"}
        </span>
        <GhostButton
          onClick={onBack}
          className="hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8f0ec]"
          style={{
            borderRadius: tokens.radius.pill,
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#b8c6bf",
            fontWeight: 500,
            fontSize: 13,
            padding: "9px 18px",
          }}
        >
          <ChevronLeftGlyph size={13} />
          Back
        </GhostButton>
      </div>

      {/* Salary hero card */}
      <div
        className="relative overflow-hidden"
        style={{ borderRadius: 18, background: GRADIENT, padding: 20, minHeight: 171 }}
      >
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{ width: 153, height: 153, top: -45, right: -36, background: "rgba(255,255,255,0.10)" }}
        />
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{ width: 99, height: 99, top: -14, right: 50, background: "rgba(255,255,255,0.07)" }}
        />
        <div className="relative z-[1] flex items-center justify-between">
          <span style={{ fontSize: 25, color: "rgba(240,250,245,0.85)" }}>Salary</span>
          <motion.button
            type="button"
            onClick={onToggleSalary}
            whileHover={reduced ? undefined : { scale: 1.05 }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
            className="flex shrink-0 cursor-pointer items-center whitespace-nowrap"
            style={{
              gap: 5,
              background: "#f5f8f6",
              color: tokens.text.onAccentDark,
              fontWeight: 700,
              fontSize: 12,
              borderRadius: tokens.radius.pill,
              padding: "9px 18px",
            }}
          >
            <PadlockGlyph size={12} color={tokens.text.onAccentDark} />
            {salaryShown ? "Hide" : "Reveal"}
          </motion.button>
        </div>
        <div
          className="relative z-[1] flex items-baseline"
          style={{ gap: 9, fontWeight: 700, fontSize: 25, color: "#fff", marginTop: 13 }}
        >
          <RevealAmount value={fmtAmountFull(person.salary)} revealed={salaryShown} label="salary" />
          <span>cUSDd / month</span>
        </div>
        <div className="relative z-[1]" style={{ fontSize: 11, color: "rgba(240,250,245,0.75)", marginTop: 4 }}>
          Decrypted locally with your wallet signature. Only you and your employer can see this.
        </div>
        <div className="relative z-[1] flex items-end justify-between" style={{ marginTop: 16 }}>
          <span className="tnum" style={{ fontSize: 13, letterSpacing: 0.9, color: "rgba(240,250,245,0.95)" }}>
            {shortWallet(person.wallet)}
          </span>
          <span style={{ fontSize: 10, color: "rgba(240,250,245,0.7)" }}>cUSDd · Sepolia</span>
        </div>
      </div>

      {/* Pay this employee — editable recipient + one-off confidential payout */}
      <GlassCard style={{ padding: "16px 20px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 15 }}>Pay {person.name}</div>
          <span style={{ fontSize: 10.5, color: tokens.text.muted }}>a one-off confidential payout</span>
        </div>
        <label htmlFor="pay-recipient" style={{ display: "block", fontSize: 10, color: tokens.text.muted, margin: "12px 0 5px" }}>
          Recipient wallet (edit to pay a different address)
        </label>
        <input
          id="pay-recipient"
          value={addr}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            setAddr(v);
            setAddrErr(onUpdateAddress(v));
          }}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${addrErr ? "rgba(224,110,98,0.5)" : "rgba(255,255,255,0.09)"}`,
            borderRadius: 11,
            padding: "10px 13px",
            color: "#e8f0ec",
            fontSize: 12,
            outline: "none",
          }}
        />
        {addrErr && (
          <p role="alert" style={{ fontSize: 11, color: "#eb8f85", marginTop: 6 }}>
            {addrErr}
          </p>
        )}
        <button
          type="button"
          onClick={onPay}
          disabled={Boolean(addrErr)}
          className="mt-3 w-full cursor-pointer rounded-full disabled:cursor-not-allowed disabled:opacity-45"
          style={{ background: tokens.accent.primary, color: tokens.text.onAccentDark, fontWeight: 700, fontSize: 13, padding: "11px 0" }}
        >
          Pay {person.name}
        </button>
      </GlassCard>

      {/* Payment history */}
      <GlassCard style={{ padding: "20px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Payment history</div>
          <div className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
            {rows.length} payments
          </div>
        </div>
        <div
          className="slim-scroll flex flex-col overflow-y-auto overflow-x-hidden"
          style={{ gap: 5, margin: "11px -13px 0 -13px", padding: "0 13px", maxHeight: 271 }}
        >
          {rows.map((row) => (
            <div
              key={row.key}
              role="button"
              tabIndex={0}
              onClick={() => onToggleRow(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleRow(row);
                }
              }}
              className="flex cursor-pointer items-center transition-colors hover:bg-[rgba(95,230,175,0.1)]"
              style={{ gap: 12, padding: "7px 13px", borderRadius: 999 }}
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: tokens.accent.puckBg,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <ReceiptCheckGlyph size={17} />
              </span>
              <span className="min-w-0">
                <span className="tnum block" style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>
                  {row.date}
                </span>
                <span
                  className="tnum block whitespace-nowrap"
                  style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}
                >
                  {shortHash(row.tx)} ·{" "}
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer hover:underline"
                    style={{ color: "#4ecba0", textDecoration: "none" }}
                  >
                    Etherscan
                  </a>
                </span>
              </span>
              <span className="ml-auto flex items-center" style={{ gap: 9 }}>
                <span
                  className="flex cursor-pointer items-center"
                  style={{ gap: 4, fontSize: 13.5, fontWeight: 700, color: "#eef4f1" }}
                >
                  <RevealAmount
                    value={row.amount !== undefined ? fmtAmountFull(row.amount) : undefined}
                    revealed={showAll || rowRevealed(row)}
                    pending={row.decrypting}
                    label="payment amount"
                  />
                  <span>cUSDd</span>
                </span>
                {row.verified ? (
                  <span
                    className="inline-flex items-center"
                    style={{
                      gap: 3.5,
                      fontSize: 9,
                      fontWeight: 400,
                      padding: "3px 9px",
                      borderRadius: tokens.radius.pill,
                      border: `1px solid ${tokens.accent.pillBorder}`,
                      color: tokens.accent.pillText,
                      background: "transparent",
                    }}
                  >
                    <CheckGlyph size={10} />
                    Verified
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center"
                    style={{
                      fontSize: 9,
                      fontWeight: 400,
                      padding: "3px 9px",
                      borderRadius: tokens.radius.pill,
                      border: "1px solid rgba(224,178,95,0.45)",
                      color: "#e3b25f",
                      background: "transparent",
                    }}
                  >
                    Delivered
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Footnote */}
      <div style={{ fontSize: 11, color: tokens.text.muted, lineHeight: 1.6 }}>
        Amounts are encrypted on-chain. Etherscan proves each payment happened; the amount itself stays private.
      </div>
    </div>
  );
}
