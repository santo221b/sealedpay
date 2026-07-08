/**
 * Wallet control for the top bar — connect, reconnect, and (critically) switch
 * to Sepolia when the connected wallet is on the wrong chain. The rest of the
 * dashboard is presentation-only; this is the one place that reaches into
 * RainbowKit, so a returning/disconnected/wrong-network judge always has an
 * affordance instead of a dead "Not connected" label.
 */
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { tokens } from "../design/tokens";

const PILL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 34,
  padding: "0 14px",
  borderRadius: tokens.radius.pill,
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: "'Manrope', sans-serif",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export function WalletControl() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, mounted, authenticationStatus }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account && chain;
        if (!ready) return <div aria-hidden style={{ width: 120, height: 34 }} />;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              style={{ ...PILL, background: tokens.accent.primary, color: "#08130e" }}
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
              style={{ ...PILL, background: "rgba(224,122,106,0.16)", color: "#f0a99d", border: "1px solid rgba(224,122,106,0.5)" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#e07a6a" }} />
              Wrong network, switch to Sepolia
            </button>
          );
        }

        // Connected and on Sepolia: nothing to show here — the address already
        // lives on the wallet card above Recent activity, so a chip would just
        // duplicate it. The control only appears when action is needed.
        void account;
        return null;
      }}
    </ConnectButton.Custom>
  );
}
