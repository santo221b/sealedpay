/**
 * Self-contained wallet stack. The widget wraps ITSELF in wagmi + RainbowKit,
 * so a host app needs zero web3 plumbing — render the component and done.
 * All widget instances on a page share one config/query client (module
 * singletons), so multiple embeds don't fight over the wallet connection.
 */
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { http, WagmiProvider, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import type { DisperseTheme } from "./theme";
import { defaultTheme } from "./theme";

/** Perceived-luminance test so a dark app theme gets RainbowKit's dark modal. */
function isDarkColor(color: string): boolean {
  const c = color.trim();
  let r = 255,
    g = 255,
    b = 255;
  if (c.startsWith("#")) {
    const s = c.slice(1);
    const full = s.length === 3 ? s.split("").map((ch) => ch + ch).join("") : s;
    r = parseInt(full.slice(0, 2), 16);
    g = parseInt(full.slice(2, 4), 16);
    b = parseInt(full.slice(4, 6), 16);
  } else {
    const m = c.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3) [r, g, b] = m.slice(0, 3).map(Number);
  }
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function makeConfig(walletConnectProjectId?: string) {
  const projectId = walletConnectProjectId ?? (import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined);
  return createConfig({
    chains: [sepolia],
    // WalletConnect only when a project id is supplied; the injected
    // connector keeps the demo dependency-free.
    connectors: projectId ? [injected(), walletConnect({ projectId })] : [injected()],
    transports: { [sepolia.id]: http() },
  });
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
  // One config per mounted widget (NOT a module singleton): a shared config
  // would be re-hydrated by every new provider mount, notifying subscribers
  // in other trees mid-render — React's "setState while rendering" warning.
  // Injected-wallet state converges across instances via the wallet itself.
  const [config] = useState(() => makeConfig(walletConnectProjectId));
  const [queryClient] = useState(() => new QueryClient());
  const accent = theme?.accent ?? defaultTheme.accent;
  const background = theme?.background ?? defaultTheme.background;

  // Match the RainbowKit "Connect a Wallet" modal to the host app: a dark app
  // theme gets the dark modal (with the app's accent + surfaces), a light one
  // gets the light modal.
  const rkTheme = useMemo(() => {
    if (isDarkColor(background)) {
      const base = darkTheme({
        accentColor: accent,
        accentColorForeground: theme?.accentText ?? "#0b1512",
        borderRadius: "large",
      });
      return {
        ...base,
        colors: {
          ...base.colors,
          modalBackground: theme?.background ?? base.colors.modalBackground,
          modalBorder: theme?.border ?? base.colors.modalBorder,
          modalText: theme?.text ?? base.colors.modalText,
          modalTextSecondary: theme?.muted ?? base.colors.modalTextSecondary,
        },
      };
    }
    return lightTheme({ accentColor: accent, borderRadius: "medium" });
  }, [accent, background, theme?.accentText, theme?.border, theme?.text, theme?.muted]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
