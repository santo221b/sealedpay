/**
 * "What stays private?" — the honest, one-glance answer. Judges and users
 * both ask; the widget answers before they do. Copy is overridable so skins
 * (e.g. the payroll dashboard) can speak their domain language — the
 * confidentiality model itself is not configurable.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { LockIcon } from "./ui";

export interface PrivacyCopy {
  hiddenTitle: string;
  hiddenBody: string;
  visibleTitle: string;
  visibleBody: string;
}

const DEFAULT_COPY: PrivacyCopy = {
  hiddenTitle: "Hidden on-chain 🔒",
  hiddenBody:
    "Every amount and the total — encrypted in your browser; each recipient can decrypt only their own.",
  visibleTitle: "Visible on-chain 👁️",
  visibleBody:
    "Recipient addresses and that a payout happened — inherent to pushing tokens. The amounts are the secret, and they stay one.",
};

export function PrivacyBadge({ copy }: { copy?: Partial<PrivacyCopy> }) {
  const text = { ...DEFAULT_COPY, ...copy };
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
            <p className="mb-1.5 font-semibold text-[var(--dk-text)]">{text.hiddenTitle}</p>
            <p className="mb-2 text-[var(--dk-muted)]">{text.hiddenBody}</p>
            <p className="mb-1.5 font-semibold text-[var(--dk-text)]">{text.visibleTitle}</p>
            <p className="text-[var(--dk-muted)]">{text.visibleBody}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
