# SealedPay 🔒

**SealedPay — confidential payroll on-chain. Pay your whole team in one transaction; salaries stay encrypted. Built on TokenOps confidential disperse × Zama FHE.**

Two layers live in this repo:

- **SealedPay** — the product: an employer-only payroll dashboard ([`packages/payroll`](packages/payroll)). Manage a team, click *Run payroll*, and every salary is delivered in a single confidential transaction — encrypted end-to-end, decryptable only by the employer and each individual employee, with delivery *proven* by decryption rather than assumed.
- **DisperseKit** — the engine: a white-label confidential disperse widget ([`packages/widget`](packages/widget)). One import, one click, a confidential bulk payout. SealedPay is a skin over it; any partner app can be too.

> Built for the Zama Developer Program Mainnet Season 3 — Special Bounty Track × TokenOps.

```tsx
import { DisperseWidget } from "@dispersekit/widget";

<DisperseWidget
  token="0xYourConfidentialToken"
  theme={{ accent: "#ff7a59" }}
  onDispersed={(txHash) => console.log("paid!", txHash)}
/>
```

That's the whole integration. Recipients, amounts, encryption, operator approval, and the bulk transfer are all handled inside the widget.

## Live demos

- **SealedPay (the product)** — `npm run dev:payroll` (Vercel deploy pending final sign-off; will live at a `sealedpay` project)
- **DisperseKit widget playground** — [dispersekit-widget.vercel.app](https://dispersekit-widget.vercel.app) (the engine standalone + a gallery of every state + the integration test bench)
- **White-label embed** — [dispersekit-demo.vercel.app](https://dispersekit-demo.vercel.app) ("Acme Payroll", a fictional partner product embedding the widget with one import)

## Deployed contracts (Sepolia)

| Contract | Address |
|---|---|
| `DisperseConfidential` — **official TokenOps singleton** (audited, verified) | [`0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`](https://sepolia.etherscan.io/address/0x710dD9885Cc9986EfD234E7719483147a6d8DBb4) |
| `ConfidentialTokenDemo` (cUSDd, ERC-7984, open faucet) | [`0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1`](https://sepolia.etherscan.io/address/0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1) |

Proof it works end-to-end on the live network: [this transaction](https://sepolia.etherscan.io/tx/0xc8d190a014015a8fe8aca9af82b49db44e61fd46a5ff2cece98033e81a6fe154) disperses two encrypted amounts through the official singleton — the amounts on-chain are opaque handles, and `packages/contracts/scripts/e2e-sepolia.mjs` decrypts them back (12.5 / 7.25 cUSDd) as sender *and* as recipient.

<!-- TODO(phase-g): screenshots/GIF for the README -->

## What it does

- A **sender** pastes or uploads (CSV) a list of `recipient, amount` rows.
- Each amount — and the subtotal — is **encrypted client-side** with the Zama relayer SDK.
- The widget asks the sender to authorize the disperse contract as an **operator** on the confidential token (ERC-7984), then executes **one transaction** that delivers every encrypted amount.
- Each **recipient** can privately decrypt *their own* amount — and nobody else's.

## What stays private (and what doesn't)

| | Visible on-chain? |
|---|---|
| Per-recipient amounts | 🔒 **No** — encrypted, decryptable only by the recipient (and whoever they grant) |
| Total dispersed | 🔒 **No** — encrypted |
| Recipient addresses | 👁️ Yes — a push transfer emits events naming recipients |
| That a distribution happened | 👁️ Yes |

Full model: [docs/CONFIDENTIALITY.md](docs/CONFIDENTIALITY.md)

## Repository layout

| Package | What it is |
|---|---|
| [`packages/payroll`](packages/payroll) | **SealedPay** — the confidential payroll dashboard (the product) |
| [`packages/widget`](packages/widget) | **DisperseKit** — the engine: the single-import `<DisperseWidget />` + the shared disperse flow |
| [`packages/contracts`](packages/contracts) | Hardhat project — ERC-7984 demo token + the audited TokenOps disperse contract (Sepolia) |
| [`packages/demo-host`](packages/demo-host) | "Acme Payroll", a mock partner app embedding the widget — the white-label story |

## Quickstart

```bash
git clone <this-repo> && cd dispersekit
npm install
npm run test:contracts   # bulk disperse + per-recipient decryption, proven in the FHEVM mock
npm run dev:payroll      # SealedPay — the confidential payroll dashboard
npm run dev:widget       # DisperseKit widget playground
npm run dev:demo         # partner app embedding the widget
```

Full setup (env, Sepolia deploy): [docs/SETUP.md](docs/SETUP.md) · Embedding guide: [docs/EMBED.md](docs/EMBED.md)

## Tech stack

Solidity `^0.8.27` · [`@fhevm/solidity`](https://docs.zama.org/protocol) · [`@openzeppelin/confidential-contracts`](https://zama.org/erc-7984) (ERC-7984) · Hardhat (fhevm template) · React + TypeScript + Vite · wagmi + viem + RainbowKit · [`@zama-fhe/relayer-sdk`](https://docs.zama.org/protocol/sdk) · Tailwind CSS + Framer Motion

## Docs

- [SETUP.md](docs/SETUP.md) — clone → run in under 10 minutes
- [EMBED.md](docs/EMBED.md) — the one-import integration guide (props reference)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — contracts, flows, and the widget pipeline
- [CONFIDENTIALITY.md](docs/CONFIDENTIALITY.md) — exactly what's hidden, exactly what isn't
- [DEMO.md](docs/DEMO.md) — running the end-to-end demo
- [PROGRESS.md](docs/PROGRESS.md) — living build log
