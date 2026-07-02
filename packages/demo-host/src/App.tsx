/**
 * "Acme Payroll" — a fictional partner product proving the white-label story.
 *
 * The entire DisperseKit integration is the two highlighted imports and the
 * two JSX tags below. Everything else on this page is Acme's own product
 * chrome, and the widgets pick up Acme's brand through the `theme` prop.
 */
import { useState } from "react";

// ⬇⬇ the integration ⬇⬇
import { DisperseWidget, ReceiptWidget, type DisperseTheme } from "@dispersekit/widget";
// ⬆⬆ that's all of it ⬆⬆

const acmeTheme: DisperseTheme = {
  accent: "#4f46e5", // Acme indigo, not DisperseKit orange — theming proof
  accentText: "#ffffff",
  background: "#ffffff",
  surface: "#f4f4f8",
  text: "#1e1b2e",
  muted: "#736f85",
  border: "#e6e4ee",
  radius: "14px",
};

const INTEGRATION_SNIPPET = `import { DisperseWidget } from "@dispersekit/widget";

<DisperseWidget
  token={ACME_PAYROLL_TOKEN}
  theme={acmeBrand}
  onDispersed={(r) => toast.success(\`Paid \${r.recipients.length} people\`)}
/>`;

export function App() {
  const [tab, setTab] = useState<"run" | "receipts">("run");
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-[#1e1b2e]">
      {/* Acme's own chrome */}
      <header className="border-b border-[#e6e4ee] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
              A
            </div>
            <span className="font-bold">Acme Payroll</span>
            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
              DEMO — DisperseKit embed
            </span>
          </div>
          <nav className="flex gap-1 text-sm">
            {(
              [
                ["run", "Run payroll"],
                ["receipts", "My pay"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 py-1.5 font-medium ${
                  tab === key ? "bg-indigo-600 text-white" : "text-[#736f85] hover:bg-[#f4f4f8]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[1fr_auto]">
        <section>
          {tab === "run" ? (
            <>
              <h1 className="text-2xl font-bold">July contractor payroll</h1>
              <p className="mt-1 max-w-md text-sm text-[#736f85]">
                Pay the whole team in one confidential transaction. Salaries stay between Acme and each contractor —
                even on a public chain.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[#736f85]">
                <li>✓ Amounts encrypted before they leave this page</li>
                <li>✓ One transaction, one gas payment</li>
                <li>✓ Every contractor privately verifies their own pay</li>
              </ul>
              <button
                onClick={() => setShowCode((s) => !s)}
                className="mt-8 rounded-lg border border-[#e6e4ee] bg-white px-3 py-1.5 text-xs font-medium text-[#736f85] hover:text-[#1e1b2e]"
              >
                {showCode ? "Hide" : "Show"} the integration code
              </button>
              {showCode && (
                <pre className="mt-3 max-w-md overflow-x-auto rounded-xl bg-[#1e1b2e] p-4 text-[11px] leading-relaxed text-indigo-100">
                  {INTEGRATION_SNIPPET}
                </pre>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">My pay</h1>
              <p className="mt-1 max-w-md text-sm text-[#736f85]">
                Only you can decrypt your pay. Acme sees that a payment happened; the amount is yours alone to reveal.
              </p>
            </>
          )}
        </section>

        {/* the embedded widgets — Acme-branded via `theme` */}
        <section className="md:w-[26rem]">
          {tab === "run" ? (
            <DisperseWidget
              title="Pay contractors"
              theme={acmeTheme}
              onDispersed={(r) => console.log("[acme] payroll dispersed:", r.txHash)}
            />
          ) : (
            <ReceiptWidget title="My pay" theme={acmeTheme} />
          )}
        </section>
      </main>
    </div>
  );
}
