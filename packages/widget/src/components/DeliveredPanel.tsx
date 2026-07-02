/**
 * Step 3 — delivered. Shows the tx, the opaque ciphertexts (the proof that
 * amounts are hidden), and offers the one-signature delivery verification
 * that catches ERC-7984's silent-zero footgun.
 */
import { motion } from "framer-motion";

import type { DeliveryResult, VerificationEntry } from "../hooks/useDisperseFlow";
import { formatAmount } from "../lib/format";
import { short } from "../lib/parse";
import { Button, Card, CipherChip, Spinner } from "./ui";

export function DeliveredPanel({
  delivery,
  verification,
  verifying,
  decimals,
  symbol,
  explorerBase,
  onVerify,
  onReset,
}: {
  delivery: DeliveryResult;
  verification?: VerificationEntry[];
  verifying: boolean;
  decimals: number;
  symbol: string;
  explorerBase: string;
  onVerify: () => void;
  onReset: () => void;
}) {
  const allOk = verification?.every((v) => v.ok);

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex flex-col items-center gap-1 py-2 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dk-accent)] text-2xl text-[var(--dk-accent-text)]">
          ✓
        </div>
        <p className="text-base font-bold text-[var(--dk-text)]">Dispersed confidentially</p>
        <p className="text-xs text-[var(--dk-muted)]">
          {delivery.recipients.length} recipients paid in{" "}
          <a
            className="font-medium text-[var(--dk-accent)] hover:underline"
            href={`${explorerBase}/tx/${delivery.txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            one transaction ↗
          </a>
        </p>
      </motion.div>

      <Card className="max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <tbody>
            {delivery.recipients.map((address, i) => {
              const entry = verification?.[i];
              return (
                <tr key={i} className="border-t border-[var(--dk-border)] first:border-t-0">
                  <td className="px-3 py-1.5 font-mono text-[var(--dk-text)]">{short(address)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {entry ? (
                      <span className={`font-mono font-semibold ${entry.ok ? "text-[var(--dk-text)]" : "text-red-500"}`}>
                        {formatAmount(entry.transferredAmount, decimals)} {symbol} {entry.ok ? "✓" : "— expected " + formatAmount(entry.requestedAmount, decimals)}
                      </span>
                    ) : (
                      <CipherChip handle={delivery.transferred[i]} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-[var(--dk-muted)]">
        {verification
          ? allOk
            ? "Every amount verified: what you requested is exactly what moved. Only you and each recipient can ever decrypt these numbers."
            : "Some transfers moved zero — usually an underfunded balance. Top up and re-send those rows."
          : "On-chain, each amount is just the ciphertext you see above. Verify delivery to decrypt them privately (one signature; visible only to you)."}
      </p>

      <div className="flex gap-2">
        {!verification && (
          <Button className="flex-1" disabled={verifying} onClick={onVerify}>
            {verifying ? <Spinner /> : null}
            {verifying ? "Decrypting…" : "Verify delivery"}
          </Button>
        )}
        <Button variant={verification ? "primary" : "ghost"} className={verification ? "flex-1" : ""} onClick={onReset}>
          New payout
        </Button>
      </div>
    </div>
  );
}
