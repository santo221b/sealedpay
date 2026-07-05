/** Screen B — the team roster: search, add/edit via drawer, remove. */
import { useEffect, useMemo, useState } from "react";

import { AmountCell, AvatarInitials, Drawer, EmptyState, PButton, SectionCard, StatusChip, UsersIcon, WalletChip } from "../components/kit";
import { validateEmployee, type Employee, type EmployeeInput } from "../lib/employees";

const BLANK: EmployeeInput = { name: "", role: "", address: "", salary: "" };

function EmployeeForm({
  initial,
  decimals,
  employees,
  editingId,
  symbol,
  onSubmit,
}: {
  initial: EmployeeInput;
  decimals?: number;
  employees: Employee[];
  editingId?: string;
  symbol: string;
  onSubmit: (values: EmployeeInput) => void;
}) {
  const [values, setValues] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);

  const duplicate =
    values.address &&
    employees.some((e) => e.id !== editingId && e.address.toLowerCase() === values.address.trim().toLowerCase());

  const field = "w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none";
  const label = "mb-1 block text-xs font-medium text-stone-500";

  return (
    <form
      className="flex h-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const issue = validateEmployee(values, decimals);
        setProblem(issue);
        if (!issue) onSubmit(values);
      }}
    >
      <div>
        <label className={label}>Name</label>
        <input className={field} value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder="Jane Doe" />
      </div>
      <div>
        <label className={label}>Role / title (optional)</label>
        <input className={field} value={values.role ?? ""} onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))} placeholder="Product designer" />
      </div>
      <div>
        <label className={label}>Wallet address</label>
        <input
          className={`${field} font-mono text-xs`}
          value={values.address}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          placeholder="0x…"
          spellCheck={false}
        />
        {duplicate && (
          <p className="mt-1 text-xs text-amber-600">⚠ Another employee uses this wallet — both salaries would go to it.</p>
        )}
      </div>
      <div>
        <label className={label}>Monthly salary ({symbol})</label>
        <input
          className={`${field} font-mono`}
          value={values.salary}
          onChange={(e) => setValues((v) => ({ ...v, salary: e.target.value }))}
          placeholder="2500.00"
          inputMode="decimal"
        />
        <p className="mt-1 text-[11px] text-stone-400">
          Stored only in this browser — and encrypted before it ever touches the chain.
        </p>
      </div>
      {problem && <p className="rounded-xl bg-red-50 p-2.5 text-xs text-red-600">{problem}</p>}
      <div className="mt-auto">
        <PButton type="submit" className="w-full">
          {editingId ? "Save changes" : "Add employee"}
        </PButton>
      </div>
    </form>
  );
}

export function People({
  employees,
  decimals,
  symbol,
  onAdd,
  onUpdate,
  onRemove,
  autoOpenAdd,
  onAutoOpenConsumed,
}: {
  employees: Employee[];
  decimals?: number;
  symbol: string;
  onAdd: (values: EmployeeInput) => void;
  onUpdate: (id: string, values: EmployeeInput) => void;
  onRemove: (id: string) => void;
  /** Open the add drawer on arrival (another screen's CTA). */
  autoOpenAdd?: boolean;
  onAutoOpenConsumed?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; employee: Employee } | null>(null);
  // Mount-time consumption: this screen is unmounted while other screens set
  // the flag, so a render-time "signal changed?" comparison never fires.
  useEffect(() => {
    if (autoOpenAdd) {
      setDrawer({ mode: "add" });
      onAutoOpenConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAdd]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q) || e.address.toLowerCase().includes(q),
    );
  }, [employees, search]);

  return (
    <>
      <SectionCard
        title={`Team · ${employees.length}`}
        action={
          <div className="flex items-center gap-2">
            <input
              className="w-44 rounded-xl border border-stone-200 px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
            />
            <PButton onClick={() => setDrawer({ mode: "add" })}>+ Add employee</PButton>
          </div>
        }
      >
        {employees.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title="No employees yet"
            line="Add your first team member — name, wallet, salary. That's all payroll needs."
            cta={<PButton onClick={() => setDrawer({ mode: "add" })}>Add employee</PButton>}
          />
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No one matches "{search}".</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-stone-400">
              <tr>
                <th className="pb-2 font-medium">employee</th>
                <th className="pb-2 font-medium">wallet</th>
                <th className="pb-2 text-right font-medium">salary</th>
                <th className="pb-2 pl-4 font-medium">status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((e) => (
                <tr key={e.id} className="group">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2.5">
                      <AvatarInitials name={e.name} />
                      <span>
                        <span className="block font-medium text-stone-800">{e.name}</span>
                        {e.role && <span className="block text-[11px] text-stone-400">{e.role}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5">
                    <WalletChip address={e.address} />
                  </td>
                  <td className="py-2.5 text-right">
                    <AmountCell value={e.salary} suffix={symbol} />
                  </td>
                  <td className="py-2.5 pl-4">
                    <StatusChip tone="green">Active</StatusChip>
                  </td>
                  <td className="py-2.5 text-right text-xs opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="mr-3 font-medium text-stone-500 hover:text-stone-800" onClick={() => setDrawer({ mode: "edit", employee: e })}>
                      edit
                    </button>
                    <button className="font-medium text-red-400 hover:text-red-600" onClick={() => onRemove(e.id)}>
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <Drawer
        open={drawer !== null}
        title={drawer?.mode === "edit" ? `Edit ${drawer.employee.name}` : "Add employee"}
        onClose={() => setDrawer(null)}
      >
        {drawer && (
          <EmployeeForm
            key={drawer.mode === "edit" ? drawer.employee.id : "add"}
            initial={drawer.mode === "edit" ? { ...drawer.employee, role: drawer.employee.role ?? "" } : BLANK}
            decimals={decimals}
            employees={employees}
            editingId={drawer.mode === "edit" ? drawer.employee.id : undefined}
            symbol={symbol}
            onSubmit={(values) => {
              if (drawer.mode === "edit") onUpdate(drawer.employee.id, values);
              else onAdd(values);
              setDrawer(null);
            }}
          />
        )}
      </Drawer>
    </>
  );
}
