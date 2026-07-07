/**
 * INSIGHTS screen. Payroll spend line chart (total cUSDd disbursed per month),
 * Payroll runway card, Privacy scorecard. Presentation only.
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

export function Insights({ data }: InsightsScreenProps) {
  const reduced = useReducedMotion();

  const { labels, spendData, spendMax } = useMemo(() => {
    const ordered = data.runs.slice().reverse(); // oldest first
    const spend = ordered.map((r) => r.total); // cUSDd disbursed per month
    // Smallest "nice" ceiling a little above the tallest month (auto-scale).
    const target = Math.max(0, ...spend, 1) * 1.1;
    const mag = Math.pow(10, Math.floor(Math.log10(target)));
    const norm = target / mag;
    const niceMax =
      (norm <= 1 ? 1 : norm <= 1.5 ? 1.5 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 3 ? 3 : norm <= 4 ? 4 : norm <= 5 ? 5 : norm <= 6 ? 6 : norm <= 8 ? 8 : 10) * mag;
    return { labels: ordered.map((r) => r.month), spendData: spend, spendMax: niceMax };
  }, [data.runs]);

  const chartData = useMemo<ChartData<"line", number[], string>>(
    () => ({
      labels,
      datasets: [
        {
          label: "Payroll paid",
          data: spendData,
          borderColor: "#5fe3ab",
          backgroundColor: "rgba(95,227,171,0.12)",
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: "#5fe3ab",
        },
      ],
    }),
    [labels, spendData],
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
            label: (c) => ` ${(c.parsed.y ?? 0).toLocaleString("en-US")} cUSDd`,
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
          max: spendMax,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: {
            stepSize: spendMax / 5,
            color: "#8ba297",
            font: { family: "Manrope", size: 11 },
            callback: (v) => {
              const n = Number(v);
              return n === 0 ? "0" : n >= 1000 ? `${n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)}k` : `${n}`;
            },
          },
        },
      },
    }),
    [reduced, spendMax],
  );

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* Title */}
      <h1 style={{ fontWeight: 500, fontSize: 38, color: tokens.text.heading, letterSpacing: 0.45, margin: 0 }}>
        Insights
      </h1>

      {/* Payroll spend line chart — total cUSDd disbursed per month */}
      <GlassCard style={{ padding: "20px 23px" }}>
        <div className="flex items-center justify-between">
          <div style={{ fontWeight: 400, fontSize: 17 }}>Payroll spend</div>
          <span className="flex items-center" style={{ gap: 6, fontSize: 11, color: tokens.accent.pillText }}>
            <span className="rounded-full" style={{ width: 8, height: 8, background: "#5fe3ab" }} />
            Every run verified · Encrypted
          </span>
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
