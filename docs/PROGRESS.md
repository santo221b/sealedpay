# PROGRESS — living build log

> What works, what's stubbed, what's blocked, and the exact next step.
> Newest entries first.

## 2026-07-02 — Session 1 (evening): Phases E, F, most of G

**Works — verified**
- **Live deploys**: widget playground → https://dispersekit-widget.vercel.app · Acme embed demo → https://dispersekit-demo.vercel.app (both verified rendering in a browser; WASM assets ship correctly in the production build).
- **ReceiptWidget (Phase E)**: finds incoming `ConfidentialTransfer` events (recipient + handle are indexed), decrypts all amounts + balance with one EIP-712 signature.
- **Demo host (Phase E)**: "Acme Payroll" embeds both widgets with one import each, fully rebranded via the `theme` prop; "Show the integration code" reveal.
- **Polish (Phase F)**: package READMEs, final EMBED.md props reference, success chime, thousands-separator parse guard, EIP-712 message bigint-coercion hardening, per-mount wagmi config fix (clean console).
- **Delivery assets (Phase G)**: `docs/VIDEO_SCRIPT.md` (3-min shot-by-shot) and `docs/X_THREAD.md` (8-tweet draft).

**Blocked / needs a human (the ONLY remaining items)**
1. **Sepolia token deploy** — needs a funded key: set `MNEMONIC` + `INFURA_API_KEY` (or `SEPOLIA_RPC_URL`), run `npm run deploy:sepolia` in `packages/contracts`, put the printed address in `.env` as `VITE_CTOKEN_ADDRESS`, add the same env var to both Vercel projects (`vercel env add VITE_CTOKEN_ADDRESS production` in `packages/widget` and repo root), redeploy (`vercel deploy --prod --yes` in both). The disperse contract needs no deploy — the widget already points at the official TokenOps singleton (`0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`).
2. **Browser end-to-end on Sepolia** — after (1): use the playground Test bench (connect → boot → mint → authorize → disperse → decrypt) with a wallet holding a little Sepolia ETH (the official singleton charges 0.001 ETH per recipient). Then re-shoot happy-path screenshots for README.
3. **Record the video** (script ready) and **post the X thread** (draft ready).

**Notes**
- **Adversarial review complete**: 22 agents (5 lenses, per-finding adversarial verification against installed library source) confirmed 17 findings (10 distinct) — all fixed and redeployed. Highlights: chunked userDecrypt under one signature (2048-bit relayer cap), no silent decimals fallback, broadcast-tx-never-abandoned confirmation retry, strict EIP-55 validation, session-tracked operator grants. See commit b01cfa9.
- Vendored TokenOps source must never be edited (`contracts/tokenops/`).

## 2026-07-02 — Session 1 (afternoon): Phases A–D

(see git history for detail)
- Monorepo scaffold; official audited TokenOps `DisperseConfidential` vendored from the verified Sepolia deployment via Sourcify; `ConfidentialTokenDemo` (ERC-7984 + open faucet); **5/5 mock tests** proving disperse + per-recipient-only decryption + footguns.
- FHE helpers (`lib/fhe/`), **passing relayer smoke test against live Sepolia relayer**, browser WASM boot verified.
- `<DisperseWidget />` with self-contained providers, CSV/paste input, review step, four-step status timeline, post-delivery verification (silent-zero catch), white-label theming; fixture gallery of all states.
