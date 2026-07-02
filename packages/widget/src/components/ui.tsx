/** Tiny shared UI atoms, all themed via the widget's CSS variables. */
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[calc(var(--dk-radius)*0.6)] px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
  const look =
    variant === "primary"
      ? "bg-[var(--dk-accent)] text-[var(--dk-accent-text)] shadow-sm hover:brightness-105 active:scale-[0.98]"
      : "bg-transparent text-[var(--dk-muted)] hover:bg-[var(--dk-surface)] hover:text-[var(--dk-text)]";
  return <button className={`${base} ${look} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[calc(var(--dk-radius)*0.7)] border border-[var(--dk-border)] bg-[var(--dk-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 ${className}`} aria-hidden>
      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
    </svg>
  );
}

/** Ciphertext chip: how an encrypted amount is shown — never a number. */
export function CipherChip({ handle }: { handle?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--dk-text)]/85 px-2 py-0.5 font-mono text-[10px] text-[var(--dk-bg)]">
      <LockIcon className="h-2.5 w-2.5" />
      {handle ? `${handle.slice(0, 10)}…` : "encrypted"}
    </span>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-middle"
    />
  );
}
