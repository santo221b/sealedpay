/**
 * "Acme Payroll" — a fictional partner product proving the white-label story.
 *
 * The entire DisperseKit integration is the two highlighted imports and the
 * two JSX tags below. Everything else on this page is Acme's own product
 * chrome, styled in SealedPay's light design language (Manrope, mint accent,
 * rounded glass, smooth motion) — the widgets pick up the brand via `theme`.
 *
 * The header badge opens a "Build with DisperseKit" docs page: this Acme
 * embed and the SealedPay dashboard are two products on one engine.
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

const WIDGET_SNIPPET = `import { DisperseProviders, DisperseWidget } from "@dispersekit/widget";

<DisperseProviders theme={acmeBrand} appName="Acme">
  <DisperseWidget
    token={ACME_PAYROLL_TOKEN}
    onDispersed={(r) => toast(\`Paid \${r.recipients.length} people\`)}
  />
</DisperseProviders>`;

const ENGINE_SNIPPET = `import {
  useDisperseFlow, getFhevmInstance, userDecryptHandles,
} from "@dispersekit/widget";

// Drive YOUR OWN UI from the same engine:
const flow = useDisperseFlow({ token, recipients });
// flow.phase: encrypting -> authorizing -> dispersing -> delivered

// A recipient reveals only their own amount, with one signature:
const clear = await userDecryptHandles({
  instance: await getFhevmInstance(),
  requests, userAddress, signTypedData,
});`;

const STEPS = [
  ["Encrypt in the browser", "Amounts are encrypted client-side before any transaction. Plaintext never leaves the page."],
  ["Authorize once", "A single operator grant lets the disperse contract move the encrypted balance."],
  ["One transaction", "Every recipient is paid in one confidential transfer. One gas payment for the whole run."],
  ["Recipients verify", "Each recipient decrypts only their own amount with one signature. Nobody else can read it."],
];
const ENGINE_API = ["useDisperseFlow", "getFhevmInstance", "userDecryptHandles", "encryptAmounts", "parseRecipients", "useTokenMeta", "erc7984Abi / disperseAbi", "formatAmount"];
const PARTS_API = ["DisperseProviders", "DisperseWidget", "ReceiptWidget", "StatusTimeline", "DeliveredPanel", "PrivacyBadge"];

function CheckDot() {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 20, height: 20, background: "rgba(23,151,111,0.12)" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#17976f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2ede8", borderRadius: 20, boxShadow: "0 8px 30px rgba(23,151,111,0.07)", ...style }}>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto" style={{ borderRadius: 14, background: "#0e1b16", color: "#bdead9", fontSize: 11.5, lineHeight: 1.65, padding: "15px 17px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
      {code}
    </pre>
  );
}

function PathCard({ num, title, desc, code, link, i }: { num: string; title: string; desc: string; code: string; link?: { label: string; href: string }; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.1 }}
    >
      <Card style={{ padding: 22, height: "100%" }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: "rgba(23,151,111,0.1)", color: "#17976f", fontSize: 12, fontWeight: 700 }}>{num}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        </div>
        <p style={{ fontSize: 13, color: "#5f7a70", lineHeight: 1.6, marginTop: 10 }}>{desc}</p>
        <div style={{ marginTop: 14 }}>
          <CodeBlock code={code} />
        </div>
        {link && (
          <a href={link.href} target="_blank" rel="noreferrer" className="mt-3.5 inline-flex items-center hover:underline" style={{ gap: 5, fontSize: 12.5, fontWeight: 600, color: "#17976f" }}>
            {link.label}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7" /><path d="M8 7h9v9" />
            </svg>
          </a>
        )}
      </Card>
    </motion.div>
  );
}

function Docs() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className="mx-auto max-w-4xl px-6 py-14">
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: "#17976f" }}>Documentation</div>
      <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.08, marginTop: 10 }}>Build with DisperseKit</h1>
      <p style={{ marginTop: 12, maxWidth: 560, fontSize: 15, color: "#5f7a70", lineHeight: 1.62 }}>
        One confidential-disperse engine. Drop in the widget, or build your own product on the hooks. This Acme page
        and the SealedPay dashboard are both DisperseKit, styled differently.
      </p>

      <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 34 }}>
        <PathCard i={0} num="01" title="Drop in the widget" desc="Themeable, no backend. Wrap it in the provider, pass a token. This Acme page is exactly this." code={WIDGET_SNIPPET} />
        <PathCard i={1} num="02" title="Build on the engine" desc="Use the hooks and FHE helpers to build any UI. SealedPay is a full payroll dashboard on these, with a custom design and the same engine." code={ENGINE_SNIPPET} link={{ label: "See SealedPay", href: "https://sealedpay.vercel.app" }} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginTop: 48 }}>How it stays confidential</h2>
      <div className="grid gap-4 md:grid-cols-4" style={{ marginTop: 18 }}>
        {STEPS.map(([title, body], i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.1 + i * 0.08 }}>
            <Card style={{ padding: "18px 18px", height: "100%" }}>
              <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: GRADIENT, color: "#fff", fontSize: 11.5, fontWeight: 700 }}>{i + 1}</span>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>{title}</div>
              <div style={{ fontSize: 11.5, color: "#5f7a70", lineHeight: 1.55, marginTop: 5 }}>{body}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginTop: 48 }}>What you import</h2>
      <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 18 }}>
        {([["The engine", ENGINE_API], ["Ready-made parts", PARTS_API]] as const).map(([label, items]) => (
          <Card key={label} style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
            <div className="flex flex-wrap" style={{ gap: 7, marginTop: 12 }}>
              {items.map((it) => (
                <span key={it} style={{ fontSize: 11.5, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#324a41", background: "#f1f8f4", border: "1px solid #dde9e3", borderRadius: 8, padding: "4px 9px" }}>{it}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap" style={{ gap: 11, marginTop: 40 }}>
        {([["SealedPay live", "https://sealedpay.vercel.app"], ["Widget playground", "https://dispersekit-widget.vercel.app"]] as const).map(([label, href]) => (
          <motion.a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center rounded-full"
            style={{ gap: 7, background: GRADIENT, color: "#fff", fontSize: 13, fontWeight: 600, padding: "11px 20px", boxShadow: "0 6px 18px rgba(23,151,111,0.28)", textDecoration: "none" }}
          >
            {label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7" /><path d="M8 7h9v9" />
            </svg>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}

export function App() {
  const [tab, setTab] = useState<"run" | "receipts">("run");
  const [showCode, setShowCode] = useState(false);
  const [view, setView] = useState<"demo" | "docs">("demo");

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
            <button type="button" onClick={() => setView("demo")} className="flex cursor-pointer items-center gap-2.5">
              <span className="flex items-center justify-center rounded-[11px]" style={{ width: 32, height: 32, background: GRADIENT, boxShadow: "0 4px 14px rgba(23,151,111,0.32)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="11" width="16" height="10" rx="2.4" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Acme Payroll</span>
            </button>
            <motion.button
              type="button"
              onClick={() => setView("docs")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex cursor-pointer items-center rounded-full"
              style={{ marginLeft: 4, gap: 5, background: view === "docs" ? GRADIENT : "rgba(23,151,111,0.1)", color: view === "docs" ? "#fff" : "#17976f", fontSize: 10, fontWeight: 600, padding: "3.5px 10px", letterSpacing: 0.2 }}
            >
              DEMO · DisperseKit embed
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </motion.button>
          </div>
          <nav className="flex" style={{ gap: 4 }}>
            {view === "docs" ? (
              <button
                type="button"
                onClick={() => setView("demo")}
                className="inline-flex cursor-pointer items-center rounded-full"
                style={{ gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#5f7a70" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to demo
              </button>
            ) : (
              TABS.map(([key, label]) => {
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
              })
            )}
          </nav>
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        {view === "docs" ? (
          <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Docs />
          </motion.div>
        ) : (
          <motion.main
            key="demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto grid max-w-5xl items-start gap-12 px-6 py-14 md:grid-cols-[1fr_auto]"
          >
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
                          style={{ overflow: "hidden", maxWidth: 460 }}
                        >
                          <div style={{ marginTop: 14 }}>
                            <CodeBlock code={WIDGET_SNIPPET} />
                          </div>
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
          </motion.main>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl px-6 pb-12 text-center" style={{ fontSize: 11.5, color: "#8aa89d" }}>
        Powered by DisperseKit · TokenOps disperse · Zama FHE
      </div>
    </div>
  );
}
