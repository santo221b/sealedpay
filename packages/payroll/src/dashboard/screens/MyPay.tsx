/**
 * MY PAY — the recipient's confidential view (the bounty's "recipients can
 * verify and decrypt their own allocation").
 *
 * A recipient connects THEIR OWN wallet, finds the confidential transfers the
 * chain indexed to them, and decrypts only those amounts with a single
 * signature — no employer, no server. Reuses SealedPay's gradient hero +
 * RevealAmount over the proven useMyPay (scan + userDecrypt) flow.
 */
import { formatAmount } from "@dispersekit/widget";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, useReducedMotion } from "framer-motion";

import { RevealAmount } from "../../design/RevealAmount";
import { SealLogo } from "../../design/SealLogo";
import { ChevronLeftGlyph, PadlockGlyph, ReceiptCheckGlyph } from "../../design/icons";
import { GhostButton } from "../../design/kit2";
import { tokens } from "../../design/tokens";
import { humanizeError } from "../../lib/humanizeError";
import { useMyPay } from "../../lib/myPay";
import { shortHash, shortWallet } from "../../lib/seed";

const GRADIENT = "linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)";
const PILL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 34,
  padding: "0 16px",
  borderRadius: tokens.radius.pill,
  fontSize: 12.5,
  fontWeight: 500,
  fontFamily: "'Manrope', sans-serif",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/** Connect / switch-network / connected-address, all via RainbowKit. */
