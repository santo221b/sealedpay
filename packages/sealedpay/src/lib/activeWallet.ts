/**
 * Active-wagmi-wallet policy.
 *
 * The engine + the balance decrypt sign with whatever wallet is ACTIVE in
 * wagmi (`useWalletClient`). Without pinning it, an injected MetaMask can
 * become the active account even after an email login — so a "no-extension"
 * user ends up signing (and decrypting their balance) through MetaMask.
 *
 * Policy: the EMBEDDED (email) wallet is active by default, so email login
 * stays extension-free. The one honoured override is an external wallet the
 * user deliberately connected (setPreferExternal) — e.g. a funded employer who
 * pays from their own MetaMask.
 */
import { getEmbeddedConnectedWallet, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useEffect } from "react";
import { useAccount } from "wagmi";

const PREFER_EXTERNAL_KEY = "sealedpay_prefer_external";

/** Remember (or clear) the external wallet the user chose to sign with. */
export function setPreferExternal(address: string | null) {
  try {
    if (address) localStorage.setItem(PREFER_EXTERNAL_KEY, address.toLowerCase());
    else localStorage.removeItem(PREFER_EXTERNAL_KEY);
  } catch {
    /* storage unavailable */
  }
}

function loadPreferExternal(): string | null {
  try {
    return localStorage.getItem(PREFER_EXTERNAL_KEY);
  } catch {
    return null;
  }
}

/**
 * Keep the active wagmi wallet aligned with intent. Mount once, high in the
 * tree (inside Privy + Wagmi providers).
 */
export function useActiveWalletSync() {
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { address } = useAccount();

  useEffect(() => {
    if (wallets.length === 0) return;
    const prefer = loadPreferExternal();
    const preferred = prefer ? wallets.find((w) => w.address.toLowerCase() === prefer) : undefined;
    const embedded = getEmbeddedConnectedWallet(wallets) ?? undefined;
    // Deliberate external → embedded → whatever's connected (wallet-only login).
    const target = preferred ?? embedded ?? wallets[0];
    if (target && target.address.toLowerCase() !== address?.toLowerCase()) {
      void setActiveWallet(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, address]);
}
