/**
 * ─── THE SEAM ────────────────────────────────────────────────────────────────
 * Run Payroll modal — the design's 4-step flow driven by the REAL engine.
 * The prototype's setTimeout cascade is replaced by useDisperseFlow phases:
 *
 *   design step 0 select  → local selection → onStart() → goToReview + execute
 *   design step 1 encrypt → flow.phase 'encrypting' (real FHE proof in browser;
 *                            the 720ms card cascade plays alongside, spinner
 *                            holds until the REAL encryption completes)
 *   design step 2 authorize → flow.phase 'authorizing' (the wallet prompt IS
 *                            the authorization; 'Already authorized' shows
 *                            when a fresh operator grant is reused)
 *   design step 3 disperse → 'dispersing' (Sending payroll) → 'confirming'
 *                            (Confirmed on-chain) → 'delivered' + REAL
 *                            verify-decrypt feeding the Paid cascade → finale
 *                            with the real total reveal + real Etherscan link.
 *
 * Documented deviations from the prototype (correctness over simulation):
 * - No in-modal "Authorize"/"Confirm & pay" buttons: the wallet's own prompts
 *   are the confirmations for the real transactions.
 * - No "Simulate failure (demo)" affordance: real failures drive the designed
 *   failure path (toast + notification, nothing recorded).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { formatAmount, type DisperseFlow, type VerificationEntry } from "@dispersekit/widget";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { SealAmount, RevealAmount } from "../design/RevealAmount";
import { CloseButton } from "../design/CloseButton";
import { DocCheckGlyph, PersonKeyGlyph } from "../design/icons";
import { humanizeError } from "../lib/humanizeError";
import { fmtAmount, initials } from "../lib/seed";
import type { Person } from "./contracts";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface RunPayrollModalProps {
  open: boolean;
  people: Person[];
  flow: DisperseFlow;
  decimals: number | undefined;
  autoverify: boolean;
  /** Validates + snapshots + goToReview + execute. Returns an error string or null. */
  onStart: (selected: Person[]) => Promise<string | null>;
  /** Close + flow.reset (only allowed when not mid-transaction). */
  onClose: () => void;
  /**
   * Single-employee runs: validate a one-off {recipient, amount} without
   * persisting anything to the roster. Presence of this prop switches the
   * modal into one-off "Pay {name}" mode. Returns a per-field error or null.
   */
  onValidatePayOne?: (recipient: string, amount: string) => { recipient: string | null; amount: string | null };
  /**
   * Wallet balance control (one-off mode only) — same reveal/fetch mechanism
   * as the sidebar's Available balance: hidden by default, tapping decrypts.
   */
  balance?: { value: string | undefined; revealed: boolean; pending: boolean; toggle: () => void };
  /** Connected employer wallet, for the one-off "Pay myself" shortcut. */
  myAddress?: `0x${string}`;
  /** Jump to the recipient "My pay" view (offered on the delivered finale). */
  onViewMyPay?: () => void;
}

type DesignStep = 0 | 1 | 2 | 3;

