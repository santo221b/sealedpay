/**
 * Employee-view right column (dashboard handoff §isNavEmp right column):
 * a "Next payout" scheduled-payroll card with a reminder bell, a wallet
 * details glass panel (token / network / frequency / joined), and the three
 * stat cards (Payments received / Team / Role). Presentation only.
 */
import { motion, useReducedMotion } from "framer-motion";

import { BellGlyph } from "../design/icons";
import { GlassCard } from "../design/kit2";
import { tokens } from "../design/tokens";
import { shortWallet } from "../lib/seed";
import type { Person } from "./contracts";

const GRADIENT = "linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)";

export function EmployeeSidebar({
  person,
  paymentsCount,
  reminderSet,
  onRemind,
}: {
  person: Person;
  paymentsCount: string;
  reminderSet: boolean;
  onRemind: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col" style={{ gap: 19.8 }}>
      {/* Next payout container (stacked card + wallet details) */}
      <div
        className="flex flex-col"
        style={{ background: tokens.glass.cardDim, boxShadow: tokens.glass.cardShadow, borderRadius: "25px 25px 42px 42px", padding: "20px 20px 18px 20px" }}
      >
        <div style={{ fontSize: 18, fontWeight: 400 }}>Next payout</div>

        {/* Stacked scheduled-payroll card */}
        <div className="relative" style={{ marginTop: 16, height: 157, marginLeft: 1, marginRight: 1 }}>
          <div className="absolute" style={{ top: 0, left: 22, right: 22, height: 36, borderRadius: "14px 14px 0 0", background: "rgba(94,190,158,0.28)", border: "1px solid rgba(170,235,210,0.14)" }} />
          <div className="absolute" style={{ top: 11, left: 11, right: 11, height: 36, borderRadius: "14px 14px 0 0", background: "rgba(94,190,158,0.46)", border: "1px solid rgba(170,235,210,0.20)" }} />
          <div
            className="absolute overflow-hidden"
            style={{ top: 23, left: 0, right: 0, height: 216, borderRadius: 18, background: GRADIENT, padding: "18px 20px", boxShadow: "0 9px 32px -3.6px rgba(64,185,150,0.35), 0 0 63px -7.2px rgba(64,185,150,0.22)" }}
          >
            <div aria-hidden className="absolute rounded-full" style={{ width: 144, height: 144, top: -36, right: -27, background: "rgba(255,255,255,0.10)" }} />
            <div aria-hidden className="absolute rounded-full" style={{ width: 90, height: 90, top: -9, right: 54, background: "rgba(255,255,255,0.07)" }} />
            <div className="flex items-start justify-between">
              <div>
                <div style={{ fontSize: 11, color: "rgba(240,250,245,0.85)", marginTop: 13 }}>Scheduled payroll</div>
                <div style={{ fontWeight: 700, fontSize: 29, color: "#fff", marginTop: 2 }}>Jul 31</div>
              </div>
              <motion.button
                type="button"
                title="Remind me"
                aria-label="Set payout reminder"
                onClick={onRemind}
                whileHover={reduced ? undefined : { scale: 1.08 }}
                whileTap={reduced ? undefined : { scale: 0.94 }}
                className="relative z-[1] flex shrink-0 cursor-pointer items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: "#f5f8f6" }}
              >
                <BellGlyph size={15} color="#14503b" glow={false} />
                {reminderSet && (
                  <span className="absolute rounded-full" style={{ top: 1, right: 1, width: 9, height: 9, background: "#5fe3ab", border: "2px solid #f5f8f6" }} />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Wallet details glass panel (overlaps the card) */}
        <div
          className="relative z-[1] overflow-hidden"
          style={{ margin: "-22px -20px -18px -20px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 42, background: "rgba(13,22,18,0.55)", padding: "14px 20px 18px 20px" }}
        >
          <div aria-hidden className="pointer-events-none absolute" style={{ top: -54, left: 11, right: 11, height: 171, borderRadius: 20, background: GRADIENT, filter: "blur(27px)", opacity: 0.55 }} />
          <div aria-hidden className="pointer-events-none absolute" style={{ top: 0, left: 54, right: 9, height: 1.5, borderRadius: 2, background: "linear-gradient(90deg, rgba(235,255,246,0) 0%, rgba(235,255,246,0.10) 40%, rgba(235,255,246,0.45) 78%, rgba(235,255,246,0.22) 100%)" }} />
          <div aria-hidden className="pointer-events-none absolute" style={{ top: 9, right: 0, height: "44%", width: 1.5, borderRadius: 2, background: "linear-gradient(180deg, rgba(235,255,246,0.30) 0%, rgba(235,255,246,0.42) 12%, rgba(235,255,246,0.10) 60%, rgba(235,255,246,0) 100%)" }} />

          <div className="relative">
            <div className="tnum" style={{ fontSize: 12.6, letterSpacing: 0.9, color: "#ffffff", paddingLeft: 21 }}>
              {shortWallet(person.wallet)}
            </div>
            <div style={{ fontSize: 10, color: "rgba(240,250,245,0.85)", marginTop: 3, paddingLeft: 21 }}>Sepolia</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px -20px 0 -20px" }} />
            <div style={{ fontSize: 17, fontWeight: 400, marginTop: 16 }}>Wallet details</div>
            <div className="flex flex-col" style={{ marginTop: 7 }}>
              {[
                ["Token", "cUSDd"],
                ["Network", "Sepolia Testnet"],
                ["Frequency", "Monthly"],
                ["Joined", person.joined],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between" style={{ padding: "9px 0" }}>
                  <span style={{ fontSize: 11.7, color: "#e8f0ec" }}>{k}</span>
                  <span style={{ fontSize: 10.8, color: "#9db3aa" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 19.8 }}>
        <GlassCard style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 10.8, color: tokens.text.muted }}>Payments received</div>
          <div className="tnum" style={{ fontSize: 18, fontWeight: 500, marginTop: 5 }}>{paymentsCount}</div>
        </GlassCard>
        <GlassCard style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 10.8, color: tokens.text.muted }}>Team</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 5 }}>{person.dept}</div>
        </GlassCard>
        <GlassCard style={{ padding: "18px 22px", gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 10.8, color: tokens.text.muted }}>Role</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 5 }}>{person.role}</div>
        </GlassCard>
      </div>
    </div>
  );
}
