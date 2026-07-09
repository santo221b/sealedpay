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
import type { ReactNode } from "react";
import { http } from "viem";
import { sepolia } from "viem/chains";

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
