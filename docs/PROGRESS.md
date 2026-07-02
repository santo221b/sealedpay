# PROGRESS — living build log

> What works, what's stubbed, what's blocked, and the exact next step.
> Newest entries first.

## 2026-07-02 — Session 1 (continued): Phases B, C, D

**Works — verified**
- **Contracts (Phase B):** official audited TokenOps `DisperseConfidential` retrieved from the verified Sepolia deployment (`0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`, via Sourcify) and vendored into `packages/contracts/contracts/tokenops/`. Compiles with the exact original settings. **5/5 mock tests pass** (`npm run test:contracts`): direct-mode delivery + per-recipient decryption, ACL privacy isolation (recipient A cannot decrypt recipient B), silent-zero on insufficient balance, wallet-mode subtotal split, guards (batch cap / fee / zero address).
- **SDK round-trip (Phase C):** `packages/widget/src/lib/fhe/` helpers; `node packages/widget/scripts/relayer-smoke.mjs` **passes against the live Zama Sepolia relayer** (encrypts 3 euint64s, gets handles + proof). FHE instance boot verified in-browser (WASM under Vite, single-thread fallback as designed).
- **Widget core (Phase D):** `<DisperseWidget />` — self-contained providers (wagmi + RainbowKit), CSV/paste input with per-line validation, review step (fee/batch-cap/operator reads at runtime — the live values are admin-mutable), encrypt → authorize → disperse → confirm state machine, post-delivery **verification that decrypts `transferred` handles and catches silent zeros**, white-label theming via CSS vars. All states visually verified via the playground's fixture gallery (`States` tab).

**Research** — `docs/research/` (5 reports + SUMMARY.md from the background fleet). Key decisions recorded there: relayer-sdk 0.4.4 `/web` entry, direct mode as primary flow, runtime reads for fee/caps, `transferred` handles decrypt under the TOKEN's ACL scope / `requested` under the disperse contract's.

**Stubbed / not started**
- Recipient `ReceiptWidget` + demo-host partner app (Phase E — next).
- Polish pass: sound, keyboard flows, responsive, empty states (Phase F).
- Wallet-mode (>20 recipients) UI — helpers support it (`computeSubtotals`), widget uses direct mode only for now.

**Blocked / needs a human**
- **Sepolia deploy of the demo token** (the disperse contract is already live — official singleton): needs a funded key. `MNEMONIC` + `INFURA_API_KEY` (or `SEPOLIA_RPC_URL`) via env or `npx hardhat vars set`, then `npm run deploy:sepolia` in `packages/contracts`, then copy addresses into repo-root `.env` (`VITE_CTOKEN_ADDRESS`). Until then the browser flow can't send real txs — everything else is proven in mock + against the live relayer.
- Vercel deploys (Phase G).

**Next step**
- Phase E: `ReceiptWidget` (connect → decrypt own `ConfidentialTransfer`/`DirectDistribution` amounts → "You received X") + `demo-host` partner app embedding both with one import each.
