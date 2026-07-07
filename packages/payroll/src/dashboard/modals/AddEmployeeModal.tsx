/**
 * Add Employee modal (modals.md §3) — centered glass modal on ModalShell.
 * Fields are local state; the shell validates + persists via onAdd and the
 * returned error string renders inline. Add is hard-disabled until name and
 * wallet are non-empty (spec gap #5: gate for real, not opacity-only).
 */
import { useEffect, useState } from "react";

import { ModalShell, StaggerItem } from "../../design/kit2";
import type { AddEmployeeModalProps } from "../contracts";

const DEPTS = ["Engineering", "Design", "Operations"] as const;

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 11,
  padding: "10px 13px",
  color: "#e8f0ec",
  fontSize: 12,
  outline: "none",
} as const;

const labelStyle = { display: "block", fontSize: 10, color: "#9db3aa", marginBottom: 5 } as const;

export function AddEmployeeModal({ open, onClose, onAdd, initial }: AddEmployeeModalProps) {
  const editing = Boolean(initial);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [dept, setDept] = useState<string>("Engineering");
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setRole(initial?.role ?? "");
      setSalary(initial?.salary ?? "");
      setDept(initial?.dept || "Engineering");
      setWallet(initial?.wallet ?? "");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid = name.trim().length > 0 && wallet.trim().length > 0;

  function handleAdd() {
    if (!valid) return;
    const err = onAdd({ name, role, salary, dept, wallet });
    setError(err);
  }

  return (
    <ModalShell open={open} onClose={onClose} width={387} labelledBy="add-employee-title">
      <div style={{ padding: 25 }}>
        <StaggerItem index={0}>
          <h2 id="add-employee-title" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
            {editing ? "Edit employee" : "Add employee"}
          </h2>
          <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 5, lineHeight: 1.5 }}>
            {editing ? "Update their details, including the wallet their pay goes to." : "They view their salary privately from the My pay page."}
          </p>
        </StaggerItem>

        <div className="mt-5 flex flex-col gap-[13px]">
          <StaggerItem index={1}>
            <label style={labelStyle} htmlFor="add-emp-name">
              Full name
            </label>
            <input id="add-emp-name" style={inputStyle} placeholder="Jane Cooper" value={name} onChange={(e) => setName(e.target.value)} />
          </StaggerItem>

          <StaggerItem index={2}>
            <div className="grid grid-cols-2 gap-[11px]">
              <div>
                <label style={labelStyle} htmlFor="add-emp-role">
                  Role
                </label>
                <input id="add-emp-role" style={inputStyle} placeholder="Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="add-emp-salary">
                  Monthly salary (cUSDd)
                </label>
                <input
                  id="add-emp-salary"
                  style={inputStyle}
                  placeholder="850"
                  inputMode="decimal"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>
            </div>
          </StaggerItem>

          <StaggerItem index={3}>
            <span style={labelStyle}>Team</span>
            <div className="flex gap-[7px]">
              {DEPTS.map((d) => {
                const selected = dept === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDept(d)}
                    className="cursor-pointer rounded-full"
                    style={{
                      fontSize: 11,
                      padding: "7px 14px",
                      background: selected ? "#5fe3ab" : "rgba(255,255,255,0.05)",
                      color: selected ? "#0b1512" : "#cfdcd6",
                      transition: "background .15s, color .15s",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </StaggerItem>

          <StaggerItem index={4}>
            <label style={labelStyle} htmlFor="add-emp-wallet">
              Wallet address
            </label>
            <input
              id="add-emp-wallet"
              style={inputStyle}
              placeholder="0x71C0…8a4E"
              spellCheck={false}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            />
          </StaggerItem>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl p-2.5"
            style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 11.5 }}
          >
            {error}
          </p>
        )}

        <StaggerItem index={5}>
          <div className="flex gap-[11px]" style={{ marginTop: 23 }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-full text-center transition-colors hover:bg-[rgba(95,230,175,0.1)]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#e8f0ec",
                fontSize: 12.6,
                fontWeight: 500,
                padding: "11px 0",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!valid}
              className="flex-1 cursor-pointer rounded-full text-center font-medium transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              style={{ background: "#f5f8f6", color: "#14503b", fontSize: 12.6, padding: "11px 0" }}
            >
              {editing ? "Save changes" : "Add employee"}
            </button>
          </div>
        </StaggerItem>
      </div>
    </ModalShell>
  );
}
