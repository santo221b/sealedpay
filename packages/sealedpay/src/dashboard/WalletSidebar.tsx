/**
 * Right sidebar — Payroll Wallet (dashboard-screens.md §6).
 * Stacked ghost card layers behind the green gradient balance card
 * (RevealAmount keepLock + eye toggle + "+" fund button), then the frosted
 * Recent activity panel with its blurred glow and glisten hairlines.
 */
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactElement } from "react";

import { RevealAmount } from "../design/RevealAmount";
import {
  DepositBoxGlyph,
  EyeGlyph,
  KeyGlyph,
  PersonPlusGlyph,
  PlusGlyph,
  ReceiptCheckGlyph,
  CheckGlyph,
} from "../design/icons";
import { tokens } from "../design/tokens";
import { copyText } from "../lib/clipboard";
import { midWallet } from "../lib/seed";
import type { ActivityRow, WalletSidebarProps } from "./contracts";

const GRADIENT = "linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)";

const ACTIVITY_ICON: Record<ActivityRow["icon"], () => ReactElement> = {
  run: () => <ReceiptCheckGlyph size={17} />,
  person: () => <PersonPlusGlyph size={16} />,
  key: () => <KeyGlyph size={16} />,
  deposit: () => <DepositBoxGlyph size={17} />,
};

function ActivityPill({ pill }: { pill: ActivityRow["pill"] }) {
  const pending = pill === "Pending";
  return (
    <span
      className="inline-flex shrink-0 items-center"
      style={{
        gap: 3.5,
        fontSize: 9,
        fontWeight: 400,
        borderRadius: tokens.radius.pill,
        border: `1px solid ${pending ? tokens.warn.pendingBorder : tokens.accent.pillBorder}`,
        color: pending ? tokens.warn.pendingText : tokens.accent.pillText,
        background: "transparent",
        padding: "4.5px 9px",
      }}
    >
      {pill === "Verified" && <CheckGlyph size={10} />}
      {pill}
    </span>
  );
}

const rowStyle: CSSProperties = {
  gap: 12,
  padding: "9px 7px",
  margin: "-5px -7px",
  borderRadius: 999,
  textDecoration: "none",
  color: "inherit",
};

function ActivityRowView({ row }: { row: ActivityRow }) {
  const Icon = ACTIVITY_ICON[row.icon];
  const body = (
    <>
      <span
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 36, height: 36, backgroundColor: "#3FAC8D5A", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Icon />
      </span>
      <span className="min-w-0">
        <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>
          {row.title}
        </span>
        <span className="block" style={{ fontSize: 10.5, color: "#9eada5", marginTop: 1 }}>
          {row.sub}
        </span>
      </span>
      <span className="ml-auto flex items-center" style={{ gap: 9 }}>
        <ActivityPill pill={row.pill} />
      </span>
    </>
  );
  const linkClass = "flex cursor-pointer items-center transition-colors hover:bg-[rgba(95,230,175,0.1)]";
  return row.url ? (
    <a href={row.url} target="_blank" rel="noreferrer" className={linkClass} style={rowStyle}>
      {body}
    </a>
  ) : (
    // No link to open, so this row is static — no pointer cursor or hover.
    <div className="flex items-center" style={rowStyle}>
      {body}
    </div>
  );
}

