/**
 * DisperseKit — the SDK integration docs.
 *
 * A real documentation surface for @dispersekit/widget: sidebar nav with
 * scroll-spy, syntax-highlighted examples, and a guide per engine export.
 * Every snippet is faithful to the actual API (see packages/widget/src) and to
 * how the SealedPay payroll app wires it up (packages/payroll/src).
 *
 * Built on Zama FHE (encryption) and TokenOps (confidential transfers + batch
 * disperse). Its own teal identity, one glow rising from the bottom.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

// SealedPay motion signatures (packages/payroll/src/design/tokens.ts).
const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const SPRING_POP = { type: "spring", stiffness: 500, damping: 30 } as const;
const LIST_V = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };
const ITEM_V = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

const T = {
  // Neutral dark. A whisper of light at the top for depth, otherwise flat.
  app: "radial-gradient(1100px 620px at 50% -8%, rgba(255,255,255,0.035), rgba(0,0,0,0) 55%), linear-gradient(180deg, #0b0c0e 0%, #090a0b 100%)",
  heading: "#f2f4f5",
  secondary: "#c9ced2",
  muted: "#9aa1a6",
  dim: "#6d747a",
  accent: "#f2f4f5",
  accentText: "#e4e7ea",
  onAccent: "#0b0c0e",
  accentGrad: "linear-gradient(180deg,#ffffff,#e6e9ec)",
  glassBg: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.022))",
  glassBgSoft: "linear-gradient(180deg, rgba(255,255,255,0.033), rgba(255,255,255,0.014))",
  cardBorder: "rgba(255,255,255,0.10)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 8px 14px -9px rgba(255,255,255,0.05), 0 20px 54px -28px rgba(0,0,0,0.85)",
  // The reading surface: a slightly raised dark panel.
  panelBg: "linear-gradient(180deg, rgba(24,26,29,0.6), rgba(17,19,21,0.44))",
  panelBorder: "rgba(255,255,255,0.10)",
  panelShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 30px 80px -44px rgba(0,0,0,0.9)",
  buttonGlow: "0 8px 22px -10px rgba(0,0,0,0.7)",
  codeBg: "rgba(0,0,0,0.34)",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

/* ── syntax highlighter (warm-neutral, no blue) ──────────────────────────── */
const HL: Record<string, string> = {
  kw: "#d59a9a",
  str: "#9ecf9a",
  com: "#6b7278",
  num: "#d8b98a",
  fn: "#e6e9ec",
  type: "#cbb58a",
  id: "#d2d6d9",
  punc: "#8b9197",
};
const KEYWORDS = new Set(["import", "from", "export", "const", "let", "var", "function", "return", "await", "async", "new", "if", "else", "for", "while", "of", "in", "type", "interface", "extends", "as", "default", "void", "null", "undefined", "true", "false", "typeof"]);

function lex(src: string): Array<{ t: string; v: string }> {
  const out: Array<{ t: string; v: string }> = [];
  const n = src.length;
  let i = 0;
  const idStart = (c: string) => /[A-Za-z_$]/.test(c);
  const idChar = (c: string) => /[A-Za-z0-9_$]/.test(c);
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { let j = i + 1; while (j < n && /\s/.test(src[j])) j++; out.push({ t: "ws", v: src.slice(i, j) }); i = j; continue; }
    if (c === "/" && src[i + 1] === "/") { let j = i + 2; while (j < n && src[j] !== "\n") j++; out.push({ t: "com", v: src.slice(i, j) }); i = j; continue; }
    if (c === "/" && src[i + 1] === "*") { let j = i + 2; while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++; j = Math.min(n, j + 2); out.push({ t: "com", v: src.slice(i, j) }); i = j; continue; }
    if (c === '"' || c === "'" || c === "`") { const q = c; let j = i + 1; while (j < n && src[j] !== q) { if (src[j] === "\\") j++; j++; } j = Math.min(n, j + 1); out.push({ t: "str", v: src.slice(i, j) }); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /[0-9a-fA-FxXn._]/.test(src[j])) j++; out.push({ t: "num", v: src.slice(i, j) }); i = j; continue; }
    if (idStart(c)) {
      let j = i + 1; while (j < n && idChar(src[j])) j++;
      const w = src.slice(i, j);
      let k = j; while (k < n && /\s/.test(src[k])) k++;
      const t = KEYWORDS.has(w) ? "kw" : /^[A-Z]/.test(w) ? "type" : src[k] === "(" ? "fn" : "id";
      out.push({ t, v: w }); i = j; continue;
    }
    out.push({ t: "punc", v: c }); i++;
  }
  return out;
}

