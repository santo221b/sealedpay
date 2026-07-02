# What stays private? (the honest version)

DisperseKit runs on the [Zama Protocol](https://docs.zama.org/protocol) (FHEVM): token balances and transfer amounts live on-chain as **FHE ciphertexts**. The chain computes on them without ever seeing them.

## Hidden on-chain 🔒

- **The amount each recipient receives.** Every amount is encrypted in the sender's browser before it touches the chain. On-chain it is a ciphertext handle; only the recipient (and anyone they explicitly grant) can decrypt it.
- **The total dispersed.** The subtotal is encrypted the same way.
- **Balances.** ERC-7984 balances are encrypted end-to-end.

## Visible on-chain 👁️ (we won't pretend otherwise)

- **Recipient addresses.** A disperse *pushes* tokens, so each transfer emits an event naming the recipient. That's inherent to push-style distribution — the confidential part is the *amounts*, not the addresses.
- **That a distribution happened**, from which contract, initiated by which sender, and to how many recipients.

## How the mechanism works

1. **Operator authorization.** The sender calls `setOperator(disperseContract, until)` on the ERC-7984 token — a time-boxed permission for the disperse contract to move the sender's (encrypted) funds. No unlimited approvals.
2. **One transaction.** The sender submits recipients + encrypted per-recipient amounts + an encrypted **subtotal**. The contract does **not** sum the amounts on-chain — FHE addition per recipient would blow past per-transaction compute limits — so it trusts the supplied subtotal and moves funds accordingly.
3. **Per-recipient access grants.** For each delivered amount the contract grants decryption access: `FHE.allowThis(handle)` (so the contract/token can keep computing with it) and `FHE.allow(handle, recipient)` (so the recipient can decrypt it later, from any session).
4. **Private read.** A recipient signs an EIP-712 request and asks the Zama relayer to user-decrypt *their* handle. The relayer verifies the on-chain ACL — anyone else asking gets nothing.

## FHE footguns we handle (so you don't have to)

- **Confidential transfers never revert on insufficient balance** — they silently transfer an encrypted **zero**. The widget checks the sender's decrypted balance before dispersing and confirms delivery from events, never by assuming success.
- **You cannot branch on an encrypted value.** Contract logic uses `FHE.select(...)` instead of `if`.
- **Missing ACL grants are a classic bug.** Without `FHE.allowThis` a contract loses access to its own ciphertext next transaction; without `FHE.allow(recipient)` the recipient can never decrypt. Both are granted per amount.
