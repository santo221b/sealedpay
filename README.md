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

- **SealedPay (the product)** — [sealedpay.vercel.app](https://sealedpay.vercel.app) (the confidential payroll dashboard; run locally with `npm run dev:payroll`)
- **DisperseKit SDK docs** — [dispersekit-demo.vercel.app](https://dispersekit-demo.vercel.app) (the single-page SDK integration guide, with a full API reference and SealedPay as the case study)

## For judges — running SealedPay end to end

SealedPay runs live on Sepolia; the whole flow takes about two minutes.

1. **Open the app** (URL above) and click **Skip for now** on the connect step, or connect straight away. The dashboard is pre-loaded with a demo team and 6 months of history, so you can explore before connecting.
2. **Connect a wallet** (top-right). Use MetaMask or scan the WalletConnect QR. If you are on the wrong network the button turns into **Switch to Sepolia**.
3. **Get Sepolia ETH for gas** (a few writes need it): [Google Cloud faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de). No real money anywhere.
4. **Fund the wallet** with demo cUSDd — the **Fund** button on the Payroll Wallet card (open faucet, one mint tx).
5. **Run Payroll** (Team screen) → watch encrypt → authorize operator → disperse → verify. Every amount is encrypted on-chain; the tx is public on Etherscan but the salaries are not.
6. **Inspect** — the run appears in Recent activity with an Etherscan link, the Payout Activity / Insights charts update, and each employee's payment history can be decrypted with your wallet signature.

> Note: in this demo build the five sample employees share one recipient wallet so a single tester can verify both sides; edit `packages/payroll/src/lib/seed.ts` (`SEED_EMPLOYEES`) to point at distinct addresses for a real team. Use **Settings → Reset demo** to clear local state.

### Deploy SealedPay (Vercel)

Create a **new Vercel project** from this repo with **Root Directory = `packages/payroll`** — Vercel auto-detects Vite via `packages/payroll/vercel.json` and installs the workspace from the repo root. Set these environment variables on the project:

| Variable | Value |
|---|---|
| `VITE_CTOKEN_ADDRESS` | `0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1` (also the built-in fallback, but set it explicitly) |
| `VITE_WALLETCONNECT_PROJECT_ID` | your free id from [reown.com](https://reown.com) — makes the WalletConnect QR reliable instead of the shared demo relay |

Deploy, then paste the URL into the **Live demos** list above.

## Deployed contracts (Sepolia)

| Contract | Address |
|---|---|
| `DisperseConfidential` — **official TokenOps singleton** (audited, verified) | [`0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`](https://sepolia.etherscan.io/address/0x710dD9885Cc9986EfD234E7719483147a6d8DBb4) |
| `ConfidentialTokenDemo` (cUSDd, ERC-7984, open faucet) | [`0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1`](https://sepolia.etherscan.io/address/0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1) |

Proof it works end-to-end on the live network: [this transaction](https://sepolia.etherscan.io/tx/0xc8d190a014015a8fe8aca9af82b49db44e61fd46a5ff2cece98033e81a6fe154) disperses two encrypted amounts through the official singleton — the amounts on-chain are opaque handles, and `packages/contracts/scripts/e2e-sepolia.mjs` decrypts them back (12.5 / 7.25 cUSDd) as sender *and* as recipient.

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
| [`packages/demo-host`](packages/demo-host) | **DisperseKit SDK docs** — the single-page integration guide for the SDK |

## Quickstart

```bash
git clone <this-repo> && cd dispersekit
npm install
npm run test:contracts   # bulk disperse + per-recipient decryption, proven in the FHEVM mock
npm run dev:payroll      # SealedPay — the confidential payroll dashboard
npm run dev:demo         # DisperseKit SDK docs site
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
