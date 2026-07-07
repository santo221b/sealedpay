/**
 * TEAM screen (dashboard-screens.md §3).
 * Title row with Run payroll / Add employee, two hero cards (Headcount
 * gradient + Monthly payroll encrypted), Employees roster (5 visible then
 * internal scroll). Presentation only.
 */
import { useMemo } from "react";

import { RevealAmount } from "../../design/RevealAmount";
import { PlayGlyph } from "../../design/icons";
import { GlassCard, PrimaryButton, SecondaryButton } from "../../design/kit2";
import { tokens } from "../../design/tokens";
import { initials, shortWallet } from "../../lib/seed";
import type { TeamScreenProps } from "../contracts";

const GRADIENT = "linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)";

export function Team({ data, onRunPayroll, onAddEmployee, onOpenEmployee }: TeamScreenProps) {
  const deptCount = useMemo(() => new Set(data.people.map((p) => p.dept)).size, [data.people]);
  const oldest = data.runs[data.runs.length - 1];
  const since = useMemo(() => {
    if (!oldest) return "since Feb 2026";
    const [month, , year] = oldest.dateFull.replace(",", "").split(" ");
    return `since ${month} ${year}`;
  }, [oldest]);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, margin: 0 }}>
          Team
        </h1>
        <div className="flex items-center" style={{ gap: 11 }}>
          <SecondaryButton
            onClick={onAddEmployee}
            style={{
              borderRadius: tokens.radius.pill,
              background: tokens.glass.card,
              boxShadow: tokens.glass.cardShadow,
              border: "none",
              color: tokens.text.secondary,
              fontSize: 13,
              fontWeight: 500,
              padding: "10px 20px",
            }}
          >
            Add employee
          </SecondaryButton>
          <PrimaryButton
            onClick={onRunPayroll}
            style={{
              borderRadius: tokens.radius.pill,
              background: tokens.accent.primary,
              color: "#0b1512",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 22px",
            }}
          >
            <PlayGlyph size={14} />
            Run payroll
          </PrimaryButton>
        </div>
      </div>

      {/* Hero cards */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Headcount gradient card */}
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
            <span style={{ fontSize: 11, color: "rgba(240,250,245,0.85)" }}>Headcount</span>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.9, color: "rgba(240,250,245,0.9)" }}>
              ACTIVE
            </span>
          </div>
          <div className="tnum relative z-[1]" style={{ fontSize: 25, fontWeight: 700, color: "#fff", marginTop: 18 }}>
            {data.people.length} employees
          </div>
          <div className="tnum relative z-[1]" style={{ fontSize: 11, color: "rgba(240,250,245,0.75)", marginTop: 2 }}>
            {deptCount} departments
          </div>
          <div className="relative z-[1] flex items-end justify-between" style={{ marginTop: 16 }}>
            <span className="tnum" style={{ fontSize: 13, letterSpacing: 0.45, color: "rgba(240,250,245,0.95)" }}>
              {data.runs.length} payroll runs completed
            </span>
            <span style={{ fontSize: 10, color: "rgba(240,250,245,0.7)" }}>{since}</span>
          </div>
        </div>

        {/* Monthly payroll encrypted card */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 18,
            background: tokens.glass.card,
            boxShadow: tokens.glass.cardShadow,
            padding: 20,
            minHeight: 171,
          }}
        >
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{ width: 153, height: 153, top: -45, right: -36, background: "rgba(139,124,246,0.12)" }}
          />
          <div className="relative z-[1] flex items-center justify-between">
            <span style={{ fontSize: 11, color: tokens.text.muted }}>Monthly payroll</span>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.9, color: tokens.text.muted }}>
              ENCRYPTED
            </span>
          </div>
          <div
            className="relative z-[1] flex cursor-pointer items-baseline"
            style={{ gap: 8, fontWeight: 700, fontSize: 25, color: tokens.text.heading, marginTop: 18 }}
          >
            <RevealAmount
              value={data.monthly.value}
              revealed={data.showAll || data.monthly.revealed}
              onToggle={data.monthly.toggle}
              label="monthly payroll"
            />
            <span onClick={data.monthly.toggle}>cUSDd</span>
          </div>
          <div className="tnum relative z-[1]" style={{ fontSize: 11, color: tokens.text.muted, marginTop: 2 }}>
            {data.people.length} salaries · encrypted on-chain
          </div>
          <div className="relative z-[1] flex items-end justify-between" style={{ marginTop: 16 }}>
            <span style={{ fontSize: 13, letterSpacing: 0.45, color: tokens.text.secondary }}>
              Next payout · Jul 31
            </span>
            <span style={{ fontSize: 10, color: tokens.text.muted }}>in 26 days</span>
          </div>
        </div>
      </div>

      {/* Employees roster */}
      <GlassCard style={{ padding: "20px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Employees</div>
          <div className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
            {data.people.length} people
          </div>
        </div>
        <div
          className="slim-scroll flex flex-col overflow-y-auto overflow-x-hidden"
          style={{ gap: 5, margin: "11px -13px 0 -13px", padding: "0 13px", maxHeight: 274 }}
        >
          {data.people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenEmployee(p.id)}
              className="flex w-full cursor-pointer items-center text-left transition-colors hover:bg-[rgba(95,230,175,0.1)]"
              style={{ gap: 12, padding: "7px 13px", borderRadius: 999 }}
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: tokens.accent.puckBg,
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontWeight: 800,
                  fontSize: 12,
                  color: "#d3ecdd",
                }}
              >
                {initials(p.name)}
              </span>
              <span className="min-w-0">
                <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>
                  {p.name}
                </span>
                <span className="tnum block" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>
                  {p.role} · {shortWallet(p.wallet)}
                </span>
              </span>
              <span className="ml-auto flex items-center" style={{ gap: 9 }}>
                <span
                  className="inline-flex items-center"
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    padding: "4px 13px",
                    borderRadius: tokens.radius.pill,
                    border: `1px solid ${tokens.accent.pillBorder}`,
                    color: tokens.accent.pillText,
                    background: "transparent",
                  }}
                >
                  Active
                </span>
              </span>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
