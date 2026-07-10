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
import { getEmbeddedConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useEffect, useRef, useState } from "react";
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
  const { user } = usePrivy();
  const { setActiveWallet } = useSetActiveWallet();
  const { address, isConnected } = useAccount();
  // Bumping this re-runs the activation attempt (retry after a failure).
  const [attempt, setAttempt] = useState(0);
  // An injected wallet PROMPTS (MetaMask window) on activation — one silent
  // auto-attempt max, never a loop.
  const promptedInjected = useRef(false);

  // An email account gets an embedded wallet — it may just not be in the list
  // yet on a fresh sign-in. Those accounts must NEVER fall back to an injected
  // wallet: that is the "why does MetaMask keep opening" bug.
  const expectsEmbedded = Boolean(user?.email?.address);

  useEffect(() => {
    if (wallets.length === 0) return;
    const prefer = loadPreferExternal();
    const preferred = prefer ? wallets.find((w) => w.address.toLowerCase() === prefer) : undefined;
    const embedded = getEmbeddedConnectedWallet(wallets) ?? undefined;
    // Deliberate external → embedded → (wallet-only logins only) the connected
    // external wallet. Email accounts wait for their embedded wallet instead.
    const fallback = expectsEmbedded ? undefined : wallets[0];
    const target = preferred ?? embedded ?? fallback;
    if (!target || target.address.toLowerCase() === address?.toLowerCase()) return;
    // Activating the embedded wallet never prompts; anything else can open a
    // wallet window, so it gets exactly one automatic attempt.
    const promptable = target !== embedded;
    if (promptable && promptedInjected.current) return;
    if (promptable) promptedInjected.current = true;
    let cancelled = false;
    let timer: number | undefined;
    // setActiveWallet can reject when the Privy wagmi connector isn't ready
    // yet (fresh embedded wallets especially). Swallowing that once left the
    // app disconnected forever — retry, but only on the prompt-free path.
    void setActiveWallet(target).catch(() => {
      if (!cancelled && !promptable) timer = window.setTimeout(() => setAttempt((n) => n + 1), 900);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, address, attempt, expectsEmbedded]);

  // Watchdog for the EMBEDDED path only (its activation never prompts, so
  // retrying is free): wallets exist but wagmi still reports disconnected —
  // keep nudging until the connection lands. Stops the moment it does.
  const walletsExist = wallets.length > 0;
  useEffect(() => {
    if (!walletsExist || isConnected) return;
    if (!expectsEmbedded || loadPreferExternal()) return;
    const t = window.setInterval(() => setAttempt((n) => n + 1), 1400);
    return () => window.clearInterval(t);
  }, [walletsExist, isConnected, expectsEmbedded]);
}
