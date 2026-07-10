/**
 * EMPLOYEE VIEW screen (dashboard-screens.md §5 + §7.2 stat cards).
 * Title, Connected chip + Back ghost button, Salary hero gradient card
 * (Reveal toggle + keepLock RevealAmount), 3 stat cards, Payment history
 * (6 visible then internal scroll, per-row reveal with real Etherscan
 * links). Presentation only.
 */
import { motion, useReducedMotion } from "framer-motion";

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
  onPay,
}: EmployeeViewProps) {
  const reduced = useReducedMotion();
  const salaryShown = showAll || salaryRevealed;

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
          style={{ borderRadius: tokens.radius.pill, border: "1px solid rgba(255,255,255,0.14)", color: "#b8c6bf", fontWeight: 500, fontSize: 13, padding: "9px 18px" }}
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
              fontWeight: 500,
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
        <div className="relative z-[1] flex items-center justify-between" style={{ marginTop: 16 }}>
          <span className="flex items-center" style={{ gap: 11 }}>
            <span className="tnum" style={{ fontSize: 13, letterSpacing: 0.9, color: "rgba(240,250,245,0.95)" }}>
              {shortWallet(person.wallet)}
            </span>
            <motion.button
              type="button"
              data-tour="tour-employee-pay"
              onClick={onPay}
              whileHover={reduced ? undefined : { scale: 1.05 }}
              whileTap={reduced ? undefined : { scale: 0.95 }}
              className="flex shrink-0 cursor-pointer items-center whitespace-nowrap"
              style={{
                background: "#f5f8f6",
                color: tokens.text.onAccentDark,
                fontWeight: 500,
                fontSize: 11,
                borderRadius: tokens.radius.pill,
                padding: "5px 15px",
              }}
            >
              Pay
            </motion.button>
          </span>
          <span style={{ fontSize: 10, color: "rgba(240,250,245,0.7)" }}>cUSDd · Sepolia</span>
        </div>
      </div>

      {/* Payment history */}
      <GlassCard style={{ padding: "20px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Payment history</div>
          {rows.length > 0 && (
            <div className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
              {rows.length} payments
            </div>
          )}
        </div>
        {rows.length === 0 && (
          <div className="flex flex-col items-center text-center" style={{ padding: "26px 8px 16px", gap: 4 }}>
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: "rgba(95,230,175,0.1)", border: "1px solid rgba(95,230,175,0.18)", marginBottom: 6 }}
            >
              <ReceiptCheckGlyph size={18} />
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: tokens.text.secondary }}>No payments yet</div>
            <div style={{ fontSize: 11.5, color: tokens.text.muted, maxWidth: 260, lineHeight: 1.5 }}>
              Pay {person.name.split(" ")[0]} individually or run payroll, and every payment lands here.
            </div>
          </div>
        )}
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
                  {row.time && (
                    <span style={{ fontWeight: 400, color: tokens.text.muted, fontVariantNumeric: "normal" }}> · {row.time}</span>
                  )}
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
                  {/* Same fetching loader as the wallet's Available balance: a
                      spinning ring while the real ciphertext is decrypting. */}
                  {row.decrypting && (
                    <span
                      className="inline-block animate-spin rounded-full align-middle"
                      style={{ width: 12, height: 12, border: "1.5px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0" }}
                      aria-hidden
                    />
                  )}
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
        Amounts are encrypted on-chain. Etherscan proves each payment happened. The amount itself stays private.
      </div>
    </div>
  );
}
