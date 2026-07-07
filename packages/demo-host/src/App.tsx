/**
 * DisperseKit — the SDK landing / docs page.
 *
 * One SDK for confidential token disperse, built on Zama FHE (encryption) and
 * TokenOps (confidential transfers + batch disperse). This page tells the SDK
 * story, names the foundation it stands on, and points at SealedPay — a full
 * payroll product built on the SDK — as a restrained case study.
 *
 * Its own dark identity: a teal / cyan scheme (distinct from SealedPay's green)
 * with a glow rising from the center-bottom. Glass cards + motion keep it in the
 * same design family without looking like a second SealedPay.
 */
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const T = {
  app: "linear-gradient(180deg, #05090e 0%, #06111a 36%, #0a1c29 66%, #06121b 100%)",
  bloom: "radial-gradient(125% 92% at 50% 116%, rgba(52,216,222,0.5), rgba(22,148,178,0.13) 44%, rgba(0,0,0,0) 68%)",
  heading: "#eef6f8",
  secondary: "#c7dbe0",
  muted: "#93b0b8",
  dim: "#6f8b93",
  accent: "#39d5dd",
  accentText: "#7ce8ec",
  onAccent: "#04323a",
  accentGrad: "linear-gradient(135deg,#5fe6e6,#28c6dc)",
  puck: "rgba(45,200,220,0.18)",
  pillBorder: "rgba(95,222,230,0.5)",
  cardBg: "rgba(110,192,204,0.09)",
  cardBgSoft: "rgba(110,192,204,0.055)",
  cardBorder: "rgba(225,244,248,0.08)",
  cardShadow:
    "inset 0 7.2px 12.6px -7.2px rgba(255,255,255,0.056), inset 8.1px 0 16.2px -10.8px rgba(150,235,255,0.032), inset -8.1px -7.2px 16.2px -10.8px rgba(160,225,255,0.03), 0 14px 40px -22px rgba(0,0,0,0.7)",
  buttonGlow: "0 0 0 1px rgba(120,228,232,0.4), 0 6px 22px -6px rgba(46,205,221,0.6)",
  codeBg: "rgba(3,10,13,0.55)",
  codeText: "#bfe8ec",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const ENGINE_SNIPPET = `import {
  useDisperseFlow, getFhevmInstance, userDecryptHandles,
} from "@dispersekit/widget";

// Drive YOUR OWN UI from the SDK. SealedPay is built exactly this way:
const flow = useDisperseFlow({ token, recipients });
// flow.phase: encrypting -> authorizing -> dispersing -> delivered

// A recipient reveals only their own amount, with one signature.
// Encryption + decryption run on Zama FHE under the hood:
const clear = await userDecryptHandles({
  instance: await getFhevmInstance(),
  requests, userAddress, signTypedData,
});`;

const STEPS = [
  ["Encrypt in the browser", "Amounts are encrypted client-side on Zama FHE before any transaction. Plaintext never leaves the page."],
  ["Authorize once", "A single operator grant lets the TokenOps disperse contract move the encrypted balance."],
  ["One transaction", "Every recipient is paid in one confidential transfer. One gas payment for the whole run."],
  ["Recipients verify", "Each recipient decrypts only their own amount with one signature. Nobody else can read it."],
];

const FOUNDATION = [
  {
    name: "Zama FHE",
    role: "Encryption layer",
    desc: "Amounts are encrypted with Zama's FHEVM, fully homomorphic encryption that keeps values secret on-chain. The SDK wraps the fhevm instance, the encryption, and user-decryption, so you never touch the cryptography.",
    tags: ["getFhevmInstance", "encryptAmounts", "userDecryptHandles"],
  },
  {
    name: "TokenOps",
    role: "Transfer layer",
    desc: "Payouts settle as TokenOps confidential transfers, ERC-7984 tokens dispersed to every recipient in a single transaction. The SDK ships the ABIs and the batch-disperse flow ready to call.",
    tags: ["erc7984Abi", "disperseAbi", "useDisperseFlow"],
  },
];

const SEALEDPAY_USES = ["useDisperseFlow", "userDecryptHandles", "getFhevmInstance", "parseRecipients", "useTokenMeta", "the ERC-7984 + disperse ABIs"];
const ENGINE_API = ["useDisperseFlow", "getFhevmInstance", "userDecryptHandles", "encryptAmounts", "parseRecipients", "useTokenMeta", "erc7984Abi / disperseAbi", "formatAmount"];
const PARTS_API = ["DisperseProviders", "StatusTimeline", "DeliveredPanel", "PrivacyBadge"];

function BrandMark({ size = 20, fill = T.onAccent }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} fillRule="evenodd" clipRule="evenodd" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M20 8.75a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5zM4 7.25a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5zM20 16.25a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5zM4 14.75a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5z" />
      <path d="M4.75 18.25H4a.75.75 0 0 1-.75-.75V14a.75.75 0 0 1 .75-.75h.75zM4.75 10.75H4a.75.75 0 0 1-.75-.75V6.5A.75.75 0 0 1 4 5.75h.75zM19.25 13.25H20a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-.75zM19.25 5.75H20a.75.75 0 0 1 .75.75V10a.75.75 0 0 1-.75.75h-.75zM18.25 5.5v13A2.25 2.25 0 0 1 16 20.75H8a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8 3.25h8a2.25 2.25 0 0 1 2.25 2.25zm-5.424 2.711a.188.188 0 0 0-.349-.118l-2.662 4.564a.19.19 0 0 0-.001.189.19.19 0 0 0 .163.094h1.553l-.356 2.849a.188.188 0 0 0 .349.118l2.662-4.564a.19.19 0 0 0 .001-.189.19.19 0 0 0-.163-.094H12.47z" />
    </svg>
  );
}

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

function FoundationPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 6, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 999, padding: "5px 12px 5px 10px", fontSize: 12, fontWeight: 600, color: T.secondary }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: T.accent, boxShadow: "0 0 8px rgba(57,213,221,0.85)" }} />
      {label}
    </span>
  );
}

export function App() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ color: T.heading, fontFamily: "'Manrope', system-ui, sans-serif", background: T.app }}>
      {/* Teal bloom rising from the center-bottom + faint ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ background: T.bloom }} />
      <div aria-hidden className="pointer-events-none fixed" style={{ left: "86%", top: "2%", width: 720, height: 720, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(46,201,221,0.22), rgba(0,0,0,0) 66%)", filter: "blur(32px)" }} />
      <div aria-hidden className="pointer-events-none fixed" style={{ left: "-2%", top: "48%", width: 520, height: 520, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(46,201,221,0.12), rgba(0,0,0,0) 66%)", filter: "blur(36px)" }} />

      {/* Header — transparent, no band */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative z-10"
      >
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center rounded-[11px]" style={{ width: 32, height: 32, background: T.accentGrad, boxShadow: "0 4px 16px rgba(46,205,221,0.4)" }}>
              <BrandMark size={22} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: T.heading }}>DisperseKit</span>
            <span className="rounded-full" style={{ marginLeft: 4, background: T.puck, color: T.accentText, border: `1px solid ${T.pillBorder}`, fontSize: 10, fontWeight: 600, padding: "3px 10px", letterSpacing: 0.3 }}>
              SDK
            </span>
          </div>
        </div>
      </motion.header>

      <main className="relative mx-auto max-w-4xl px-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE, delay: 0.05 }} style={{ paddingTop: 56, paddingBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.4, color: T.accentText }}>Confidential disperse SDK</div>
          <h1 style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1, lineHeight: 1.05, marginTop: 12, maxWidth: 640, color: T.heading }}>
            Pay everyone in one transaction, with amounts nobody can see.
          </h1>
          <p style={{ marginTop: 16, maxWidth: 580, fontSize: 15.5, color: T.muted, lineHeight: 1.62 }}>
            DisperseKit is the SDK for confidential token disperse. It puts Zama's FHE encryption and TokenOps'
            confidential transfers behind a few hooks, so you build your own UI and never touch the cryptography.
          </p>
          <div className="flex flex-wrap items-center" style={{ gap: 9, marginTop: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.dim }}>Built on</span>
            <FoundationPill label="Zama FHE" />
            <FoundationPill label="TokenOps" />
          </div>
          <div className="flex flex-wrap items-center" style={{ gap: 11, marginTop: 26 }}>
            <motion.a href="#confidential" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center rounded-full" style={{ gap: 7, background: T.accentGrad, color: T.onAccent, fontSize: 13, fontWeight: 700, padding: "11px 22px", boxShadow: T.buttonGlow, textDecoration: "none" }}>
              How it stays private
            </motion.a>
            <motion.a href="#build" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center rounded-full" style={{ gap: 7, background: "transparent", color: T.secondary, border: `1px solid ${T.cardBorder}`, fontSize: 13, fontWeight: 600, padding: "11px 20px", textDecoration: "none" }}>
              Build on the SDK
            </motion.a>
          </div>
        </motion.div>

        {/* Build on the SDK */}
        <Section id="build">
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>Build on the SDK</h2>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 6, maxWidth: 620 }}>Use the hooks and FHE helpers to build any UI, with zero re-implementation of a single on-chain or cryptographic step.</p>
          <Card style={{ padding: 22, marginTop: 20 }}>
            <CodeBlock code={ENGINE_SNIPPET} />
          </Card>
        </Section>

        {/* Foundation */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>Powered by Zama FHE and TokenOps</h2>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 6, maxWidth: 620 }}>The SDK is a thin, ergonomic layer over two foundations. You call hooks. They do the hard part.</p>
          <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 22 }}>
            {FOUNDATION.map((f) => (
              <Card key={f.name} style={{ padding: 22, height: "100%" }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span className="flex items-center justify-center rounded-[11px]" style={{ width: 34, height: 34, background: T.puck, border: `1px solid ${T.pillBorder}` }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: T.accent, boxShadow: "0 0 10px rgba(57,213,221,0.9)" }} />
                  </span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.heading }}>{f.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: T.accentText }}>{f.role}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginTop: 12 }}>{f.desc}</p>
                <div className="flex flex-wrap" style={{ gap: 7, marginTop: 14 }}>
                  {f.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11, fontFamily: T.mono, color: T.secondary, background: "rgba(110,192,204,0.08)", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "4px 9px" }}>{t}</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* How it stays confidential */}
        <Section id="confidential">
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>How it stays confidential</h2>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>Zama FHE for the secrecy, TokenOps for the transfer. The SDK sequences both.</p>
          <div className="grid gap-4 md:grid-cols-4" style={{ marginTop: 18 }}>
            {STEPS.map(([title, body], i) => (
              <Card key={title} soft style={{ padding: "18px 18px", height: "100%" }}>
                <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: T.accentGrad, color: T.onAccent, fontSize: 11.5, fontWeight: 700 }}>{i + 1}</span>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12, color: T.heading }}>{title}</div>
                <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.55, marginTop: 5 }}>{body}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* What you import */}
        <Section>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 56, color: T.heading }}>What you import</h2>
          <div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 18 }}>
            {([["The engine", ENGINE_API], ["Ready-made parts", PARTS_API]] as const).map(([label, items]) => (
              <Card key={label} style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.heading }}>{label}</div>
                <div className="flex flex-wrap" style={{ gap: 7, marginTop: 12 }}>
                  {items.map((it) => (
                    <span key={it} style={{ fontSize: 11.5, fontFamily: T.mono, color: T.secondary, background: "rgba(110,192,204,0.08)", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "4px 9px" }}>{it}</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* SealedPay — restrained case study */}
        <Section>
          <Card style={{ marginTop: 56, padding: "26px 28px", position: "relative", overflow: "hidden" }}>
            <div aria-hidden className="pointer-events-none absolute" style={{ right: -60, top: -80, width: 260, height: 260, background: "radial-gradient(circle, rgba(46,201,221,0.16), rgba(0,0,0,0) 68%)", filter: "blur(10px)" }} />
            <div className="relative">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: T.accentText }}>Case study</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.heading, marginTop: 7 }}>SealedPay, built entirely on the SDK</div>
              <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.62, marginTop: 9, maxWidth: 640 }}>
                A full confidential payroll dashboard: onboarding, an employee roster, encrypted balances, one-click
                payroll runs, and a recipient view where each employee decrypts only their own pay. Its own design, the
                same SDK, zero re-implementation of a single on-chain or cryptographic step.
              </p>
              <div className="flex flex-wrap" style={{ gap: 7, marginTop: 14 }}>
                {SEALEDPAY_USES.map((u) => (
                  <span key={u} style={{ fontSize: 11, fontFamily: T.mono, color: T.secondary, background: "rgba(110,192,204,0.08)", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "4px 9px" }}>{u}</span>
                ))}
              </div>
              <a href="https://sealedpay.vercel.app" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center hover:underline" style={{ gap: 5, fontSize: 12.5, fontWeight: 600, color: T.accentText }}>
                Open SealedPay
                <Arrow />
              </a>
            </div>
          </Card>
        </Section>

        {/* Footer */}
        <div className="text-center" style={{ marginTop: 64, paddingBottom: 56, fontSize: 11.5, color: T.dim }}>
          DisperseKit · Confidential disperse powered by Zama FHE and TokenOps
        </div>
      </main>
    </div>
  );
}
