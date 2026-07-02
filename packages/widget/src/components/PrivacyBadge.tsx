/**
 * "What stays private?" — the honest, one-glance answer. Judges and users
 * both ask; the widget answers before they do.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { LockIcon } from "./ui";

export function PrivacyBadge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--dk-border)] bg-[var(--dk-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--dk-muted)] hover:text-[var(--dk-text)]"
      >
        <LockIcon className="text-[var(--dk-accent)]" />
        What stays private?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 z-10 mt-2 w-64 rounded-[calc(var(--dk-radius)*0.6)] border border-[var(--dk-border)] bg-[var(--dk-bg)] p-3 text-[11px] leading-relaxed shadow-lg"
          >
            <p className="mb-1.5 font-semibold text-[var(--dk-text)]">Hidden on-chain 🔒</p>
            <p className="mb-2 text-[var(--dk-muted)]">
              Every amount and the total — encrypted in your browser; each recipient can decrypt only their own.
            </p>
            <p className="mb-1.5 font-semibold text-[var(--dk-text)]">Visible on-chain 👁️</p>
            <p className="text-[var(--dk-muted)]">
              Recipient addresses and that a payout happened — inherent to pushing tokens. The amounts are the secret,
              and they stay one.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
