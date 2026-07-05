/**
 * Roster → engine rows. Serializes employees into the same `address, amount`
 * lines the widget accepts and funnels them through the widget's validated
 * parser, so every guard (EIP-55, euint64 range, no rounding, duplicates)
 * applies to payroll exactly as it does to CSV/paste input.
 */
import { parseRecipients, type ParseResult } from "@dispersekit/widget";

import type { Employee } from "./employees";

export function rosterToRows(
  employees: Employee[],
  decimals: number,
): ParseResult & { namedProblems: string[] } {
  const text = employees.map((e) => `${e.address}, ${e.salary}`).join("\n");
  const parsed = parseRecipients(text, decimals);
  const namedProblems = parsed.issues.map(
    (issue) => `${employees[Math.max(0, issue.line - 1)]?.name ?? "row"}: ${issue.problem}`,
  );
  return { ...parsed, namedProblems };
}
