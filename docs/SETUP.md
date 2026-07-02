# Setup — clone to running in under 10 minutes

Prereqs: **Node ≥ 20**, npm ≥ 7, git.

## 1. Clone + install

```bash
git clone <this-repo> dispersekit
cd dispersekit
npm install
```

One install at the root covers all three workspaces (`contracts`, `widget`, `demo-host`).

## 2. Prove the confidential flow locally (no keys, no network)

```bash
npm run test:contracts
```

This runs the Hardhat suite in the **FHEVM mock** — fund a sender, `setOperator`, disperse to several recipients in one transaction, then each recipient decrypts *only their own* amount. If this is green, the whole confidential pipeline works on your machine.

## 3. Run the frontends

```bash
npm run dev:widget   # widget playground → http://localhost:5173
npm run dev:demo     # mock partner app  → http://localhost:5174
```

## 4. Deploy to Sepolia (optional — needed for the live demo)

```bash
cd packages/contracts
npx hardhat vars set MNEMONIC          # a funded Sepolia account
npx hardhat vars set INFURA_API_KEY    # or any Sepolia RPC
npm run deploy:sepolia
```

(Plain env vars work too — see [.env.example](../.env.example). `MNEMONIC`/`INFURA_API_KEY` in the environment take precedence.)

Copy the printed addresses into the repo-root `.env`:

```bash
VITE_CTOKEN_ADDRESS=0x...
VITE_DISPERSE_ADDRESS=0x...
```

then restart the dev servers. Get Sepolia ETH from any faucet; mint demo cTokens straight from the widget playground (the demo token has an open faucet `mint`).

## Troubleshooting

- **`npm install` warns about peer deps** — the workspaces pin compatible majors (wagmi 2 / viem 2 / RainbowKit 2); use npm ≥ 7 so workspaces hoist correctly.
- **Tests are skipped** — the suite only runs against the local mock by design (`fhevm.isMock`); it will skip itself on a live network. Use the Sepolia scripts instead.

<!-- TODO(phase-g): verify timings + add screenshots of a fresh-clone run -->
