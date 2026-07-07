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
  ChevronRightGlyph,
  DepositBoxGlyph,
  EyeGlyph,
  KeyGlyph,
  PersonPlusGlyph,
  PlusGlyph,
  ReceiptCheckGlyph,
  CheckGlyph,
} from "../design/icons";
import { tokens } from "../design/tokens";
import { shortWallet } from "../lib/seed";
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
        <span className="tnum block" style={{ fontSize: 10.5, color: "#9eada5", marginTop: 1 }}>
          {row.sub}
        </span>
      </span>
      <span className="ml-auto flex items-center" style={{ gap: 9 }}>
        <ActivityPill pill={row.pill} />
      </span>
    </>
  );
  const className = "flex cursor-pointer items-center transition-colors hover:bg-[rgba(95,230,175,0.1)]";
  return row.url ? (
    <a href={row.url} target="_blank" rel="noreferrer" className={className} style={rowStyle}>
      {body}
    </a>
  ) : (
    <div className={className} style={rowStyle}>
      {body}
    </div>
  );
}

export function WalletSidebar({ data, onFund, activity }: WalletSidebarProps) {
  const reduced = useReducedMotion();
  const balanceRevealed = data.showAll || data.balance.revealed;

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
      <div style={{ fontSize: 18, fontWeight: 500 }}>Payroll Wallet</div>

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
            <motion.button
              type="button"
              title="Fund"
              aria-label="Fund wallet"
              onClick={onFund}
              whileHover={reduced ? undefined : { scale: 1.08 }}
              whileTap={reduced ? undefined : { scale: 0.94 }}
              className="z-[1] flex shrink-0 cursor-pointer items-center justify-center rounded-full"
              style={{ width: 40, height: 40, background: "#f5f8f6" }}
            >
              <PlusGlyph size={16} />
            </motion.button>
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
          {/* address strip */}
          <div className="tnum" style={{ fontSize: 13, letterSpacing: 0.9, color: "#ffffff", paddingLeft: 21 }}>
            {data.employerAddress ? shortWallet(data.employerAddress) : "Not connected"}
          </div>
          <div style={{ fontSize: 10, color: "rgba(240,250,245,0.85)", marginTop: 3, paddingLeft: 21 }}>Sepolia</div>
          {/* divider (full-bleed) */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px -20px 0 -20px" }} />

          <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 400 }}>Recent activity</div>
            <div
              className="flex cursor-pointer items-center transition-colors hover:text-[#e8f0ec]"
              style={{ gap: 4, fontSize: 11, color: tokens.text.muted }}
            >
              View All
              <ChevronRightGlyph size={11} />
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 22, marginTop: 20 }}>
            {activity.map((row) => (
              <ActivityRowView key={row.key} row={row} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
