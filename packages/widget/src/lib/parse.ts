/**
 * Recipient list parsing — paste or CSV, forgiving separators, precise errors.
 */
import Papa from "papaparse";
import { getAddress, isAddress, parseUnits } from "viem";

export interface RecipientRow {
  address: `0x${string}`;
  /** Base units (token decimals applied). */
  amount: bigint;
  /** Human-entered amount, kept for display. */
  amountText: string;
}

export interface ParseIssue {
  line: number;
  text: string;
  problem: string;
}

export interface ParseResult {
  rows: RecipientRow[];
  issues: ParseIssue[];
  /** Non-fatal observations (duplicates, zero amounts). */
  warnings: string[];
  total: bigint;
}

const MAX_EUINT64 = 2n ** 64n - 1n;

/**
 * Accepts one `address, amount` pair per line; comma, semicolon, tab or
 * whitespace separated. Ignores empty lines, `#` comments, and a header row.
 */
export function parseRecipients(text: string, decimals: number): ParseResult {
  const rows: RecipientRow[] = [];
  const issues: ParseIssue[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    // Tolerate headers exported from spreadsheets.
    if (i === 0 && /address/i.test(line) && /amount|value/i.test(line)) return;

    const parts = line.split(/[,;\t]+|\s{1,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      issues.push({ line: i + 1, text: line, problem: "expected `address, amount`" });
      return;
    }
    const [addressText, amountText] = parts;

    if (!isAddress(addressText, { strict: false })) {
      issues.push({ line: i + 1, text: line, problem: "not a valid address" });
      return;
    }
    let amount: bigint;
    try {
      amount = parseUnits(amountText as `${number}`, decimals);
    } catch {
      issues.push({ line: i + 1, text: line, problem: "not a valid amount" });
      return;
    }
    if (amount < 0n) {
      issues.push({ line: i + 1, text: line, problem: "amount must be positive" });
      return;
    }
    if (amount > MAX_EUINT64) {
      issues.push({ line: i + 1, text: line, problem: "amount exceeds the euint64 range" });
      return;
    }
    if (amount === 0n) warnings.push(`line ${i + 1}: zero amount — recipient will receive nothing`);

    const address = getAddress(addressText);
    const priorLine = seen.get(address);
    if (priorLine !== undefined) {
      warnings.push(`line ${i + 1}: duplicate of line ${priorLine} — ${short(address)} will be paid twice`);
    } else {
      seen.set(address, i + 1);
    }

    rows.push({ address, amount, amountText });
  });

  const total = rows.reduce((acc, r) => acc + r.amount, 0n);
  if (total > MAX_EUINT64) {
    issues.push({ line: 0, text: "(total)", problem: "the summed total exceeds the euint64 range" });
  }

  return { rows, issues, warnings, total };
}

/** CSV file → the same textual format `parseRecipients` reads. */
export function csvFileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => resolve(result.data.map((cols) => cols.join(", ")).join("\n")),
      error: (err) => reject(err),
    });
  });
}

export function short(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
