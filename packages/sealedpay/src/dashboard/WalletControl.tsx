/**
 * Wallet control for the top bar — reconnect and (critically) switch to
 * Sepolia when a connected external wallet is on the wrong chain. The rest of
 * the dashboard is presentation-only; this is the one place that reaches into
 * Privy/wagmi, so a returning/disconnected/wrong-network user always has an
 * affordance instead of a dead "Not connected" label.
 *
 * The control only appears when action is needed: connected-and-on-Sepolia
 * renders nothing (the address already lives on the wallet card).
 */
import { SEPOLIA_CHAIN_ID } from "@dispersekit/widget";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";

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
  const { ready, authenticated, connectWallet } = usePrivy();
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!ready) return <div aria-hidden style={{ width: 120, height: 34 }} />;

  // The gate guarantees authentication before the dashboard renders, but an
  // external wallet can still disconnect out from under us (extension locked,
  // account removed). Offer the reconnect instead of a dead label.
  if (authenticated && !isConnected) {
    return (
      <button
        type="button"
        onClick={() => connectWallet()}
        style={{ ...PILL, background: tokens.accent.primary, color: "#08130e" }}
      >
        Reconnect wallet
      </button>
    );
  }

  if (isConnected && chain?.id !== SEPOLIA_CHAIN_ID) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
        disabled={switching}
        style={{ ...PILL, background: "rgba(224,122,106,0.16)", color: "#f0a99d", border: "1px solid rgba(224,122,106,0.5)", opacity: switching ? 0.7 : 1, cursor: switching ? "wait" : "pointer" }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "#e07a6a" }} />
        {switching ? "Switching to Sepolia" : "Wrong network, switch to Sepolia"}
      </button>
    );
  }

  return null;
}
