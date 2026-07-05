/**
 * Screen C — the hero flow.
 *
 * ─── THE SEAM ────────────────────────────────────────────────────────────────
 * "Run payroll" IS the shared DisperseKit engine, unchanged: the shell parses
 * the roster through the widget's validated `parseRecipients` and this screen
 * renders the phases of the SAME `useDisperseFlow` instance the widget uses —
 * encrypt → authorize → disperse (one tx) → confirm-from-event →
 * verify-decrypt. This file contains presentation only.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  DeliveredPanel,
  formatAmount,
  formatEth,
  StatusTimeline,
  themeToCssVars,
  type DisperseFlow,
} from "@dispersekit/widget";
import { motion } from "framer-motion";
import { useMemo } from "react";

import { AmountCell, AvatarInitials, LockIcon, PButton, SectionCard } from "../components/kit";
import type { Employee } from "../lib/employees";
import { EXPLORER, payrollTheme } from "../theme";

const WALLET_HINTS: Record<string, string> = {
  authorizing: "Approve the prompt in your wallet — a 1-hour permission for the payout contract.",
  dispersing: "Approve the payment in your wallet — one transaction pays everyone.",
};

export function Run({
  flow,
  employees,
  decimals,
  symbol,
  warnings,
  onDone,
}: {
  flow: DisperseFlow;
  employees: Employee[];
  decimals?: number;
  symbol: string;
  warnings: string[];
  onDone: () => void;
}) {
  const nameByAddress = useMemo(() => {
    const map = new Map(employees.map((e) => [e.address.toLowerCase(), e.name]));
    return (address: `0x${string}`) => map.get(address.toLowerCase());
  }, [employees]);

  const inFlight = ["encrypting", "authorizing", "dispersing", "confirming"].includes(flow.phase);
  const overCap = flow.maxRecipients !== undefined && flow.rows.length > flow.maxRecipients;
  const walletHint = WALLET_HINTS[flow.phase];

  return (
    // The embedded engine components are themed via DisperseKit CSS variables.
    <div style={themeToCssVars(payrollTheme) as React.CSSProperties} className="mx-auto max-w-lg">
      {flow.phase === "review" && decimals !== undefined && (
        <SectionCard title={`Review payroll · ${flow.rows.length} ${flow.rows.length === 1 ? "person" : "people"}`}>
          <ul className="mb-4 max-h-64 divide-y divide-stone-100 overflow-y-auto">
            {flow.rows.map((row, i) => {
              const name = nameByAddress(row.address) ?? "—";
              return (
                <li key={i} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2.5">
                    <AvatarInitials name={name} />
                    <span className="text-sm font-medium text-stone-800">{name}</span>
                  </span>
                  <AmountCell value={formatAmount(row.amount, decimals)} suffix={symbol} />
                </li>
              );
            })}
          </ul>

          <div className="mb-4 space-y-1.5 rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
            <p className="flex items-center justify-between">
              <span>Total this run</span>
              <AmountCell value={formatAmount(flow.total, decimals)} suffix={symbol} />
            </p>
            {flow.gasFeePerRecipient !== undefined && flow.gasFeePerRecipient > 0n && (
              <p className="flex items-center justify-between">
                <span>Network anti-spam fee</span>
                <span className="font-mono">{formatEth(flow.gasFeePerRecipient * BigInt(flow.rows.length))} ETH</span>
              </p>
            )}
            <p className="flex items-center justify-between">
              <span>Wallet steps</span>
              <span>{flow.operatorAlreadySet ? "1 signature" : "2 signatures (authorize, then pay)"}</span>
            </p>
            <p className="flex items-center gap-1.5 border-t border-stone-200/60 pt-2 text-orange-700">
              <LockIcon className="h-3 w-3" /> Amounts stay encrypted — the chain sees who got paid, never how much.
            </p>
          </div>

          {warnings.map((w, i) => (
            <p key={i} className="mb-2 text-xs text-amber-600">
              ⚠ {w}
            </p>
          ))}
          {overCap && (
            <p className="mb-2 text-xs text-red-600">
              The payout contract accepts {flow.maxRecipients} people per transaction — split the team into waves.
            </p>
          )}

          <div className="flex gap-2">
            <PButton variant="ghost" onClick={onDone}>
              Cancel
            </PButton>
            <PButton className="flex-1" disabled={overCap} onClick={() => void flow.execute()}>
              <LockIcon /> Confirm &amp; run payroll
            </PButton>
          </div>
        </SectionCard>
      )}

      {inFlight && (
        <SectionCard title="Running payroll…">
          <StatusTimeline phase={flow.phase} />
          {walletHint && !flow.error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 rounded-xl bg-orange-50 p-2.5 text-xs text-orange-700"
            >
              {walletHint}
            </motion.p>
          )}
        </SectionCard>
      )}

      {flow.phase === "delivered" && flow.delivery && decimals !== undefined && (
        <SectionCard>
          <DeliveredPanel
            delivery={flow.delivery}
            verification={flow.verification}
            verifying={flow.verifying}
            decimals={decimals}
            symbol={symbol}
            explorerBase={EXPLORER}
            onVerify={() => void flow.verifyDelivery()}
            onReset={onDone}
            nameFor={nameByAddress}
            labels={{
              title: "Salaries delivered confidentially",
              verify: "Verify salaries were delivered",
              reset: "Done",
            }}
          />
        </SectionCard>
      )}

      {flow.error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">
          {flow.error}
        </p>
      )}
      {flow.phase === "confirming" && flow.error && flow.pendingTxHash && (
        <div className="mt-2 flex items-center gap-3">
          <PButton className="flex-1" onClick={() => void flow.retryConfirmation()}>
            Retry confirmation
          </PButton>
          <a
            className="text-xs font-medium text-orange-600 hover:underline"
            href={`${EXPLORER}/tx/${flow.pendingTxHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
