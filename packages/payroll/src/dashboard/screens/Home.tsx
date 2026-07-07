/**
 * HOME screen — Payroll overview (dashboard-screens.md §2 + data-assets §8/§9.1).
 * Title, tab row, custom Payout Activity bar chart, Team donut (Chart.js),
 * Monthly payroll + Last run cards. Presentation only.
 */
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import { Doughnut } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

import { CheckGlyph, ChevronRightGlyph } from "../../design/icons";
import { GlassCard } from "../../design/kit2";
import { tokens } from "../../design/tokens";
import { fmtAmount } from "../../lib/seed";
import type { HomeScreenProps, RunView } from "../contracts";

ChartJS.register(ArcElement, Tooltip);

const EASE = [0.22, 1, 0.36, 1] as const;
const CH = 112; // chart height px
const BAR_COLOR = "#8fd7c0";
const TABS = ["All", "Payouts", "Verifications", "Team"];
const DONUT_DEPTS = ["Engineering", "Design", "Operations"];
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

export function Home({ data, tab, setTab }: HomeScreenProps) {
  const reduced = useReducedMotion();

  // Chart buckets: seed runs are the month bases, live runs stack as caps.
  const chart = useMemo(() => {
    const seedOldest = data.runs.filter((r) => !r.live).slice().reverse();
    const liveOldest = data.runs.filter((r) => r.live).slice().reverse();
    const months = seedOldest.map((r) => r.month);
    for (const r of liveOldest) if (!months.includes(r.month)) months.push(r.month);
    const base = new Map(seedOldest.map((r) => [r.month, r]));
    const caps = new Map<string, RunView[]>();
    for (const r of liveOldest) caps.set(r.month, [...(caps.get(r.month) ?? []), r]);
    const totals = months.map(
      (m) => (base.get(m)?.total ?? 0) + (caps.get(m) ?? []).reduce((s, r) => s + r.total, 0),
    );
    const { niceMax, labels } = yScale(Math.max(...totals, 0));
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
        tooltip: {
          backgroundColor: "rgba(236,244,240,0.96)",
          titleColor: "#20302a",
          bodyColor: "#20302a",
          titleFont: { family: "Manrope", weight: 700 },
          bodyFont: { family: "Manrope", weight: 600 },
          displayColors: false,
          padding: 10,
          cornerRadius: 10,
          callbacks: { label: (c) => ` ${counts[c.dataIndex]} people` },
        },
      },
    }),
    [counts, reduced],
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

      {/* Payout Activity card */}
      <GlassCard style={{ padding: "20px 23px 16px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Payout Activity</div>
          <ViewAll />
        </div>

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
              return (
                <div
                  key={m}
                  className="relative flex cursor-pointer flex-col items-center justify-end"
                  style={{ height: CH }}
                  onMouseEnter={() => data.setActiveBar(m)}
                >
                  <div className="relative flex flex-col-reverse" style={{ width: 54, gap: 3 }}>
                    {/* base segment */}
                    <div
                      className={active ? "" : "hatch"}
                      style={{
                        width: 54,
                        height: Math.max(((base?.total ?? 0) / chart.niceMax) * CH, 3),
                        borderRadius: 14,
                        transformOrigin: "bottom",
                        transition: "background .25s",
                        background: active ? BAR_COLOR : undefined,
                      }}
                    />
                    {/* run caps (grow in from the bottom) */}
                    {caps.map((r) => (
                      <motion.div
                        key={r.id}
                        className={active ? "" : "hatch"}
                        initial={reduced ? false : { scaleY: 0, opacity: 0.4 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        transition={{ duration: reduced ? 0 : 0.52, ease: EASE }}
                        style={{
                          width: 54,
                          height: Math.max((r.total / chart.niceMax) * CH, 8),
                          borderRadius: 14,
                          transformOrigin: "bottom",
                          transition: "background .25s",
                          background: active ? BAR_COLOR : undefined,
                        }}
                      />
                    ))}
                    {active && (
                      <>
                        {/* glass tooltip */}
                        <div
                          className="tnum absolute z-[3] whitespace-nowrap"
                          style={{
                            bottom: "calc(100% + 22px)",
                            left: "50%",
                            transform: "translateX(-64%)",
                            background: "rgba(57,70,67,0.82)",
                            backdropFilter: "blur(9px)",
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
                          {fmtAmount(total)} cUSDd · {paid} paid
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
      </GlassCard>

      {/* Bottom row */}
      <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr", gap: 20 }}>
        {/* Team donut card */}
        <GlassCard className="flex flex-col" style={{ padding: "16px 23px" }}>
          <div className="flex items-center justify-between">
            <div style={{ fontWeight: 400, fontSize: 17 }}>Team</div>
            <ViewAll />
          </div>
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
            <div style={{ marginTop: 9 }}>
              <span className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>
                {data.people.length} salaries
              </span>
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
    </div>
  );
}