function Code({ code, lang = "tsx" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const toks = useMemo(() => lex(code), [code]);
  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  };
  return (
    <div style={{ marginTop: 14, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.cardBorder}`, background: T.codeBg, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div className="flex items-center justify-between" style={{ padding: "8px 13px", borderBottom: `1px solid ${T.cardBorder}` }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 0.6, color: T.dim, textTransform: "uppercase" }}>{lang}</span>
        <motion.button onClick={copy} whileTap={{ scale: 0.88 }} className="inline-flex items-center" style={{ gap: 5, fontSize: 11, fontWeight: 600, color: copied ? T.accent : T.muted, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
          {copied ? "Copied" : "Copy"}
        </motion.button>
      </div>
      <pre className="overflow-x-auto" style={{ margin: 0, padding: "15px 17px", fontSize: 12, lineHeight: 1.72, fontFamily: T.mono }}>
        <code>
          {toks.map((tk, i) => (tk.t === "ws" ? tk.v : <span key={i} style={{ color: HL[tk.t] ?? HL.id }}>{tk.v}</span>))}
        </code>
      </pre>
    </div>
  );
}

/* ── content ─────────────────────────────────────────────────────────────── */
const SNIP_SETUP = `import { DisperseProviders } from "@dispersekit/widget";

// Wrap your app once. It brings its own wallet stack
// (wagmi + RainbowKit + React Query), wired for Sepolia.
export function Root() {
  return (
    <DisperseProviders appName="My app">
      <Payouts />
    </DisperseProviders>
  );
}`;

const SNIP_QUICKSTART = `import {
  useDisperseFlow, useTokenMeta, parseRecipients,
  DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID,
} from "@dispersekit/widget";

function Payouts() {
  const { decimals } = useTokenMeta(DEMO_TOKEN_ADDRESS);

  const flow = useDisperseFlow({
    token: DEMO_TOKEN_ADDRESS,
    chainId: SEPOLIA_CHAIN_ID,
    onDispersed: (r) => console.log("paid", r.recipients.length),
  });

  async function pay() {
    if (!decimals) return; // wait until token decimals load

    const { rows, issues } = parseRecipients(
      "0x1111111111111111111111111111111111111111, 250\\n" +
      "0x2222222222222222222222222222222222222222, 1000",
      decimals,
    );
    if (issues.length) return; // bad address, range, or duplicate

    await flow.goToReview(rows); // validate + snapshot
    await flow.execute();        // encrypt, authorize, disperse, confirm
  }

  return <button onClick={pay}>Pay everyone</button>;
}`;

const SNIP_PROVIDERS = `import { DisperseProviders, type DisperseTheme } from "@dispersekit/widget";

const theme: DisperseTheme = {
  accent: "#39d5dd",
  background: "#0b1418",
  text: "#eef6f8",
  radius: "16px",
};

<DisperseProviders theme={theme} appName="SealedPay">
  <App />
</DisperseProviders>`;

const SNIP_RECIPIENTS = `import { parseRecipients } from "@dispersekit/widget";

// One "address, amount" per line. Same format everywhere.
const text = employees
  .map((e) => e.address + ", " + e.salary)
  .join("\\n");

const { rows, issues, warnings, total } = parseRecipients(text, decimals);

for (const issue of issues) {
  // line-accurate: checksum, euint64 range, decimals, or duplicate
  console.warn(issue.line, issue.problem);
}`;

const SNIP_TOKEN = `import { useTokenMeta, erc7984Abi, DEMO_TOKEN_ADDRESS } from "@dispersekit/widget";

const { symbol, decimals, metaError } = useTokenMeta(DEMO_TOKEN_ADDRESS);

// A confidential balance is a ciphertext handle, not a number.
const handle = await publicClient.readContract({
  address: DEMO_TOKEN_ADDRESS,
  abi: erc7984Abi,
  functionName: "confidentialBalanceOf",
  args: [account],
}); // a bytes32 euint64 handle. Decrypt it to read the value.`;

const SNIP_DISPERSE = `import {
  useDisperseFlow, StatusTimeline,
  DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID,
} from "@dispersekit/widget";

const flow = useDisperseFlow({
  token: DEMO_TOKEN_ADDRESS,
  chainId: SEPOLIA_CHAIN_ID,
  onDispersed: (r) => toast("Paid " + r.recipients.length),
  onError: (e) => toast(e.message),
});

// Drive it from your own UI:
await flow.goToReview(rows); // validate + snapshot RecipientRow[]
await flow.execute();        // run the whole sequence

// Render progress straight off flow.phase:
// input -> review -> encrypting -> authorizing
//   -> dispersing -> confirming -> delivered
{["encrypting", "authorizing", "dispersing", "confirming"].includes(flow.phase) && (
  <StatusTimeline phase={flow.phase} />
)}

// After delivery, prove what actually landed:
await flow.verifyDelivery(); // decrypts requested vs transferred`;

const SNIP_DECRYPT = `import { getFhevmInstance, userDecryptHandles } from "@dispersekit/widget";
import { parseAbiItem } from "viem";

// 1. Find confidential transfers indexed to this account.
const logs = await publicClient.getLogs({
  address: token,
  event: parseAbiItem(
    "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
  ),
  args: { to: account },
  fromBlock, toBlock,
});
const handles = logs.map((l) => l.args.amount);

// 2. One signature decrypts only this account's handles.
const instance = await getFhevmInstance("https://ethereum-sepolia-rpc.publicnode.com");
const clear = await userDecryptHandles({
  instance,
  requests: handles.map((h) => ({ handle: h, contractAddress: token })),
  userAddress: account,
  signTypedData: (args) => walletClient.signTypedData({ ...args, account }),
});
const amounts = handles.map((h) => clear[h]); // bigint[], visible only to them`;

const SNIP_FORMAT = `import { formatAmount } from "@dispersekit/widget";

formatAmount(1000000n, 6);    // "1"
formatAmount(2500500000n, 6); // "2,500.5"`;

const STEPS = [
  ["Encrypt in the browser", "Amounts are encrypted client-side on Zama FHE. Plaintext never leaves the page."],
  ["Authorize once", "One time-boxed grant lets the disperse contract move the encrypted balance."],
  ["One transaction", "Every recipient is paid in a single confidential transfer."],
  ["Recipients verify", "Each recipient decrypts only their own amount, with one signature."],
];

const ENGINE_REF: [string, string, string][] = [
  ["useDisperseFlow", "(options) => DisperseFlow", "The payout state machine: encrypt, authorize, disperse, confirm, verify."],
  ["useTokenMeta", "(token) => { name, symbol, decimals, metaError, refetchMeta }", "Read an ERC-7984 token's name, symbol, and decimals."],
  ["parseRecipients", "(text, decimals) => ParseResult", "Validate address + amount lines into typed rows."],
  ["encryptAmounts", "(options) => Promise<EncryptedDisperse>", "Encrypt per-recipient amounts under one proof. The flow calls this for you."],
  ["getFhevmInstance", "(network) => Promise<FhevmInstance>", "Load the Zama FHE runtime once, cached per network source."],
  ["userDecryptHandles", "(options) => Promise<Record<Address, bigint>>", "Decrypt only the handles the signer is allowed to read."],
  ["formatAmount", "(value, decimals) => string", "Base-unit bigint to a human string with separators."],
  ["isValidAmountText", "(text) => boolean", "Entry-time check for a plain-decimal amount."],
  ["disperseAddressFor", "(chainId) => address", "The TokenOps disperse contract for a chain."],
  ["erc7984Abi · disperseAbi", "viem Abi", "ABIs for the confidential token and the disperse singleton."],
  ["DEMO_TOKEN_ADDRESS · SEPOLIA_CHAIN_ID", "constants", "A faucet-backed demo token and the Sepolia chain id."],
];

const PARTS_REF: [string, string, string][] = [
  ["DisperseProviders", "<DisperseProviders theme appName>", "The wallet + query stack. Wrap your app once."],
  ["StatusTimeline", "<StatusTimeline phase={flow.phase} />", "The in-flight encrypt-to-confirm progress timeline."],
  ["DeliveredPanel", "<DeliveredPanel delivery verifying decimals symbol explorerBase onVerify onReset />", "The result screen with per-recipient verify."],
  ["PrivacyBadge", "<PrivacyBadge />", "A lock that explains what stays private and what is public."],
];

const NAV: { group: string; items: [string, string][] }[] = [
  { group: "Start", items: [["overview", "Overview"], ["architecture", "Architecture"], ["install", "Install"], ["quickstart", "Quick start"]] },
  { group: "Guides", items: [["providers", "Providers & setup"], ["recipients", "Parse recipients"], ["token", "Token metadata"], ["disperse", "Run a disperse"], ["decrypt", "Recipient decryption"], ["format", "Format amounts"]] },
  { group: "Reference", items: [["confidential", "Confidentiality"], ["api", "API reference"], ["casestudy", "Case study"]] },
];
const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i[0]));

/* ── primitives ──────────────────────────────────────────────────────────── */
function BrandMark({ size = 26, fill = T.accent }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} fillRule="evenodd" clipRule="evenodd" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M20 8.75a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5zM4 7.25a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5zM20 16.25a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 0 1.5zM4 14.75a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5z" />
      <path d="M4.75 18.25H4a.75.75 0 0 1-.75-.75V14a.75.75 0 0 1 .75-.75h.75zM4.75 10.75H4a.75.75 0 0 1-.75-.75V6.5A.75.75 0 0 1 4 5.75h.75zM19.25 13.25H20a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-.75zM19.25 5.75H20a.75.75 0 0 1 .75.75V10a.75.75 0 0 1-.75.75h-.75zM18.25 5.5v13A2.25 2.25 0 0 1 16 20.75H8a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8 3.25h8a2.25 2.25 0 0 1 2.25 2.25zm-5.424 2.711a.188.188 0 0 0-.349-.118l-2.662 4.564a.19.19 0 0 0-.001.189.19.19 0 0 0 .163.094h1.553l-.356 2.849a.188.188 0 0 0 .349.118l2.662-4.564a.19.19 0 0 0 .001-.189.19.19 0 0 0-.163-.094H12.47z" />
    </svg>
  );
}

