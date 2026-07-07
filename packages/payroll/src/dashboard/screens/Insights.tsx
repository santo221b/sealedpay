/**
 * INSIGHTS screen (dashboard-screens.md §4 + data-assets §9.2).
 * Payroll health dual-axis line chart, Payroll runway card, Privacy
 * scorecard. Presentation only.
 */
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

import { RevealAmount } from "../../design/RevealAmount";
import { PadlockGlyph } from "../../design/icons";
import { GlassCard } from "../../design/kit2";
import { tokens } from "../../design/tokens";
import type { InsightsScreenProps } from "../contracts";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

/** Seed gas values per seed run (oldest first), from the design's dataset. */
const SEED_GAS = [0.0013, 0.0013, 0.0014, 0.0014, 0.0015, 0.0015];

export function Insights({ data }: InsightsScreenProps) {
  const reduced = useReducedMotion();

  const { labels, paidData, gasData, paidMax, gasMax } = useMemo(() => {
    const ordered = data.runs.slice().reverse(); // oldest first
    let seedIdx = 0;
    const paid = ordered.map((r) => r.paid);
    // A confidential disperse is roughly flat in gas (base + a little per
    // recipient) — keep it in the believable ~0.0013-0.0016 ETH band, not the
    // old 0.001*paid which shot a 5-person run off the chart.
    const gas = ordered.map((r) =>
      r.live ? Number((0.0013 + 0.00004 * r.paid).toFixed(4)) : (SEED_GAS[seedIdx++] ?? 0.0015),
    );
    return {
      labels: ordered.map((r) => r.month),
      paidData: paid,
      gasData: gas,
      paidMax: Math.max(6, Math.ceil(Math.max(0, ...paid) / 2) * 2), // auto-scale, even step
      gasMax: Math.max(0.002, Math.ceil((Math.max(0, ...gas) * 1.2) / 0.0005) * 0.0005),
    };
  }, [data.runs]);

  const chartData = useMemo<ChartData<"line", number[], string>>(
    () => ({
      labels,
      datasets: [
        {
          label: "Employees paid",
          yAxisID: "y",
          data: paidData,
          borderColor: "#5fe3ab",
          backgroundColor: "rgba(59,191,142,0.10)",
          fill: true,
          tension: 0.45,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#5fe3ab",
        },
        {
          label: "Gas (ETH)",
          yAxisID: "y1",
          data: gasData,
          borderColor: "#8b7cf6",
          backgroundColor: "rgba(139,124,246,0.08)",
          fill: true,
          tension: 0.45,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#8b7cf6",
        },
      ],
    }),
    [labels, paidData, gasData],
  );

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reduced ? (false as const) : undefined,
      interaction: { mode: "index", intersect: false },
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
          callbacks: {
            label: (c) =>
              c.dataset.yAxisID === "y" ? ` ${c.parsed.y} paid` : ` ${(c.parsed.y ?? 0).toFixed(4)} ETH`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#8ba297", font: { family: "Manrope", size: 11 } },
        },
        y: {
          min: 0,
          max: paidMax,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { stepSize: Math.max(1, Math.round(paidMax / 5)), color: "#8ba297", font: { family: "Manrope", size: 11 } },
        },
        y1: {
          position: "right",
          min: 0,
          max: gasMax,
          grid: { drawOnChartArea: false },
          ticks: {
            color: "#8ba297",
            font: { family: "Manrope", size: 11 },
            callback: (v) => (Number(v) === 0 ? "0" : Number(v).toFixed(4)),
          },
        },
      },
    }),
    [reduced, paidMax, gasMax],
  );

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Title */}
      <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, margin: 0 }}>
        Insights
      </h1>

      {/* Payroll health line chart */}
      <GlassCard style={{ padding: "20px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Payroll health</div>
          <div className="flex items-center" style={{ gap: 14 }}>
            {[
              { color: "#5fe3ab", label: "Employees paid" },
              { color: "#8b7cf6", label: "Gas (ETH)" },
            ].map((chip) => (
              <span key={chip.label} className="flex items-center" style={{ gap: 6 }}>
                <span className="rounded-full" style={{ width: 8, height: 8, background: chip.color }} />
                <span style={{ fontSize: 11, color: tokens.text.muted }}>{chip.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="relative" style={{ height: 252, marginTop: 14 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </GlassCard>

      {/* Bottom grid */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Payroll runway */}
        <GlassCard style={{ padding: "18px 22px" }}>
          <div style={{ fontWeight: 400, fontSize: 16 }}>Payroll runway</div>
          <div
            className="cursor-pointer"
            style={{ fontWeight: 700, fontSize: 27, marginTop: 7 }}
            onClick={data.runway.toggle}
          >
            <div>
              <RevealAmount
                value={data.runway.value}
                revealed={data.showAll || data.runway.revealed}
                pending={data.runway.pending}
                label="payroll runway"
              />
            </div>
            <div style={{ fontWeight: 700 }}>runs left</div>
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 5 }}>
            <span style={{ fontSize: 11, color: tokens.text.muted }}>
              at {data.monthly.value} / run · {data.runway.hint}
            </span>
            <span
              className="inline-flex items-center"
              style={{
                gap: 4,
                fontSize: 10,
                fontWeight: 400,
                padding: "4.5px 11px",
                borderRadius: tokens.radius.pill,
                border: `1px solid ${tokens.accent.pillBorder}`,
                color: tokens.accent.pillText,
                background: "transparent",
              }}
            >
              <PadlockGlyph size={10} />
              Employer-only
            </span>
          </div>
        </GlassCard>

        {/* Privacy scorecard */}
        <GlassCard style={{ padding: "18px 22px" }}>
          <div style={{ fontWeight: 400, fontSize: 16 }}>Privacy scorecard</div>
          <div className="flex items-baseline" style={{ gap: 6, marginTop: 7 }}>
            <span className="tnum" style={{ fontWeight: 700, fontSize: 27 }}>
              {data.encryptedCount}
            </span>
            <span style={{ fontSize: 13, color: tokens.text.muted }}>amounts encrypted</span>
          </div>
          <div
            className="flex"
            style={{ gap: 14, marginTop: 13, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex-1">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2, color: tokens.text.muted }}>Public</div>
              <div style={{ fontSize: 10.5, color: "#c2d0c9", marginTop: 4, lineHeight: 1.4 }}>
                Transactions · recipients · timing
              </div>
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2, color: tokens.accent.pillText }}>
                Private
              </div>
              <div style={{ fontSize: 10.5, color: "#c2d0c9", marginTop: 4, lineHeight: 1.4 }}>Every amount</div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
