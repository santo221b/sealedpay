/**
 * Search command palette (modals.md §6) — full overlay dim + blur, panel
 * unfolds downward from a fixed top position (transform-origin top center).
 * Employees + Payouts sections are live-filtered; result rows stagger in on
 * open; close is one quick collapse. Esc / overlay click closes.
 *
 * The query input lives in the shell's top bar (it stays above this overlay);
 * the palette receives `query` and renders results only.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { Pill } from "../../design/kit2";
import { SendGlyph } from "../../design/icons";
import { initials } from "../../lib/seed";
import { tokens } from "../../design/tokens";
import type { Person, RunView, SearchPaletteProps } from "../contracts";

function shortTx(tx: string): string {
  return tx.length > 12 ? `${tx.slice(0, 6)}…${tx.slice(-4)}` : tx;
}

export function SearchPalette({ open, onClose, query, setQuery, people, runs, onPickPerson, onPickRun }: SearchPaletteProps) {
  const reduced = useReducedMotion();
  void setQuery; // typing happens in the shell's top-bar input

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const emps = people
    .filter((p) => `${p.name} ${p.role} ${p.dept} ${p.wallet}`.toLowerCase().includes(q))
    .slice(0, q ? 5 : 4);
  const payouts = runs
    .filter((r) => `${r.month} ${r.dateFull} ${r.tx}`.toLowerCase().includes(q))
    .slice(0, q ? 4 : 2);
  const empty = emps.length === 0 && payouts.length === 0;

  /** Global row index drives the open stagger across both sections. */
  let rowIndex = 0;
  const rowDelay = (i: number) => (reduced ? 0 : 0.2 + i * 0.035);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            key="overlay"
            className="absolute inset-0"
            style={{ background: tokens.bg.scrim, backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
            transition={{ duration: reduced ? 0.12 : 0.2, ease: "easeOut" }}
            onMouseDown={onClose}
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-label="Search"
            className="absolute left-1/2 overflow-hidden"
            style={{
              top: 76,
              width: 468,
              maxWidth: "calc(100vw - 32px)",
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.11)",
              background: "#121D1ABF",
              backdropFilter: "blur(6px)",
              padding: 14,
              transformOrigin: "top center",
            }}
            initial={reduced ? { opacity: 0, x: "-50%" } : { opacity: 0, x: "-50%", y: -8, scale: 0.98 }}
            animate={{
              opacity: 1,
              x: "-50%",
              y: 0,
              scale: 1,
              transition: reduced
                ? { duration: 0.12 }
                : { duration: 0.38, delay: 0.08, ease: [0.2, 1.06, 0.3, 1] },
            }}
            exit={
              reduced
                ? { opacity: 0, x: "-50%", transition: { duration: 0.12 } }
                : { opacity: 0, x: "-50%", y: -8, scale: 0.98, transition: { duration: 0.19, ease: [0.4, 0, 1, 1] } }
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            {empty ? (
              <p className="text-center" style={{ padding: "20px 12px", fontSize: 13.5, color: "#9db3aa" }}>
                No matches. Try a name, team, or month.
              </p>
            ) : (
              <div className="slim-scroll overflow-y-auto" style={{ maxHeight: "min(480px, 70vh)" }}>
                {emps.length > 0 && (
                  <>
                    <SectionLabel text="Employees" first reduced={reduced} />
                    {emps.map((p) => (
                      <EmployeeRow key={p.id} person={p} delay={rowDelay(rowIndex++)} reduced={reduced} onPick={() => {
                        onPickPerson(p.id);
                        onClose();
                      }} />
                    ))}
                  </>
                )}
                {payouts.length > 0 && (
                  <>
                    <SectionLabel text="Payouts" reduced={reduced} />
                    {payouts.map((r) => (
                      <PayoutRow key={r.id} run={r} delay={rowDelay(rowIndex++)} reduced={reduced} onPick={() => {
                        onPickRun(r.month);
                        onClose();
                      }} />
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ text, first = false, reduced }: { text: string; first?: boolean; reduced: boolean | null }) {
  return (
    <motion.p
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, delay: reduced ? 0 : 0.18 }}
      style={{ fontSize: 12, color: "#9db3aa", padding: first ? "7px 12px 4px 12px" : "11px 12px 4px 12px" }}
    >
      {text}
    </motion.p>
  );
}

function ResultRow({
  delay,
  reduced,
  onPick,
  children,
}: {
  delay: number;
  reduced: boolean | null;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-full cursor-pointer items-center gap-[13px] rounded-full text-left transition-colors hover:bg-[rgba(95,230,175,0.1)]"
      style={{ padding: "10px 12px" }}
    >
      {children}
    </motion.button>
  );
}

function EmployeeRow({ person, delay, reduced, onPick }: { person: Person; delay: number; reduced: boolean | null; onPick: () => void }) {
  return (
    <ResultRow delay={delay} reduced={reduced} onPick={onPick}>
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "rgba(59,191,142,0.18)",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 12,
          fontWeight: 800,
          color: "#d3ecdd",
        }}
      >
        {initials(person.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate" style={{ fontSize: 15, fontWeight: 600, color: "#eef4f1" }}>
          {person.name}
        </span>
        <span className="block truncate" style={{ fontSize: 12, color: "#9db3aa", marginTop: 1 }}>
          {person.role} · {person.dept}
        </span>
      </span>
    </ResultRow>
  );
}

function PayoutRow({ run, delay, reduced, onPick }: { run: RunView; delay: number; reduced: boolean | null; onPick: () => void }) {
  return (
    <ResultRow delay={delay} reduced={reduced} onPick={onPick}>
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "rgba(59,191,142,0.18)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SendGlyph size={15} color="#cfe5d8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="tnum block truncate" style={{ fontSize: 15, fontWeight: 600, color: "#eef4f1" }}>
          {run.dateFull}
        </span>
        <span className="tnum block truncate" style={{ fontSize: 12, color: "#9db3aa", marginTop: 1 }}>
          {run.paid} paid · {shortTx(run.tx)}
        </span>
      </span>
      {run.verified !== false && (
        <Pill tone="green" className="ml-auto shrink-0">
          Verified
        </Pill>
      )}
    </ResultRow>
  );
}
