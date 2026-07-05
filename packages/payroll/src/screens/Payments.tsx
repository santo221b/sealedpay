/**
 * Screen D — payout history. Amounts stay masked; every run is provable:
 * expanding a run lets the employer decrypt what each employee actually
 * received, from the ciphertext handles stored at confirmation time.
 */
import { formatAmount } from "@dispersekit/widget";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { AmountCell, AvatarInitials, CardIcon, EmptyState, ExternalIcon, LockIcon, PButton, SectionCard, Spinner, StatusChip } from "../components/kit";
import type { PayoutRun } from "../lib/history";
import type { VerifiedEntry } from "../lib/verifyRun";
import { EXPLORER } from "../theme";

export function Payments({
  runs,
  symbol,
  decimals,
  canVerify,
  busyRunId,
  verifyError,
  verified,
  onVerifyRun,
  onRunPayroll,
  canRun,
}: {
  runs: PayoutRun[];
  symbol: string;
  decimals?: number;
  canVerify: boolean;
  busyRunId?: string;
  verifyError?: string;
  verified: Record<string, VerifiedEntry[]>;
  onVerifyRun: (run: PayoutRun) => void;
  onRunPayroll: () => void;
  canRun: boolean;
}) {
  const [openId, setOpenId] = useState<string>();

  if (runs.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={<CardIcon className="h-6 w-6" />}
          title="No payouts yet"
          line="Your first run will appear here — private amounts, provable delivery."
          cta={
            <PButton onClick={onRunPayroll} disabled={!canRun}>
              Run payroll now
            </PButton>
          }
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Payout history">
      <ul className="divide-y divide-stone-100">
        {runs.map((run) => {
          const open = openId === run.id;
          const entries = verified[run.id];
          return (
            <li key={run.id}>
              <button
                className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:bg-stone-50"
                onClick={() => setOpenId(open ? undefined : run.id)}
                aria-expanded={open}
              >
                <span className="w-36 shrink-0">
                  <span className="block font-medium text-stone-800">{new Date(run.date).toLocaleDateString()}</span>
                  <span className="block text-[11px] text-stone-400">
                    {new Date(run.date).toLocaleDateString(undefined, { month: "long", year: "numeric" })} payroll
                  </span>
                </span>
                <span className="text-stone-500">{run.employeeCount} paid</span>
                <AmountCell value={run.totalText} suffix={symbol} />
                <span className="flex items-center gap-2">
                  {run.verified === true && <StatusChip tone="green">✓ verified</StatusChip>}
                  {run.verified === false && <StatusChip tone="red">⚠ check delivery</StatusChip>}
                  {run.verified === undefined && <StatusChip tone="neutral">unverified</StatusChip>}
                  <a
                    className="inline-flex items-center gap-1 font-mono text-xs text-orange-600 hover:underline"
                    href={`${EXPLORER}/tx/${run.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {run.txHash.slice(0, 10)}… <ExternalIcon />
                  </a>
                  <span className="text-stone-300">{open ? "▾" : "▸"}</span>
                </span>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-3 rounded-xl bg-stone-50 p-3">
                      {!run.entries?.length ? (
                        <p className="text-xs text-stone-400">
                          This run predates per-employee records — see the transaction on Etherscan.
                        </p>
                      ) : (
                        <>
                          <ul className="divide-y divide-stone-200/60">
                            {run.entries.map((entry, i) => {
                              const v = entries?.[i];
                              return (
                                <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                                  <span className="flex items-center gap-2">
                                    <AvatarInitials name={entry.name} />
                                    <span className="font-medium text-stone-700">{entry.name}</span>
                                  </span>
                                  {v && decimals !== undefined ? (
                                    <span className={`font-mono text-sm font-semibold ${v.ok ? "text-stone-800" : "text-red-600"}`}>
                                      {formatAmount(v.transferredAmount, decimals)} {symbol}{" "}
                                      {v.ok ? "✓" : `— expected ${formatAmount(v.requestedAmount, decimals)}`}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-400">
                                      •••• <LockIcon className="h-3 w-3 text-orange-500" />
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                          {!entries && (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-[11px] text-stone-400">
                                Decrypt from the on-chain ciphertexts — one signature, visible only to you.
                              </p>
                              <PButton
                                variant="outline"
                                disabled={!canVerify || busyRunId === run.id}
                                onClick={() => onVerifyRun(run)}
                              >
                                {busyRunId === run.id ? <Spinner /> : <LockIcon />}
                                {busyRunId === run.id ? "Decrypting…" : "Verify this run"}
                              </PButton>
                            </div>
                          )}
                          {verifyError && busyRunId === undefined && openId === run.id && (
                            <p className="mt-2 text-xs text-red-600">{verifyError}</p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
