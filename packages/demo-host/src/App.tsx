/**
 * DisperseKit — the SDK landing / docs page.
 *
 * One engine for confidential token disperse. This page explains the two ways
 * to ship it (a drop-in widget, or building on the engine) and points at
 * SealedPay, a full payroll product built entirely on the engine layer.
 *
 * Dark theme, matched to SealedPay's design tokens (near-black green base,
 * mint accents, glass cards, radial glows, onboarding aurora bloom) so the two
 * properties read as one family. Palette source of truth:
 * packages/payroll/src/design/tokens.ts.
 */
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const T = {
  app: "linear-gradient(180deg, #070c0a 0%, #0a1210 34%, #101915 62%, #0d1411 100%)",
  bloom: "radial-gradient(120% 80% at 50% 118%, rgba(78,206,152,0.5), rgba(46,148,116,0.12) 40%, rgba(0,0,0,0) 66%)",
  heading: "#f2f7f4",
  secondary: "#cfdcd6",
  muted: "#9db3aa",
  dim: "#7b8f85",
  mint: "#5fe3ab",
  mintText: "#78e9c0",
  onAccent: "#08331f",
  mintGrad: "linear-gradient(135deg,#6fe9b7,#34d399)",
  caseGrad: "linear-gradient(135deg,#1f9d75,#125437)",
  puck: "rgba(59,191,142,0.18)",
  pillBorder: "rgba(95,230,175,0.5)",
  cardBg: "rgba(110,196,186,0.09)",
  cardBgSoft: "rgba(110,196,186,0.055)",
  cardBorder: "rgba(225,248,238,0.08)",
  cardShadow:
    "inset 0 7.2px 12.6px -7.2px rgba(255,255,255,0.056), inset 8.1px 0 16.2px -10.8px rgba(150,235,255,0.032), inset -8.1px -7.2px 16.2px -10.8px rgba(255,160,225,0.026), 0 14px 40px -22px rgba(0,0,0,0.7)",
  buttonGlow: "0 0 0 1px rgba(120,233,192,0.4), 0 6px 22px -6px rgba(59,191,142,0.6)",
  codeBg: "rgba(3,9,7,0.55)",
  codeText: "#bdead9",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

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

function Card({ children, style, soft }: { children: React.ReactNode; style?: React.CSSProperties; soft?: boolean }) {
  return (
    <div style={{ background: soft ? T.cardBgSoft : T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 22, boxShadow: T.cardShadow, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", ...style }}>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto" style={{ borderRadius: 14, background: T.codeBg, border: `1px solid ${T.cardBorder}`, color: T.codeText, fontSize: 11.5, lineHeight: 1.65, padding: "15px 17px", fontFamily: T.mono }}>
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

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {children}
    </motion.section>
  );
}

function PathCard({ num, title, desc, code, link }: { num: string; title: string; desc: string; code: string; link?: { label: string; href: string } }) {
  return (
    <Card style={{ padding: 22, height: "100%" }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: T.puck, color: T.mintText, fontSize: 12, fontWeight: 700 }}>{num}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.heading }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginTop: 10 }}>{desc}</p>
      <div style={{ marginTop: 14 }}>
        <CodeBlock code={code} />
      </div>
      {link && (
        <a href={link.href} target="_blank" rel="noreferrer" className="mt-3.5 inline-flex items-center hover:underline" style={{ gap: 5, fontSize: 12.5, fontWeight: 600, color: T.mintText }}>
          {link.label}
          <Arrow />
        </a>
      )}
    </Card>
  );
}

