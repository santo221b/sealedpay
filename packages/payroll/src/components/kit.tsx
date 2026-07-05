/**
 * Payroll design kit — the shared primitives every screen composes.
 * Pure presentation; nothing here talks to the chain.
 */
import { LockIcon, Spinner } from "@dispersekit/widget";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

/* ── Icons (inline, 16×16 viewBox, currentColor) ─────────────────────────── */

const icon = "h-4 w-4 shrink-0";
export function HomeIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 1.5 1.5 7h1.75v6.5h4v-4h1.5v4h4V7h1.75L8 1.5Z" />
    </svg>
  );
}
export function UsersIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6a5 5 0 0 1 10 0v.5H1V14Zm10.5-6.6a2.75 2.75 0 0 0 0-4.8 3 3 0 0 1 0 4.8Zm1.9 6.6h1.85V14a4.6 4.6 0 0 0-2.7-4.2 6 6 0 0 1 .85 4.2Z" />
    </svg>
  );
}
export function CardIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M1 4.5A1.5 1.5 0 0 1 2.5 3h11A1.5 1.5 0 0 1 15 4.5V6H1V4.5ZM1 8h14v3.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 11.5V8Zm2 2.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5H3Z" />
    </svg>
  );
}
export function GearIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M6.3 1.6a.8.8 0 0 1 .79-.6h1.82a.8.8 0 0 1 .78.6l.3 1.2c.4.15.79.37 1.13.62l1.2-.36a.8.8 0 0 1 .92.36l.9 1.57a.8.8 0 0 1-.13.97l-.9.86a5 5 0 0 1 0 1.3l.9.86a.8.8 0 0 1 .14.97l-.91 1.57a.8.8 0 0 1-.92.36l-1.2-.36c-.34.25-.72.47-1.12.62l-.3 1.2a.8.8 0 0 1-.79.6H7.09a.8.8 0 0 1-.78-.6L6 12.14a5.3 5.3 0 0 1-1.12-.62l-1.2.36a.8.8 0 0 1-.92-.36l-.91-1.57a.8.8 0 0 1 .13-.97l.9-.86a5 5 0 0 1 0-1.3l-.9-.86a.8.8 0 0 1-.13-.97l.9-1.57a.8.8 0 0 1 .93-.36l1.2.36c.34-.25.72-.47 1.12-.62l.3-1.2ZM8 10.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
    </svg>
  );
}
export function EyeIcon({ className = icon }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 3C4.5 3 1.9 5.4 1 8c.9 2.6 3.5 5 7 5s6.1-2.4 7-5c-.9-2.6-3.5-5-7-5Zm0 8.25A3.25 3.25 0 1 1 8 4.75a3.25 3.25 0 0 1 0 6.5ZM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}
export function CopyIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1h6A1.5 1.5 0 0 1 14 2.5v6A1.5 1.5 0 0 1 12.5 10H11v1.5A1.5 1.5 0 0 1 9.5 13h-6A1.5 1.5 0 0 1 2 11.5v-6A1.5 1.5 0 0 1 3.5 4H5V2.5ZM6.5 4h3A1.5 1.5 0 0 1 11 5.5v3h1.5a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0-.5.5V4Z" />
    </svg>
  );
}
export function ExternalIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M6.5 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V9.5a.75.75 0 0 0-1.5 0v3h-8v-8h3a.75.75 0 0 0 0-1.5ZM9 2.75c0 .41.34.75.75.75h1.69L6.72 8.22a.75.75 0 1 0 1.06 1.06L12.5 4.56v1.69a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-.75-.75H9.75a.75.75 0 0 0-.75.75Z" />
    </svg>
  );
}
export { LockIcon, Spinner };

/* ── Primitives ──────────────────────────────────────────────────────────── */

export function PButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
  const look = {
    primary: "bg-orange-600 text-white shadow-sm hover:bg-orange-700 active:scale-[0.98]",
    ghost: "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
    outline: "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:text-stone-900",
  }[variant];
  return <button className={`${base} ${look} ${className}`} {...props} />;
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-stone-200/70 bg-white p-5 shadow-[0_1px_3px_rgb(0,0,0,0.04)] ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-stone-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-[0_1px_3px_rgb(0,0,0,0.04)]">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">{icon}</div>
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-stone-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

export function StatusChip({ tone, children }: { tone: "green" | "orange" | "red" | "neutral"; children: ReactNode }) {
  const look = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-600",
    neutral: "bg-stone-100 text-stone-500",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${look}`}>{children}</span>;
}

const AVATAR_HUES = ["bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700"];
export function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_HUES[hash % AVATAR_HUES.length]}`}>
      {initials || "?"}
    </span>
  );
}

export function WalletChip({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={address}
      onClick={() => {
        void navigator.clipboard?.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-500 hover:text-stone-800"
    >
      {address.slice(0, 6)}…{address.slice(-4)}
      {copied ? <span className="text-emerald-600">✓</span> : <CopyIcon />}
    </button>
  );
}

/**
 * The privacy signature: amounts render masked with a lock, revealed only on
 * an explicit click. The chain never sees these numbers; this makes that
 * feeling tangible on every screen.
 */
export function AmountCell({ value, suffix }: { value: string | undefined; suffix?: string }) {
  const [revealed, setRevealed] = useState(false);
  if (value === undefined) return <Skeleton className="ml-auto h-4 w-16" />;
  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      title={revealed ? "Hide amount" : "Reveal amount (only you can)"}
      aria-label={revealed ? "Hide amount" : "Reveal amount"}
      className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-sm hover:bg-stone-100"
    >
      <AnimatePresence mode="wait" initial={false}>
        {revealed ? (
          <motion.span key="clear" initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-semibold text-stone-900">
            {value}
            {suffix && <span className="ml-1 text-[11px] font-medium text-stone-400">{suffix}</span>}
          </motion.span>
        ) : (
          <motion.span key="masked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tracking-wider text-stone-400">
            ••••
          </motion.span>
        )}
      </AnimatePresence>
      <LockIcon className={`h-3 w-3 ${revealed ? "text-stone-300" : "text-orange-500"} group-hover:text-orange-600`} />
    </button>
  );
}

export function EmptyState({ icon, title, line, cta }: { icon: ReactNode; title: string; line: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">{icon}</div>
      <p className="font-semibold text-stone-700">{title}</p>
      <p className="max-w-xs text-sm text-stone-400">{line}</p>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  // A span (not div) so it can legally sit inside <p>/<button> containers.
  return <span className={`block animate-pulse rounded-lg bg-stone-100 ${className}`} />;
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-stone-900/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label={title}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h3 className="font-semibold text-stone-800">{title}</h3>
              <button className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
