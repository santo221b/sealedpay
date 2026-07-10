/**
 * SealedPay's own wallet/auth stack — Privy replaces RainbowKit.
 *
 * Email login creates an embedded wallet (Privy) for users without one, so an
 * employee can receive + reveal confidential pay with no extension — Safari and
 * mobile included. External wallets (MetaMask etc.) stay available for
 * employers who already hold funded Sepolia accounts.
 *
 * The engine (@dispersekit/widget) is untouched: its hooks read wagmi, and
 * @privy-io/wagmi exposes every Privy wallet (embedded or external) as a wagmi
 * connector. One provider swap, zero engine changes.
 */
import { PrivyProvider } from "@privy-io/react-auth";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { http } from "viem";
import { sepolia } from "viem/chains";

/**
 * Fix + re-skin the Privy modal.
 *
 * LAYOUT (the important half): our host sets `body { overflow:hidden; height:100% }`
 * so the document never scrolls. Privy's modal wrapper (#privy-dialog) relies on
 * its own fixed full-screen box to lift the card into a centered overlay — but in
 * this host that box collapses, so the fully-rendered card lands *below the fold*
 * and the popup looks like "nothing happened". We pin the wrapper to a fixed,
 * full-screen flex-centering overlay ourselves so the card is always on-screen.
 *
 * SKIN: Privy's SDK theme only exposes light|dark + an accent color, so we paint
 * the SealedPay dark-green glass onto its STABLE ids. The card is
 * #privy-modal-content (NOT #privy-dialog, which is only the overlay wrapper); the
 * styled-components hashes are unstable, but these ids are not. Injected once.
 */
const PRIVY_SKIN_ID = "sp-privy-skin";
function ensurePrivySkin() {
  if (typeof document === "undefined" || document.getElementById(PRIVY_SKIN_ID)) return;
  const style = document.createElement("style");
  style.id = PRIVY_SKIN_ID;
  style.textContent = `
    /* Overlay wrapper — force a centered full-screen box (see note above). */
    #privy-dialog {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow-y: auto !important;
      padding: 24px !important;
      background: transparent !important;
      border: none !important;
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
      box-shadow: none !important;
      z-index: 2147483000 !important;
    }
    #privy-dialog-backdrop {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(6,12,10,0.66) !important;
      -webkit-backdrop-filter: blur(4px) !important;
      backdrop-filter: blur(4px) !important;
    }
    /* The card itself — SealedPay dark-green glass, translucent so the page
       glows through the blur. */
    #privy-modal-content {
      position: relative !important;
      z-index: 1 !important;
      background: rgba(16,26,22,0.72) !important;
      -webkit-backdrop-filter: blur(26px) saturate(1.3) !important;
      backdrop-filter: blur(26px) saturate(1.3) !important;
      border: 1px solid rgba(95,230,175,0.22) !important;
      border-radius: 22px !important;
      box-shadow: 0 30px 90px -30px rgba(0,0,0,0.75), 0 0 70px -22px rgba(46,148,116,0.4) !important;
      font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif !important;
    }
    /* The app-style avatar glow: the modal logo lifts + glows on hover. */
    #privy-dialog img {
      transition: filter .25s ease, transform .25s ease;
    }
    #privy-dialog img:hover {
      filter: drop-shadow(0 0 14px rgba(120,233,192,0.85));
      transform: scale(1.06);
    }
  `;
  document.head.appendChild(style);
}

// Public client-side identifier (not a secret). The env var wins so a fork can
// point at its own Privy app without touching source.
export const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ?? "cmre3lzzl00iq0bihtxg4p6cw";

const queryClient = new QueryClient();

// One config for the whole app (module singleton, mirrors the old providers).
export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: { [sepolia.id]: http() },
});

export function SealedPayProviders({ children }: { children: ReactNode }) {
  useEffect(() => ensurePrivySkin(), []);
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#5fe3ab",
          logo: "/avatars/avatar-profile.svg",
          walletChainType: "ethereum-only",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: true,
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
