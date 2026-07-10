# Architecture

```
Partner app ──embeds──► [DisperseKit widget]
                              │ 1. sender inputs recipients + amounts
                              │ 2. encrypts each amount + subtotal (client SDK)
                              │ 3. setOperator(disperseContract, until) on cToken
                              ▼
                     [DisperseConfidential]  ◄── pulls funds ──  [cToken (ERC-7984)]
                              │ 4. transfers encrypted amount to each recipient (one tx)
                              │ 5. grants allowThis + allow(recipient) per amount
                              ▼
                     events (recipients visible, amounts hidden)
                              │
                              ▼
                     Recipient ── 6. user-decrypts own amount (EIP-712) ──► "You received X"
```

## The three flows

### 1. Encrypt inputs (browser)
Each amount is encrypted with the Zama relayer SDK: `createEncryptedInput(disperseContract, senderAddress)` → `.add64(amount₁)…add64(amountₙ)` → `.encrypt()` → `{ handles, inputProof }`. The handles map 1:1 to `externalEuint64` parameters on the contract. In SealedPay this encryption is driven **by the TokenOps SDK** (step 2) — we adapt our relayer instance to its `Encryptor` interface, so one FHE stack serves the whole app.

### 2. Authorize + disperse (via `@tokenops/sdk`)
Both steps run through the official TokenOps SDK (`@tokenops/sdk/fhe-disperse`), pointed at the same audited `DisperseConfidential` singleton — **no factories are deployed**:
- `setOperator({ token, spender: disperse, deadline })` — time-boxed ERC-7984 operator permission.
- `new ConfidentialDisperseClient({ …, encryptor }).disperse({ token, mode: "direct", recipients, amounts })` — the SDK validates the batch, encrypts every amount under one proof (via our adapted relayer encryptor), pays the anti-spam gas fee, submits `disperseConfidentialTokenDirect`, waits for the receipt, and returns the per-recipient `requested`/`transferred` handles. DisperseKit's `useDisperseFlow` captures the broadcast tx hash so a confirmation hiccup is recovered, never re-sent.

### 3. User-decrypt (browser, recipient)
The recipient signs an EIP-712 decryption request; the relayer checks the on-chain ACL and returns the plaintext of *their* handle only.

## Packages

- **`packages/sealedpay`** — **SealedPay**, the product: confidential payroll with email accounts. Employer dashboard + employee portal, both signed in via Privy (embedded wallets created from the email); a small backend (Vercel functions in `api/` + `server/`, Upstash Redis) verifies the Privy token and stores rosters, runs, and profiles. The one engine touchpoint is documented as THE SEAM in `src/dashboard/RunPayrollModal.tsx`.
- **`packages/dispersekit`** — **DisperseKit**, the engine. `DisperseWidget.tsx` (sender flow), `ReceiptWidget.tsx` (recipient flow), `lib/fhe/` (relayer init + encrypt/decrypt helpers), the shared `useDisperseFlow` state machine (which drives the confidential disperse through **`@tokenops/sdk`**), self-contained wallet providers (wagmi + RainbowKit) so a host app needs nothing.
- **`packages/smart-contracts`** — Hardhat (fhevm template). `ConfidentialTokenDemo` (ERC-7984 + public mint faucet for the demo) and the audited TokenOps disperse contract. Mock-mode tests prove the full flow without any external service.
- **`packages/dispersekit-docs`** — the DisperseKit SDK documentation site: a single-page integration guide for the SDK, with SealedPay as the case study.
