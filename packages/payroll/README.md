# SealedPay (`@dispersekit/payroll`)

**SealedPay — confidential payroll on-chain.** Pay your whole team in one
transaction; salaries stay encrypted. Built on TokenOps confidential
disperse × Zama FHE.

SealedPay is the product; **DisperseKit is the engine** underneath. "Run
payroll" *is* the existing confidential disperse flow; this package adds zero
on-chain or cryptographic code. (The package keeps its `@dispersekit/payroll`
name — code identifiers are engine-side.)

```bash
npm run dev   # http://localhost:5175   (root: npm run dev:payroll)
```

## The architecture rule this package proves

The disperse flow lives in ONE place — `useDisperseFlow` in
[`@dispersekit/widget`](../widget) — and both the widget and this dashboard
import it unchanged. The single file where payroll touches the engine is
[`src/components/RunPayroll.tsx`](src/components/RunPayroll.tsx) (marked
`THE SEAM`): it serializes the roster into the same `address, amount` lines
the widget accepts, funnels them through the widget's validated
`parseRecipients` (EIP-55, euint64 range, no rounding, duplicate warnings),
and hands the rows to the same state machine — encrypt → authorize →
disperse (one tx) → confirm-from-event → verify-decrypt.

```
roster (localStorage)              @dispersekit/widget (unchanged engine)
┌────────────────────┐   rows    ┌──────────────────────────────────────┐
│ { name, address,   │ ────────► │ parseRecipients → useDisperseFlow    │
│   salary } []      │           │ StatusTimeline / DeliveredPanel      │
└────────────────────┘   phases  │ ("Verify salaries were delivered")   │
       ▲                ◄──────── └──────────────────────────────────────┘
  history + next-due (localStorage, display-only)
```

## What's here (and deliberately not)

- **Employees** — add/edit/remove with EIP-55 + amount validation;
  `localStorage` only ([`src/lib/employees.ts`](src/lib/employees.ts)).
- **Team overview** — roster table + exact total (computed at the token's real
  decimals; never rounded).
- **Run payout** — one button → the shared flow, same live status states,
  same post-delivery decrypt-verify, reworded for payroll.
- **History** — recorded only after on-chain confirmation, each run linked to
  its Sepolia tx, with a ✓ once salaries are decrypt-verified
  ([`src/lib/history.ts`](src/lib/history.ts)).
- **Next payout due** — display-only (manual date, or last run + 1 month).
  **No scheduling, no automation**: the only trigger is the button.
- No employee logins, no backend, no new contracts, no fork of the flow.
