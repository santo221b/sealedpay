/**
 * SealedPay design kit — primitives shared by every screen, styled verbatim
 * from the design handoff tokens. Purely presentational.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

import { motionTokens, tokens } from "./tokens";

/* ── Glass surfaces ──────────────────────────────────────────────────────── */

export function GlassCard({
  children,
  dim = false,
  className = "",
  style,
}: {
  children: ReactNode;
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: dim ? tokens.glass.cardDim : tokens.glass.card,
        boxShadow: tokens.glass.cardShadow,
        borderRadius: tokens.radius.card,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Pills (Set E unified) ───────────────────────────────────────────────── */

export function Pill({
  tone = "green",
  children,
  className = "",
}: {
  tone?: "green" | "pending";
  children: ReactNode;
  className?: string;
}) {
  const green = tone === "green";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-normal ${className}`}
      style={{
        borderRadius: tokens.radius.pill,
        border: `1px solid ${green ? tokens.accent.pillBorder : tokens.warn.pendingBorder}`,
        color: green ? tokens.accent.pillText : tokens.warn.pendingText,
        background: "transparent",
      }}
    >
      {children}
    </span>
  );
}

/* ── Icon puck ───────────────────────────────────────────────────────────── */

export function IconPuck({
  children,
  size = 36,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size, borderRadius: "50%", background: tokens.accent.puckBg, color: tokens.accent.pillText }}
    >
      {children}
    </span>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryButton({ children, className = "", disabled, ...rest }: ButtonProps) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      whileHover={disabled || reduced ? undefined : { scale: 1.03, boxShadow: tokens.glass.buttonGlow }}
      whileTap={disabled || reduced ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ borderRadius: tokens.radius.control, background: tokens.accent.primary, color: tokens.text.onAccentDark }}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({ children, className = "", disabled, ...rest }: ButtonProps) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      whileHover={disabled || reduced ? undefined : { scale: 1.03 }}
      whileTap={disabled || reduced ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{
        borderRadius: tokens.radius.control,
        background: tokens.glass.rail,
        border: `1px solid ${tokens.glass.railBorder}`,
        color: tokens.text.nearWhite,
      }}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
}

export function GhostButton({ children, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition-colors hover:text-[#f2f7f4] disabled:opacity-40 ${className}`}
      style={{
        borderRadius: tokens.radius.pill,
        border: `1px solid ${tokens.glass.railBorder}`,
        color: tokens.text.muted,
        background: "transparent",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Warning-red outlined confirm (logout). */
export function DangerOutlineButton({ children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold ${className}`}
      style={{
        borderRadius: tokens.radius.control,
        background: tokens.warn.dangerBg,
        border: `1px solid ${tokens.warn.dangerBorder}`,
        color: tokens.warn.dangerText,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Setting toggle ──────────────────────────────────────────────────────── */

export function SettingToggle({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  sub?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 py-2 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium" style={{ color: tokens.text.nearWhite }}>
          {label}
        </span>
        {sub && (
          <span className="block text-[11px]" style={{ color: tokens.text.subtle }}>
            {sub}
          </span>
        )}
      </span>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{ background: on ? tokens.accent.primary : "rgba(157,179,170,0.25)" }}
      >
        <motion.span
          layout={!reduced}
          transition={motionTokens.springPop}
          className="absolute h-4 w-4 rounded-full bg-white"
          style={{ left: on ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

/* ── Modal shell ─────────────────────────────────────────────────────────── */

export function ModalShell({
  open,
  onClose,
  children,
  width = 440,
  anchor = "center",
  labelledBy,
  contentClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  /** center = bloom from center; a corner = unfold from that origin (popovers). */
  anchor?: "center" | "top-left" | "top-right";
  labelledBy?: string;
  contentClassName?: string;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const origin = anchor === "top-left" ? "top left" : anchor === "top-right" ? "top right" : "center";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          style={{ background: tokens.bg.scrim, backdropFilter: "blur(10px)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby={labelledBy}
            className={`max-h-[86vh] w-full overflow-y-auto slim-scroll ${contentClassName}`}
            style={{
              maxWidth: width,
              borderRadius: tokens.radius.modal,
              background: "rgba(16,25,21,0.92)",
              boxShadow: `${tokens.glass.cardShadow}, 0 24px 60px -20px rgba(0,0,0,0.6)`,
              transformOrigin: origin,
            }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={motionTokens.springPanel}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Staggered form content (Add Employee / Fund Wallet), per the inventory. */
export function StaggerItem({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.042, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
