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
// Plain decimal only: rejects '-', '.', '1.2.3', '1e5', '1,250' fragments —
// anything parseUnits would otherwise coerce or round in surprising ways.
const AMOUNT_RE = /^\d+(\.\d+)?$/;

/** Entry-time amount check for custom skins (same rule the parser applies). */
export function isValidAmountText(text: string): boolean {
  return AMOUNT_RE.test(text.trim());
}

/**
 * Accepts one `address, amount` pair per line; comma, semicolon, tab or
 * whitespace separated. Ignores empty lines, `#` comments, and a header row.
 */
export function parseRecipients(text: string, decimals: number): ParseResult {
  const rows: RecipientRow[] = [];
  const issues: ParseIssue[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  let sawContent = false;

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    // Tolerate a header row exported from spreadsheets — wherever it appears
    // as the first line with content.
    if (!sawContent && /address/i.test(line) && /amount|value/i.test(line)) {
      sawContent = true;
      return;
    }
    sawContent = true;

    const parts = line.split(/[,;\t]+|\s{1,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      issues.push({ line: i + 1, text: line, problem: "expected `address, amount`" });
      return;
    }
    // "0xabc, 1,250" would silently read as amount "1" — refuse rather than misparse.
    if (parts.length > 2) {
      issues.push({ line: i + 1, text: line, problem: "too many columns — write amounts without thousands separators" });
      return;
    }
    const [addressText, amountText] = parts;

    // Strict EIP-55: a mixed-case address with a wrong checksum is most likely
    // a typo, and a typo here sends someone's money to a stranger.
    if (!isAddress(addressText)) {
      issues.push({ line: i + 1, text: line, problem: "not a valid address (mixed-case must match its EIP-55 checksum)" });
      return;
    }
    if (!AMOUNT_RE.test(amountText)) {
      issues.push({ line: i + 1, text: line, problem: "not a valid amount — plain decimals only, e.g. 1250.5" });
      return;
    }
    const fraction = amountText.split(".")[1];
    if (fraction && fraction.length > decimals) {
      // parseUnits would silently round; never round money.
      issues.push({ line: i + 1, text: line, problem: `more decimal places than the token supports (${decimals})` });
      return;
    }
    const amount = parseUnits(amountText, decimals);
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
