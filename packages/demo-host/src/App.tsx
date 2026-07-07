/**
 * "Acme Payroll" — a fictional partner product proving the white-label story.
 *
 * The entire DisperseKit integration is the two highlighted imports and the
 * two JSX tags below. Everything else on this page is Acme's own product
 * chrome, styled in SealedPay's light design language (Manrope, mint accent,
 * rounded glass, smooth motion) — the widgets pick up the brand via `theme`.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

// ⬇⬇ the integration ⬇⬇
import { DisperseWidget, ReceiptWidget, type DisperseTheme } from "@dispersekit/widget";
// ⬆⬆ that's all of it ⬆⬆

// Acme's brand, expressed in SealedPay's light-mint palette.
const acmeTheme: DisperseTheme = {
  accent: "#17976f",
  accentText: "#ffffff",
  background: "#ffffff",
  surface: "#f1f8f4",
  text: "#16241d",
  muted: "#5f7a70",
  border: "#dde9e3",
  radius: "18px",
};

const INTEGRATION_SNIPPET = `import { DisperseWidget } from "@dispersekit/widget";

<DisperseWidget
  token={ACME_PAYROLL_TOKEN}
  theme={acmeBrand}
  onDispersed={(r) => toast.success(\`Paid \${r.recipients.length} people\`)}
/>`;

const EASE = [0.22, 1, 0.36, 1] as const;
const GRADIENT = "linear-gradient(135deg,#2e9478,#17976f)";
const TABS = [
  ["run", "Run payroll"],
  ["receipts", "My pay"],
] as const;
const FEATURES = [
  "Amounts encrypted before they leave this page",
  "One transaction, one gas payment",
  "Every contractor privately verifies their own pay",
];

function CheckDot() {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 20, height: 20, background: "rgba(23,151,111,0.12)" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#17976f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export function App() {
  const [tab, setTab] = useState<"run" | "receipts">("run");
  const [showCode, setShowCode] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{
        color: "#16241d",
        fontFamily: "'Manrope', system-ui, sans-serif",
        background: "radial-gradient(1100px 620px at 82% -8%, rgba(95,230,175,0.20), rgba(255,255,255,0) 60%), linear-gradient(180deg, #f6faf8 0%, #eef6f1 100%)",
      }}
    >
      {/* Acme's own chrome */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="sticky top-0 z-10"
        style={{ borderBottom: "1px solid rgba(23,151,111,0.12)", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center rounded-[11px]" style={{ width: 32, height: 32, background: GRADIENT, boxShadow: "0 4px 14px rgba(23,151,111,0.32)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="11" width="16" height="10" rx="2.4" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Acme Payroll</span>
            <span className="rounded-full" style={{ marginLeft: 4, background: "rgba(23,151,111,0.1)", color: "#17976f", fontSize: 10, fontWeight: 600, padding: "3.5px 10px", letterSpacing: 0.2 }}>
              DEMO · DisperseKit embed
            </span>
          </div>
          <nav className="flex" style={{ gap: 4 }}>
            {TABS.map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="relative cursor-pointer rounded-full"
                  style={{ padding: "8px 17px", fontSize: 13, fontWeight: 500, color: active ? "#ffffff" : "#5f7a70", transition: "color .2s" }}
                >
                  {active && (
                    <motion.span
                      layoutId="acme-tab"
                      className="absolute inset-0 rounded-full"
                      style={{ background: GRADIENT, zIndex: -1, boxShadow: "0 4px 14px rgba(23,151,111,0.28)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </motion.header>

      <main className="mx-auto grid max-w-5xl items-start gap-12 px-6 py-14 md:grid-cols-[1fr_auto]">
        <AnimatePresence mode="wait">
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {tab === "run" ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: "#17976f" }}>Confidential payroll</div>
                <h1 style={{ fontSize: 35, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.08, marginTop: 10 }}>July contractor payroll</h1>
                <p style={{ marginTop: 12, maxWidth: 440, fontSize: 14.5, color: "#5f7a70", lineHeight: 1.62 }}>
                  Pay the whole team in one confidential transaction. Salaries stay between Acme and each contractor,
                  even on a public chain.
                </p>
                <ul className="flex flex-col" style={{ gap: 12, marginTop: 28 }}>
                  {FEATURES.map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.12 + i * 0.08 }}
                      className="flex items-center"
                      style={{ gap: 11, fontSize: 14, color: "#324a41" }}
                    >
                      <CheckDot />
                      {f}
                    </motion.li>
                  ))}
                </ul>
                <motion.button
                  type="button"
                  onClick={() => setShowCode((s) => !s)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="cursor-pointer rounded-full"
                  style={{ marginTop: 30, background: "#ffffff", border: "1px solid #dbe8e2", boxShadow: "0 2px 10px rgba(23,151,111,0.06)", color: "#324a41", fontSize: 12.5, fontWeight: 500, padding: "9px 18px" }}
                >
                  {showCode ? "Hide" : "Show"} the integration code
                </motion.button>
                <AnimatePresence>
                  {showCode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      style={{ overflow: "hidden" }}
                    >
                      <pre
                        className="overflow-x-auto"
                        style={{ marginTop: 14, maxWidth: 460, borderRadius: 16, background: "#0e1b16", color: "#bdead9", fontSize: 11.5, lineHeight: 1.65, padding: "16px 18px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
                      >
                        {INTEGRATION_SNIPPET}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: "#17976f" }}>For the contractor</div>
                <h1 style={{ fontSize: 35, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.08, marginTop: 10 }}>My pay</h1>
                <p style={{ marginTop: 12, maxWidth: 440, fontSize: 14.5, color: "#5f7a70", lineHeight: 1.62 }}>
                  Only you can decrypt your pay. Acme sees that a payment happened. The amount is yours alone to reveal.
                </p>
              </>
            )}
          </motion.section>
        </AnimatePresence>

        {/* the embedded widgets — Acme-branded via `theme` */}
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.08 }}
          className="md:w-[26rem]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {tab === "run" ? (
                <DisperseWidget
                  title="Pay contractors"
                  theme={acmeTheme}
                  onDispersed={(r) => console.log("[acme] payroll dispersed:", r.txHash)}
                />
              ) : (
                <ReceiptWidget title="My pay" theme={acmeTheme} />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </main>

      <div className="mx-auto max-w-5xl px-6 pb-12 text-center" style={{ fontSize: 11.5, color: "#8aa89d" }}>
        Powered by DisperseKit · TokenOps disperse · Zama FHE
      </div>
    </div>
  );
}