function Card({ children, style, soft, hover = true, variants }: { children: React.ReactNode; style?: React.CSSProperties; soft?: boolean; hover?: boolean; variants?: unknown }) {
  return (
    <motion.div
      variants={variants as never}
      whileHover={hover ? { y: -4 } : undefined}
      transition={SPRING}
      style={{ background: soft ? T.glassBgSoft : T.glassBg, border: `1px solid ${T.cardBorder}`, borderRadius: 18, boxShadow: T.glassShadow, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", ...style }}
    >
      {children}
    </motion.div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, borderRadius: 12, border: `1px solid ${T.cardBorder}`, borderLeft: `2px solid rgba(255,255,255,0.45)`, background: "rgba(255,255,255,0.04)", padding: "11px 14px", fontSize: 12.5, color: T.secondary, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

function PropsTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div style={{ marginTop: 14, borderRadius: 12, border: `1px solid ${T.cardBorder}`, overflow: "hidden" }}>
      {rows.map(([name, type, desc], i) => (
        <div key={name} className="grid" style={{ gridTemplateColumns: "132px minmax(0,1fr)", gap: 12, padding: "11px 14px", borderTop: i ? `1px solid ${T.cardBorder}` : "none" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: 12, color: T.accentText }}>{name}</div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.dim, marginTop: 2, wordBreak: "break-word" }}>{type}</div>
          </div>
          <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function Reveal({ children, id, mt = 60 }: { children: React.ReactNode; id?: string; mt?: number }) {
  return (
    <motion.section id={id} style={{ scrollMarginTop: 20, marginTop: mt }} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.45, ease: EASE }}>
      {children}
    </motion.section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.4, color: T.heading }}>{children}</h2>;
}
function Lead({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14.5, color: T.muted, marginTop: 8, lineHeight: 1.62, maxWidth: 660 }}>{children}</p>;
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-15% 0px -72% 0px", threshold: [0, 0.3, 0.6, 1] },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids.join(",")]);
  return active;
}

/* ── page ────────────────────────────────────────────────────────────────── */
export function App() {
  const active = useActiveSection(ALL_IDS);

  return (
    <div className="relative min-h-screen" style={{ color: T.heading, fontFamily: "'Manrope', system-ui, sans-serif", background: T.app }}>
      {/* Header — bare glowing logo, no band */}
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-6 py-5">
          <span style={{ display: "inline-flex", filter: "drop-shadow(0 0 9px rgba(255,255,255,0.35))" }}>
            <BrandMark size={26} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.heading }}>DisperseKit</span>
          <span className="rounded-full" style={{ marginLeft: 3, color: T.accentText, border: `1px solid rgba(255,255,255,0.22)`, fontSize: 10, fontWeight: 600, padding: "3px 9px", letterSpacing: 0.4 }}>SDK</span>
        </div>
      </motion.header>

      <div className="relative z-0 mx-auto max-w-6xl px-6 md:grid" style={{ gridTemplateColumns: "212px minmax(0,1fr)", columnGap: 48 }}>
        {/* Sidebar */}
        <aside className="hidden md:block" style={{ position: "sticky", top: 0, alignSelf: "start", maxHeight: "100vh", overflowY: "auto", paddingTop: 26, paddingBottom: 40 }}>
          <motion.nav className="flex flex-col" style={{ gap: 20 }} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: EASE }}>
            {NAV.map((g) => (
              <div key={g.group}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.dim, marginBottom: 8, paddingLeft: 10 }}>{g.group}</div>
                <div className="flex flex-col" style={{ gap: 1 }}>
                  {g.items.map(([id, label]) => {
                    const on = active === id;
                    return (
                      <motion.a key={id} href={`#${id}`} whileHover={{ x: on ? 0 : 2 }} transition={SPRING} className="relative" style={{ fontSize: 13, fontWeight: on ? 600 : 500, color: on ? T.accentText : T.muted, padding: "5px 10px", textDecoration: "none", transition: "color .15s" }}>
                        {on && <motion.span layoutId="nav-active" transition={SPRING} className="absolute inset-0" style={{ borderRadius: 8, background: "rgba(255,255,255,0.07)" }} />}
                        <span className="relative">{label}</span>
                      </motion.a>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.nav>
        </aside>

        {/* Content */}
        <main style={{ minWidth: 0, paddingTop: 26, paddingBottom: 72 }}>
          {/* Overview */}
          <motion.section id="overview" style={{ scrollMarginTop: 20 }} variants={LIST_V} initial="hidden" animate="show">
            <motion.div variants={ITEM_V} style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.4, color: T.accentText }}>Confidential disperse SDK</motion.div>
            <motion.h1 variants={ITEM_V} style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1.06, marginTop: 12, maxWidth: 640, color: T.heading }}>
              Pay everyone in one transaction, with amounts nobody can see.
            </motion.h1>
            <motion.div variants={ITEM_V}>
              <Lead>The SDK for confidential token disperse. Zama FHE encryption and TokenOps transfers behind a few hooks, so you build the UI and never touch the cryptography.</Lead>
            </motion.div>
            <motion.div variants={ITEM_V} className="flex flex-wrap items-center" style={{ gap: 9, marginTop: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.dim }}>Built on</span>
              {["Zama FHE", "TokenOps"].map((l) => (
                <motion.span key={l} whileHover={{ y: -2 }} transition={SPRING} className="inline-flex items-center" style={{ gap: 6, background: T.glassBg, border: `1px solid ${T.cardBorder}`, borderRadius: 999, padding: "5px 12px 5px 10px", fontSize: 12, fontWeight: 600, color: T.secondary }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: T.accent, boxShadow: "0 0 8px rgba(255,255,255,0.5)" }} />
                  {l}
                </motion.span>
              ))}
            </motion.div>
            <motion.div variants={ITEM_V} className="flex flex-wrap items-center" style={{ gap: 11, marginTop: 24 }}>
              <motion.a href="#quickstart" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={SPRING_POP} className="inline-flex items-center rounded-full" style={{ gap: 7, background: T.accentGrad, color: T.onAccent, fontSize: 13, fontWeight: 700, padding: "11px 22px", boxShadow: T.buttonGlow, textDecoration: "none" }}>Quick start</motion.a>
              <motion.a href="#confidential" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={SPRING_POP} className="inline-flex items-center rounded-full" style={{ gap: 7, background: "transparent", color: T.secondary, border: `1px solid ${T.cardBorder}`, fontSize: 13, fontWeight: 600, padding: "11px 20px", textDecoration: "none" }}>How it stays private</motion.a>
            </motion.div>
          </motion.section>

          {/* Architecture */}
          <Reveal id="architecture">
            <H2>Architecture</H2>
            <Lead>A thin layer over two foundations. You call hooks, they do the hard part.</Lead>
            <motion.div className="grid gap-5 md:grid-cols-2" style={{ marginTop: 16 }} variants={LIST_V} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
              {[
                { name: "Zama FHE", role: "Encryption layer", desc: "Amounts are encrypted with Zama's FHEVM. The SDK wraps the instance, the encryption, and user-decryption.", tags: ["getFhevmInstance", "encryptAmounts", "userDecryptHandles"] },
                { name: "TokenOps", role: "Transfer layer", desc: "ERC-7984 confidential transfers, dispersed to every recipient in one transaction. ABIs and flow included.", tags: ["disperseAbi", "erc7984Abi", "useDisperseFlow"] },
              ].map((f) => (
                <Card key={f.name} variants={ITEM_V} style={{ padding: 22, height: "100%" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.heading }}>{f.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, color: T.accentText, marginTop: 3 }}>{f.role}</div>
                  <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginTop: 13 }}>{f.desc}</p>
                  <div className="flex flex-wrap" style={{ gap: 7, marginTop: 14 }}>
                    {f.tags.map((t) => (
                      <span key={t} style={{ fontSize: 11, fontFamily: T.mono, color: T.secondary, background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: "4px 9px" }}>{t}</span>
                    ))}
                  </div>
                </Card>
              ))}
            </motion.div>
          </Reveal>

          {/* Install */}
          <Reveal id="install">
            <H2>Install</H2>
            <Lead>One package, wallet stack included. Sepolia today.</Lead>
            <Code lang="bash" code={`npm install @dispersekit/widget`} />
          </Reveal>

          {/* Quick start */}
          <Reveal id="quickstart">
            <H2>Quick start</H2>
            <Lead>Wrap your app, then run a disperse from your own component.</Lead>
            <Code code={SNIP_SETUP} />
            <Code code={SNIP_QUICKSTART} />
          </Reveal>

          {/* Providers */}
          <Reveal id="providers">
            <H2>Providers & setup</H2>
            <Lead>The one wrapper you need. It brings wagmi, RainbowKit, and React Query, wired for Sepolia.</Lead>
            <Code code={SNIP_PROVIDERS} />
            <PropsTable rows={[
              ["theme", "DisperseTheme?", "White-label colors, radius, and font."],
              ["appName", "string?", "Shown to wallets while pairing."],
              ["walletConnectProjectId", "string?", "Your WalletConnect id from reown.com."],
            ]} />
          </Reveal>

          {/* Recipients */}
          <Reveal id="recipients">
            <H2>Parse recipients</H2>
            <Lead>The one validated path from text to typed rows. Checksums, ranges, and duplicates are caught here.</Lead>
            <Code code={SNIP_RECIPIENTS} />
          </Reveal>

          {/* Token metadata */}
          <Reveal id="token">
            <H2>Token metadata</H2>
            <Lead>Read symbol and decimals. A confidential balance comes back as a ciphertext handle, not a number.</Lead>
            <Code code={SNIP_TOKEN} />
            <Note>decimals is undefined until it loads. Gate parsing and encryption on it.</Note>
          </Reveal>

          {/* Run a disperse */}
          <Reveal id="disperse">
            <H2>Run a disperse</H2>
            <Lead>One hook owns the whole state machine. Drive it with two calls, render the rest off flow.phase.</Lead>
            <Code code={SNIP_DISPERSE} />
            <Note>A short transfer moves an encrypted zero, silently. flow.verifyDelivery decrypts requested against transferred to catch it.</Note>
          </Reveal>

          {/* Recipient decryption */}
          <Reveal id="decrypt">
            <H2>Recipient decryption</H2>
            <Lead>A recipient reveals only their own amounts, with one signature and no server in the loop.</Lead>
            <Code code={SNIP_DECRYPT} />
          </Reveal>

          {/* Format */}
          <Reveal id="format">
            <H2>Format amounts</H2>
            <Lead>Turn a decrypted bigint in base units into a display string.</Lead>
            <Code code={SNIP_FORMAT} />
          </Reveal>

          {/* Confidentiality */}
          <Reveal id="confidential">
            <H2>How it stays confidential</H2>
            <Lead>Zama FHE for the secrecy, TokenOps for the transfer. The SDK sequences both.</Lead>
            <motion.div className="grid gap-4 md:grid-cols-2" style={{ marginTop: 18 }} variants={LIST_V} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
              {STEPS.map(([title, body], i) => (
                <Card key={title} soft variants={ITEM_V} style={{ padding: 18 }}>
                  <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: T.accentGrad, color: T.onAccent, fontSize: 11.5, fontWeight: 700 }}>{i + 1}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12, color: T.heading }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, marginTop: 5 }}>{body}</div>
                </Card>
              ))}
            </motion.div>
          </Reveal>

          {/* API reference */}
          <Reveal id="api">
            <H2>API reference</H2>
            <Lead>The full public surface, grouped by layer.</Lead>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: T.dim, marginTop: 20 }}>The engine</div>
            <Card hover={false} style={{ padding: "6px 20px 16px", marginTop: 10 }}>
              {ENGINE_REF.map(([name, sig, desc], i) => (
                <div key={name} style={{ padding: "13px 0", borderTop: i ? `1px solid ${T.cardBorder}` : "none" }}>
                  <div className="flex flex-wrap items-baseline" style={{ gap: 9 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.accentText }}>{name}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.dim }}>{sig}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: T.dim, marginTop: 22 }}>Ready-made parts</div>
            <Card hover={false} style={{ padding: "6px 20px 16px", marginTop: 10 }}>
              {PARTS_REF.map(([name, sig, desc], i) => (
                <div key={name} style={{ padding: "13px 0", borderTop: i ? `1px solid ${T.cardBorder}` : "none" }}>
                  <div className="flex flex-wrap items-baseline" style={{ gap: 9 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.accentText }}>{name}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.dim }}>{sig}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </Card>
          </Reveal>

          {/* Case study */}
          <Reveal id="casestudy">
            <Card style={{ padding: "26px 28px", position: "relative", overflow: "hidden" }}>
              <div aria-hidden className="pointer-events-none absolute" style={{ right: -60, top: -80, width: 260, height: 260, background: "radial-gradient(circle, rgba(255,255,255,0.05), rgba(0,0,0,0) 68%)" }} />
              <div className="relative">
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.4, color: T.accentText }}>Case study</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.heading, marginTop: 7 }}>SealedPay, built entirely on the SDK</div>
                <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.62, marginTop: 9, maxWidth: 640 }}>
                  A full confidential payroll dashboard, built on the same calls above. Its own design, zero
                  re-implementation of a single on-chain or cryptographic step.
                </p>
                <a href="https://sealedpay.vercel.app" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center hover:underline" style={{ gap: 5, fontSize: 12.5, fontWeight: 600, color: T.accentText }}>
                  Open SealedPay
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
                </a>
              </div>
            </Card>
          </Reveal>

          <div style={{ marginTop: 64, paddingTop: 22, borderTop: `1px solid ${T.cardBorder}`, fontSize: 11.5, color: T.dim }}>
            DisperseKit · Confidential disperse powered by Zama FHE and TokenOps
          </div>
        </main>
      </div>
    </div>
  );
}
