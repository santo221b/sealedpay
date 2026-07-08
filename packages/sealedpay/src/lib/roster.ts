/**
 * Roster → engine rows. Serializes employees into the same `address, amount`
 * lines the widget accepts and funnels them through the widget's validated
 * parser, so every guard (EIP-55, euint64 range, no rounding, duplicates)
 * applies to payroll exactly as it does to CSV/paste input.
 *
 * Because we emit exactly one line per employee (no headers/comments),
 * parser line N ↔ employees[N-1] — used to translate the parser's
 * line-numbered messages into employee names. Line 0 = roster-level.
 */
import { parseRecipients, type ParseResult } from "@dispersekit/widget";

import type { Employee } from "./employees";

export function rosterToRows(
  employees: Employee[],
  decimals: number,
): ParseResult & { namedProblems: string[]; namedWarnings: string[] } {
  const text = employees.map((e) => `${e.address}, ${e.salary}`).join("\n");
  const parsed = parseRecipients(text, decimals);

  const nameAt = (line: number) => employees[line - 1]?.name ?? `row ${line}`;
  const namedProblems = parsed.issues.map((issue) =>
    issue.line >= 1 ? `${nameAt(issue.line)}: ${issue.problem}` : `Roster total: ${issue.problem}`,
  );
  // Warnings arrive as "line N: …" prose — swap the line refs for names.
  const namedWarnings = parsed.warnings.map((w) => w.replace(/line (\d+)/g, (m, n) => employees[Number(n) - 1]?.name ?? m));

  return { ...parsed, namedProblems, namedWarnings };
}
