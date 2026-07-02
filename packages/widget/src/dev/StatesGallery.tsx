/**
 * Dev-only gallery: every widget state rendered side by side with fixture
 * data — no wallet needed. Used to iterate on visuals and to screenshot for
 * the docs/demo.
 */
import { DeliveredPanel } from "../components/DeliveredPanel";
import { RecipientsEditor } from "../components/RecipientsEditor";
import { ReviewPanel } from "../components/ReviewPanel";
import { StatusTimeline } from "../components/StatusTimeline";
import type { DeliveryResult, FlowPhase, VerificationEntry } from "../hooks/useDisperseFlow";
import type { RecipientRow } from "../lib/parse";
import { themeToCssVars, type DisperseTheme } from "../theme";

const ROWS: RecipientRow[] = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: 100_000_000n, amountText: "100" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: 250_500_000n, amountText: "250.5" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: 42_000_000n, amountText: "42" },
];

const DELIVERY: DeliveryResult = {
  txHash: "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd",
  recipients: ROWS.map((r) => r.address),
  requested: ROWS.map((_, i) => `0x${(i + 1).toString().repeat(8).padEnd(64, "e")}` as `0x${string}`),
  transferred: ROWS.map((_, i) => `0x${(i + 7).toString(16).repeat(8).padEnd(64, "f")}` as `0x${string}`),
};

const VERIFIED: VerificationEntry[] = ROWS.map((r, i) => ({
  address: r.address,
  requestedAmount: r.amount,
  transferredAmount: i === 2 ? 0n : r.amount, // third row shows the silent-zero case
  ok: i !== 2,
}));

function Frame({ label, theme, children }: { label: string; theme?: DisperseTheme; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <div
        style={themeToCssVars(theme) as React.CSSProperties}
        className="w-96 rounded-[var(--dk-radius)] border border-[var(--dk-border)] bg-[var(--dk-bg)] p-5 text-[var(--dk-text)] shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
      >
        {children}
      </div>
    </div>
  );
}

const noop = () => {};

export function StatesGallery() {
  const midnight: DisperseTheme = {
    accent: "#818cf8",
    background: "#111827",
    surface: "#1f2937",
    text: "#f9fafb",
    muted: "#9ca3af",
    border: "#374151",
    radius: "12px",
  };

  return (
    <div className="flex flex-wrap items-start gap-8">
      <Frame label="1 · input">
        <RecipientsEditor decimals={6} symbol="cUSDd" onReview={noop} />
      </Frame>
      <Frame label="2 · review">
        <ReviewPanel
          rows={ROWS}
          total={ROWS.reduce((a, r) => a + r.amount, 0n)}
          decimals={6}
          symbol="cUSDd"
          gasFeePerRecipient={1_000_000_000_000_000n}
          maxRecipients={20}
          operatorAlreadySet={false}
          onBack={noop}
          onExecute={noop}
        />
      </Frame>
      {(["encrypting", "authorizing", "dispersing", "confirming"] as FlowPhase[]).map((phase) => (
        <Frame key={phase} label={`3 · in flight — ${phase}`}>
          <StatusTimeline phase={phase} />
        </Frame>
      ))}
      <Frame label="4 · delivered (unverified)">
        <DeliveredPanel
          delivery={DELIVERY}
          verifying={false}
          decimals={6}
          symbol="cUSDd"
          explorerBase="https://sepolia.etherscan.io"
          onVerify={noop}
          onReset={noop}
        />
      </Frame>
      <Frame label="5 · verified (with one silent zero)">
        <DeliveredPanel
          delivery={DELIVERY}
          verification={VERIFIED}
          verifying={false}
          decimals={6}
          symbol="cUSDd"
          explorerBase="https://sepolia.etherscan.io"
          onVerify={noop}
          onReset={noop}
        />
      </Frame>
      <Frame label="6 · partner theme (midnight)" theme={midnight}>
        <ReviewPanel
          rows={ROWS}
          total={ROWS.reduce((a, r) => a + r.amount, 0n)}
          decimals={6}
          symbol="cUSDd"
          gasFeePerRecipient={0n}
          maxRecipients={20}
          operatorAlreadySet
          onBack={noop}
          onExecute={noop}
        />
      </Frame>
    </div>
  );
}
