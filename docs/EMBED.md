# Embedding DisperseKit — the one-import guide

DisperseKit is a white-label React component. No iframe, no backend, no wallet plumbing in your app — the widget carries its own providers.

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

## Props reference

<!-- TODO(phase-d): this table is the contract for DisperseWidget's props — keep it exact and complete as the component lands. Draft below. -->

| Prop | Type | Default | What it does |
|---|---|---|---|
| `token` | `` `0x${string}` `` | demo token | ERC-7984 confidential token to disperse |
| `chainId` | `number` | `11155111` (Sepolia) | Network |
| `theme` | `DisperseTheme` | DisperseKit warm | Brand colors, radius, font — see Theming |
| `recipients` | `{ address, amount }[]` | — | Programmatic pre-fill (skips CSV/paste input) |
| `onDispersed` | `(result) => void` | — | Fires after delivery is confirmed from events |
| `onError` | `(err) => void` | — | Surfaced failures (also shown inline) |

## Theming

Partners restyle the widget with a small config object (CSS variables under the hood):

```tsx
<DisperseWidget theme={{ accent: "#0ea5e9", background: "#0b1220", mode: "dark" }} />
```

## Recipient receipts

The companion component for the receiving side:

```tsx
import { ReceiptWidget } from "@dispersekit/widget";
<ReceiptWidget token="0xYourConfidentialToken" />
```

Connect wallet → EIP-712 signature → "You received X" (decrypted locally, visible only to the recipient).

<!-- TODO(phase-g): npm-publish story (today: workspace import), bundle size, SSR notes -->
