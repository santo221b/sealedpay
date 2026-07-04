/**
 * Team roster: add / edit / remove employees, with the running monthly total.
 * Pure local UI — nothing here touches the chain.
 */
import { formatAmount, short } from "@dispersekit/widget";
import { useState } from "react";
import { parseUnits } from "viem";

import { validateEmployee, type Employee } from "../lib/employees";

const EMPTY = { name: "", address: "", salary: "" };

function EmployeeForm({
  initial,
  decimals,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; address: string; salary: string };
  decimals?: number;
  submitLabel: string;
  onSubmit: (values: { name: string; address: string; salary: string }) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);

  const input = "rounded-lg border border-neutral-300 px-2 py-1.5 text-sm";
  return (
    <form
      className="flex flex-wrap items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const issue = validateEmployee(values, decimals);
        setProblem(issue);
        if (!issue) {
          onSubmit(values);
          if (!onCancel) setValues(EMPTY); // add-mode: clear for the next entry
        }
      }}
    >
      <input
        className={`${input} w-32`}
        placeholder="Name"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
      />
      <input
        className={`${input} w-80 font-mono`}
        placeholder="0x… wallet address"
        value={values.address}
        onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
        spellCheck={false}
      />
      <input
        className={`${input} w-28 text-right font-mono`}
        placeholder="Salary"
        value={values.salary}
        onChange={(e) => setValues((v) => ({ ...v, salary: e.target.value }))}
        inputMode="decimal"
      />
      <button type="submit" className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white">
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" className="px-2 py-1.5 text-sm text-neutral-500" onClick={onCancel}>
          Cancel
        </button>
      )}
      {problem && <p className="w-full text-xs text-red-600">{problem}</p>}
    </form>
  );
}

export function EmployeeManager({
  employees,
  decimals,
  symbol,
  onAdd,
  onUpdate,
  onRemove,
}: {
  employees: Employee[];
  decimals?: number;
  symbol: string;
  onAdd: (values: { name: string; address: string; salary: string }) => void;
  onUpdate: (id: string, values: { name: string; address: string; salary: string }) => void;
  onRemove: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Exact total (never rounded): every stored salary already fits `decimals`.
  const total =
    decimals !== undefined
      ? employees.reduce((sum, e) => sum + parseUnits(e.salary as `${number}`, decimals), 0n)
      : undefined;
  const duplicates = employees.length !== new Set(employees.map((e) => e.address)).size;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-neutral-800">Team</h2>

      {employees.length === 0 ? (
        <p className="mb-3 text-sm text-neutral-500">No employees yet — add your first below.</p>
      ) : (
        <table className="mb-3 w-full text-sm">
          <thead className="text-left text-xs text-neutral-400">
            <tr>
              <th className="py-1 font-medium">name</th>
              <th className="py-1 font-medium">wallet</th>
              <th className="py-1 text-right font-medium">salary ({symbol})</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) =>
              editingId === e.id ? (
                <tr key={e.id}>
                  <td colSpan={4} className="py-2">
                    <EmployeeForm
                      initial={e}
                      decimals={decimals}
                      submitLabel="Save"
                      onSubmit={(values) => {
                        onUpdate(e.id, values);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={e.id} className="border-t border-neutral-100">
                  <td className="py-2 font-medium text-neutral-800">{e.name}</td>
                  <td className="py-2 font-mono text-neutral-500" title={e.address}>
                    {short(e.address)}
                  </td>
                  <td className="py-2 text-right font-mono">{e.salary}</td>
                  <td className="py-2 text-right text-xs">
                    <button className="mr-2 text-neutral-500 hover:text-neutral-800" onClick={() => setEditingId(e.id)}>
                      edit
                    </button>
                    <button className="text-red-400 hover:text-red-600" onClick={() => onRemove(e.id)}>
                      remove
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 font-semibold">
              <td className="py-2">Total monthly payroll</td>
              <td />
              <td className="py-2 text-right font-mono">
                {total !== undefined ? `${formatAmount(total, decimals!)} ${symbol}` : "…"}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}

      {duplicates && (
        <p className="mb-2 text-xs text-amber-600">
          ⚠ Two employees share a wallet address — both salaries will be sent to it.
        </p>
      )}

      <EmployeeForm initial={EMPTY} decimals={decimals} submitLabel="Add employee" onSubmit={onAdd} />
    </section>
  );
}
