/**
 * Add Employee modal — email-first (modals.md §3, evolved for Privy).
 *
 * The employee's EMAIL is their payroll identity: on Add, SealedPay asks the
 * backend to resolve it to a wallet (Privy pregenerates an embedded wallet if
 * that email has never signed in), so pay can be sent before the employee's
 * first login. A manual-address mode stays available for people who prefer
 * their own external wallet — exactly one of the two identities is required.
 *
 * The pregen round-trip runs on Add with a busy state ("Creating their wallet
 * from email"); failures render inline with the server's service-named
 * message. Fields are local state; the shell validates + persists via onAdd.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { ModalShell, StaggerItem } from "../../design/kit2";
import { api } from "../../lib/api";
import { shortWallet } from "../../lib/seed";
import type { AddEmployeeModalProps } from "../contracts";

const DEPTS = ["Engineering", "Design", "Operations"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function AddEmployeeModal({ open, onClose, onAdd, initial, onRemove }: AddEmployeeModalProps) {
  const reduced = useReducedMotion();
  const editing = Boolean(initial);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [dept, setDept] = useState<string>("Engineering");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  // "email" = wallet is derived from the email (pregen); "manual" = typed address.
  const [walletMode, setWalletMode] = useState<"email" | "manual">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Track open across the async pregen so a late resolve after Cancel can't
  // add a phantom row.
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setRole(initial?.role ?? "");
      setSalary(initial?.salary ?? "");
      setDept(initial?.dept || "Engineering");
      setEmail(initial?.email ?? "");
      setWallet(initial?.wallet ?? "");
      // An existing row with an address but no email was added manually.
      setWalletMode(initial && initial.wallet && !initial.email ? "manual" : "email");
      setError(null);
      setBusy(false);
      setConfirmRemove(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const emailValid = EMAIL_RE.test(email.trim());
  const valid =
    name.trim().length > 0 &&
    (walletMode === "email" ? emailValid : wallet.trim().length > 0) &&
    !busy;

  async function handleAdd() {
    if (!valid) return;
    setError(null);
    if (walletMode === "manual") {
      setError(onAdd({ name, role, salary, dept, email: emailValid ? email.trim().toLowerCase() : undefined, wallet }));
      return;
    }
    // Email mode: resolve (or create) their wallet first, then persist. If the
    // email is unchanged while editing, the existing address is already theirs.
    const cleanEmail = email.trim().toLowerCase();
    if (editing && initial?.email === cleanEmail && initial.wallet) {
      setError(onAdd({ name, role, salary, dept, email: cleanEmail, wallet: initial.wallet }));
      return;
    }
    setBusy(true);
    try {
      const { address } = await api.pregen(cleanEmail);
      if (!openRef.current) return; // cancelled mid-request — don't add a phantom row
      setError(onAdd({ name, role, salary, dept, email: cleanEmail, wallet: address }));
    } catch (e) {
      if (openRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (openRef.current) setBusy(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} width={387} labelledBy="add-employee-title">
      <div style={{ padding: 25 }}>
        <StaggerItem index={0}>
          <h2 id="add-employee-title" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
            {editing ? "Edit employee" : "Add employee"}
          </h2>
          <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 5, lineHeight: 1.5 }}>
            {editing
              ? "Update their details, including where their pay goes."
              : "Their email is all you need · a wallet is created from it, and they sign in with it to see their pay."}
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
            <AnimatePresence mode="wait" initial={false}>
              {walletMode === "email" ? (
                <motion.div
                  key="email"
                  initial={reduced ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.24 }}
                >
                  <label style={labelStyle} htmlFor="add-emp-email">
                    Work email
                  </label>
                  <input
                    id="add-emp-email"
                    style={inputStyle}
                    placeholder="jane@company.com"
                    type="email"
                    autoComplete="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p style={{ fontSize: 10, color: "#7f9a8f", marginTop: 6, lineHeight: 1.5 }}>
                    {editing && initial?.email === email.trim().toLowerCase() && initial.wallet ? (
                      <>
                        Their wallet <span className="tnum" style={{ color: "#9db3aa" }}>{shortWallet(initial.wallet)}</span> stays linked to this email.
                      </>
                    ) : (
                      "A private wallet is created from this email · they sign in with it to reveal their pay. No extension needed."
                    )}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="manual"
                  initial={reduced ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.24 }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setWalletMode((m) => (m === "email" ? "manual" : "email"))}
              className="mt-2 cursor-pointer transition-colors hover:text-[#cfe0d8]"
              style={{ fontSize: 10.5, color: "#9db3aa", background: "none" }}
            >
              {walletMode === "email" ? "They have their own wallet? Enter an address instead" : "Use their email instead (recommended)"}
            </button>
          </StaggerItem>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl p-2.5"
            style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 11.5, lineHeight: 1.5 }}
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
              onClick={() => void handleAdd()}
              disabled={!valid}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-center font-medium transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              style={{ background: "#f5f8f6", color: "#14503b", fontSize: 12.6, padding: "11px 0" }}
            >
              {busy && (
                <span aria-hidden style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(20,80,59,0.25)", borderTopColor: "#14503b", animation: "dc-spin .7s linear infinite" }} />
              )}
              {busy ? "Creating their wallet" : editing ? "Save changes" : "Add employee"}
            </button>
          </div>
        </StaggerItem>

        {editing && onRemove && (
          <button
            type="button"
            onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
            onMouseLeave={() => setConfirmRemove(false)}
            className="mt-3 w-full cursor-pointer rounded-full transition-colors hover:bg-[rgba(224,122,106,0.14)]"
            style={{ background: "transparent", border: "1px solid rgba(224,122,106,0.4)", color: "#f0a99d", fontSize: 12, fontWeight: 500, padding: "9px 0" }}
          >
            {confirmRemove ? "Tap again to remove this employee" : "Remove employee"}
          </button>
        )}
      </div>
    </ModalShell>
  );
}
