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
The widget builds one encrypted input bundle per disperse with the relayer SDK:
`createEncryptedInput(disperseContract, senderAddress)` → `.add64(amount₁)…add64(amountₙ).add64(subtotal)` → `.encrypt()` → `{ handles, inputProof }`. The handles map 1:1 to `externalEuint64` parameters on the contract.

### 2. Authorize + disperse (on-chain)
- `cToken.setOperator(disperse, until)` — time-boxed operator permission (ERC-7984).
- `disperse.disperse(token, recipients[], amountHandles[], subtotalHandle, inputProof)` — one transaction: verifies the input proof, moves funds via the operator permission, transfers each encrypted amount, grants each recipient ACL access to their amount.

### 3. User-decrypt (browser, recipient)
The recipient signs an EIP-712 decryption request; the relayer checks the on-chain ACL and returns the plaintext of *their* handle only.

## Packages

- **`packages/payroll`** — **SealedPay**, the product: an employer-only confidential payroll dashboard skinned over the engine (roster/history in localStorage; the one engine touchpoint is documented as THE SEAM in `src/screens/Run.tsx`).
- **`packages/widget`** — **DisperseKit**, the engine. `DisperseWidget.tsx` (sender flow), `ReceiptWidget.tsx` (recipient flow), `lib/fhe/` (SDK init + encrypt/decrypt helpers), the shared `useDisperseFlow` state machine, self-contained wallet providers (wagmi + RainbowKit) so a host app needs nothing.
- **`packages/contracts`** — Hardhat (fhevm template). `ConfidentialTokenDemo` (ERC-7984 + public mint faucet for the demo) and the audited TokenOps disperse contract. Mock-mode tests prove the full flow without any external service.
- **`packages/demo-host`** — a fictional partner app ("Acme Payroll") embedding both widgets with one import each, restyled via the theme prop.

<!-- TODO(phase-b): pin down the exact disperse contract API once the TokenOps research lands; keep this file in sync with the deployed source. -->
