/**
 * Self-contained wallet stack. The widget wraps ITSELF in wagmi + RainbowKit,
 * so a host app needs zero web3 plumbing — render the component and done.
 * All widget instances on a page share one config/query client (module
 * singletons), so multiple embeds don't fight over the wallet connection.
 */
import { RainbowKitProvider, connectorsForWallets, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { http, WagmiProvider, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";

import type { DisperseTheme } from "./theme";
import { defaultTheme } from "./theme";

/** Parse a #hex / #rgb / rgb()/rgba() color to its [r,g,b] channels (0-255). */
function parseRgb(color: string): [number, number, number] {
  const c = color.trim();
  if (c.startsWith("#")) {
    const s = c.slice(1);
    const full = s.length === 3 ? s.split("").map((ch) => ch + ch).join("") : s;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const m = c.match(/\d+(\.\d+)?/g);
  if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  return [255, 255, 255];
}

/** Perceived-luminance test so a dark app theme gets RainbowKit's dark modal. */
function isDarkColor(color: string): boolean {
  const [r, g, b] = parseRgb(color);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** Re-express any color at a given alpha, so a solid theme color can go glassy. */
function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = parseRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * RainbowKit's theme controls the modal's font family and colors, but NOT its
 * font weights — its wallet list and heading are hardcoded bold. This one-time
 * stylesheet dials those back to medium (heading a touch stronger).
 *
 * Crucially it is scoped to the modal ALONE. RainbowKit wraps the host app in
 * its own `[data-rk]` (inside `#root`) but PORTALS the modal outside `#root`,
 * so a `[data-rk]`-wide rule would rewrite the whole app's typography. The app
 * also uses `role="dialog"` for its own modals, so `:not(#root *)` is what
 * isolates RainbowKit's portaled dialog from everything the app renders.
 */
const RK_POLISH_ID = "dk-rk-polish";
function ensureRainbowKitPolish() {
  if (typeof document === "undefined" || document.getElementById(RK_POLISH_ID)) return;
  const style = document.createElement("style");
  style.id = RK_POLISH_ID;
  style.textContent = `
    div[role="dialog"]:not(#root *) { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; }
    div[role="dialog"]:not(#root *) * { font-weight: 500 !important; }
    div[role="dialog"]:not(#root *) h1 { font-weight: 600 !important; }
  `;
  document.head.appendChild(style);
}

// RainbowKit's public demo projectId — enough to render the universal
// WalletConnect QR out of the box. For production / bounty judging, set
// VITE_WALLETCONNECT_PROJECT_ID (repo-root .env, or the host's env) to your own
// free id from https://reown.com so the QR isn't sharing a rate-limited relay.
const DEMO_WC_PROJECT_ID = "21fef48091f12692cad574a6f7753643";

function makeConfig(appName: string, walletConnectProjectId?: string) {
  const envId = import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
  const projectId = walletConnectProjectId || envId || DEMO_WC_PROJECT_ID;

  // The modal must never be a dead end for a visitor with NO extension.
  //   • WalletConnect — the universal QR: scan with ANY mobile wallet, zero
  //     install. This is the real no-extension path.
  //   • MetaMask      — branded; connects if installed, else offers its get flow.
  //   • Injected      — catches any other extension (Rabby, Brave, Frame …).
  // Coinbase Wallet is intentionally omitted: with no extension it bounces
  // through keys.coinbase.com, which fails in several browsers. The projectId is
  // effectively always present (demo fallback), so the Coinbase+injected branch
  // is only a safety net if someone explicitly blanks the id.
  const wallets = projectId
    ? [walletConnectWallet, metaMaskWallet, injectedWallet]
    : [coinbaseWallet, injectedWallet];

  const connectors = connectorsForWallets([{ groupName: "Recommended", wallets }], {
    appName,
    projectId: projectId || "",
  });

  return createConfig({
    chains: [sepolia],
    connectors,
    transports: { [sepolia.id]: http() },
  });
}

export function DisperseProviders({
  children,
  theme,
  walletConnectProjectId,
  appName = "DisperseKit",
}: {
  children: ReactNode;
  theme?: DisperseTheme;
  walletConnectProjectId?: string;
  /** Shown to WalletConnect-based wallets during pairing. */
  appName?: string;
}) {
  // One config per mounted widget (NOT a module singleton): a shared config
  // would be re-hydrated by every new provider mount, notifying subscribers
  // in other trees mid-render — React's "setState while rendering" warning.
  // Injected-wallet state converges across instances via the wallet itself.
  const [config] = useState(() => makeConfig(appName, walletConnectProjectId));
  const [queryClient] = useState(() => new QueryClient());
  const accent = theme?.accent ?? defaultTheme.accent;
  const background = theme?.background ?? defaultTheme.background;

  // Font + weight + blur can't be set through RainbowKit's theme object, so a
  // scoped stylesheet handles those (injected once, on the client).
  ensureRainbowKitPolish();

  // Match the RainbowKit "Connect a Wallet" modal to the host app: a dark app
  // theme gets the dark modal (with the app's accent + surfaces), a light one
  // gets the light modal.
  const rkTheme = useMemo(() => {
    const font = theme?.font && theme.font !== "inherit" ? theme.font : undefined;
    if (isDarkColor(background)) {
      const base = darkTheme({
        accentColor: accent,
        accentColorForeground: theme?.accentText ?? "#0b1512",
        borderRadius: "large",
      });
      return {
        ...base,
        ...(font ? { fonts: { ...base.fonts, body: font } } : {}),
        colors: {
          ...base.colors,
          // Translucent card + themed hover = glass that matches the app.
          modalBackground: withAlpha(theme?.background ?? "#121d1a", 0.72),
          modalBorder: theme?.border ?? base.colors.modalBorder,
          modalText: theme?.text ?? base.colors.modalText,
          modalTextSecondary: theme?.muted ?? base.colors.modalTextSecondary,
          menuItemBackground: withAlpha(accent, 0.12),
          closeButtonBackground: withAlpha(theme?.text ?? "#f2f7f4", 0.06),
        },
      };
    }
    const base = lightTheme({ accentColor: accent, borderRadius: "medium" });
    return font ? { ...base, fonts: { ...base.fonts, body: font } } : base;
  }, [accent, background, theme?.accentText, theme?.border, theme?.text, theme?.muted, theme?.background, theme?.font]);

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
