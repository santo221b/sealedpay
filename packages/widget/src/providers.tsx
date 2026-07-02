/**
 * Self-contained wallet stack. The widget wraps ITSELF in wagmi + RainbowKit,
 * so a host app needs zero web3 plumbing — render the component and done.
 * All widget instances on a page share one config/query client (module
 * singletons), so multiple embeds don't fight over the wallet connection.
 */
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, WagmiProvider, createConfig, type Config } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import type { DisperseTheme } from "./theme";
import { defaultTheme } from "./theme";

let sharedConfig: Config | undefined;
let sharedQueryClient: QueryClient | undefined;

function getConfig(walletConnectProjectId?: string): Config {
  if (!sharedConfig) {
    const projectId = walletConnectProjectId ?? (import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined);
    sharedConfig = createConfig({
      chains: [sepolia],
      // WalletConnect only when a project id is supplied; the injected
      // connector keeps the demo dependency-free.
      connectors: projectId ? [injected(), walletConnect({ projectId })] : [injected()],
      transports: { [sepolia.id]: http() },
    });
  }
  return sharedConfig;
}

export function DisperseProviders({
  children,
  theme,
  walletConnectProjectId,
}: {
  children: ReactNode;
  theme?: DisperseTheme;
  walletConnectProjectId?: string;
}) {
  sharedQueryClient ??= new QueryClient();
  const accent = theme?.accent ?? defaultTheme.accent;
  return (
    <WagmiProvider config={getConfig(walletConnectProjectId)}>
      <QueryClientProvider client={sharedQueryClient}>
        <RainbowKitProvider theme={lightTheme({ accentColor: accent, borderRadius: "medium" })} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
