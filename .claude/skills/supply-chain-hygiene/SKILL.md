---
name: supply-chain-hygiene
description: Apply layered supply-chain and dependency-security guardrails whenever you're touching anything that could let untrusted npm code execute on a developer machine, in CI, or in production. Invoke whenever the user mentions npm install / npm audit / package.json / package-lock.json / Dependabot / Renovate / lavamoat / allow-scripts / ignore-scripts / postinstall / lockfile / supply chain / Shai-Hulud / Snyk / a CVE / GHSA / Socket.dev / typosquatting / "is this package safe" / "should we add this dep" / a new dependency in any PR / a Dependabot PR review / a security advisory / a dep upgrade / "do we need a new package for this" / npm ci failing on a deploy / install scripts not running / sharp/esbuild binary missing after install. Covers the EIGHT layered defenses (ignore-scripts + a script allowlist, exact-version saves, npm ci everywhere, security PRs with a routine-update cooldown, a CI audit gate with a documented advisory allowlist, runtime HTTP headers, lockfile-lint, hand-rolling small code instead of wrapper libraries), the dep-addition workflow, the install-script allowlist process, the advisory-allowlist convention for documented false positives, the git hook setup, and how to safely upgrade or audit existing deps. This is the security-poured-into-package-management discipline, not a general feature workflow.
---

# Supply-chain hygiene

The single biggest class of "lose customer data, lose customer trust, lose nights of sleep" risks in an npm-based codebase is **a malicious package executing code you never wrote, on a machine you never wrote it for**. Shai-Hulud is the canonical example: a self-propagating worm where a compromised package's `postinstall` reads npm tokens and republishes the worm under hundreds of victim packages, cascading the attack across the ecosystem at the speed of `npm install`.

Eight layers of defense can sit between a codebase and that class of attack. Each layer kills a specific failure mode that the others don't catch; skipping any one of them re-opens a real hole. This skill is how to keep them in working order while still shipping features.

**First, discover what the repo actually has.** Before applying any advice below, check: `.npmrc` (for `ignore-scripts`, `save-exact`), `package.json` (for a `lavamoat.allowScripts` block, `overrides`, hook config), `.github/dependabot.yml`, CI workflows with an audit step, and a `SECURITY.md`. Keep the layers that exist in working order; where a layer is missing and the work at hand touches its failure mode, propose adding it (bootstrap order at the bottom). If the repo documents its own policy in `SECURITY.md` or `CLAUDE.md`, that policy wins over this skill's defaults.

---

## Layer cheat-sheet

| # | Layer | Typical mechanism | Failure it kills |
|---|---|---|---|
| 1 | Lockfile discipline | `.npmrc` `save-exact` + a committed `package-lock.json` | Surprise version drift between dev / CI / prod |
| 2 | Automated dep PRs | `.github/dependabot.yml` (or Renovate): security PRs immediate; routine updates behind a 3/7/14-day cooldown by semver kind | Slow CVE response + auto-merging brand-new (potentially-malicious) releases |
| 3 | CI audit gate | A workflow step running `npm audit --audit-level=high --omit=dev`, with a documented advisory allowlist | Newly-disclosed CVE on existing deps sitting silently for days |
| 4 | Runtime headers | The framework's header config (`next.config.ts` `headers()`, `vercel.json`, helmet, nginx) | Clickjacking, MIME confusion, leaked referrers |
| 5 | `npm ci` everywhere | Deploy `installCommand` + CI both use `npm ci`, never `npm install` | Non-deterministic installs pulling minor-bumped malicious patches |
| 6 | Install-script lockdown | `.npmrc` `ignore-scripts=true` + a `lavamoat.allowScripts` allowlist run via a `setup` script | Shai-Hulud-class attacks via compromised `postinstall` scripts |
| 7 | Lockfile-injection defense | `lockfile-lint` in CI + a pre-commit hook | A PR that swaps a `resolved` URL to a malicious mirror and ships compromised code to anyone running `npm ci` |
| 8 | Hand-roll small wrappers | Write the 40 lines yourself instead of adding a wrapper library (canonical example: a hand-written service worker instead of `next-pwa`/Workbox) | The transitive supply-chain surface a convenience wrapper drags in |

If you can't say which layer kills which failure mode, you're not ready to weaken any of them.

---

## When the user mentions a NEW dep

Stop and walk the gate. The conversation goes like this:

1. **"Is this dep actually needed?"** Most "let's add a lib for this" cases are 20 lines of vanilla code. The standard library + browser APIs (`fetch`, `Date`, `Intl`, `crypto.subtle`, `URL`, `caches`, `Set`, `Map`, etc.) cover way more ground than people think. If 20 lines of plain code work, the new package's full transitive tree is ALWAYS bigger than 20 lines of attack surface — usually 50-500× bigger.

