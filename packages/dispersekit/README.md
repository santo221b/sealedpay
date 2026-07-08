# @dispersekit/widget

**The DisperseKit SDK.** One engine for confidential token disperse, plus
ready-made React parts. Pay many recipients in a single transaction with
amounts encrypted end to end. Built on **Zama FHE** (encryption) and the
official **[TokenOps SDK](https://www.npmjs.com/package/@tokenops/sdk)**
(`@tokenops/sdk`) — the confidential ERC-7984 disperse runs through its
`ConfidentialDisperseClient` against the audited, already-deployed singleton
(no factories deployed).

Full integration docs, with a runnable example per export:
[dispersekit-demo.vercel.app](https://dispersekit-demo.vercel.app).

## Two layers

**1. The engine** is one implementation of the confidential payout flow
(encrypt, authorize, disperse, confirm, verify). It has no UI opinions.
SealedPay (the payroll dashboard) is built entirely on this layer and never
reimplements an on-chain or cryptographic step.

```tsx
import {
  useDisperseFlow, useTokenMeta, parseRecipients,
  getFhevmInstance, userDecryptHandles, formatAmount,
  erc7984Abi, disperseAbi,
} from "@dispersekit/widget";
```

**2. Ready-made parts** are the drop-in widgets and the presentational building
blocks a custom skin can reuse, so status states and the verify-delivery moment
stay identical everywhere.

```tsx
import { DisperseProviders, DisperseWidget } from "@dispersekit/widget";

<DisperseProviders theme={{ accent: "#635bff" }} appName="Acme">
  <DisperseWidget token="0xYourConfidentialToken" />
</DisperseProviders>
```

Full integration guide and props reference: [`docs/EMBED.md`](../../docs/EMBED.md).

## What's inside

```
src/
├── DisperseWidget.tsx    the single-import sender component
├── ReceiptWidget.tsx     the recipient's "what did I get?" companion
├── providers.tsx         self-contained wagmi + RainbowKit stack
├── hooks/
│   ├── useDisperseFlow.ts   the state machine (encrypt, authorize, disperse, confirm, verify)
│   └── useTokenMeta.ts
├── components/           presentational pieces (editor, review, timeline, receipt, privacy badge)
├── lib/
│   ├── fhe/              relayer SDK: init singleton, encryptAmounts, userDecryptHandles
│   ├── contracts/        minimal ABIs + official singleton addresses
│   ├── parse.ts          CSV/paste recipient parsing
│   └── format.ts
├── theme.ts              DisperseTheme to CSS variables
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

- **The disperse runs through `@tokenops/sdk`.** `useDisperseFlow` authorizes the
  operator (`setOperator`) and disperses via the SDK's `ConfidentialDisperseClient`
  (`mode: "direct"`), encrypting through our relayer instance adapted to the SDK's
  `Encryptor` interface — one FHE stack, no second Zama SDK pulled in. The flow
  captures the broadcast tx hash so a confirmation hiccup is recovered from the
  hash, never re-sent (no double payout).
- **Direct mode** (`disperseConfidentialTokenDirect`) is the flow: no
  registration, no subtotals to get wrong, funds never held by the contract.
  The singleton caps the batch (currently 20 recipients), validated by the SDK.
- **Delivery is verified, never assumed.** ERC-7984 transfers silently move an
  encrypted zero if the sender is short. After the tx, the flow decrypts the
  `transferred` handles (the sender holds ACL on them) and flags any zeros.
- **ACL scopes.** `transferred` handles decrypt under the **token's** scope,
  `requested` handles under the **disperse contract's**. See
  [`docs/research/SUMMARY.md`](../../docs/research/SUMMARY.md).
- The FHE instance uses a public Sepolia RPC for reads. The wallet only signs.
