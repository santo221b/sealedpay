/**
 * HOME screen — Payroll overview (dashboard-screens.md §2 + data-assets §8/§9.1).
 * Title, tab row, custom Payout Activity bar chart, Team donut (Chart.js),
 * Monthly payroll + Last run cards. Presentation only.
 */
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

import { CheckGlyph, ChevronRightGlyph, PadlockGlyph, PersonPlusGlyph } from "../../design/icons";
import { GlassCard } from "../../design/kit2";
import { tokens } from "../../design/tokens";
import { fmtAmount, initials, shortHash } from "../../lib/seed";
import type { DashboardData, HomeScreenProps, RunView } from "../contracts";

ChartJS.register(ArcElement, Tooltip);

const EASE = [0.22, 1, 0.36, 1] as const;
const CH = 112; // chart height px
const BAR_COLOR = "#8fd7c0";
// Siblings of the hovered block in an active column dim to this so the block
// you are pointing at stands out (stacked-bar per-segment hover).
const BAR_DIM = "rgba(143,215,192,0.34)";
const TABS = ["All", "Payouts", "Verifications", "Team"];
const DONUT_DEPTS = ["Engineering", "Design", "Operations"];
// The chart always spans these months so it reads as a full timeline even with
// one real run; empty months render a small placeholder bar of this height.
const SCAFFOLD_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const PLACEHOLDER_H = 26;
const DONUT_COLORS = ["#8b7cf6", "#d7ee59", "#5fe3ab"];

/* ── Payout Activity scale (data-assets §8) ─────────────────────────────── */

function yScale(maxVal: number) {
  // Auto-hug the data: the ceiling is the smallest "nice" number just above the
  // tallest month (~10-45% headroom), not a fixed 5x overshoot. So an 11k max
  // scales to a 15k axis (bars ~73%) instead of the old 25k (bars ~44%).
  const target = Math.max(maxVal, 1) * 1.1;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  const norm = target / mag; // 1 … <10
  const niceMax =
    (norm <= 1 ? 1
      : norm <= 1.5 ? 1.5
      : norm <= 2 ? 2
      : norm <= 2.5 ? 2.5
      : norm <= 3 ? 3
      : norm <= 4 ? 4
      : norm <= 5 ? 5
      : norm <= 6 ? 6
      : norm <= 8 ? 8
      : 10) * mag;
  const yStep = niceMax / 5;
  const fmt = (v: number) =>
    v === 0 ? "0" : v >= 1000 ? (v % 1000 === 0 ? `${v / 1000}k` : `${(v / 1000).toFixed(1)}k`) : `${Math.round(v)}`;
  return { niceMax, labels: [5, 4, 3, 2, 1, 0].map((i) => fmt(yStep * i)) };
}

/* ── ENCRYPTED / Verified puck with the 110ms fade tooltip ──────────────── */

function TipPuck({ tip, children }: { tip: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);
  return (
    <span className="relative flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: 28,
          height: 28,
          background: "rgba(95,230,175,0.14)",
          border: "1px solid rgba(95,230,175,0.35)",
          color: tokens.accent.pillText,
        }}
      >
        {children}
      </span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute z-30 whitespace-nowrap"
        initial={false}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.11, ease: "easeOut" }}
        style={{
          bottom: "calc(100% + 7px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(18,30,25,0.97)",
          color: "#e8f0ec",
          fontSize: 10,
          fontWeight: 500,
          padding: "4.5px 9px",
          borderRadius: 7,
          boxShadow: "0 6px 16px -6px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}
      >
        {tip}
      </motion.span>
    </span>
  );
}

/* ── View All (navigation is owned by the shell; cosmetic here) ─────────── */

function ViewAll() {
  return (
    <div
      className="flex cursor-pointer items-center transition-colors hover:text-[#e8f0ec]"
      style={{ gap: 4, fontSize: 11, color: tokens.text.muted }}
    >
      View All
      <ChevronRightGlyph size={11} />
    </div>
  );
}

/* ── Screen ─────────────────────────────────────────────────────────────── */