2. **Audit before installing.**

   ```bash
   npm view <pkg> maintainers time.modified scripts dependencies
   ```

   What to look at:
   - **`maintainers`** — single-maintainer wrappers around battle-tested libs are higher risk than well-staffed projects. Multiple maintainers with org-affiliated emails = lower risk.
   - **`time.modified`** — last release date. Long-abandoned packages are prime takeover targets (someone gets the npm credentials, publishes a "patch"). If it's been > 18 months, look at GitHub activity.
   - **`scripts`** — `preinstall` / `install` / `postinstall` entries. If any exist, READ what they do before installing. Binary downloads (sharp, esbuild) are normal; arbitrary shell commands are NOT.
   - **`dependencies`** — does it pull in 50 transitive packages? Each is its own attack surface. A package that adds 200 transitives to fetch a JSON file is a no.

3. **Install with exact versions.**

   ```bash
   npm install <pkg>
   # with save-exact in .npmrc, package.json gets "1.2.3" not "^1.2.3";
   # without it, add --save-exact yourself (and propose adding it to .npmrc)
   ```

4. **If the package has lifecycle scripts, opt them in EXPLICITLY.**

   Under `ignore-scripts=true`, a new dep with a postinstall installs fine but its script does NOT run automatically — which is the right default. To re-enable:

   ```bash
   npx @lavamoat/allow-scripts auto
   # → updates package.json's lavamoat.allowScripts with the new
   #   entry set to `false`.

   # Now MANUALLY edit package.json. Flip the new entry from
   # `false` to `true` ONLY AFTER reading what its postinstall
   # script actually does (e.g. `cat node_modules/<pkg>/scripts/postinstall.js`).

   npm run setup   # or `npx @lavamoat/allow-scripts run` if no setup script exists
   ```

   If you skip the manual flip, the package's install script doesn't run — which is the right failure mode. Better to break the dev install loud (with a clear "sharp can't find its binary" error at runtime) than silently execute untrusted code.

5. **Audit after install.**

   ```bash
   npm audit --omit=dev --audit-level=high
   # or the repo's allowlist-aware wrapper (often `npm run audit:prod`) if it has one
   ```

6. **Review the lockfile diff before committing.**

   ```bash
   git diff package-lock.json | head -100
   ```

   A SINGLE direct dep that adds hundreds of transitive deps is a red flag. Read the diff. Sometimes you'll learn the new package pulled in a `core-js` polyfill graveyard, or pulled in a competitor's library three levels deep — both worth knowing before merging.

7. **Document the dep if it matters structurally.** A dep that becomes load-bearing for some feature deserves a sentence in the repo's `CLAUDE.md` / `SECURITY.md` so future readers know it's there and why it was trusted.

---

## When a Dependabot/Renovate PR opens

For **security advisories** (PR has a `security` label or links to a GHSA):

- Merge fast. The advisory is published; assume attackers are scanning for unpatched targets. Time pressure here is real.
- Click through to the advisory. Read the affected versions + the vulnerable code path. Verify your code actually USES that path — if you don't, you're patching anyway but the urgency is lower.
- After merge, confirm the audit shows the vuln gone. If it's still there, the fix probably needs to go further up the dep chain (use the `overrides` field in `package.json` to force a transitive bump).

For **routine updates** (no `security` label):

- The cooldown (3/7/14 days by semver) already kept this PR back. Trust the cooldown to have done its filtering job.
- Read the changelog. Linked in the PR body.
- For patch: usually safe to merge if CI passes.
- For minor: skim for breaking changes flagged as non-breaking (a thing). Merge if clean.
- For major: scrutinize. Breaking changes can hide here; the cooldown gives you time but you still have to look.

For **grouped PRs** (e.g. "types-and-tooling weekly bundle"):

- CI must pass.
- Skim each package's changelog briefly.
- If any one looks fishy, comment `@dependabot recreate` + temporarily remove the suspect dep from the group config; let the bot reopen the rest.

If the repo has a pre-push audit hook, any pre-existing audit issue surfaces on local push too.

---

## When `npm audit` finds something

A CI gate on `npm audit --audit-level=high --omit=dev` blocks PRs on high/critical vulnerabilities. When it fires:

1. **Try `npm audit fix` first.** The "auto-fixable" advisories upgrade within-semver and usually don't break anything. Run the repo's tests + build after to verify.

2. **If `npm audit fix` says "requires breaking change" but the latest is a clean minor bump:** npm sometimes over-flags when advisories chain. Check `npm view <pkg> version` vs the pinned version. If the latest fixes the issue and is a minor/patch (not major) bump, just do `npm install <pkg>@<version>` manually.

3. **If a transitive dep needs a forced upgrade, use `overrides`.**

   ```json
   {
     "overrides": {
       "postcss": "^8.5.14"
     }
   }
   ```

   `npm install` after that to apply, then re-run the audit to verify.

4. **If there's no upstream fix:**
   - Assess practical exploitability. Does user input reach the vulnerable function in THIS repo's usage? Often it doesn't.
   - If genuinely unreachable in your code paths, allowlist the specific GHSA in the CI audit step + document why in `SECURITY.md` under an "audit history" section.
   - If reachable but the impact is small, consider: (a) migrate to an alternative library, (b) add validation at the call site, (c) sandbox it.
   - The bar for allowlisting: you can write a paragraph explaining why this CVE can't hit your users. If you can't, you can't allowlist it.

