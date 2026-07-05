# PROGRESS — living build log

> What works, what's stubbed, what's blocked, and the exact next step.
> Newest entries first.

## 2026-07-05 — Payroll UI polish pass (design brief implementation)

**Works — verified in-browser**
- Full fintech shell: sidebar (icon rail below `md`), sticky top bar with trust line + Run CTA, wallet status pinned in the sidebar, animated page transitions. Opens on the overview.
- All four brief screens + Settings: Dashboard (4 stat cards, next-payout card, recent payouts, designed empty state), People (search, add/edit side drawer with name/role/wallet/salary + EIP-55/duplicate warnings), Run (named review → StatusTimeline with wallet-prompt hints → DeliveredPanel reveal in payroll language, cancel/retry paths), Payments (expandable history), Settings (schedule/display-only, addresses, privacy model, clear-data).
- **Privacy motif throughout**: `AmountCell` masks every amount (`••••` + lock, reveal on click); trust banner; payroll-worded PrivacyBadge.
- **History is private AND provable**: each run stores per-employee ciphertext HANDLES only (never plaintext) — "Verify this run" decrypts any past run on demand via the engine's exported helpers (employer holds permanent ACL).
- A run in progress survives navigation (flow owned by the shell + return banner).

**Guardrail — the frozen path did NOT break:** all packages type-check/build; contracts 7/7; **live Sepolia E2E re-run PASSING** after the reskin (tx `0x2a664012…cd76`).

**Review fleet applied (same evening)** — 27 agents, 4 lenses, per-finding adversarial verification: 23 confirmed findings (14 distinct), all fixed in commit `690be0e`. Highlights: the double-payout gate on `startRun` (critical), positional name snapshots for duplicate-wallet employees, **orphan-run recovery** (pending tx persisted at broadcast; after a refresh the dashboard offers "Check & record", which re-parses the real receipt — functionally verified against a live past Sepolia tx), no more silent employee-row deletion, invalid-roster totals read "fix roster" instead of understating. Re-verified after fixes: all builds green, contracts 7/7, **live Sepolia E2E passing** (tx `0x33a47373…9908`), browser console clean.

**Pending** — payroll Vercel deploy deferred until owner sign-off on the look (project settings noted below).

## 2026-07-05 — Payroll dashboard repackage (structure night)

**Works — verified**
- **Engine seam (no behavior change):** the disperse flow was promoted to the widget package's public API (`useDisperseFlow`, `DisperseProviders`, `parseRecipients`, `StatusTimeline`, `DeliveredPanel`, `PrivacyBadge`, …). `DisperseWidget` and the new payroll app are now two skins over one engine. Only wording hooks were added (DeliveredPanel `labels`/`nameFor`, PrivacyBadge `copy`) — defaults identical.
- **`packages/payroll` — Confidential Payroll dashboard** (`npm run dev:payroll`, port 5175): employees add/edit/remove with EIP-55 + amount validation (browser-verified, incl. a rejected bad-checksum address), localStorage persistence across reload (verified), exact team total at live token decimals (verified: 2,500.50 + 1,800 → "4,300.5 cUSDd", updated on edit/remove), display-only next-due date (manual set verified persisted), payout history wired to record ONLY on confirmed delivery + ✓ badge after decrypt-verify. The seam is one documented file: `packages/payroll/src/components/RunPayroll.tsx` — roster → widget's validated parser → unchanged flow.
- **Guardrail — the working path did NOT break:** after all changes: widget + demo-host + payroll all type-check/build; contracts suite 7/7; **live Sepolia E2E re-run PASSED** through the official singleton (fresh tx `0xc3968e09…e025`, sender + recipient decrypts ✓).

**Stubbed / notes**
- The dashboard's in-browser "Run payroll" click-through needs a wallet (can't be driven headlessly) — the engine path it calls is the one just re-proven live. Employer walkthrough = connect → Run payroll now → confirm → verify salaries.
- Visual polish deliberately deferred (owner does UI/UX tomorrow). No Vercel project for payroll yet — deploy after polish: link a project with root-directory build like the demo (`buildCommand: npm run build --workspace packages/payroll`, output `packages/payroll/dist`).

