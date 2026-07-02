# @dispersekit/contracts

Hardhat project (based on [`zama-ai/fhevm-hardhat-template`](https://github.com/zama-ai/fhevm-hardhat-template)) holding the two contracts DisperseKit touches.

## The contracts

| Contract | What it is |
|---|---|
| [`contracts/tokenops/DisperseConfidential.sol`](contracts/tokenops/DisperseConfidential.sol) | The **official, audited TokenOps disperse contract** — vendored byte-for-byte from the verified Sepolia deployment (`0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`, retrieved via Sourcify). We deploy it locally for tests; on Sepolia the widget talks to the live official singleton. Provenance: [`contracts/tokenops/README.md`](contracts/tokenops/README.md). **Do not edit** — it must stay identical to the audited deployment. |
| [`contracts/ConfidentialTokenDemo.sol`](contracts/ConfidentialTokenDemo.sol) | A minimal ERC-7984 confidential token with an **open faucet** so anyone can try the widget. The faucet mint amount is plaintext by design (a faucet has nothing to hide); balances and transfers are encrypted end-to-end. |

## Prove the whole confidential flow locally

```bash
npm test            # or from the repo root: npm run test:contracts
```

Runs in the FHEVM **mock** (no keys, no network): fund → `setOperator` → one
disperse tx → each recipient decrypts *only their own* amount. The suite also
proves the sharp edges: ACL isolation, the silent-zero on insufficient
balance, wallet-mode subtotal splitting, and the batch/fee/zero-address guards.

## Deploy

```bash
npm run deploy:sepolia   # deploys ConfidentialTokenDemo; records the official
                         # disperse singleton address into deployments/
```

Set credentials first (either env vars or `npx hardhat vars set`): `MNEMONIC`,
`INFURA_API_KEY` (or `SEPOLIA_RPC_URL`). See the repo-root
[`.env.example`](../../.env.example).

On local networks the deploy scripts also deploy our own `DisperseConfidential`
instance configured to mirror the live Sepolia singleton (0.001 ETH/recipient
gas fee, 5% token fee, batch caps 30/20/5) so tests exercise live behavior.

## Layout

```
contracts/            ConfidentialTokenDemo + vendored tokenops/ source
deploy/               hardhat-deploy scripts (00 token, 01 disperse)
test/                 the end-to-end mock suite
reference/            pristine Sourcify retrieval (metadata.json, constructor args)
```
