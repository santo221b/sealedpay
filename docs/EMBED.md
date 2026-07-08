# Embedding DisperseKit — the one-import guide

DisperseKit is a white-label React component. No iframe, no backend, no wallet
plumbing in your app — the widget carries its own wallet stack (wagmi +
RainbowKit), its own FHE encryption pipeline, and its own UI. You render a
component; your users get confidential bulk payouts.

```tsx
import { DisperseWidget } from "@dispersekit/widget";

export function PayoutsPage() {
  return (
    <DisperseWidget
      token="0xYourConfidentialToken"
      theme={{ accent: "#635bff", radius: "14px" }}
      onDispersed={({ txHash, recipients }) => track("payout", txHash)}
    />
  );
}
```

That is the entire integration. Try the widget live in the
[widget playground](https://dispersekit-widget.vercel.app), and read the full
SDK walkthrough at the [DisperseKit docs](https://dispersekit-demo.vercel.app).

## `<DisperseWidget />` props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `token` | `` `0x${string}` `` | demo token (`VITE_CTOKEN_ADDRESS`) | The ERC-7984 confidential token to disperse. |
| `chainId` | `number` | `11155111` (Sepolia) | Network. Sepolia only for now; the disperse singleton also exists on mainnet. |
| `theme` | `DisperseTheme` | DisperseKit warm | Brand colors, radius, font — see Theming below. |
| `title` | `string` | `"Confidential payout"` | Card heading, e.g. your feature's name. |
| `recipients` | `{ address: string; amount: string }[]` | — | Programmatic pre-fill of the list (amounts in human units, e.g. `"1.25"`). |
| `onDispersed` | `(result: DeliveryResult) => void` | — | Fires after delivery is confirmed **from the on-chain event** (never assumed). `result` = `{ txHash, recipients, requested, transferred }` — the latter two are ciphertext handles. |
| `onError` | `(err: Error) => void` | — | Real failures only (user-cancelled wallet prompts are not errors). |
| `walletConnectProjectId` | `string` | `VITE_WALLETCONNECT_PROJECT_ID` | Adds WalletConnect to the connect modal. Injected wallets work without it. |

## `<ReceiptWidget />` props — the recipient side

```tsx
import { ReceiptWidget } from "@dispersekit/widget";

<ReceiptWidget token="0xYourConfidentialToken" theme={acmeBrand} />
```

Connect wallet → one EIP-712 signature → every incoming confidential payment
plus the current balance, decrypted locally. Nobody else can perform this read.

| Prop | Type | Default | What it does |
|---|---|---|---|
| `token`, `chainId`, `theme`, `title`, `walletConnectProjectId` | — | as above | Same semantics as `DisperseWidget`. |
| `lookbackBlocks` | `bigint` | `100_000n` | How far back to scan for incoming transfers (public RPCs cap ranges; the widget falls back to a narrower scan automatically). |

## Theming

A small object → CSS variables under the hood. Every color, the radius and
the font are yours:

```tsx
const acmeBrand: DisperseTheme = {
  accent: "#4f46e5",     // buttons, focus, progress
  accentText: "#ffffff",
  background: "#ffffff", // card
  surface: "#f4f4f8",    // inputs, table rows
  text: "#1e1b2e",
  muted: "#736f85",
  border: "#e6e4ee",
  radius: "14px",
  font: "Inter, sans-serif", // defaults to inheriting your app's font
};
```

Unset keys fall back to the DisperseKit default (warm peach/cream). The
RainbowKit connect modal picks up your `accent` automatically.

## What the widget does for your users (so you don't have to)

1. **Encrypts client-side.** Every amount is encrypted in the browser with the
   Zama relayer SDK — one ZK proof covers the whole batch. Plaintext never
   leaves the page.
2. **Time-boxed authorization.** `setOperator` on the token for 1 hour — no
   unlimited approvals. Skipped when a grant is still live.
3. **One transaction.** The audited TokenOps `DisperseConfidential` singleton
   delivers every encrypted amount in a single tx (direct mode — the contract
   never holds funds).
4. **Verified delivery.** Confidential transfers can't revert on insufficient
   balance (they move an encrypted zero — an FHE reality). The widget decrypts
   the `transferred` handles after the tx and flags any zeros, so "delivered"
   means delivered.

## Today's packaging caveats (honest section)

- The widget currently ships as **workspace source** (this is a bounty
  monorepo). Consuming it from another Vite app needs two lines of config:
  `optimizeDeps: { exclude: ["@zama-fhe/relayer-sdk"] }` in `vite.config.ts`
  (the SDK's WASM resolves relative to `import.meta.url`) and
  `@source "<path-to-widget>/src"` in your Tailwind CSS entry. A published
  npm build would compile both away.
- React ≥ 18, ESM only. SSR: render client-side (the FHE WASM is browser-only).