## 2026-07-02 — Session 1 (evening): Phases E, F, most of G

**Works — verified**
- **Live deploys**: widget playground → https://dispersekit-widget.vercel.app · Acme embed demo → https://dispersekit-demo.vercel.app (both verified rendering in a browser; WASM assets ship correctly in the production build).
- **ReceiptWidget (Phase E)**: finds incoming `ConfidentialTransfer` events (recipient + handle are indexed), decrypts all amounts + balance with one EIP-712 signature.
- **Demo host (Phase E)**: "Acme Payroll" embeds both widgets with one import each, fully rebranded via the `theme` prop; "Show the integration code" reveal.
- **Polish (Phase F)**: package READMEs, final EMBED.md props reference, success chime, thousands-separator parse guard, EIP-712 message bigint-coercion hardening, per-mount wagmi config fix (clean console).
- **Delivery assets (Phase G)**: `docs/VIDEO_SCRIPT.md` (3-min shot-by-shot) and `docs/X_THREAD.md` (8-tweet draft).

**DONE since — live Sepolia is fully wired (Jul 2, evening)**
- `ConfidentialTokenDemo` (cUSDd) deployed: `0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1` (deployments/ committed).
- **Live E2E PASSED through the official TokenOps singleton** (`scripts/e2e-sepolia.mjs`): mint → setOperator → encrypt (one proof) → one disperse tx → sender decrypts requested+transferred (12.5/7.25 ✓) → recipient decrypts their own amount ✓. Tx: `0xc8d190a014015a8fe8aca9af82b49db44e61fd46a5ff2cece98033e81a6fe154`.
- `VITE_CTOKEN_ADDRESS` set on both Vercel projects; both sites redeployed and functional. Vite `envDir` now points at the repo-root `.env` so local dev sees the same config; hardhat auto-loads it too (`dotenv`). `PRIVATE_KEY` supported as an alternative to `MNEMONIC`.
- `scripts/rpc-check.ts` prints network/deployer/balance for instant config sanity.

**Remaining (human-only)**
1. **Browser walkthrough on Sepolia** for the video: use the live playground with a wallet (deployer key `0x3F9e…3Fc3` holds ~1.1 Sepolia ETH) — mint via Test bench, then run a payout in the Widget tab; receipt view with a second wallet.
2. **Record the video** (docs/VIDEO_SCRIPT.md) and **post the X thread** (docs/X_THREAD.md) before Jul 7 AOE.
3. Optional: Etherscan-verify the demo token (needs `ETHERSCAN_API_KEY`; Sourcify alternative available), screenshots/GIF for README.

**Notes**
- **Adversarial review complete**: 22 agents (5 lenses, per-finding adversarial verification against installed library source) confirmed 17 findings (10 distinct) — all fixed and redeployed. Highlights: chunked userDecrypt under one signature (2048-bit relayer cap), no silent decimals fallback, broadcast-tx-never-abandoned confirmation retry, strict EIP-55 validation, session-tracked operator grants. See commit b01cfa9.
- Vendored TokenOps source must never be edited (`contracts/tokenops/`).

## 2026-07-02 — Session 1 (afternoon): Phases A–D

(see git history for detail)
- Monorepo scaffold; official audited TokenOps `DisperseConfidential` vendored from the verified Sepolia deployment via Sourcify; `ConfidentialTokenDemo` (ERC-7984 + open faucet); **5/5 mock tests** proving disperse + per-recipient-only decryption + footguns.
- FHE helpers (`lib/fhe/`), **passing relayer smoke test against live Sepolia relayer**, browser WASM boot verified.
- `<DisperseWidget />` with self-contained providers, CSV/paste input, review step, four-step status timeline, post-delivery verification (silent-zero catch), white-label theming; fixture gallery of all states.
