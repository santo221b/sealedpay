# Security — supply-chain policy and threat model

The biggest class of risk in an npm codebase is a malicious package executing
code we never wrote (Shai-Hulud-style: a compromised `postinstall` steals npm
tokens and republishes itself across the ecosystem). This repo runs layered
defenses; each kills a failure mode the others don't. The working discipline
lives in `.claude/skills/supply-chain-hygiene/SKILL.md`.

## The layers

| # | Layer | Mechanism here | Failure it kills |
|---|---|---|---|
| 1 | Lockfile discipline | `.npmrc` `save-exact` + committed `package-lock.json` | Version drift between dev / CI / prod |
| 2 | Dependabot | `.github/dependabot.yml` — security PRs immediate, routine behind a 3/7/14-day cooldown | Slow CVE response + installing hijacked releases before they're yanked |
| 3 | CI audit gate | `npm run audit:prod` (`scripts/audit-prod.mjs`) in `ci.yml` | Newly-disclosed CVE on prod deps sitting silently |
| 4 | Runtime headers | `headers` in `vercel.json` (both apps) | Clickjacking, MIME confusion, leaked referrers |
| 5 | `npm ci` everywhere | CI + both SealedPay Vercel projects' installCommand | Non-deterministic installs pulling fresh malicious patches |
| 6 | Install-script lockdown | `.npmrc` `ignore-scripts=true` + `lavamoat.allowScripts` + `npm run setup` | Compromised `postinstall` executing on install |
| 7 | Lockfile-injection defense | `npm run lint:lockfile` (lockfile-lint) in CI + pre-commit hook | A PR swapping a `resolved` URL to a malicious mirror |
| 8 | Hand-roll small wrappers | Culture: write the 40 lines, skip the wrapper lib | A convenience wrapper's transitive attack surface |

## Install-script allowlist

`lavamoat.allowScripts` in `package.json` currently blocks ALL seven
script-carrying packages (`keccak`, `secp256k1`, `bufferutil`,
`utf-8-validate` ×2, `fsevents`, `@reown/appkit`): every one ships prebuilt
binaries resolved at require time (or is a vestigial version-check), verified
by the full contract suite + all workspace builds passing on a fresh
scriptless `npm ci`. Flip an entry to `true` only after reading the script it
runs, and record it below.

`ignore-scripts=true` also skips npm pre/post run-hooks — repo scripts chain
steps explicitly instead (e.g. smart-contracts `compile` calls `typechain`).

## The audit gate

`scripts/audit-prod.mjs` recomputes TRUE production reachability from the
lockfile because `npm audit --omit=dev` does not mark workspace
devDependencies as dev. It fails on any prod-reachable high/critical
advisory. GHSA allowlisting requires a paragraph in the audit history below —
no paragraph, no allowlist.

## Audit history

- **2026-07-10 — gate hardened after adversarial review**: audit-prod now
  fails CLOSED when npm itself cannot run or returns error-shaped output,
  traverses peerDependencies edges (an installed peer is loadable at
  runtime), and seeds only true workspace roots. The peer pass exposed that
  the hoisted axios 0.21.4 WAS statically prod-reachable via axios-retry's
  peer under @coinbase/cdp-sdk — remediated by pinning axios 1.18.1 as a
  root devDependency so the patched 1.x occupies the hoisted slot and the
  0.x copy hardhat-deploy insists on nests under it, dev-only.
- **2026-07-10 — layers bootstrapped** (this document, `.npmrc`, allowlist,
  gates, hooks, Dependabot, headers, `npm ci` install commands).
- **2026-07-10 — ws consolidated to 8.21.0** (GHSA-58qx-3vcg-4xpx memory
  disclosure, GHSA-96hv-2xvq-fx4p DoS): stale nested 8.18.x copies under the
  Privy/Reown packages deduped onto the patched root version; `ws@8` override
  pins the line. The remaining ws 7.5.11 copies are outside both advisories'
  affected range (>=8.0.0).
- **2026-07-10 — axios 0.21.4 via hardhat-deploy: accepted as dev-only.**
  hardhat-deploy is a devDependency of the contracts workspace, used only for
  manual Sepolia deploys on a developer machine against developer-configured
  RPC endpoints; no user input reaches it and nothing from it ships to the
  browser or the serverless functions. npm's workspace audit mis-flags it as
  prod (and ignores scoped overrides for it), so the path-aware gate
  classifies it dev-only instead of allowlisting ~20 churning GHSA ids.
  Upstream: hardhat-deploy 0.x pins axios ^0.21; 2.x requires Hardhat 3 —
  revisit on the Hardhat 3 migration.
- **2026-07-10 — full-history secrets audit ran clean** (284 commits, all
  refs, exact-value greps for every live credential) before `main` was first
  pushed public.