function RecipientWallet({ big = false }: { big?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, openAccountModal, mounted, authenticationStatus }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account && chain;
        if (!ready) return <div aria-hidden style={{ width: 120, height: 34 }} />;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              style={{ ...PILL, background: tokens.accent.primary, color: "#08130e", ...(big ? { height: 44, fontSize: 13.5, padding: "0 26px" } : {}) }}
            >
              Connect wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              style={{ ...PILL, background: "rgba(224,122,106,0.16)", color: "#f0a99d", border: "1px solid rgba(224,122,106,0.5)", ...(big ? { height: 44, fontSize: 13.5, padding: "0 26px" } : {}) }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#e07a6a" }} />
              Wrong network, switch to Sepolia
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="tnum"
            style={{ ...PILL, background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, color: tokens.text.secondary }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: tokens.accent.liveDot }} />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function MyPay({ onExit }: { onExit: () => void }) {
  const reduced = useReducedMotion();
  const pay = useMyPay();
  const sym = pay.symbol ?? "cUSDd";
  const fmt = (v: bigint) => (pay.decimals !== undefined ? formatAmount(v, pay.decimals) : undefined);

  return (
    <div
      className="slim-scroll fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "radial-gradient(880px 560px at 78% 18%, rgba(52,148,106,0.32), rgba(0,0,0,0) 60%), #070c0a" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between" style={{ padding: "18px 32px 9px 45px" }}>
        <div className="flex items-center" style={{ gap: 9 }}>
          <SealLogo size={31} />
          <span style={{ fontWeight: 500, fontSize: 14, color: tokens.text.heading }}>SealedPay</span>
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <RecipientWallet />
          <GhostButton
            onClick={onExit}
            className="hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e8f0ec]"
            style={{ borderRadius: tokens.radius.pill, border: "1px solid rgba(255,255,255,0.14)", color: "#b8c6bf", fontWeight: 500, fontSize: 13, padding: "9px 18px" }}
          >
            <ChevronLeftGlyph size={13} />
            Employer view
          </GhostButton>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto flex flex-col" style={{ maxWidth: 520, padding: "44px 24px 60px 24px", gap: 22 }}>
        <div>
          <h1 style={{ fontWeight: 500, fontSize: 40, color: tokens.text.heading, letterSpacing: 0.45, margin: 0 }}>My pay</h1>
          <p style={{ fontSize: 13.5, color: tokens.text.muted, marginTop: 8, lineHeight: 1.55 }}>
            See exactly what you have been paid. The amounts are encrypted on-chain, so only your wallet can decrypt
            them. Connect the wallet that received the payments.
          </p>
        </div>

        {!pay.ready ? (
          <div
            className="flex flex-col items-center text-center"
            style={{ background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, borderRadius: 20, padding: "40px 28px" }}
          >
            <span className="flex items-center justify-center rounded-full" style={{ width: 60, height: 60, background: "rgba(95,230,175,0.12)" }}>
              <PadlockGlyph size={24} color="#78e9c0" />
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: tokens.text.heading, marginTop: 16 }}>
              {pay.connected && !pay.onSepolia ? "Switch to Sepolia" : "Connect your wallet"}
            </h2>
            <p style={{ fontSize: 12.5, color: tokens.text.muted, marginTop: 6, maxWidth: 320, lineHeight: 1.5 }}>
              Nobody else can read your allocation. The decryption happens locally, in your browser, with your signature.
            </p>
            <div style={{ marginTop: 20 }}>
              <RecipientWallet big />
            </div>
          </div>
        ) : pay.payments === undefined ? (
          <motion.button
            type="button"
            onClick={() => void pay.scan()}
            disabled={pay.phase === "scanning"}
            whileHover={reduced || pay.phase === "scanning" ? undefined : { scale: 1.01 }}
            whileTap={reduced || pay.phase === "scanning" ? undefined : { scale: 0.99 }}
            className="flex w-full items-center justify-center gap-2 rounded-full text-center disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: tokens.accent.primary, color: "#0b1512", fontSize: 14, fontWeight: 500, padding: "15px 0" }}
          >
            {pay.phase === "scanning" && (
              <span aria-hidden style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(11,21,18,0.25)", borderTopColor: "#0b1512", animation: "dc-spin .7s linear infinite" }} />
            )}
            {pay.phase === "scanning" ? "Looking for your payments" : "Find my payments"}
          </motion.button>
        ) : (
          <>
            {/* Confidential balance hero */}
            <div className="relative overflow-hidden" style={{ borderRadius: 18, background: GRADIENT, padding: 22 }}>
              <div aria-hidden className="absolute rounded-full" style={{ width: 153, height: 153, top: -45, right: -36, background: "rgba(255,255,255,0.10)" }} />
              <div className="relative z-[1]" style={{ fontSize: 12, color: "rgba(240,250,245,0.85)" }}>Your confidential balance</div>
              <div className="relative z-[1] flex items-baseline" style={{ gap: 9, fontWeight: 700, fontSize: 30, color: "#fff", marginTop: 8 }}>
                <RevealAmount
                  value={pay.balance !== undefined ? fmt(pay.balance) : undefined}
                  revealed={pay.balance !== undefined && pay.decimals !== undefined}
                  pending={pay.phase === "revealing"}
                  label="balance"
                />
                <span style={{ fontSize: 15 }}>{sym}</span>
              </div>
              <div className="relative z-[1]" style={{ fontSize: 11, color: "rgba(240,250,245,0.75)", marginTop: 6 }}>
                {shortWallet(pay.me ?? "0x")} · Sepolia
              </div>
            </div>

            {/* Payments received */}
            <div style={{ background: tokens.glass.card, boxShadow: tokens.glass.cardShadow, borderRadius: 18, padding: "20px 22px" }}>
              <div className="flex items-center justify-between">
                <div style={{ fontWeight: 400, fontSize: 16, color: tokens.text.heading }}>Payments received</div>
                <div className="tnum" style={{ fontSize: 11, color: tokens.text.muted }}>{pay.payments.length} found</div>
              </div>

              {pay.payments.length === 0 ? (
                <p style={{ fontSize: 12.5, color: tokens.text.muted, marginTop: 14, lineHeight: 1.5 }}>
                  No confidential payments to this wallet in the recent history. If you were just paid, give the transaction
                  a moment to settle, then scan again.
                </p>
              ) : (
                <div className="flex flex-col" style={{ gap: 5, marginTop: 12 }}>
                  {pay.payments.map((p) => (
                    <div key={p.txHash + p.handle} className="flex items-center" style={{ gap: 12, padding: "8px 4px" }}>
                      <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: tokens.accent.puckBg, border: "1px solid rgba(255,255,255,0.06)" }}>
                        <ReceiptCheckGlyph size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block" style={{ fontSize: 13, fontWeight: 500, color: "#eef4f1" }}>from {shortWallet(p.from)}</span>
                        <span className="tnum block whitespace-nowrap" style={{ fontSize: 10.5, color: tokens.text.muted, marginTop: 1 }}>
                          {shortHash(p.txHash)} ·{" "}
                          <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#4ecba0", textDecoration: "none" }}>
                            Etherscan
                          </a>
                        </span>
                      </span>
                      <span className="ml-auto flex items-center" style={{ gap: 4, fontSize: 13.5, fontWeight: 500, color: "#eef4f1" }}>
                        <span style={{ color: "#78e9c0" }}>+</span>
                        <RevealAmount
                          value={p.amount !== undefined ? fmt(p.amount) : undefined}
                          revealed={p.amount !== undefined && pay.decimals !== undefined}
                          pending={pay.phase === "revealing"}
                          label="payment amount"
                        />
                        <span>{sym}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pay.phase !== "revealed" ? (
              // Always reachable after a scan: a recipient may hold a decryptable
              // balance even when no transfer rows fell inside the RPC lookback.
              <motion.button
                type="button"
                onClick={() => void pay.reveal()}
                disabled={pay.phase === "revealing"}
                whileHover={reduced || pay.phase === "revealing" ? undefined : { scale: 1.01 }}
                whileTap={reduced || pay.phase === "revealing" ? undefined : { scale: 0.99 }}
                className="flex w-full items-center justify-center gap-2 rounded-full text-center disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "#f5f8f6", color: "#14503b", fontSize: 14, fontWeight: 500, padding: "15px 0" }}
              >
                {pay.phase === "revealing" ? (
                  <span aria-hidden style={{ width: 15, height: 15, borderRadius: "50%", border: "2.2px solid rgba(20,80,59,0.25)", borderTopColor: "#14503b", animation: "dc-spin .7s linear infinite" }} />
                ) : (
                  <PadlockGlyph size={14} color="#14503b" />
                )}
                {pay.phase === "revealing" ? "Decrypting with your signature" : "Reveal my pay"}
              </motion.button>
            ) : (
              <p className="text-center" style={{ fontSize: 11.5, color: tokens.text.muted, lineHeight: 1.55 }}>
                Decrypted locally after your signature. These amounts never appear on-chain or on any server. Only
                your wallet can read them.
              </p>
            )}
          </>
        )}

        {pay.error && (
          <p role="alert" className="rounded-xl p-3" style={{ background: "rgba(224,110,98,0.1)", border: "1px solid rgba(224,110,98,0.4)", color: "#eb8f85", fontSize: 12 }}>
            {humanizeError(pay.error)}
          </p>
        )}

        <p className="text-center" style={{ fontSize: 10.5, color: "#6f8577", marginTop: 6 }}>
          SealedPay · Powered by DisperseKit · TokenOps disperse · Zama FHE
        </p>
      </div>
    </div>
  );
}