export function Home({ data, tab, setTab, onAddEmployee }: HomeScreenProps) {
  const reduced = useReducedMotion();

  // Which stacked block (month + segment id) the cursor is over, so the tooltip
  // and highlight reflect THAT block, not the whole column's aggregate.
  const [hoverSeg, setHoverSeg] = useState<{ month: string; id: string; total: number; paid: number } | null>(null);

  // Hover-intent: a bar only becomes active after the cursor rests on it for a
  // beat, so brushing past on the way to another element doesn't hijack it.
  const HOVER_INTENT_MS = 300;
  const hoverTimer = useRef<number | undefined>(undefined);
  const armActive = (m: string) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => data.setActiveBar(m), HOVER_INTENT_MS);
  };
  const cancelActive = () => window.clearTimeout(hoverTimer.current);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // Chart buckets: seed runs are the month bases, live runs stack as caps.
  // The full Feb–Jul timeline always renders so the chart never collapses to a
  // lone bar; a month with no run shows a small placeholder (see PLACEHOLDER_H).
  const chart = useMemo(() => {
    const seedOldest = data.runs.filter((r) => !r.live).slice().reverse();
    const liveOldest = data.runs.filter((r) => r.live).slice().reverse();
    const months = [...SCAFFOLD_MONTHS];
    for (const r of [...seedOldest, ...liveOldest]) if (!months.includes(r.month)) months.push(r.month);
    const base = new Map(seedOldest.map((r) => [r.month, r]));
    const caps = new Map<string, RunView[]>();
    for (const r of liveOldest) caps.set(r.month, [...(caps.get(r.month) ?? []), r]);
    const totals = months.map(
      (m) => (base.get(m)?.total ?? 0) + (caps.get(m) ?? []).reduce((s, r) => s + r.total, 0),
    );
    const maxTotal = Math.max(...totals, 0);
    // Fall back to a sensible axis when there is no real data yet.
    const { niceMax, labels } = yScale(maxTotal > 0 ? maxTotal : 15000);
    return { months, base, caps, niceMax, labels };
  }, [data.runs]);

  // Team donut derived from the roster.
  const counts = useMemo(
    () => DONUT_DEPTS.map((d) => data.people.filter((p) => p.dept === d).length),
    [data.people],
  );
  const donutData = useMemo<ChartData<"doughnut", number[], string>>(
    () => ({
      labels: DONUT_DEPTS,
      datasets: [
        {
          data: counts,
          backgroundColor: DONUT_COLORS,
          borderWidth: 0,
          borderRadius: 16,
          spacing: 5,
          hoverOffset: 4,
        },
      ],
    }),
    [counts],
  );
  const donutOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      rotation: 253,
      animation: reduced ? (false as const) : undefined,
      plugins: {
        legend: { display: false },
        // No canvas tooltip: it overlapped the slices and rendered beneath the
        // "05 Employees" HTML center overlay. The legend on the right already
        // lists every department + count; hover still grows the slice.
        tooltip: { enabled: false },
      },
    }),
    [reduced],
  );

  const lastRun = data.runs[0];
  const lastRunDay = useMemo(() => {
    if (!lastRun) return "";
    const d = new Date(lastRun.dateFull);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { weekday: "short" });
  }, [lastRun]);

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Title */}
      <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, lineHeight: 1.06, margin: 0 }}>
        Payroll
      </h1>

      {/* Tab row */}
      <div className="flex" style={{ gap: 13 }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="cursor-pointer select-none"
              style={{
                fontSize: 13,
                borderRadius: tokens.radius.pill,
                padding: "10px 22px",
                transition: "background .2s, color .2s",
                border: "none",
                fontWeight: 400,
                background: active ? tokens.accent.primary : tokens.glass.card,
                color: active ? "#0b1512" : tokens.text.muted,
                boxShadow: active ? "none" : tokens.glass.cardShadow,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Payout Activity card — shown on the overview and the Payouts tab */}
      {(tab === "All" || tab === "Payouts") && (
      <GlassCard style={{ padding: "20px 23px 16px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Payout Activity</div>
          <ViewAll />
        </div>

        {chart.months.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ height: CH + 44, gap: 4 }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "rgba(95,230,175,0.1)", border: "1px solid rgba(95,230,175,0.18)", marginBottom: 6 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 3v18h18" />
                <rect x="7" y="12" width="3" height="5" rx="1" />
                <rect x="12.5" y="8" width="3" height="9" rx="1" />
                <rect x="18" y="5" width="3" height="12" rx="1" />
              </svg>
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: tokens.text.secondary }}>No payouts yet</div>
            <div style={{ fontSize: 11.5, color: tokens.text.muted, maxWidth: 250, lineHeight: 1.5 }}>
              Run your first payroll and it will show up here.
            </div>
          </div>
        ) : (
          <>
        <div className="flex" style={{ gap: 13, marginTop: 16 }}>
          {/* Y axis */}
          <div
            className="flex shrink-0 flex-col justify-between"
            style={{ height: CH, fontSize: 10, color: "#8ba297", paddingBottom: 2, width: 29 }}
          >
            {chart.labels.map((l, i) => (
              <span key={i} className="tnum">
                {l}
              </span>
            ))}
          </div>

          {/* Bars */}
          <div
            className="relative grid flex-1 items-end"
            style={{ gridTemplateColumns: `repeat(${chart.months.length},1fr)`, gap: 20, height: CH }}
          >
            {chart.months.map((m) => {
              const base = chart.base.get(m);
              const caps = chart.caps.get(m) ?? [];
              const total = (base?.total ?? 0) + caps.reduce((s, r) => s + r.total, 0);
              const paid = (base?.paid ?? 0) + caps.reduce((s, r) => s + r.paid, 0);
              const active = data.activeBar === m;
              // A month with no run renders a small hatched placeholder bar.
              const hasData = (base?.total ?? 0) > 0 || caps.length > 0;
              // A stacked column has more than one block (a run cap on top of the
              // base). When one is hovered, the tooltip + highlight track THAT
              // block; otherwise the column shows its month aggregate.
              const stacked = caps.length > 0;
              const hovHere = hoverSeg && hoverSeg.month === m ? hoverSeg : null;
              const tipTotal = hovHere ? hovHere.total : total;
              const tipPaid = hovHere ? hovHere.paid : paid;
              // The hovered block stays bright; its siblings dim so it stands out.
              const segBg = (id: string) => {
                if (!active) return undefined; // hatch class paints inactive columns
                if (hovHere && stacked) return hovHere.id === id ? BAR_COLOR : BAR_DIM;
                return BAR_COLOR;
              };
              // Track the hovered segment immediately (for the tooltip content);
              // the column becomes ACTIVE only after the hover-intent delay.
              const enterSeg = (id: string, segTotal: number, segPaid: number) => () => {
                setHoverSeg({ month: m, id, total: segTotal, paid: segPaid });
              };
              return (
                <div
                  key={m}
                  className="relative flex cursor-pointer flex-col items-center justify-end"
                  style={{ height: CH }}
                  onMouseEnter={() => armActive(m)}
                  onMouseLeave={() => {
                    cancelActive();
                    setHoverSeg(null);
                  }}
                >
                  <div className="relative flex flex-col-reverse" style={{ width: 54, gap: 3 }}>
                    {/* base segment */}
                    <div
                      className={active && hasData ? "" : "hatch"}
                      onMouseEnter={enterSeg("base", base?.total ?? 0, base?.paid ?? 0)}
                      style={{
                        width: 54,
                        height: hasData ? Math.max(((base?.total ?? 0) / chart.niceMax) * CH, base ? 3 : 0) : PLACEHOLDER_H,
                        borderRadius: 14,
                        transformOrigin: "bottom",
                        transition: "background .25s",
                        background: hasData ? segBg("base") : undefined,
                      }}
                    />
                    {/* run caps (grow in from the bottom) */}
                    {caps.map((r) => (
                      <motion.div
                        key={r.id}
                        className={active ? "" : "hatch"}
                        onMouseEnter={enterSeg(r.id, r.total, r.paid)}
                        initial={reduced ? false : { scaleY: 0, opacity: 0.4 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        transition={{ duration: reduced ? 0 : 0.52, ease: EASE }}
                        style={{
                          width: 54,
                          height: Math.max((r.total / chart.niceMax) * CH, 8),
                          borderRadius: 14,
                          transformOrigin: "bottom",
                          transition: "background .25s",
                          background: segBg(r.id),
                        }}
                      />
                    ))}
                    {active && (
                      <>
                        {/* glass tooltip — reflects the hovered block */}
                        <div
                          className="absolute z-[3] whitespace-nowrap"
                          style={{
                            bottom: "calc(100% + 22px)",
                            left: "50%",
                            transform: "translateX(-64%)",
                            background: "rgba(57,70,67,0.82)",
                            backdropFilter: "blur(9px)",
                            WebkitBackdropFilter: "blur(9px)",
                            border: "1px solid rgba(255,255,255,0.14)",
                            boxShadow:
                              "inset 0 1px 0 0 rgba(255,255,255,0.16), inset 0 -1px 0 0 rgba(255,255,255,0.04)",
                            color: "#cfd8d6",
                            fontSize: 11,
                            fontWeight: 400,
                            borderRadius: tokens.radius.pill,
                            padding: "6px 11px",
                          }}
                        >
                          {hasData ? `${fmtAmount(tipTotal)} cUSDd · ${tipPaid} paid` : "No transactions"}
                        </div>
                        {/* halo ring marker */}
                        <div
                          aria-hidden
                          className="absolute z-[3] rounded-full"
                          style={{
                            top: -13,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 24,
                            height: 24,
                            border: "5px solid #f5f8f6",
                            background: "transparent",
                            boxShadow:
                              "0 0 9px 2.7px rgba(240,248,232,0.30), 0 0 23.4px 9px rgba(240,248,232,0.12), inset 0 0 8.1px 1.8px rgba(245,252,248,0.40)",
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Month labels */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${chart.months.length},1fr)`, gap: 20, marginLeft: 41, marginTop: 7 }}
        >
          {chart.months.map((m) => (
            <div key={m} className="text-center" style={{ fontSize: 10, color: "#8ba297" }}>
              {m}
            </div>
          ))}
        </div>
          </>
        )}
      </GlassCard>
      )}

      {tab === "Payouts" && <PayoutsTab data={data} />}
      {tab === "Verifications" && <VerificationsTab data={data} />}
      {tab === "Team" && (
        <TeamTab data={data} donutData={donutData} donutOptions={donutOptions} counts={counts} onAddEmployee={onAddEmployee} />
      )}

      {/* Bottom row — overview only */}
      {tab === "All" && (
      <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr", gap: 20 }}>
        {/* Team donut card */}
        <GlassCard className="flex flex-col" style={{ padding: "16px 23px" }}>
          <div className="flex items-center justify-between">
            <div style={{ fontWeight: 400, fontSize: 17 }}>Team</div>
            <ViewAll />
          </div>
          {data.people.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center text-center"
              style={{ gap: 5, padding: "20px 0 8px" }}
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 48, height: 48, background: "rgba(95,230,175,0.12)", border: "1px solid rgba(95,230,175,0.2)", marginBottom: 5 }}
              >
                <PersonPlusGlyph size={21} color="#78e9c0" />
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: tokens.text.secondary }}>No team yet</div>
              <div style={{ fontSize: 11.5, color: tokens.text.muted, lineHeight: 1.5, maxWidth: 200 }}>
                Add your first employee to run a confidential payroll.
              </div>
              <button
                type="button"
                onClick={onAddEmployee}
                className="cursor-pointer rounded-full transition-transform hover:scale-[1.04] active:scale-[0.97]"
                style={{ marginTop: 11, background: "#5fe3ab", color: "#0b1512", fontSize: 12, fontWeight: 500, padding: "8px 20px" }}
              >
                Add employee
              </button>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center" style={{ gap: 23, marginTop: 7 }}>
              <div className="relative" style={{ width: 144, height: 144 }}>
                <Doughnut data={donutData} options={donutOptions} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="tnum" style={{ fontWeight: 700, fontSize: 20 }}>
                    {String(data.people.length).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 10, color: tokens.text.muted }}>Employees</div>
                </div>
              </div>
              <div className="flex flex-col" style={{ gap: 16 }}>
                {DONUT_DEPTS.map((d, i) => (
                  <div key={d} className="flex items-start" style={{ gap: 8 }}>
                    <span
                      className="shrink-0 rounded-full"
                      style={{ width: 8, height: 8, marginTop: 3.5, background: DONUT_COLORS[i] }}
                    />
                    <span>
                      <span className="block" style={{ fontSize: 12, fontWeight: 600, color: "#e8f0ec" }}>
                        {d}
                      </span>
                      <span className="tnum block" style={{ fontSize: 11, color: tokens.text.muted }}>
                        {counts[i]} people
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Monthly payroll + Last run */}
        <div className="flex flex-col" style={{ gap: 20 }}>
          <GlassCard className="flex-1" style={{ padding: "13.5px 22px" }}>
            <div style={{ fontWeight: 400, fontSize: 17 }}>Monthly payroll</div>
            {/* The aggregate total is already public in the Payout Activity bars,
                so it is shown plainly here — no lock. Only per-person salaries stay masked. */}
            <span className="whitespace-nowrap" style={{ display: "inline-flex", gap: 6, fontWeight: 700, fontSize: 27, marginTop: 7 }}>
              <span>{data.monthly.value}</span>
              <span>cUSDd</span>
            </span>
            <div className="flex items-center justify-between" style={{ marginTop: 9 }}>
              <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
                {data.people.length} salaries
              </span>
              <TipPuck tip="Encrypted">
                <PadlockGlyph size={11} />
              </TipPuck>
            </div>
          </GlassCard>

          <GlassCard className="flex-1" style={{ padding: "13.5px 22px" }}>
            <div style={{ fontWeight: 400, fontSize: 17 }}>Last run</div>
            <div className="tnum flex items-baseline whitespace-nowrap" style={{ gap: 8, fontWeight: 700, fontSize: 27, marginTop: 7 }}>
              {lastRun ? (
                <>
                  <span>{lastRun.date}</span>
                  {lastRunDay && <span>{lastRunDay}</span>}
                </>
              ) : (
                <span>No runs</span>
              )}
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 9 }}>
              <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
                {lastRun ? `${lastRun.paid} employees paid` : "Run payroll to get started"}
              </span>
              <TipPuck tip="Verified">
                <CheckGlyph size={12} />
              </TipPuck>
            </div>
          </GlassCard>
        </div>
      </div>
      )}
    </div>
  );
}

/* ── Shared bits for the focused tabs ────────────────────────────────────── */

function TabEmpty({ title, sub, action }: { title: string; sub: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: "30px 8px 22px", gap: 4 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: tokens.text.secondary }}>{title}</div>
      <div style={{ fontSize: 11.5, color: tokens.text.muted, maxWidth: 250, lineHeight: 1.5 }}>{sub}</div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="cursor-pointer rounded-full transition-transform hover:scale-[1.04] active:scale-[0.97]"
          style={{ marginTop: 10, background: "#5fe3ab", color: "#0b1512", fontSize: 12, fontWeight: 500, padding: "8px 20px" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function RunStatus({ verified }: { verified?: boolean }) {
  return verified ? (
    <span className="inline-flex shrink-0 items-center" style={{ gap: 3.5, fontSize: 9, padding: "3px 9px", borderRadius: 999, border: `1px solid ${tokens.accent.pillBorder}`, color: tokens.accent.pillText }}>
      <CheckGlyph size={10} />
      Verified
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center" style={{ fontSize: 9, padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(224,178,95,0.45)", color: "#e3b25f" }}>
      Delivered
    </span>
  );
}

/* ── Payouts tab: a ledger of every run ─────────────────────────────────── */
function PayoutsTab({ data }: { data: DashboardData }) {
  return (
    <GlassCard style={{ padding: "20px 23px" }}>
      <div className="flex items-center justify-between">
        <div style={{ fontWeight: 400, fontSize: 17 }}>Payout ledger</div>
        <div className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>{data.runs.length} runs</div>
      </div>
      {data.runs.length === 0 ? (
        <TabEmpty title="No payouts yet" sub="Run your first payroll to build the ledger." />
      ) : (
        <div className="slim-scroll flex flex-col overflow-y-auto overflow-x-hidden" style={{ gap: 4, maxHeight: 360, margin: "12px -13px 0", padding: "0 13px" }}>
          {data.runs.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center transition-colors hover:bg-[rgba(95,230,175,0.08)]"
              style={{ gap: 12, padding: "9px 13px", borderRadius: 999, textDecoration: "none", color: "inherit" }}
            >
              <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: tokens.accent.puckBg, border: "1px solid rgba(255,255,255,0.06)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>{r.dateFull}</span>
                <span className="block whitespace-nowrap" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>
                  {r.paid} paid · {shortHash(r.tx)}
                </span>
              </span>
              <span className="ml-auto flex shrink-0 items-center" style={{ gap: 11 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>{fmtAmount(r.total)} cUSDd</span>
                <RunStatus verified={r.verified} />
              </span>
            </a>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ── Verifications tab: privacy scorecard + per-run verify status ────────── */
function StatCard({ value, label, sub, accent = false }: { value: string; label: string; sub: string; accent?: boolean }) {
  return (
    <GlassCard style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 10.5, color: tokens.text.muted }}>{label}</div>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 700, color: accent ? "#78e9c0" : "#f2f7f4", marginTop: 5 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 3 }}>{sub}</div>
    </GlassCard>
  );
}

function VerificationsTab({ data }: { data: DashboardData }) {
  const verified = data.runs.filter((r) => r.verified).length;
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <StatCard value={String(data.encryptedCount)} label="Amounts encrypted" sub="on-chain, never public" />
        <StatCard value={`${verified}/${data.runs.length}`} label="Runs verified" sub="decrypted and matched" />
      </div>
      <GlassCard style={{ padding: "20px 23px" }}>
        <div style={{ fontWeight: 400, fontSize: 17 }}>Verifications</div>
        <p style={{ fontSize: 11.5, color: tokens.text.muted, lineHeight: 1.5, marginTop: 5 }}>
          Amounts stay encrypted on-chain. A verified run was decrypted with your signature and matched what was requested.
        </p>
        {data.runs.length === 0 ? (
          <TabEmpty title="Nothing to verify yet" sub="Run a payroll and it will appear here, ready to verify." />
        ) : (
          <div className="slim-scroll flex flex-col overflow-y-auto overflow-x-hidden" style={{ gap: 4, maxHeight: 320, margin: "12px -13px 0", padding: "0 13px" }}>
            {data.runs.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center transition-colors hover:bg-[rgba(95,230,175,0.08)]"
                style={{ gap: 12, padding: "9px 13px", borderRadius: 999, textDecoration: "none", color: "inherit" }}
              >
                <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: r.verified ? "rgba(95,230,175,0.14)" : "rgba(224,178,95,0.12)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {r.verified ? <CheckGlyph size={15} /> : <PadlockGlyph size={14} color="#e3b25f" />}
                </span>
                <span className="min-w-0">
                  <span className="block" style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>{r.dateFull}</span>
                  <span className="block whitespace-nowrap" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>{r.paid} amounts · encrypted on-chain</span>
                </span>
                <span className="ml-auto shrink-0">
                  <RunStatus verified={r.verified} />
                </span>
              </a>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ── Team tab: department donut + roster ────────────────────────────────── */
function TeamTab({
  data,
  donutData,
  donutOptions,
  counts,
  onAddEmployee,
}: {
  data: DashboardData;
  donutData: ChartData<"doughnut", number[], string>;
  donutOptions: ChartOptions<"doughnut">;
  counts: number[];
  onAddEmployee: () => void;
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <GlassCard className="flex flex-col" style={{ padding: "16px 23px" }}>
        <div style={{ fontWeight: 400, fontSize: 17 }}>By department</div>
        {data.people.length === 0 ? (
          <TabEmpty title="No team yet" sub="Add your first employee to run a confidential payroll." action={{ label: "Add employee", onClick: onAddEmployee }} />
        ) : (
          <div className="flex flex-1 items-center justify-center" style={{ gap: 23, marginTop: 7 }}>
            <div className="relative" style={{ width: 144, height: 144 }}>
              <Doughnut data={donutData} options={donutOptions} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="tnum" style={{ fontWeight: 700, fontSize: 20 }}>{String(data.people.length).padStart(2, "0")}</div>
                <div style={{ fontSize: 10, color: tokens.text.muted }}>Employees</div>
              </div>
            </div>
            <div className="flex flex-col" style={{ gap: 16 }}>
              {DONUT_DEPTS.map((d, i) => (
                <div key={d} className="flex items-start" style={{ gap: 8 }}>
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, marginTop: 3.5, background: DONUT_COLORS[i] }} />
                  <span>
                    <span className="block" style={{ fontSize: 12, fontWeight: 600, color: "#e8f0ec" }}>{d}</span>
                    <span className="tnum block" style={{ fontSize: 11, color: tokens.text.muted }}>{counts[i]} people</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard style={{ padding: "16px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Employees</div>
          <div className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>{data.people.length} people</div>
        </div>
        {data.people.length === 0 ? (
          <TabEmpty title="No employees" sub="They will appear here once added." />
        ) : (
          <div className="slim-scroll flex flex-col overflow-y-auto overflow-x-hidden" style={{ gap: 3, maxHeight: 300, margin: "10px -13px 0", padding: "0 13px" }}>
            {data.people.map((p) => (
              <div key={p.id} className="flex items-center" style={{ gap: 11, padding: "7px 13px", borderRadius: 999 }}>
                <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 32, height: 32, background: tokens.accent.puckBg, border: "1px solid rgba(255,255,255,0.06)", fontWeight: 800, fontSize: 11, color: "#d3ecdd" }}>
                  {initials(p.name)}
                </span>
                <span className="min-w-0">
                  <span className="block" style={{ fontSize: 12.5, fontWeight: 600, color: "#eef4f1" }}>{p.name}</span>
                  <span className="block" style={{ fontSize: 10, color: tokens.text.muted, marginTop: 1 }}>{p.role} · {p.dept}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
