# SealedPay 🔒

**SealedPay — confidential payroll on-chain. Pay your whole team in one transaction; salaries stay encrypted. Built on TokenOps confidential disperse × Zama FHE.**

> **📂 Reviewing this? It's one monorepo — here are the two pieces you're looking for:**
> the **frontend code** is in **[`packages/sealedpay`](packages/sealedpay)** and the **smart-contract code** is in **[`packages/smart-contracts`](packages/smart-contracts)**.
> (The shared SDK engine and its docs are in `packages/dispersekit` and `packages/dispersekit-docs` — full breakdown under [Repository layout](#repository-layout).)

The product is built in two layers:

- **SealedPay** — the product: a confidential payroll app with email accounts ([`packages/sealedpay`](packages/sealedpay)). Employers sign in with an email, manage a team, and click *Run payroll* — every salary is delivered in a single confidential transaction, encrypted end-to-end and *proven* by decryption rather than assumed. Employees sign in with their email to a dedicated portal and decrypt their own pay — wallets are created from the email (Privy embedded wallets), so neither side needs an extension or a seed phrase.
- **DisperseKit** — the engine: a white-label confidential disperse widget ([`packages/dispersekit`](packages/dispersekit)). One import, one click, a confidential bulk payout. SealedPay is a skin over it; any partner app can be too.

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

- **SealedPay (the product)** — [sealedpay.vercel.app](https://sealedpay.vercel.app) (the confidential payroll dashboard; run locally with `npm run dev:sealedpay`)
- **DisperseKit SDK docs** — [dispersekit-demo.vercel.app](https://dispersekit-demo.vercel.app) (the single-page SDK integration guide, with a full API reference and SealedPay as the case study)

## For judges — running SealedPay end to end

SealedPay runs live on Sepolia; the whole flow takes about two minutes. No wallet extension is needed — accounts are email-based and the wallet is created for you.

1. **Open the app** (URL above), pick **For Employers**, and sign in with any email (a one-time code). A short onboarding asks for your name and company; your payroll wallet is created from the email automatically.
2. **Get Sepolia ETH for gas** into the payroll wallet (address on the Payroll Wallet card — click to copy): [Google Cloud faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de). No real money anywhere.
3. **Fund the wallet** with demo cUSDd — the **Fund** button on the Payroll Wallet card (open faucet, one mint tx).
4. **Add an employee by email** (Team screen). The server pregenerates their wallet, so payroll can run before they ever sign in. Empty states also offer **Load sample data** if you just want to look around.
5. **Run Payroll** → watch encrypt → authorize operator → disperse → verify. Every amount is encrypted on-chain; the tx is public on Etherscan but the salaries are not.
6. **See the employee side** — sign in with the employee's email (another browser profile works well), pick **For Employees**, and reveal the salary with one signature: chart, payments ledger, verifications, and payslip export. An email is an employer or an employee, never both.

### Deploy SealedPay (Vercel)

Create a **new Vercel project** from this repo with **Root Directory = `packages/sealedpay`** — Vercel auto-detects Vite via `packages/sealedpay/vercel.json`, installs the workspace from the repo root, and serves the account backend from `packages/sealedpay/api` as Vercel Functions. Set these environment variables on the project:

| Variable | Value |
|---|---|
| `VITE_CTOKEN_ADDRESS` | `0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1` (also the built-in fallback, but set it explicitly) |
| `VITE_PRIVY_APP_ID` | your app id from [privy.io](https://privy.io) (email login + embedded wallets; the id is public by design) |
| `PRIVY_APP_SECRET` | the matching Privy app secret — **server-only, never `VITE_`-prefixed** |
| `UPSTASH_REDIS_REST_URL` | from an [Upstash](https://upstash.com) Redis database (stores rosters, runs, profiles) |
| `UPSTASH_REDIS_REST_TOKEN` | its REST token — **server-only** |

Deploy, then paste the URL into the **Live demos** list above.

## Deployed contracts (Sepolia)

| Contract | Address |
|---|---|
| `DisperseConfidential` — **official TokenOps singleton** (audited, verified) | [`0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`](https://sepolia.etherscan.io/address/0x710dD9885Cc9986EfD234E7719483147a6d8DBb4) |
| `ConfidentialTokenDemo` (cUSDd, ERC-7984, open faucet) | [`0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1`](https://sepolia.etherscan.io/address/0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1) |

Proof it works end-to-end on the live network: [this transaction](https://sepolia.etherscan.io/tx/0xc8d190a014015a8fe8aca9af82b49db44e61fd46a5ff2cece98033e81a6fe154) disperses two encrypted amounts through the official singleton — the amounts on-chain are opaque handles, and `packages/smart-contracts/scripts/e2e-sepolia.mjs` decrypts them back (12.5 / 7.25 cUSDd) as sender *and* as recipient.

## What it does

- A **sender** pastes or uploads (CSV) a list of `recipient, amount` rows.
- Each amount is **encrypted client-side** with the Zama relayer SDK.
- Through the official **TokenOps SDK** ([`@tokenops/sdk`](https://www.npmjs.com/package/@tokenops/sdk)) the sender authorizes the disperse contract as an **operator** on the confidential token (ERC-7984), then runs **one transaction** against the SDK's audited `DisperseConfidential` singleton that delivers every encrypted amount. No new contracts are deployed — we install and call the SDK directly.
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

Where to look. The two pieces the bounty asks for — the **smart contracts** and the **frontend** — plus the SDK they share and its docs:

| Package | Role | What it is |
|---|---|---|
| [`packages/smart-contracts`](packages/smart-contracts) | **Smart contracts** | Hardhat — the ERC-7984 confidential token + the audited TokenOps disperse contract (Sepolia) |
| [`packages/sealedpay`](packages/sealedpay) | **Frontend** (the product) | **SealedPay** — the confidential payroll dashboard ([live](https://sealedpay.vercel.app)) |
| [`packages/dispersekit`](packages/dispersekit) | **SDK engine** | **DisperseKit** — the single-import `<DisperseWidget />` + the shared disperse flow SealedPay is built on |
| [`packages/dispersekit-docs`](packages/dispersekit-docs) | **SDK docs** | The single-page DisperseKit integration guide ([live](https://dispersekit-demo.vercel.app)) |

> Folder names map 1:1 to their role. Package names stay `@dispersekit/*` (so the `import { DisperseWidget } from "@dispersekit/widget"` above is unchanged).

## Quickstart

```bash
git clone <this-repo> && cd dispersekit
npm install
npm run test:contracts   # bulk disperse + per-recipient decryption, proven in the FHEVM mock
npm run dev:sealedpay      # SealedPay — the confidential payroll dashboard
npm run dev:docs         # DisperseKit SDK docs site
```

Full setup (env, Sepolia deploy): [docs/SETUP.md](docs/SETUP.md) · Embedding guide: [docs/EMBED.md](docs/EMBED.md)

## Tech stack

Solidity `^0.8.27` · [`@fhevm/solidity`](https://docs.zama.org/protocol) · [`@openzeppelin/confidential-contracts`](https://zama.org/erc-7984) (ERC-7984) · Hardhat (fhevm template) · React + TypeScript + Vite · wagmi + viem · [Privy](https://privy.io) email auth + embedded wallets (SealedPay) · RainbowKit (DisperseKit widget) · Vercel Functions + [Upstash Redis](https://upstash.com) (SealedPay backend) · [`@tokenops/sdk`](https://www.npmjs.com/package/@tokenops/sdk) (confidential disperse) · [`@zama-fhe/relayer-sdk`](https://docs.zama.org/protocol/sdk) · Tailwind CSS + Framer Motion

## Docs

- [SETUP.md](docs/SETUP.md) — clone → run in under 10 minutes
- [EMBED.md](docs/EMBED.md) — the one-import integration guide (props reference)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — contracts, flows, and the widget pipeline
- [CONFIDENTIALITY.md](docs/CONFIDENTIALITY.md) — exactly what's hidden, exactly what isn't
- [DEMO.md](docs/DEMO.md) — running the end-to-end demo
- [PROGRESS.md](docs/PROGRESS.md) — living build log
