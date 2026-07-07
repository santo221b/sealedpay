/**
 * Employee roster — browser-local only (localStorage), no backend.
 *
 * Salaries are stored as the human-entered string ("2500.5") and only
 * converted to base units at payroll time, through the widget's validated
 * parser — so the euint64/rounding/checksum guards apply there, not here.
 */
import { getAddress, isAddress } from "viem";
import { isValidAmountText } from "@dispersekit/widget";
import { useCallback, useEffect, useState } from "react";

export interface Employee {
  id: string;
  name: string;
  /** Optional job title, display only. */
  role?: string;
  /** Team, e.g. Engineering / Design / Operations. */
  dept?: string;
  address: `0x${string}`;
  /** Human units, e.g. "2500.5" (cUSDd). */
  salary: string;
}

export type EmployeeInput = { name: string; role?: string; dept?: string; address: string; salary: string };

const STORAGE_KEY = "dispersekit.payroll.employees.v1";

function load(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Employee[];
    // Structural check only. Content problems (bad address, bad amount) are
    // surfaced in the UI at run time — dropping rows here would silently and
    // PERMANENTLY delete an employee (the persistence effect writes the
    // filtered list straight back).
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.name === "string" &&
        typeof e.address === "string" &&
        typeof e.salary === "string",
    );
  } catch {
    return [];
  }
}

/** Validation shared by add + edit. Returns a problem string or null if OK. */
export function validateEmployee(
  input: EmployeeInput,
  decimals?: number,
): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (!isAddress(input.address)) return "Not a valid address (mixed-case must match its EIP-55 checksum).";
  if (!isValidAmountText(input.salary)) return "Salary must be a plain decimal, e.g. 2500.50";
  const fraction = input.salary.trim().split(".")[1];
  if (decimals !== undefined && fraction && fraction.length > decimals) {
    return `The token supports at most ${decimals} decimal places.`;
  }
  return null;
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }, [employees]);

  const add = useCallback((input: EmployeeInput) => {
    setEmployees((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        role: input.role?.trim() || undefined,
        dept: input.dept?.trim() || undefined,
        address: getAddress(input.address), // normalize to checksummed form
        salary: input.salary.trim(),
      },
    ]);
  }, []);

  const update = useCallback((id: string, input: EmployeeInput) => {
    setEmployees((list) =>
      list.map((e) =>
        e.id === id
          ? {
              ...e,
              name: input.name.trim(),
              role: input.role?.trim() || undefined,
        dept: input.dept?.trim() || undefined,
              address: getAddress(input.address),
              salary: input.salary.trim(),
            }
          : e,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setEmployees((list) => list.filter((e) => e.id !== id));
  }, []);

  return { employees, add, update, remove };
}