---

## The install-script allowlist — when to touch it

The `lavamoat.allowScripts` block in `package.json` is the runtime-trust contract for install scripts. Treat it like a security boundary. Specifically:

- **`true`** = "I personally read this package's postinstall and it's fine to run during install on every developer's machine + deploy CI."
- **`false`** = "Don't run this. The package will install but its script won't execute."

Each entry uses the FULL PATH from the root (e.g. `some-sdk>@opentelemetry/sdk-node>…>protobufjs`) — that's intentional. The path encodes WHO introduced the dep. If the same package shows up via a different path later, it's a different entry that requires its own review.

Packages that legitimately need their scripts are almost always one of: platform-specific binary downloads (`sharp`, `esbuild`), native/NAPI module setup, or a vendor SDK's codegen step. Arbitrary shell commands, network calls to non-release hosts, or anything reading env vars during install are disqualifying until proven otherwise.

Adding an entry: walk step 4 of the new-dep section. Removing one: flip `true` → `false` and verify with the repo's tests + build; if both pass, the package didn't actually need its script (a sign the maintainer included a postinstall that's vestigial). Document additions and removals in `SECURITY.md`'s audit history.

---

## Git hooks

If the repo wires hooks via `simple-git-hooks` (or husky), the standard pair is:

- **pre-commit** — runs `lockfile-lint` when `package-lock.json` is in the commit. Refuses lockfiles with non-npm hosts, non-HTTPS URLs, name mismatches, or missing SHA-512 hashes.
- **pre-push** — runs the prod audit before push. Refuses to push if a new high/critical prod-dep vulnerability has appeared.

Hooks live in `.git/hooks/` (per-clone, not in the repo). The hook config in `package.json` is the source of truth; hooks are (re)installed by the repo's `setup` script. A dev who pulls a branch with a hook-config change and doesn't re-run setup will silently have stale hooks — point them at this section.

Bypass syntax (for genuine emergencies — and tell the team if you do): `git commit --no-verify`, `git push --no-verify`. If you find yourself bypassing more than once a quarter, the hook is wrong, not your change. File an issue.

---

## Things to push back on

- **"Let's install a wrapper lib for this small thing."** — If the need is ~40 lines of logic (a service worker, a debounce, a date formatter), hand-roll it. A wrapper library's transitive tree is a permanent supply-chain surface bought to avoid an afternoon of code.
- **"Let's loosen the cooldown."** — The 3/7/14-day cooldown by semver kind is a deliberate trade-off between freshness and "publish, wait for the maintainer to notice it's malicious, get yanked, before npm-installing it." Don't shorten without naming what attack you're newly accepting.
- **"`ignore-scripts=true` is annoying — let me set it false."** — This is THE Shai-Hulud kill switch. The annoyance is the security working as designed. The fix is to keep flipping allowlist entries (with eyes-on-code review), not to disable the layer.
- **"Let me skip the pre-push hook."** — Once is fine in a true emergency; routinely, no. The hook is fast. If it's slow, the audit is slow because there's something to triage.
- **"Can we switch package managers for this one feature?"** — pnpm's built-in script allowlists are genuinely good, but a mid-project package-manager migration is its own risk event. Worth doing deliberately; not worth doing on a whim.

---

## Where these mechanisms usually live

| File | Role |
|---|---|
| `.npmrc` | Install behavior (ignore-scripts, save-exact, engine-strict, audit-level) |
| `package.json` `lavamoat.allowScripts` | Per-package install-script allowlist |
| `package.json` `overrides` | Force transitive dep versions |
| `package.json` `engines` | Node + npm minimum versions |
| `package.json` hook config | pre-commit / pre-push wiring |
| `package.json` `scripts` (`setup`, `audit:prod`, `lint:lockfile`) | The dev-facing command surface |
| Deploy config `installCommand` | `npm ci && npm run setup` — the prod install pipeline |
| `.github/dependabot.yml` | Auto-PR config with cooldown |
| CI audit workflow | The audit gate with its advisory allowlist |
| `.github/pull_request_template.md` | Supply-chain checklist on dep PRs |
| `SECURITY.md` | Full policy + threat model + audit history |
| `CLAUDE.md` | The codified rule-book for sessions |

When something in this skill's scope changes, update the audit-history section of `SECURITY.md` in the same commit. The history is the timeline of why the policy is what it is.

---

## Adopting from zero

For a repo with none of this, the highest-value order (each step is independently shippable):

1. `.npmrc` with `ignore-scripts=true` + `save-exact=true`, then `npx @lavamoat/allow-scripts auto` and review the generated allowlist (this alone kills the Shai-Hulud class).
2. Switch CI and deploy installs to `npm ci`.
3. Add the CI audit gate (`npm audit --audit-level=high --omit=dev`).
4. Add `lockfile-lint` (CI + pre-commit hook).
5. Add Dependabot with immediate security PRs and a 3/7/14-day routine cooldown.
6. Add runtime security headers in the framework config.
7. Write `SECURITY.md` capturing the layers and start the audit history.
