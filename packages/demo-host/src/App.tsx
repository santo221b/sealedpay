/**
 * DisperseKit — the SDK landing / docs page.
 *
 * One engine for confidential token disperse. This page explains the two ways
 * to ship it (a drop-in widget, or building on the engine) and points at
 * SealedPay, a full payroll product built entirely on the engine layer.
 */
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;
const GRADIENT = "linear-gradient(135deg,#2e9478,#17976f)";

const WIDGET_SNIPPET = `import { DisperseProviders, DisperseWidget } from "@dispersekit/widget";

<DisperseProviders theme={brand} appName="Acme">
  <DisperseWidget
    token={PAYROLL_TOKEN}
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
const SEALEDPAY_USES = ["useDisperseFlow", "userDecryptHandles", "getFhevmInstance", "parseRecipients", "useTokenMeta", "the ERC-7984 + disperse ABIs"];
const ENGINE_API = ["useDisperseFlow", "getFhevmInstance", "userDecryptHandles", "encryptAmounts", "parseRecipients", "useTokenMeta", "erc7984Abi / disperseAbi", "formatAmount"];
const PARTS_API = ["DisperseProviders", "DisperseWidget", "ReceiptWidget", "StatusTimeline", "DeliveredPanel", "PrivacyBadge"];

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

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function PathCard({ num, title, desc, code, link }: { num: string; title: string; desc: string; code: string; link?: { label: string; href: string } }) {
  return (
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
          <Arrow />
        </a>
      )}
    </Card>
  );
}

function LinkPill({ label, href, filled }: { label: string; href: string; filled?: boolean }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center rounded-full"
      style={
        filled
          ? { gap: 7, background: GRADIENT, color: "#fff", fontSize: 13, fontWeight: 600, padding: "11px 20px", boxShadow: "0 6px 18px rgba(23,151,111,0.28)", textDecoration: "none" }
          : { gap: 7, background: "#fff", color: "#324a41", border: "1px solid #dbe8e2", fontSize: 13, fontWeight: 600, padding: "11px 20px", textDecoration: "none" }
      }
    >
      {label}
      <Arrow />
    </motion.a>
  );
}

export function App() {
  return (
    <div
      className="min-h-screen"
      style={{
        color: "#16241d",
        fontFamily: "'Manrope', system-ui, sans-serif",
        background: "radial-gradient(1100px 640px at 82% -10%, rgba(95,230,175,0.22), rgba(255,255,255,0) 58%), linear-gradient(180deg, #f6faf8 0%, #eef6f1 100%)",
      }}
    >
      {/* Header */}
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
            <span style={{ fontWeight: 700, fontSize: 15 }}>DisperseKit</span>
            <span className="rounded-full" style={{ marginLeft: 4, background: "rgba(23,151,111,0.1)", color: "#17976f", fontSize: 10, fontWeight: 600, padding: "3.5px 10px", letterSpacing: 0.3 }}>
              SDK
            </span>
          </div>
          <nav className="flex items-center" style={{ gap: 18, fontSize: 13, fontWeight: 500 }}>
            <a href="https://sealedpay.vercel.app" target="_blank" rel="noreferrer" className="hover:text-[#17976f]" style={{ color: "#5f7a70", transition: "color .2s" }}>SealedPay</a>
            <a href="https://dispersekit-widget.vercel.app" target="_blank" rel="noreferrer" className="hover:text-[#17976f]" style={{ color: "#5f7a70", transition: "color .2s" }}>Playground</a>
          </nav>
        </div>
      </motion.header>

      <main className="mx-auto max-w-4xl px-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE, delay: 0.05 }} style={{ paddingTop: 72, paddingBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.4, color: "#17976f" }}>Confidential disperse SDK</div>
          <h1 style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1, lineHeight: 1.05, marginTop: 12, maxWidth: 640 }}>
            Pay everyone in one transaction, with amounts nobody can see.
          </h1>
          <p style={{ marginTop: 16, maxWidth: 560, fontSize: 15.5, color: "#5f7a70", lineHeight: 1.62 }}>
            DisperseKit is one engine for confidential token disperse on Zama FHE. Drop in a themeable widget in
            minutes, or build a whole product on the hooks. SealedPay, a full confidential payroll dashboard, is built
            entirely on the engine layer.
          </p>
          <div className="flex flex-wrap" style={{ gap: 11, marginTop: 26 }}>
            <LinkPill label="See SealedPay" href="https://sealedpay.vercel.app" filled />
            <LinkPill label="Widget playground" href="https://dispersekit-widget.vercel.app" />
          </div>
        </motion.div>

        {/* Two paths */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56 }}>Two ways to ship it</h2>
          <p style={{ fontSize: 14, color: "#5f7a70", marginTop: 6 }}>Same engine underneath, whichever you pick.</p>
          <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 22 }}>
            <PathCard num="01" title="Drop in the widget" desc="Themeable, no backend. Wrap it in the provider, pass a token, done. Good for adding confidential payouts to an existing app." code={WIDGET_SNIPPET} link={{ label: "Try the widget", href: "https://dispersekit-widget.vercel.app" }} />
            <PathCard num="02" title="Build on the engine" desc="Use the hooks and FHE helpers to build any UI. This is how SealedPay works: a custom dashboard, the same engine, zero re-implementation of a single on-chain or crypto step." code={ENGINE_SNIPPET} link={{ label: "See SealedPay", href: "https://sealedpay.vercel.app" }} />
          </div>
        </Section>

        {/* SealedPay case study */}
        <Section>
          <div className="relative overflow-hidden" style={{ marginTop: 56, borderRadius: 24, background: GRADIENT, padding: "30px 32px", boxShadow: "0 18px 50px rgba(23,151,111,0.28)" }}>
            <div aria-hidden className="absolute rounded-full" style={{ width: 220, height: 220, top: -70, right: -50, background: "rgba(255,255,255,0.12)" }} />
            <div aria-hidden className="absolute rounded-full" style={{ width: 130, height: 130, top: -20, right: 90, background: "rgba(255,255,255,0.08)" }} />
            <div className="relative">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: "rgba(255,255,255,0.85)" }}>Case study</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 8 }}>SealedPay is a product on this SDK</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.62, marginTop: 10, maxWidth: 620 }}>
                A full confidential payroll dashboard: onboarding, an employee roster, encrypted balances, one-click
                payroll runs, and a recipient view where each employee decrypts only their own pay. It ships its own
                design and reuses the engine for every on-chain and cryptographic step.
              </p>
              <div className="flex flex-wrap" style={{ gap: 7, marginTop: 16 }}>
                {SEALEDPAY_USES.map((u) => (
                  <span key={u} style={{ fontSize: 11.5, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#eafaf3", background: "rgba(255,255,255,0.16)", borderRadius: 8, padding: "4px 9px" }}>{u}</span>
                ))}
              </div>
              <motion.a
                href="https://sealedpay.vercel.app"
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-5 inline-flex items-center rounded-full"
                style={{ gap: 7, background: "#fff", color: "#17976f", fontSize: 13, fontWeight: 700, padding: "11px 22px", textDecoration: "none" }}
              >
                Open SealedPay
                <Arrow />
              </motion.a>
            </div>
          </div>
        </Section>

        {/* Confidentiality */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56 }}>How it stays confidential</h2>
          <div className="grid gap-4 md:grid-cols-4" style={{ marginTop: 18 }}>
            {STEPS.map(([title, body], i) => (
              <Card key={title} style={{ padding: "18px 18px", height: "100%" }}>
                <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: GRADIENT, color: "#fff", fontSize: 11.5, fontWeight: 700 }}>{i + 1}</span>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>{title}</div>
                <div style={{ fontSize: 11.5, color: "#5f7a70", lineHeight: 1.55, marginTop: 5 }}>{body}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* API surface */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56 }}>What you import</h2>
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
        </Section>

        {/* Footer */}
        <div className="text-center" style={{ marginTop: 72, paddingBottom: 56, fontSize: 11.5, color: "#8aa89d" }}>
          DisperseKit · TokenOps confidential disperse · Zama FHE
        </div>
      </main>
    </div>
  );
}