export function App() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ color: T.heading, fontFamily: "'Manrope', system-ui, sans-serif", background: T.app }}>
      {/* Onboarding aurora bloom (bottom) + ambient mint glows — SealedPay signature */}
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ background: T.bloom }} />
      <div aria-hidden className="pointer-events-none fixed" style={{ left: "88%", top: "4%", width: 760, height: 760, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.32), rgba(0,0,0,0) 66%)", filter: "blur(30px)" }} />
      <div aria-hidden className="pointer-events-none fixed" style={{ left: "-4%", top: "58%", width: 560, height: 560, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(73,169,130,0.16), rgba(0,0,0,0) 66%)", filter: "blur(34px)" }} />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="sticky top-0 z-10"
        style={{ borderBottom: "1px solid rgba(225,248,238,0.06)", background: "rgba(7,12,10,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center rounded-[11px]" style={{ width: 32, height: 32, background: T.mintGrad, boxShadow: "0 4px 16px rgba(59,191,142,0.4)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#08331f" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="11" width="16" height="10" rx="2.4" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.heading }}>DisperseKit</span>
            <span className="rounded-full" style={{ marginLeft: 4, background: T.puck, color: T.mintText, border: `1px solid ${T.pillBorder}`, fontSize: 10, fontWeight: 600, padding: "3px 10px", letterSpacing: 0.3 }}>
              SDK
            </span>
          </div>
          <nav className="flex items-center" style={{ fontSize: 13, fontWeight: 500 }}>
            <a href="https://sealedpay.vercel.app" target="_blank" rel="noreferrer" className="hover:text-[#78e9c0]" style={{ color: T.muted, transition: "color .2s" }}>SealedPay</a>
          </nav>
        </div>
      </motion.header>

      <main className="relative mx-auto max-w-4xl px-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE, delay: 0.05 }} style={{ paddingTop: 72, paddingBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.4, color: T.mintText }}>Confidential disperse SDK</div>
          <h1 style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1, lineHeight: 1.05, marginTop: 12, maxWidth: 640, color: T.heading }}>
            Pay everyone in one transaction, with amounts nobody can see.
          </h1>
          <p style={{ marginTop: 16, maxWidth: 560, fontSize: 15.5, color: T.muted, lineHeight: 1.62 }}>
            DisperseKit is one engine for confidential token disperse on Zama FHE. Drop in a themeable widget in
            minutes, or build a whole product on the hooks. SealedPay, a full confidential payroll dashboard, is built
            entirely on the engine layer.
          </p>
          <div className="flex flex-wrap items-center" style={{ gap: 11, marginTop: 26 }}>
            <motion.a href="https://sealedpay.vercel.app" target="_blank" rel="noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center rounded-full" style={{ gap: 7, background: T.mintGrad, color: T.onAccent, fontSize: 13, fontWeight: 700, padding: "11px 22px", boxShadow: T.buttonGlow, textDecoration: "none" }}>
              See SealedPay
              <Arrow />
            </motion.a>
            <motion.a href="#confidential" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center rounded-full" style={{ gap: 7, background: "transparent", color: T.secondary, border: `1px solid ${T.cardBorder}`, fontSize: 13, fontWeight: 600, padding: "11px 20px", textDecoration: "none" }}>
              How it stays private
            </motion.a>
          </div>
        </motion.div>

        {/* Two paths */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>Two ways to ship it</h2>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>Same engine underneath, whichever you pick.</p>
          <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 22 }}>
            <PathCard num="01" title="Drop in the widget" desc="Themeable, no backend. Wrap it in the provider, pass a token, done. Good for adding confidential payouts to an existing app." code={WIDGET_SNIPPET} />
            <PathCard num="02" title="Build on the engine" desc="Use the hooks and FHE helpers to build any UI. This is how SealedPay works: a custom dashboard, the same engine, zero re-implementation of a single on-chain or crypto step." code={ENGINE_SNIPPET} link={{ label: "See SealedPay", href: "https://sealedpay.vercel.app" }} />
          </div>
        </Section>

        {/* SealedPay case study */}
        <Section>
          <div className="relative overflow-hidden" style={{ marginTop: 56, borderRadius: 24, background: T.caseGrad, padding: "30px 32px", boxShadow: "0 24px 70px -30px rgba(59,191,142,0.55), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
            <div aria-hidden className="absolute rounded-full" style={{ width: 220, height: 220, top: -70, right: -50, background: "rgba(255,255,255,0.1)" }} />
            <div aria-hidden className="absolute rounded-full" style={{ width: 130, height: 130, top: -20, right: 90, background: "rgba(255,255,255,0.07)" }} />
            <div className="relative">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: "rgba(255,255,255,0.82)" }}>Case study</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 8 }}>SealedPay is a product on this SDK</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", lineHeight: 1.62, marginTop: 10, maxWidth: 620 }}>
                A full confidential payroll dashboard: onboarding, an employee roster, encrypted balances, one-click
                payroll runs, and a recipient view where each employee decrypts only their own pay. It ships its own
                design and reuses the engine for every on-chain and cryptographic step.
              </p>
              <div className="flex flex-wrap" style={{ gap: 7, marginTop: 16 }}>
                {SEALEDPAY_USES.map((u) => (
                  <span key={u} style={{ fontSize: 11.5, fontFamily: T.mono, color: "#eafaf3", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 9px" }}>{u}</span>
                ))}
              </div>
              <motion.a href="https://sealedpay.vercel.app" target="_blank" rel="noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-5 inline-flex items-center rounded-full" style={{ gap: 7, background: "#fff", color: "#125437", fontSize: 13, fontWeight: 700, padding: "11px 22px", textDecoration: "none" }}>
                Open SealedPay
                <Arrow />
              </motion.a>
            </div>
          </div>
        </Section>

        {/* Confidentiality */}
        <Section id="confidential">
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>How it stays confidential</h2>
          <div className="grid gap-4 md:grid-cols-4" style={{ marginTop: 18 }}>
            {STEPS.map(([title, body], i) => (
              <Card key={title} soft style={{ padding: "18px 18px", height: "100%" }}>
                <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: T.mintGrad, color: T.onAccent, fontSize: 11.5, fontWeight: 700 }}>{i + 1}</span>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12, color: T.heading }}>{title}</div>
                <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.55, marginTop: 5 }}>{body}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* API surface */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>What you import</h2>
          <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 18 }}>
            {([["The engine", ENGINE_API], ["Ready-made parts", PARTS_API]] as const).map(([label, items]) => (
              <Card key={label} style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.heading }}>{label}</div>
                <div className="flex flex-wrap" style={{ gap: 7, marginTop: 12 }}>
                  {items.map((it) => (
                    <span key={it} style={{ fontSize: 11.5, fontFamily: T.mono, color: T.secondary, background: "rgba(110,196,186,0.08)", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "4px 9px" }}>{it}</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center" style={{ marginTop: 72, paddingBottom: 56, fontSize: 11.5, color: T.dim }}>
          DisperseKit · TokenOps confidential disperse · Zama FHE
        </div>
      </main>
    </div>
  );
}
