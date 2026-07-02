# PROGRESS — living build log

> What works, what's stubbed, what's blocked, and the exact next step.
> Newest entries first.

## 2026-07-02 — Session 1: scaffold

**Works**
- Monorepo scaffolded (npm workspaces): `contracts` (from `zama-ai/fhevm-hardhat-template`), `widget` + `demo-host` (Vite react-ts).
- Background research fleet dispatched: TokenOps disperse contract hunt (§12 procedure), relayer SDK exact API, template test patterns, ERC-7984 API, Sepolia config. Findings land in `docs/research/`.

**In progress**
- Root `npm install`.
- Phase B: contracts (ERC-7984 demo token + confidential disperse) + mock tests.

**Stubbed / not started**
- Widget UI (Phase D), demo host (Phase E), polish (Phase F), deploys (Phase G).

**Blocked / needs a human**
- Sepolia deployment needs a funded key: set `MNEMONIC` + `INFURA_API_KEY` (see `.env.example`). Everything else proceeds in the FHEVM mock.
- Vercel deploys (Phase G) need project auth.

**Next step**
- Contracts: write `ConfidentialTokenDemo` (ERC-7984 + mint faucet) and the disperse contract (official TokenOps source if the research finds it — else minimal equivalent marked `TODO(swap-to-official)`), then a mock test: fund → setOperator → disperse to 3 recipients → each decrypts only their own amount.
