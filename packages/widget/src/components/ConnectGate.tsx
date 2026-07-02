/**
 * Wallet gate rendered inside the widget — RainbowKit under the hood, themed
 * like the partner's widget, so connecting never feels like leaving the page.
 */
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Button } from "./ui";

export function ConnectGate() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, mounted }) => {
        if (!mounted) return null;
        if (!account) {
          return (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-[var(--dk-muted)]">Connect a wallet to send a confidential payout.</p>
              <Button onClick={openConnectModal}>Connect wallet</Button>
            </div>
          );
        }
        if (chain?.unsupported) {
          return (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-[var(--dk-muted)]">This network isn't supported yet.</p>
              <Button onClick={openChainModal}>Switch to Sepolia</Button>
            </div>
          );
        }
        return null;
      }}
    </ConnectButton.Custom>
  );
}

/** Compact connected-account chip for the widget header. */
export function AccountChip() {
  return (
    <ConnectButton.Custom>
      {({ account, mounted, openAccountModal }) => {
        if (!mounted || !account) return null;
        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="rounded-full border border-[var(--dk-border)] bg-[var(--dk-surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--dk-muted)] hover:text-[var(--dk-text)]"
          >
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
