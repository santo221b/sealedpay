/**
 * Step 2 — confirm before anything cryptographic happens. Shows exactly what
 * will be public (recipients, count) and what won't (amounts).
 */
import { formatAmount, formatEth } from "../lib/format";
import { short, type RecipientRow } from "../lib/parse";
import { Button, Card, LockIcon } from "./ui";

export function ReviewPanel({
  rows,
  total,
  decimals,
  symbol,
  gasFeePerRecipient,
  maxRecipients,
  operatorAlreadySet,
  onBack,
  onExecute,
}: {
  rows: RecipientRow[];
  total: bigint;
  decimals: number;
  symbol: string;
  gasFeePerRecipient?: bigint;
  maxRecipients?: number;
  operatorAlreadySet?: boolean;
  onBack: () => void;
  onExecute: () => void;
}) {
  const overCap = maxRecipients !== undefined && rows.length > maxRecipients;
  const feeTotal = gasFeePerRecipient !== undefined ? gasFeePerRecipient * BigInt(rows.length) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Card className="max-h-52 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--dk-surface)] text-left text-[var(--dk-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">recipient</th>
              <th className="px-3 py-2 text-right font-medium">
                amount <LockIcon className="ml-0.5 inline h-3 w-3 opacity-60" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--dk-border)]">
                <td className="px-3 py-1.5 font-mono text-[var(--dk-text)]" title={row.address}>
                  {short(row.address)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-[var(--dk-text)]">
                  {formatAmount(row.amount, decimals)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col gap-1 px-1 text-xs text-[var(--dk-muted)]">
        <div className="flex justify-between">
          <span>Total (encrypted on-chain)</span>
          <span className="font-mono font-semibold text-[var(--dk-text)]">
            {formatAmount(total, decimals)} {symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Recipients (visible on-chain)</span>
          <span className="font-mono text-[var(--dk-text)]">{rows.length}</span>
        </div>
        {feeTotal !== undefined && feeTotal > 0n && (
          <div className="flex justify-between">
            <span>Network anti-spam fee</span>
            <span className="font-mono text-[var(--dk-text)]">{formatEth(feeTotal)} ETH</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Wallet steps</span>
          <span className="text-[var(--dk-text)]">
            {operatorAlreadySet ? "1 signature (authorized earlier)" : "2 signatures (authorize, then send)"}
          </span>
        </div>
      </div>

      {overCap && (
        <Card className="px-3 py-2 text-xs text-[var(--dk-text)]">
          This batch has {rows.length} recipients but the disperse contract currently accepts {maxRecipients} per
          transaction. Split the list and send it in waves.
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" disabled={overCap} onClick={onExecute}>
          <LockIcon />
          Encrypt &amp; disperse
        </Button>
      </div>
    </div>
  );
}
