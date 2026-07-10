---
name: ui-copy-style
description: SealedPay/DisperseKit UI copy rules. Apply whenever writing or editing ANY user-facing text in this repo - headings, titles, subtitles, descriptions, button labels, toasts, error messages, empty states, tooltips, pill labels, aria-labels, chart tooltips. Read BEFORE writing the string, not after.
---

# SealedPay UI copy style

Three hard rules for every user-facing string. They exist because past copy repeatedly broke them.

## 1. Capitalize the first letter

Every standalone user-facing string starts with a capital letter: titles, labels, descriptions, subtitles, stat-card subs, toasts, buttons, empty-state text.

- Wrong: `sub="on-chain, never public"`
- Right: `sub="On-chain, never public"`

This includes clauses after a middot: if the text after `·` reads as a full clause or sentence, either capitalize it or use a period instead of the middot.

- Wrong: `SealedPay runs on Sepolia testnet · payroll settles with free test funds.`
- Right: `SealedPay runs on Sepolia testnet. Payroll settles with free test funds.`

The only exception is a genuine mid-sentence fragment on the same rendered line (e.g. an address chip inside a running sentence).

## 2. Never use the em-dash

The em-dash `—` (and a spaced en-dash `–` used as punctuation) is banned in UI copy. Use the middot `·` as a separator, or restructure into two sentences.

- Wrong: `Decrypted locally — only you can read it.`
- Right: `Decrypted locally · only you can read it.`

## 3. No three-dot ellipsis, no semicolons, serious register

- Never `...` in UI copy. The single-character `…` is allowed ONLY inside truncated wallet addresses and tx hashes (`0xE5EF…4200`).
- Never `;` as prose punctuation.
- Serious-product register: audience labels over first-person quiz copy ("For Employers", not "I run payroll"), statements over questions, no chatty filler ("just", "go ahead", "awesome"), no exclamation marks, no forced "I understand" acknowledgments.

## Scope

Applies to all user-facing strings in `packages/sealedpay` and `packages/dispersekit` UI code. Does NOT apply to code comments, commit messages, README/docs prose, or internal log strings.