export function WalletSidebar({ data, onFund, activity, title = "Payroll Wallet", action, emptyNote, onCopied }: WalletSidebarProps) {
  const reduced = useReducedMotion();
  const balanceRevealed = data.showAll || data.balance.revealed;
  const empty = emptyNote ?? { title: "No activity yet", sub: "Fund the wallet or run a payroll to see it here." };

  return (
    <div
      className="flex flex-col"
      style={{
        background: tokens.glass.cardDim,
        boxShadow: tokens.glass.cardShadow,
        borderRadius: "25px 25px 42px 42px",
        padding: "20px 20px 18px 20px",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 500 }}>{title}</div>

      {/* Stacked balance card */}
      <div className="relative" style={{ marginTop: 43, height: 157, marginLeft: 1, marginRight: 1 }}>
        {/* ghost layers */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: 22,
            right: 22,
            height: 36,
            borderRadius: "14px 14px 0 0",
            background: "rgba(94,190,158,0.28)",
            border: "1px solid rgba(170,235,210,0.14)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: 11,
            left: 11,
            right: 11,
            height: 36,
            borderRadius: "14px 14px 0 0",
            background: "rgba(94,190,158,0.46)",
            border: "1px solid rgba(170,235,210,0.20)",
          }}
        />
        {/* balance card (bottom tucks under the activity panel) */}
        <div
          className="absolute overflow-hidden"
          style={{ top: 23, left: 0, right: 0, height: 184, borderRadius: 18, background: GRADIENT, padding: "18px 20px" }}
        >
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{ width: 144, height: 144, top: -36, right: -27, background: "rgba(255,255,255,0.10)" }}
          />
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{ width: 90, height: 90, top: -9, right: 54, background: "rgba(255,255,255,0.07)" }}
          />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center" style={{ gap: 7, fontSize: 11, color: "rgba(240,250,245,0.85)", marginTop: 13 }}>
                <span>Available balance</span>
                <button
                  type="button"
                  aria-label={
                    data.balance.pending ? "Decrypting balance" : balanceRevealed ? "Hide balance" : "Reveal balance"
                  }
                  onClick={data.balance.toggle}
                  disabled={data.balance.pending}
                  className={`transition-opacity ${data.balance.pending ? "cursor-wait opacity-100" : "cursor-pointer opacity-85 hover:opacity-100"}`}
                >
                  {data.balance.pending ? (
                    <span
                      className="inline-block animate-spin rounded-full align-middle"
                      style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff" }}
                      aria-hidden
                    />
                  ) : (
                    <EyeGlyph size={13} />
                  )}
                </button>
              </div>
              <div
                className="flex"
                style={{ gap: 9, marginTop: 2 }}
              >
                <div style={{ fontWeight: 400, fontSize: 23, color: "#fff", lineHeight: 1.15, minWidth: 119 }}>
                  <RevealAmount
                    value={data.balance.value}
                    revealed={balanceRevealed}
                    pending={data.balance.pending}
                    label="balance"
                  />
                  <div style={{ fontWeight: 700 }}>cUSDd</div>
                </div>
              </div>
            </div>
            <div className="z-[1] flex shrink-0 flex-col items-center" style={{ gap: 3 }}>
              <motion.button
                type="button"
                title={action ? action.aria : "Fund wallet"}
                aria-label={action ? action.aria : "Fund wallet"}
                data-tour="tour-wallet-fund"
                onClick={action ? action.onClick : onFund}
                disabled={action?.busy}
                whileHover={reduced || action?.busy ? undefined : { scale: 1.08 }}
                whileTap={reduced || action?.busy ? undefined : { scale: 0.94 }}
                className="flex cursor-pointer items-center justify-center rounded-full disabled:cursor-wait"
                style={{ width: 40, height: 40, background: "#f5f8f6" }}
              >
                {action?.busy ? (
                  <span
                    aria-hidden
                    className="inline-block animate-spin rounded-full"
                    style={{ width: 15, height: 15, border: "2px solid rgba(20,80,59,0.25)", borderTopColor: "#14503b" }}
                  />
                ) : action ? (
                  action.icon
                ) : (
                  <PlusGlyph size={16} />
                )}
              </motion.button>
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 0.2, color: "rgba(240,250,245,0.9)" }}>
                {action ? action.label : "Fund"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity glass panel */}
      <div
        className="relative z-[1] overflow-hidden"
        style={{
          margin: "-16px -20px -18px -20px",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 42,
          backdropFilter: "blur(5px)",
          // Clip the backdrop-filter to the rounded shape — Safari honours
          // clip-path here where it ignores border-radius + overflow, killing
          // the rectangular blur halo behind the panel.
          clipPath: "inset(0 0 0 0 round 40px)",
          WebkitClipPath: "inset(0 0 0 0 round 40px)",
          padding: "14px 20px 22px 20px",
          backgroundColor: "#21212145",
        }}
      >
        {/* blurred green glow behind the content */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: -54,
            left: 11,
            right: 11,
            height: 171,
            borderRadius: 20,
            background: "linear-gradient(135deg,#41b091 0%,#2e9478 55%,#26826a 100%)",
            filter: "blur(27px)",
            opacity: 0.55,
          }}
        />
        {/* glisten hairlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: 0,
            left: 54,
            right: 9,
            height: 1.5,
            borderRadius: 2,
            background:
              "linear-gradient(90deg, rgba(235,255,246,0) 0%, rgba(235,255,246,0.10) 40%, rgba(235,255,246,0.45) 78%, rgba(235,255,246,0.22) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: 9,
            right: 0,
            height: "44%",
            width: 1.5,
            borderRadius: 2,
            background:
              "linear-gradient(180deg, rgba(235,255,246,0.30) 0%, rgba(235,255,246,0.42) 12%, rgba(235,255,246,0.10) 60%, rgba(235,255,246,0) 100%)",
          }}
        />

        <div className="relative">
          {/* address strip — show more of the address here, there is room.
              Clicking copies the full address (the shell toasts). */}
          <div className="tnum" style={{ fontSize: 13, letterSpacing: 0.9, color: "#ffffff", paddingLeft: 21 }}>
            {data.employerAddress ? (
              <button
                type="button"
                title="Copy wallet address"
                onClick={() => {
                  const address = data.employerAddress;
                  if (address) void copyText(address).then((ok) => ok && onCopied?.());
                }}
                className="tnum cursor-pointer transition-opacity hover:opacity-75"
                style={{ font: "inherit", letterSpacing: "inherit", color: "inherit", background: "none", padding: 0 }}
              >
                {midWallet(data.employerAddress)}
              </button>
            ) : (
              "Not connected"
            )}
          </div>
          <div style={{ fontSize: 10, color: "rgba(240,250,245,0.85)", marginTop: 3, paddingLeft: 21 }}>Sepolia</div>
          {/* divider (full-bleed) */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px -20px 0 -20px" }} />

          <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 400 }}>Recent activity</div>
          </div>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center text-center" style={{ padding: "24px 8px 12px", gap: 4 }}>
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: "rgba(95,230,175,0.1)", border: "1px solid rgba(95,230,175,0.18)", marginBottom: 5 }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 12h4l2 5 4-12 2 7h6" />
                </svg>
              </span>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8f0ec" }}>{empty.title}</div>
              <div style={{ fontSize: 11, color: "#8ba297", maxWidth: 210, lineHeight: 1.5 }}>{empty.sub}</div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 22, marginTop: 20 }}>
              {activity.map((row) => (
                <ActivityRowView key={row.key} row={row} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
