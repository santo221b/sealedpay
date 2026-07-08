# PROGRESS — living build log

> What works, what's stubbed, what's blocked, and the exact next step.
> Newest entries first.

## 2026-07-07 — SealedPay design handoff implementation (in progress)

**Done — verified**
- Design package vendored (`docs/design/handoff/`) + four exhaustive extraction specs (`docs/design/extracted/`) produced by a parallel fleet (copy, styles, timings, seed data, every SVG, verbatim).
- Foundations: design tokens, `RevealAmount`/`SealAmount` (exact scramble parameters), glass kit primitives + ModalShell, Manrope self-hosted, chart.js.
- **Onboarding (6 steps) complete + browser-verified** (welcome scramble, progress sheen, ghost numeral flip, acknowledgment gate, avatar picker). Step 4 wallet connect is REAL (RainbowKit + wagmi, real address chip) replacing the prototype's 1250ms simulation.
- Real-wire hooks ready: balance = the employer's actual encrypted cUSDd balance handle with one-signature decryption; Fund Wallet = a real faucet mint transaction.
- Run Payroll modal (THE SEAM) built: design's 4 steps driven by real `useDisperseFlow` phases; encrypting cascade plays during the real FHE proof; Paid cascade fed by the real verify-decrypt; real Etherscan link + real total.

**Design-ambiguity resolutions (prototype bug vs README — decision + why)**
- Select-all label rendered a boolean in the prototype → "Select all"/"Deselect all".
- Monthly payroll was hard-coded always-revealed → README behavior (masked, tap to reveal).
- keepLock (drifting lock) never passed in prototype → applied to balance + salary hero per README.
- "Already authorized" skip missing in prototype → implemented from real `operatorAlreadySet`.
- Runway "04" / scorecard "48" hard-coded → derived live (balance ÷ monthly; Σ recipients across history).
- Last run card static "Jul 5 Sun" → derived from the latest real run.
- Signed-out screen hard-coded "Santo" → real stored name.
- No in-modal "Authorize"/"Confirm & pay" buttons: the wallet's own prompts are the real confirmations. "Simulate failure (demo)" omitted; real failures drive the designed failure path.
- Copy rule: no ellipses/em-dashes anywhere (design already omitted most; the rest stripped).
- Seed team uses REAL dev-account addresses and seed history rows link to REAL past Sepolia txs from this repo, so sample data is fully clickable and a real run against the seed roster settles on-chain.

**Dashboard complete + integrated + verified**
- New dark-glass App shell owns all state and every real-wiring seam; the four screens (Home / Team / Insights / Employee View), the icon rail, floating top bar, Payroll Wallet sidebar, and all 12 modals/panels (incl. the engine-wired Run Payroll 4-step) are built from the extraction specs and wired in. Superseded prior UI (old Sidebar/kit/screens) deleted.
- Browser-verified: onboarding, Home (bar chart + donut + cards), Team (hero cards + roster + wallet sidebar), Insights (line chart + runway + scorecard), Employee View (salary hero + stat cards + history). Masking correct everywhere ("***" by default; reveals scramble-settle).
- **Real wiring confirmed live**: wallet balance = real encrypted-balance handle with one-signature decryption; runway derives from it; Fund Wallet = real faucet mint; per-employee live history rows decrypt real handles; notifications/activity/chart reflect real runs; every Etherscan link is real. Seed team uses real dev addresses; seed history links real past txs.
- **Guardrail GREEN after integration**: all four packages build; contracts 7/7; **live Sepolia E2E passing** (tx `0x6e799580…465f`).

**Adversarial integration review applied (commit cbd339c)** — a 13-agent fleet (4 lenses: Run Payroll seam, real-wiring, App state, engine-freeze/copy; per-finding adversarial verification) confirmed 6 findings (1 critical, 4 major, 1 minor), all fixed and re-verified: the auto-verify-rejection strand + double-record trap (finale now renders on any settled delivered state; retry gated pre-delivery; addRun idempotent by txHash); pre-broadcast failure no longer locks Continue; decrypted amounts render full-precision; txHash-keyed orphan list (no clobber, no stale re-surface); failed live-row reveal no longer silently consumed. Re-verified: payroll builds, contracts 7/7, live Sepolia E2E passing (tx `0x3029febd…84bf`).

**Two console warnings fixed (mine), one noted (library)**
- Fixed: `useWalletBalance` called setState inside a setState updater (removed the ConnectModal setState warning) and reordered `reveal()` so a disconnected reveal errors instead of fabricating a "0". Fixed: `RevealAmount` now renders a `<span>` when display-only, ending a `<button>`-in-`<button>` nesting.
- Noted (not mine): a dev-only "button cannot contain a nested button" warning fires once at mount from RainbowKit's `[data-rk]` connect-modal DOM (16 buttons / 42 KB, browser-hoisted so the final DOM is clean, `rkNested: 0`). It never re-fires from any SealedPay component and is stripped in production builds. Shared with the widget/demo apps (same DisperseProviders).

**Design-ambiguity resolutions (prototype bug vs README — decision + why)**

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
- **`packages/sealedpay` — Confidential Payroll dashboard** (`npm run dev:sealedpay`, port 5175): employees add/edit/remove with EIP-55 + amount validation (browser-verified, incl. a rejected bad-checksum address), localStorage persistence across reload (verified), exact team total at live token decimals (verified: 2,500.50 + 1,800 → "4,300.5 cUSDd", updated on edit/remove), display-only next-due date (manual set verified persisted), payout history wired to record ONLY on confirmed delivery + ✓ badge after decrypt-verify. The seam is one documented file: `packages/sealedpay/src/components/RunPayroll.tsx` — roster → widget's validated parser → unchanged flow.
- **Guardrail — the working path did NOT break:** after all changes: widget + demo-host + payroll all type-check/build; contracts suite 7/7; **live Sepolia E2E re-run PASSED** through the official singleton (fresh tx `0xc3968e09…e025`, sender + recipient decrypts ✓).

**Stubbed / notes**
- The dashboard's in-browser "Run payroll" click-through needs a wallet (can't be driven headlessly) — the engine path it calls is the one just re-proven live. Employer walkthrough = connect → Run payroll now → confirm → verify salaries.
- Visual polish deliberately deferred (owner does UI/UX tomorrow). No Vercel project for payroll yet — deploy after polish: link a project with root-directory build like the demo (`buildCommand: npm run build --workspace packages/sealedpay`, output `packages/sealedpay/dist`).

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