export function RunPayrollModal({ open, people, flow, decimals, autoverify, onStart, onClose, onValidatePayOne, balance, myAddress, onViewMyPay }: RunPayrollModalProps) {
  const reduced = useReducedMotion();
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [payReveal, setPayReveal] = useState(false);
  const [resultReveal, setResultReveal] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [encIdx, setEncIdx] = useState(0);
  const [deliveredN, setDeliveredN] = useState(0);
  // Selected snapshot for steps 1-3 (selection order = row order = event order).
  const [running, setRunning] = useState<Person[]>([]);
  // Holds the encrypting step on screen for a minimum time so the seal cascade
  // always plays out, even when the browser seals the amount in a split second.
  const [encHold, setEncHold] = useState(false);

  // One-off "Pay {name}" mode: opened from an Employee page for a single person.
  // The recipient + amount are editable and DO NOT persist to the roster — this
  // is a one-off payment, not a salary change.
  const single = people.length === 1 && Boolean(onValidatePayOne) ? people[0] : null;
  const [payRecipient, setPayRecipient] = useState("");
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    if (open) {
      setSel({});
      setPayReveal(false);
      setResultReveal(false);
      setStartError(null);
      setEncIdx(0);
      setDeliveredN(0);
      setRunning([]);
      // Prefill the one-off form from the employee (their own wallet + salary).
      setPayRecipient(people.length === 1 ? people[0].wallet : "");
      setPayAmount(people.length === 1 ? String(people[0].salary) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const payErrors = single && onValidatePayOne ? onValidatePayOne(payRecipient, payAmount) : { recipient: null, amount: null };
  const payBlocked = single ? payErrors.recipient !== null || payErrors.amount !== null : false;

  // In one-off mode the "selection" is a single override person carrying the
  // edited wallet + amount; startRun reads .wallet/.salary off it directly.
  const selected = useMemo(() => {
    if (single) {
      const amt = Number(payAmount);
      return [{ ...single, wallet: payRecipient.trim(), salary: Number.isFinite(amt) ? amt : 0 }];
    }
    return people.filter((p) => sel[p.id] !== false);
  }, [single, payRecipient, payAmount, people, sel]);
  const allChecked = selected.length === people.length;
  const total = selected.reduce((a, p) => a + p.salary, 0);
  const phase = flow.phase;

  /* Minimum encrypting dwell: keep the step visible long enough for the whole
     seal cascade to land, no matter how fast the real FHE proof returns. */
  useEffect(() => {
    if (phase === "encrypting") {
      setEncHold(true);
      const ms = Math.max(1300, running.length * 720 + 500);
      const t = window.setTimeout(() => setEncHold(false), ms);
      return () => window.clearTimeout(t);
    }
    // A pre-broadcast error drops us back to review/input — never mask that.
    if (phase === "input" || phase === "review") setEncHold(false);
  }, [phase, running.length]);

  // Visually "still encrypting" = the engine is encrypting OR we are holding the
  // step open so the animation can finish. Never hold over review/input, so a
  // pre-broadcast error surfaces immediately instead of flashing the cascade.
  const showEncrypting = phase !== "input" && phase !== "review" && (phase === "encrypting" || encHold);

  const step: DesignStep = showEncrypting
    ? 1
    : phase === "input" || phase === "review"
      ? 0
      : phase === "authorizing"
        ? 2
        : 3;

  /* Encrypting cascade: one card seals every 720ms for as long as the step is
     shown (real proof + the minimum-dwell hold). */
  useEffect(() => {
    if (!showEncrypting || reduced) {
      if (!showEncrypting) setEncIdx(0);
      else setEncIdx(running.length + 1);
      return;
    }
    setEncIdx(0);
    const t = window.setInterval(() => setEncIdx((k) => k + 1), 720);
    return () => window.clearInterval(t);
  }, [showEncrypting, reduced, running.length]);

  /* Real verification feeds the Paid cascade (140ms per row). */
  const verification = flow.verification;
  useEffect(() => {
    if (!verification) {
      setDeliveredN(0);
      return;
    }
    if (reduced) {
      setDeliveredN(verification.length);
      return;
    }
    setDeliveredN(0);
    let k = 0;
    const t = window.setInterval(() => {
      k += 1;
      setDeliveredN(k);
      if (k >= verification.length) window.clearInterval(t);
    }, 140);
    return () => window.clearInterval(t);
  }, [verification, reduced]);

  /* Auto-verify after delivery (one EIP-712 signature) per the Settings toggle. */
  const verifyKicked = useRef<string>(undefined);
  useEffect(() => {
    if (open && autoverify && phase === "delivered" && flow.delivery && !flow.verification && !flow.verifying && verifyKicked.current !== flow.delivery.txHash) {
      verifyKicked.current = flow.delivery.txHash;
      void flow.verifyDelivery();
    }
  }, [open, autoverify, phase, flow]);

  async function handleContinue() {
    if (selected.length === 0 || payBlocked) return;
    setStartError(null);
    setRunning(selected);
    const err = await onStart(selected);
    if (err) {
      setStartError(err);
      setRunning([]);
    }
  }

  // A pre-broadcast failure (no wallet, wrong chain, rejected signature, encrypt
  // error) sends the engine back to review/input WITH an error. execute() is
  // fired by the shell, not handleContinue, so its error branch never runs —
  // clear the running snapshot here so Continue leaves the "Preparing" state.
  useEffect(() => {
    if ((phase === "input" || phase === "review") && flow.error) setRunning([]);
  }, [phase, flow.error]);

  const inTx = ["encrypting", "authorizing", "dispersing", "confirming"].includes(phase);
  const requestClose = () => {
    // Never abandon a broadcast tx by accident; scrim clicks are ignored mid-flight.
    if (inTx) return;
    onClose();
  };
  // Escape closes when it is safe to (not mid-transaction).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !inTx) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, inTx, onClose]);

  const verifiedOk = verification ? verification.filter((v) => v.ok).length : 0;
  const n = running.length || selected.length;
  const progressWidth =
    phase === "dispersing"
      ? "34%"
      : phase === "confirming"
        ? "64%"
        : phase === "delivered" && flow.verifying
          ? "64%"
          : verification
            ? `${64 + Math.round(34 * Math.min(1, deliveredN / Math.max(1, verification.length)))}%`
            : phase === "delivered"
              ? "96%"
              : "6%";

  // The finale (with its Done button) must render on ANY settled delivered
  // state — verified, unverified, or verify-failed — so a rejected auto-verify
  // signature can never strand the modal with no way out.
  const finale =
    phase === "delivered" &&
    !flow.verifying &&
    (!autoverify || Boolean(verification) || Boolean(flow.error)) &&
    (verification ? deliveredN >= verification.length : true);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[72] flex items-center justify-center p-6"
          style={{ background: "#0D1411F2" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Run payroll"
            className="relative w-full overflow-hidden"
            style={{ maxWidth: 468, borderRadius: 27, border: "1px solid rgba(255,255,255,0.11)", background: "#121D1AE6", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", boxShadow: "0 30px 80px -30px rgba(0,0,0,0.6)", padding: "26px 24px 22px 24px" }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.17, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.34, ease: [0.2, 1.06, 0.3, 1] }}
          >
            {/* Top progress bar: 25/50/75/100% by design step */}
            <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: "27px 27px 0 0" }}>
              <div
                style={{ height: "100%", width: `${((step + 1) / 4) * 100}%`, background: "linear-gradient(90deg,#5fe3ab,#78e9c0)", transition: "width .45s cubic-bezier(.22,1,.36,1)" }}
              />
            </div>

            {/* Close — hidden mid-transaction so a broadcast is never abandoned. */}
            {!inTx && <CloseButton onClick={requestClose} className="absolute z-[2]" style={{ top: 15, right: 15 }} />}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step + (finale ? "-finale" : "")}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {step === 0 && (
                  <StepSelect
                    people={people}
                    sel={sel}
                    onToggle={(id) => setSel((s) => ({ ...s, [id]: s[id] === false }))}
                    onSelectAll={() => {
                      if (allChecked) setSel(Object.fromEntries(people.map((p) => [p.id, false])));
                      else setSel({});
                    }}
                    allChecked={allChecked}
                    selectedCount={selected.length}
                    total={total}
                    payReveal={payReveal}
                    onToggleReveal={() => setPayReveal((r) => !r)}
                    error={humanizeError(startError ?? flow.error)}
                    busy={phase === "review" && running.length > 0}
                    onContinue={() => void handleContinue()}
                    single={single}
                    payRecipient={payRecipient}
                    payAmount={payAmount}
                    onRecipientChange={setPayRecipient}
                    onAmountChange={setPayAmount}
                    recipientError={payErrors.recipient}
                    amountError={payErrors.amount}
                    blocked={payBlocked}
                    balance={balance}
                    myAddress={myAddress}
                  />
                )}
                {step === 1 && <StepEncrypting people={running} encIdx={encIdx} single={Boolean(single)} />}
                {step === 2 && <StepAuthorize alreadyAuthorized={flow.operatorAlreadySet === true} />}
                {step === 3 && !finale && (
                  <StepDisperse
                    n={n}
                    phase={phase}
                    single={Boolean(single)}
                    verifying={flow.verifying || (Boolean(verification) && deliveredN < (verification?.length ?? 0))}
                    verification={verification}
                    deliveredN={deliveredN}
                    people={running}
                    progressWidth={progressWidth}
                    error={humanizeError(flow.error)}
                    // Retry confirmation only BEFORE delivery is confirmed — once
                    // flow.delivery exists, retrying would re-fire onDispersed and
                    // double-record the run; a post-delivery verify error is
                    // handled in the finale instead.
                    pendingTxHash={flow.delivery ? undefined : flow.pendingTxHash}
                    onRetryConfirm={() => void flow.retryConfirmation()}
                  />
                )}
                {step === 3 && finale && (
                  <Finale
                    n={n}
                    single={Boolean(single)}
                    verifiedOk={verification ? verifiedOk : undefined}
                    total={total}
                    decimals={decimals}
                    resultReveal={resultReveal}
                    onToggleResult={() => setResultReveal((r) => !r)}
                    url={flow.delivery ? `https://sepolia.etherscan.io/tx/${flow.delivery.txHash}` : "https://sepolia.etherscan.io"}
                    // Offer a manual verify whenever no verification exists yet
                    // (covers both autoverify-off and a rejected auto-verify).
                    onVerify={verification ? undefined : () => void flow.verifyDelivery()}
                    verifyError={humanizeError(flow.error)}
                    verifying={flow.verifying}
                    onDone={onClose}
                    onViewMyPay={onViewMyPay}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Step 0 — Select & review ────────────────────────────────────────────── */

function StepSelect(props: {
  people: Person[];
  sel: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  allChecked: boolean;
  selectedCount: number;
  total: number;
  payReveal: boolean;
  onToggleReveal: () => void;
  error?: string | null;
  busy: boolean;
  onContinue: () => void;
  /** Non-null → one-off "Pay {name}" mode with editable recipient + amount. */
  single: Person | null;
  payRecipient: string;
  payAmount: string;
  onRecipientChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  recipientError: string | null;
  amountError: string | null;
  blocked: boolean;
  balance?: { value: string | undefined; revealed: boolean; pending: boolean; toggle: () => void };
  myAddress?: `0x${string}`;
}) {
  const { people, sel, selectedCount, single } = props;
  return (
    <div className="mt-2.5">
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>{single ? `Pay ${single.name}` : "Run payroll"}</h2>
        <div className="flex items-center justify-between gap-3" style={{ marginTop: 4 }}>
          <p style={{ fontSize: 12, color: "#9db3aa", fontWeight: single ? 600 : 400 }}>
            {single ? "A one-off confidential payment." : "Review who gets paid this run."}
          </p>
          {!single && (
            <button type="button" onClick={props.onSelectAll} className="shrink-0 cursor-pointer select-none hover:underline" style={{ fontSize: 12, color: "#78e9c0" }}>
              {props.allChecked ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
      </div>

      {single ? (
        <div className="mt-4 flex flex-col gap-3">
          {/* Recipient wallet — prefilled with the employee's address, editable. */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <label htmlFor="pay-one-recipient" style={{ fontSize: 11, color: "#9db3aa", paddingLeft: 5 }}>
                Recipient wallet
              </label>
              {props.myAddress && props.myAddress !== props.payRecipient.trim() && (
                <button
                  type="button"
                  onClick={() => props.onRecipientChange(props.myAddress ?? "")}
                  className="cursor-pointer hover:underline"
                  style={{ fontSize: 10.5, color: "#78e9c0", paddingRight: 5 }}
                >
                  Pay myself
                </button>
              )}
            </div>
            <input
              id="pay-one-recipient"
              value={props.payRecipient}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => props.onRecipientChange(e.target.value)}
              className="tnum w-full"
              style={{ ...PAY_INPUT_STYLE, borderColor: props.recipientError ? "rgba(224,110,98,0.55)" : "rgba(255,255,255,0.12)" }}
            />
            {props.recipientError && (
              <p role="alert" style={{ fontSize: 11, color: "#eb8f85", marginTop: 6, paddingLeft: 5 }}>
                {props.recipientError}
              </p>
            )}
          </div>

          {/* Amount — a one-off amount, not the stored salary; nothing persists. */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <label htmlFor="pay-one-amount" style={{ fontSize: 11, color: "#9db3aa", paddingLeft: 5 }}>
                Amount
              </label>
              {props.balance && (
                <button
                  type="button"
                  onClick={props.balance.toggle}
                  disabled={props.balance.pending}
                  title={props.balance.pending ? "Fetching balance" : props.balance.revealed ? "Hide balance" : "Reveal balance"}
                  className={`tnum flex items-center ${props.balance.pending ? "cursor-wait" : "cursor-pointer hover:text-[#c2d0c9]"}`}
                  style={{ gap: 4, fontSize: 10.5, color: "#9db3aa", paddingRight: 5 }}
                >
                  <span>Balance</span>
                  {props.balance.pending && (
                    <span
                      className="inline-block animate-spin rounded-full align-middle"
                      style={{ width: 10, height: 10, border: "1.5px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0" }}
                      aria-hidden
                    />
                  )}
                  <RevealAmount value={props.balance.value} revealed={props.balance.revealed} pending={props.balance.pending} label="wallet balance" />
                  <span>cUSDd</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="pay-one-amount"
                value={props.payAmount}
                inputMode="decimal"
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => props.onAmountChange(e.target.value)}
                className="tnum w-full"
                style={{ ...PAY_INPUT_STYLE, paddingRight: 62, borderColor: props.amountError ? "rgba(224,110,98,0.55)" : "rgba(255,255,255,0.12)" }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center" style={{ paddingRight: 14, fontSize: 12, color: "#9db3aa" }}>
                cUSDd
              </span>
            </div>
            {props.amountError && (
              <p role="alert" style={{ fontSize: 11, color: "#eb8f85", marginTop: 6, paddingLeft: 5 }}>
                {props.amountError}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="slim-scroll -mx-1.5 mt-3.5 flex flex-col gap-0.5 overflow-y-auto px-1.5" style={{ maxHeight: 268 }}>
            {people.map((p) => {
              const checked = sel[p.id] !== false;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => props.onToggle(p.id)}
                  className="flex cursor-pointer items-center gap-3 text-left transition-colors hover:bg-[rgba(95,230,175,0.1)]"
                  style={{ padding: 8, borderRadius: 14 }}
                >
                  <span className="flex shrink-0 items-center justify-center" style={{ width: 20, height: 20, borderRadius: "50%", background: checked ? "#5fe3ab" : "rgba(255,255,255,0.04)", border: checked ? "1px solid transparent" : "1px solid rgba(255,255,255,0.16)", transition: "background .18s" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b1512" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: checked ? 1 : 0, transition: "opacity .18s" }} aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="flex shrink-0 items-center justify-center" style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(59,191,142,0.18)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, fontWeight: 800, color: "#d3ecdd" }}>
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 600, color: "#eef4f1" }}>
                      {p.name}
                    </span>
                    <span className="block" style={{ fontSize: 10.5, color: "#9db3aa", marginTop: 1 }}>
                      {p.role}
                    </span>
                  </span>
                  <span className="tnum shrink-0" style={{ fontSize: 13.5, fontWeight: 700, color: "#eef4f1" }}>
                    <RevealAmount value={fmtAmount(p.salary)} revealed={props.payReveal} label="salary" /> <span style={{ fontSize: 10.5, color: "#9db3aa" }}>cUSDd</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-end justify-between" style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.09)" }}>
            <div>
              <p style={{ fontSize: 10.5, color: "#9db3aa" }}>
                Total to disperse ·{" "}
                <button type="button" onClick={props.onToggleReveal} className="cursor-pointer hover:underline" style={{ color: "#78e9c0" }}>
                  {props.payReveal ? "Hide" : "Reveal"}
                </button>
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
                  <RevealAmount value={fmtAmount(props.total)} revealed={props.payReveal} label="total" />
                </span>
                <span style={{ fontSize: 12, color: "#9db3aa" }}>cUSDd</span>
              </p>
            </div>
            <div className="text-right">
              <p className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
                {String(selectedCount).padStart(2, "0")}
              </p>
              <p style={{ fontSize: 10.5, color: "#9db3aa", marginTop: 3 }}>recipients</p>
            </div>
          </div>
        </>
      )}

      {props.error && (
        <p role="alert" className="mt-3 rounded-xl p-2.5" style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 11.5 }}>
          {props.error}
        </p>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={selectedCount === 0 || props.busy || props.blocked}
        onClick={props.onContinue}
        className="mt-4 w-full rounded-full text-center font-medium disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 13.5, padding: "12.6px 0" }}
      >
        {props.busy ? "Preparing" : single ? "Pay" : "Continue"}
      </motion.button>
    </div>
  );
}

/** Shared style for the one-off Pay form inputs (recipient + amount). */
const PAY_INPUT_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#eef4f1",
  fontSize: 12.5,
  letterSpacing: 0.3,
  padding: "11px 13px",
  outline: "none",
};

/* ── Step 1 — Encrypting (real proof + design cascade) ───────────────────── */

function StepEncrypting({ people, encIdx, single }: { people: Person[]; encIdx: number; single: boolean }) {
  return (
    <div className="mt-2.5">
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}>
        {single ? "Encrypting the amount in your browser" : `Encrypting ${people.length} salaries in your browser`}
      </h2>
      <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 4 }}>Amounts are sealed locally before anything is sent.</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {people.map((p, k) => (
          <div key={p.id} className="flex min-w-0 items-center gap-2" style={{ padding: "8px 11px", borderRadius: 13, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="flex shrink-0 items-center justify-center" style={{ width: 29, height: 29, borderRadius: "50%", background: "rgba(59,191,142,0.18)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 10.5, fontWeight: 800, color: "#d3ecdd" }}>
              {initials(p.name)}
            </span>
            <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12, fontWeight: 600, color: "#eef4f1" }}>
              {p.name}
            </span>
            <span className="shrink-0" style={{ fontSize: 12, fontWeight: 600, color: "#cfe0d8" }}>
              <SealAmount value={fmtAmount(p.salary)} sealed={encIdx > k} />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" style={{ fontSize: 12, color: "#9db3aa" }}>
        <span style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }} />
        Sealing amounts
      </div>
    </div>
  );
}

/* ── Step 2 — Authorize (the wallet prompt IS the signature) ─────────────── */

function StepAuthorize({ alreadyAuthorized }: { alreadyAuthorized: boolean }) {
  return (
    <div className="mt-2 text-center" style={{ padding: "14px 6px 6px 6px" }}>
      <div className="relative mx-auto mb-1.5 flex items-center justify-center" style={{ width: 66, height: 66 }}>
        <span className="absolute inset-0 rounded-full" style={{ background: "rgba(95,230,175,0.14)", animation: "dc-glowpulse 2.2s ease-in-out infinite" }} />
        <PersonKeyGlyph size={30} color="#78e9c0" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4", marginTop: 10 }}>Authorize SealedPay</h2>
      <p className="mx-auto" style={{ fontSize: 12.6, color: "#9db3aa", marginTop: 8, lineHeight: 1.55, maxWidth: 330 }}>
        Allow SealedPay to disperse cUSDd on your behalf · one signature · expires in 24h.
      </p>

      {alreadyAuthorized ? (
        <div className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full" style={{ background: "rgba(59,191,142,0.16)", border: "1px solid rgba(95,230,175,0.4)", color: "#78e9c0", fontSize: 13.5, fontWeight: 600, padding: "12.6px 0" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" opacity="0.35" />
            <polyline points="16 9 10.5 15 8 12.5" />
          </svg>
          Already authorized
        </div>
      ) : (
        <div className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cfdcd6", fontSize: 13.5, fontWeight: 600, padding: "12.6px 0" }}>
          <span style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(120,233,192,0.25)", borderTopColor: "#78e9c0", animation: "dc-spin .7s linear infinite" }} />
          Confirm in your wallet
        </div>
      )}
    </div>
  );
}

/* ── Step 3 — Disperse & verify ──────────────────────────────────────────── */

function StepDisperse(props: {
  n: number;
  phase: string;
  single: boolean;
  verifying: boolean;
  verification?: VerificationEntry[];
  deliveredN: number;
  people: Person[];
  progressWidth: string;
  error?: string;
  pendingTxHash?: `0x${string}`;
  onRetryConfirm: () => void;
}) {
  const headline = props.phase === "dispersing" ? (props.single ? "Sending payment" : "Sending payroll") : "Confirmed on-chain";
  const dispersed = props.phase !== "dispersing";
  const walletHint = props.phase === "dispersing" && !props.pendingTxHash;
  return (
    <div className="mt-2.5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={headline}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
          style={{ fontSize: 20, fontWeight: 700, color: "#f2f7f4" }}
        >
          {headline}
        </motion.h2>
      </AnimatePresence>
      <p style={{ fontSize: 12, color: "#9db3aa", marginTop: 4 }}>
        {props.single ? "The amount is sealed on-chain, sent in one call." : "One disperse call settles every salary at once."}
      </p>
      {walletHint && (
        <p style={{ fontSize: 11, color: "#78e9c0", marginTop: 6 }}>Approve the payment in your wallet</p>
      )}

      <div className="mt-[18px] overflow-hidden" style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
        <div className="relative h-full" style={{ width: props.progressWidth, background: "linear-gradient(90deg,#2f9d74,#78e9c0)", borderRadius: 999, transition: "width .5s cubic-bezier(.22,1,.36,1)" }}>
          <span className="dc-sheen absolute inset-0" style={{ background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)", backgroundSize: "220% 100%", animation: "dc-step-sheen 1.15s linear infinite" }} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <StatusLine label="Dispersing on Sepolia" state={dispersed ? "done" : "active"} color="#cfe0d8" />
        <StatusLine
          label={`Verifying delivery · ${props.deliveredN}/${props.verification?.length ?? props.n}`}
          state={props.verification && props.deliveredN >= props.verification.length ? "done" : props.verifying ? "active" : "pending"}
          color="#9db3aa"
        />
      </div>

      {props.verifying && props.verification && (
        <div className="slim-scroll -mx-1.5 mt-3.5 flex flex-col gap-0.5 overflow-y-auto px-1.5" style={{ maxHeight: 150 }}>
          {props.people.map((p, i) => (
            <div key={p.id} className="flex items-center gap-[11px]" style={{ padding: 6 }}>
              <span className="flex shrink-0 items-center justify-center" style={{ width: 29, height: 29, borderRadius: "50%", background: "rgba(59,191,142,0.18)", fontSize: 10.5, fontWeight: 800, color: "#d3ecdd" }}>
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12.6, fontWeight: 600, color: "#eef4f1" }}>
                {p.name}
              </span>
              {i < props.deliveredN && props.verification?.[i]?.ok && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.18, 1] }} transition={{ duration: 0.4, ease: EASE }} className="flex items-center gap-1" style={{ color: "#78e9c0", fontSize: 10.5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Paid
                </motion.span>
              )}
              {i < props.deliveredN && props.verification && !props.verification[i]?.ok && (
                <span style={{ color: "#e6c082", fontSize: 10.5 }}>Check</span>
              )}
            </div>
          ))}
        </div>
      )}

      {props.error && (
        <div className="mt-3">
          <p role="alert" className="rounded-xl p-2.5" style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 11.5 }}>
            {props.error}
          </p>
          {props.pendingTxHash && (
            <button type="button" onClick={props.onRetryConfirm} className="mt-2 w-full rounded-full font-medium" style={{ background: "#f5f8f6", color: "#14503b", fontSize: 13.5, padding: "12.6px 0" }}>
              Retry confirmation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusLine({ label, state, color }: { label: string; state: "pending" | "active" | "done"; color: string }) {
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 12.6, color }}>
      <span className="flex w-[15px] items-center justify-center">
        {state === "done" ? (
          <motion.svg initial={{ scale: 0 }} animate={{ scale: [0, 1.18, 1] }} transition={{ duration: 0.45, ease: EASE }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#78e9c0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" opacity="0.35" />
            <polyline points="16 9 10.5 15 8 12.5" />
          </motion.svg>
        ) : state === "active" ? (
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: "50%", background: "#78e9c0" }} />
        ) : (
          <span style={{ width: 15, height: 15, borderRadius: "50%", border: "1.8px solid rgba(255,255,255,0.14)" }} />
        )}
      </span>
      <span className="tnum">{label}</span>
    </div>
  );
}

/* ── Success finale ──────────────────────────────────────────────────────── */

function Finale(props: {
  n: number;
  single: boolean;
  verifiedOk?: number;
  total: number;
  decimals?: number;
  resultReveal: boolean;
  onToggleResult: () => void;
  url: string;
  onVerify?: () => void;
  verifyError?: string;
  verifying: boolean;
  onDone: () => void;
  onViewMyPay?: () => void;
}) {
  void formatAmount;
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    try {
      void navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?view=mypay`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="text-center" style={{ padding: "12px 6px 4px 6px" }}>
      <div className="relative mx-auto flex items-center justify-center" style={{ width: 96, height: 96 }}>
        <motion.span
          className="absolute rounded-full"
          style={{ inset: -12, background: "radial-gradient(circle, rgba(95,230,175,0.2), transparent 72%)" }}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: [0, 1, 0.6] }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.18, 1] }} transition={{ duration: 0.55, ease: EASE }}>
          <DocCheckGlyph size={80} color="#5fe3ab" />
        </motion.span>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f2f7f4", marginTop: 14 }}>{props.single ? "Payment delivered" : "Payroll delivered"}</h2>
      <p className="tnum" style={{ fontSize: 12.6, color: "#9db3aa", marginTop: 6 }}>
        {props.verifiedOk !== undefined ? `${props.verifiedOk}/${props.n} verified` : `${props.n} paid`}
      </p>

      {/* Proof card: the amount (tap to reveal) and the on-chain proof grouped
          into one surface, so the finale reads as confirm + one primary. */}
      <div
        className="mx-auto mt-[18px]"
        style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "15px 16px 4px" }}
      >
        <button
          type="button"
          onClick={props.onToggleResult}
          title={props.resultReveal ? "Hide total" : "Reveal total"}
          aria-label={props.resultReveal ? "Hide total" : "Reveal total"}
          className="mx-auto flex cursor-pointer items-baseline justify-center gap-1.5"
        >
          <span className="tnum" style={{ fontSize: 17, fontWeight: 700, color: "#f2f7f4" }}>
            <RevealAmount value={fmtAmount(props.total)} revealed={props.resultReveal} label="total" />
          </span>
          <span style={{ fontSize: 12, color: "#9db3aa" }}>cUSDd</span>
        </button>
        <div className="text-center" style={{ fontSize: 10.5, color: "#6f857c", marginTop: 6 }}>
          Employer only
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px -16px 0" }} />

        <a
          href={props.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between transition-colors hover:text-[#e8f0ec]"
          style={{ fontSize: 12, color: "#9db3aa", textDecoration: "none", padding: "13px 6px 11px" }}
        >
          View on Etherscan
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
      </div>

      {props.onVerify && props.verifiedOk === undefined && (
        <button type="button" onClick={props.onVerify} disabled={props.verifying} className="mx-auto mt-3.5 block w-full rounded-full font-medium disabled:opacity-50" style={{ background: "#f5f8f6", color: "#14503b", fontSize: 13.5, padding: "12.6px 0" }}>
          {props.verifying ? "Decrypting" : props.single ? "Verify the payment was delivered" : "Verify salaries were delivered"}
        </button>
      )}
      {props.verifyError && props.verifiedOk === undefined && !props.verifying && (
        <p className="mt-2" style={{ fontSize: 11, color: "#eb8f85" }}>
          {props.verifyError}
        </p>
      )}

      {/* Recipient handoff (a demo affordance) — demoted to a quiet middot pair
          so it never twins the primary Done button. */}
      {props.single && props.onViewMyPay && (
        <div className="flex items-center justify-center" style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
          <button type="button" onClick={props.onViewMyPay} className="cursor-pointer hover:underline" style={{ fontSize: 11.5, fontWeight: 500, color: "#78e9c0" }}>
            View this as the recipient
          </button>
          <span aria-hidden style={{ color: "rgba(255,255,255,0.18)", padding: "0 8px" }}>·</span>
          <button type="button" onClick={copyLink} className="cursor-pointer hover:underline" style={{ fontSize: 11.5, color: "#9db3aa" }}>
            {copied ? "Recipient link copied" : "Copy recipient link"}
          </button>
        </div>
      )}

      <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={props.onDone} className="mt-3.5 w-full rounded-full font-medium" style={{ background: "#5fe3ab", color: "#0b1512", fontSize: 13.5, padding: "12.6px 0" }}>
        Done
      </motion.button>
    </div>
  );
}
