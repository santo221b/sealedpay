# SealedPay (`@dispersekit/payroll`)

**SealedPay — confidential payroll on-chain.** Pay your whole team in one
transaction; salaries stay encrypted. Built on TokenOps confidential
disperse × Zama FHE.

SealedPay is the product; **DisperseKit is the engine** underneath. "Run
payroll" *is* the existing confidential disperse flow; this package adds zero
on-chain or cryptographic code. (The package keeps its `@dispersekit/payroll`
name — code identifiers are engine-side.)

Accounts are email-based: both sides sign in with an email via
[Privy](https://privy.io) and get an embedded wallet created from it — no
extension, no seed phrase. An email is an employer or an employee, never both.

```bash
npm run dev   # http://localhost:5175   (root: npm run dev:sealedpay)
```

Dev serves the account backend too — a Vite plugin bridges the SAME Vercel
functions (`api/` + `server/`) at `/api`. Set `VITE_PRIVY_APP_ID`,
`PRIVY_APP_SECRET`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`
in the repo-root `.env` (secrets stay server-side, never `VITE_`-prefixed).

## The architecture rule this package proves

The disperse flow lives in ONE place — `useDisperseFlow` in
[`@dispersekit/widget`](../widget) — and both the widget and this dashboard
import it unchanged. The single file where payroll touches the engine is
[`src/dashboard/RunPayrollModal.tsx`](src/dashboard/RunPayrollModal.tsx) (marked
`THE SEAM`): it serializes the roster into the same `address, amount` lines
the widget accepts, funnels them through the widget's validated
`parseRecipients` (EIP-55, euint64 range, no rounding, duplicate warnings),
and hands the rows to the same state machine — encrypt → authorize →
disperse (one tx) → confirm-from-event → verify-decrypt.

```
roster (Upstash via /api)          @dispersekit/widget (unchanged engine)
┌────────────────────┐   rows    ┌──────────────────────────────────────┐
│ { name, email,     │ ────────► │ parseRecipients → useDisperseFlow    │
│   address, salary }│           │ StatusTimeline / DeliveredPanel      │
└────────────────────┘   phases  │ ("Verify salaries were delivered")   │
       ▲                ◄──────── └──────────────────────────────────────┘
  runs + profiles (Upstash; localStorage as cache)
```

## What's here (and deliberately not)

- **Email accounts** — Privy sign-in with embedded wallets on both surfaces;
  the Gate enforces role exclusivity (employer XOR employee per email).
- **Employees** — added by email; the server pregenerates their Privy wallet
  so payroll runs before they ever sign in
  ([`src/lib/employees.ts`](src/lib/employees.ts), `server/handlers.ts`).
- **Backend** — Vercel functions (`api/` + `server/`): every call verifies
  the Privy access token; rosters, runs, and profiles live in Upstash Redis.
- **Team overview** — roster table + exact total (computed at the token's real
  decimals; never rounded).
- **Run payout** — one button → the shared flow, same live status states,
  same post-delivery decrypt-verify, reworded for payroll.
- **History** — recorded only after on-chain confirmation, each run linked to
  its Sepolia tx, with a ✓ once salaries are decrypt-verified
  ([`src/lib/history.ts`](src/lib/history.ts)).
- **Employee portal** ([`src/portal`](src/portal)) — salary chart, payments
  ledger, verifications, payslip export; amounts reveal with one EIP-712
  signature and only for the signed-in recipient.
- **Sample data is opt-in** — empty states offer a "Load sample data" link;
  nothing is seeded.
- No scheduling or automation (the only trigger is the button), no new
  contracts, no fork of the flow.
