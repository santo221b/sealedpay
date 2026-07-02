# @dispersekit/widget

The product: a white-label React widget for confidential bulk payouts on the
Zama Protocol, powered by the official TokenOps disperse contract.

```tsx
import { DisperseWidget } from "@dispersekit/widget";

<DisperseWidget token="0xYourConfidentialToken" theme={{ accent: "#635bff" }} />
```

Full integration guide + props reference: [`docs/EMBED.md`](../../docs/EMBED.md).

## What's inside

```
src/
├── DisperseWidget.tsx    the single-import sender component
├── ReceiptWidget.tsx     the recipient's "what did I get?" companion
├── providers.tsx         self-contained wagmi + RainbowKit stack
├── hooks/
│   ├── useDisperseFlow.ts   the state machine (encrypt → authorize → disperse → confirm → verify)
│   └── useTokenMeta.ts
├── components/           presentational pieces (editor, review, timeline, receipt, privacy badge)
├── lib/
│   ├── fhe/              relayer SDK: init singleton, encryptAmounts, userDecryptHandles
│   ├── contracts/        minimal ABIs + official singleton addresses
│   ├── parse.ts          CSV/paste recipient parsing
│   └── format.ts
├── theme.ts              DisperseTheme → CSS variables
└── dev/                  playground: live widget, fixture gallery of all states, test bench
```

## Development

```bash
npm run dev      # playground at http://localhost:5173
                 # tabs: Widget (live), States (all states, no wallet), Test bench
npx tsc -b       # type-check
node scripts/relayer-smoke.mjs   # encrypt round-trip vs the live Sepolia relayer (no wallet)
```

## Design decisions worth knowing

- **Direct mode** (`disperseConfidentialTokenDirect`) is the flow: no
  registration, no subtotals to get wrong, funds never held by the contract.
  The live singleton caps it (currently 20 recipients) — read at runtime.
- **Delivery is verified, never assumed**: ERC-7984 transfers silently move an
  encrypted zero if the sender is short. After the tx, the widget decrypts the
  `transferred` handles (the sender holds ACL on them) and flags any zeros.
- **ACL scopes**: `transferred` handles decrypt under the **token's** scope;
  `requested` handles under the **disperse contract's**. See
  [`docs/research/SUMMARY.md`](../../docs/research/SUMMARY.md).
- The FHE instance uses a public Sepolia RPC for reads; the wallet only signs.
