/**
 * ─── THE SEAM ────────────────────────────────────────────────────────────────
 * This component is where the payroll dashboard hands off to the shared
 * DisperseKit engine — and the ONLY place the two touch.
 *
 * "Run payroll" = serialize the roster into the same `address, amount` lines
 * the widget accepts → `parseRecipients` (the widget's validated path: EIP-55,
 * euint64 range, rounding, duplicates) → `useDisperseFlow` (the widget's
 * unchanged state machine: encrypt → authorize → disperse → confirm →
 * verify-decrypt). Nothing about the on-chain or cryptographic flow is
 * payroll-specific; this file only translates roster → rows and phases → UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  Button,
  DeliveredPanel,
  formatAmount,
  formatEth,
  parseRecipients,
  StatusTimeline,
  useDisperseFlow,
  useTokenMeta,
  SEPOLIA_CHAIN_ID,
  type DeliveryResult,
} from "@dispersekit/widget";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import type { Employee } from "../lib/employees";

const EXPLORER = "https://sepolia.etherscan.io";

export function RunPayroll({
  employees,
  token,
  onRunConfirmed,
  onVerificationResult,
}: {
  employees: Employee[];
  token: `0x${string}` | undefined;
  /** Fires only after delivery is confirmed from the on-chain event. */
  onRunConfirmed: (run: { txHash: `0x${string}`; employeeCount: number; totalText: string }) => void;
  onVerificationResult: (txHash: `0x${string}`, allOk: boolean) => void;
}) {
  const { isConnected, chain } = useAccount();
  const { symbol, decimals } = useTokenMeta(token);
  const [problems, setProblems] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  // Captured at run time so the history row records exactly what was reviewed.
  const pendingTotalText = useRef<string>("");

  const flow = useDisperseFlow({
    token,
    chainId: SEPOLIA_CHAIN_ID,
    onDispersed: (result: DeliveryResult) =>
      onRunConfirmed({
        txHash: result.txHash,
        employeeCount: result.recipients.length,
        totalText: pendingTotalText.current,
      }),
  });

  // Relay the decrypt-verify outcome into history ("✓ verified" badge).
  const reportedFor = useRef<string>(undefined);
  useEffect(() => {
    if (flow.verification && flow.delivery && reportedFor.current !== flow.delivery.txHash) {
      reportedFor.current = flow.delivery.txHash;
      onVerificationResult(flow.delivery.txHash, flow.verification.every((v) => v.ok));
    }
  }, [flow.verification, flow.delivery, onVerificationResult]);

  const nameByAddress = useMemo(() => {
    const map = new Map(employees.map((e) => [e.address.toLowerCase(), e.name]));
    return (address: `0x${string}`) => map.get(address.toLowerCase());
  }, [employees]);

  function startRun() {
    if (decimals === undefined) return;
    // Funnel through the widget's validated parser — one source of truth for
    // every guard, whether input arrives via CSV, paste, or this roster.
    const text = employees.map((e) => `${e.address}, ${e.salary}`).join("\n");
    const parsed = parseRecipients(text, decimals);
    setProblems(parsed.issues.map((i) => `${employees[Math.max(0, i.line - 1)]?.name ?? "row"}: ${i.problem}`));
    setWarnings(parsed.warnings);
    if (parsed.issues.length > 0 || parsed.rows.length === 0) return;
    pendingTotalText.current = formatAmount(parsed.total, decimals);
    void flow.goToReview(parsed.rows);
  }

  const ready = isConnected && chain?.id === SEPOLIA_CHAIN_ID;
  const inFlight = ["encrypting", "authorizing", "dispersing", "confirming"].includes(flow.phase);
  const overCap = flow.maxRecipients !== undefined && flow.rows.length > flow.maxRecipients;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-neutral-800">Run payout</h2>

      {flow.phase === "input" && (
        <div className="flex flex-col gap-2">
          <Button
            disabled={!ready || employees.length === 0 || decimals === undefined || !token}
            onClick={startRun}
          >
            Run payroll now — pay {employees.length} employee{employees.length === 1 ? "" : "s"}
          </Button>
          {!token && <p className="text-xs text-neutral-500">Set VITE_CTOKEN_ADDRESS to enable payouts.</p>}
          {!ready && <p className="text-xs text-neutral-500">Connect a wallet (Sepolia) above to run payroll.</p>}
          {employees.length === 0 && <p className="text-xs text-neutral-500">Add employees first.</p>}
          {problems.map((p, i) => (
            <p key={i} className="text-xs text-red-600">
              {p}
            </p>
          ))}
        </div>
      )}

      {flow.phase === "review" && (
        <div className="flex flex-col gap-3">
          <table className="w-full text-sm">
            <tbody>
              {flow.rows.map((row, i) => (
                <tr key={i} className="border-t border-neutral-100 first:border-t-0">
                  <td className="py-1.5 font-medium text-neutral-800">{nameByAddress(row.address) ?? "—"}</td>
                  <td className="py-1.5 font-mono text-xs text-neutral-400" title={row.address}>
                    {row.address.slice(0, 8)}…
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {formatAmount(row.amount, decimals!)} {symbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 text-xs text-neutral-500">
            <p>
              Total (encrypted on-chain): <b className="font-mono">{pendingTotalText.current} {symbol}</b> ·
              recipients visible on-chain: {flow.rows.length}
            </p>
            {flow.gasFeePerRecipient !== undefined && flow.gasFeePerRecipient > 0n && (
              <p>Network anti-spam fee: {formatEth(flow.gasFeePerRecipient * BigInt(flow.rows.length))} ETH</p>
            )}
            <p>{flow.operatorAlreadySet ? "1 wallet signature" : "2 wallet signatures (authorize, then pay)"}</p>
            {warnings.map((w, i) => (
              <p key={i} className="text-amber-600">
                ⚠ {w}
              </p>
            ))}
            {overCap && (
              <p className="text-red-600">
                The disperse contract accepts {flow.maxRecipients} recipients per transaction — split the team.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={flow.backToInput}>
              Back
            </Button>
            <Button className="flex-1" disabled={overCap} onClick={() => void flow.execute()}>
              Confirm — pay salaries confidentially
            </Button>
          </div>
        </div>
      )}

      {inFlight && <StatusTimeline phase={flow.phase} />}

      {flow.phase === "delivered" && flow.delivery && decimals !== undefined && (
        <DeliveredPanel
          delivery={flow.delivery}
          verification={flow.verification}
          verifying={flow.verifying}
          decimals={decimals}
          symbol={symbol ?? "tokens"}
          explorerBase={EXPLORER}
          onVerify={() => void flow.verifyDelivery()}
          onReset={flow.reset}
          nameFor={nameByAddress}
          labels={{
            title: "Payroll delivered confidentially",
            verify: "Verify salaries were delivered",
            reset: "Back to dashboard",
          }}
        />
      )}

      {flow.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
          {flow.error}
        </p>
      )}
      {flow.phase === "confirming" && flow.error && flow.pendingTxHash && (
        <div className="mt-2 flex items-center gap-2">
          <Button className="flex-1" onClick={() => void flow.retryConfirmation()}>
            Retry confirmation
          </Button>
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
    </section>
  );
}
