/**
 * Step 1 — who gets paid. Paste rows or drop a CSV; problems are pointed out
 * per line, never as a blocking wall of red.
 */
import { useRef, useState } from "react";

import { csvFileToText, parseRecipients, type ParseResult } from "../lib/parse";
import { formatAmount } from "../lib/format";
import { Button, Card } from "./ui";

const PLACEHOLDER = `0x1234…abcd, 250
0x5678…ef01, 100.5
# one recipient per line — or drop a CSV on me`;

export function RecipientsEditor({
  decimals,
  symbol,
  initialText,
  onReview,
}: {
  decimals: number;
  symbol: string;
  initialText?: string;
  onReview: (parsed: ParseResult) => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const parsed = parseRecipients(text, decimals);
  const hasInput = text.trim().length > 0;

  async function acceptFile(file: File) {
    setText(await csvFileToText(file));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`relative rounded-[calc(var(--dk-radius)*0.7)] border-2 border-dashed transition-colors ${
          dragOver ? "border-[var(--dk-accent)] bg-[var(--dk-surface)]" : "border-[var(--dk-border)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void acceptFile(file);
        }}
      >
        <textarea
          aria-label="Recipients: one address and amount per line"
          className="block h-40 w-full resize-y bg-transparent p-3 font-mono text-xs text-[var(--dk-text)] placeholder:text-[var(--dk-muted)]/60 focus:outline-none"
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="flex items-center justify-between border-t border-[var(--dk-border)] px-3 py-1.5 text-xs text-[var(--dk-muted)]">
          <span>
            {parsed.rows.length > 0
              ? `${parsed.rows.length} recipient${parsed.rows.length === 1 ? "" : "s"} · total ${formatAmount(parsed.total, decimals)} ${symbol}`
              : "address, amount — one per line"}
          </span>
          <button
            type="button"
            className="font-medium text-[var(--dk-accent)] hover:underline"
            onClick={() => fileInput.current?.click()}
          >
            upload CSV
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void acceptFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {hasInput && parsed.issues.length > 0 && (
        <Card className="px-3 py-2 text-xs">
          <p className="mb-1 font-semibold text-[var(--dk-text)]">Needs a look:</p>
          <ul className="space-y-0.5 text-[var(--dk-muted)]">
            {parsed.issues.slice(0, 4).map((issue, i) => (
              <li key={i}>
                line {issue.line}: {issue.problem}
              </li>
            ))}
            {parsed.issues.length > 4 && <li>…and {parsed.issues.length - 4} more</li>}
          </ul>
        </Card>
      )}
      {hasInput && parsed.issues.length === 0 && parsed.warnings.length > 0 && (
        <Card className="px-3 py-2 text-xs text-[var(--dk-muted)]">
          {parsed.warnings.slice(0, 3).map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </Card>
      )}

      <Button
        disabled={!hasInput || parsed.rows.length === 0 || parsed.issues.length > 0}
        onClick={() => onReview(parsed)}
      >
        Review payout
      </Button>
    </div>
  );
}
