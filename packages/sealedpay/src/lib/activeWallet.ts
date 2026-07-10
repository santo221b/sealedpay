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
import { useEffect, useState } from "react";
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
  const { address, isConnected } = useAccount();
  // Bumping this re-runs the activation attempt (retry after a failure).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (wallets.length === 0) return;
    const prefer = loadPreferExternal();
    const preferred = prefer ? wallets.find((w) => w.address.toLowerCase() === prefer) : undefined;
    const embedded = getEmbeddedConnectedWallet(wallets) ?? undefined;
    // Deliberate external → embedded → whatever's connected (wallet-only login).
    const target = preferred ?? embedded ?? wallets[0];
    if (!target || target.address.toLowerCase() === address?.toLowerCase()) return;
    let cancelled = false;
    let timer: number | undefined;
    // setActiveWallet can reject when the Privy wagmi connector isn't ready
    // yet (fresh embedded wallets especially). Swallowing that once left the
    // app disconnected forever — schedule a retry instead.
    void setActiveWallet(target).catch(() => {
      if (!cancelled) timer = window.setTimeout(() => setAttempt((n) => n + 1), 900);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, address, attempt]);

  // Watchdog: wallets exist but wagmi still reports disconnected — whatever
  // the silent cause (a resolved-but-ineffective activation, a connector that
  // came up late), keep nudging until the connection lands. Stops the moment
  // isConnected flips.
  const walletsExist = wallets.length > 0;
  useEffect(() => {
    if (!walletsExist || isConnected) return;
    const t = window.setInterval(() => setAttempt((n) => n + 1), 1400);
    return () => window.clearInterval(t);
  }, [walletsExist, isConnected]);
}
