# Running the demo end-to-end

<!-- TODO(phase-e/g): finalize once demo-host + Sepolia deploys exist. Outline: -->

1. **Setup** — [SETUP.md](SETUP.md) steps 1–4 (Sepolia deploy + `.env` addresses).
2. **Fund the sender** — in the widget playground, mint demo cTokens to the connected wallet (open faucet).
3. **Disperse** — paste a `recipient, amount` list (or upload the sample CSV in `packages/widget/sample/`), watch encrypting → authorizing → dispersing → delivered.
4. **Verify privacy** — open the tx on Etherscan: recipients visible, every amount an opaque ciphertext handle.
5. **Receive** — switch to a recipient wallet on the receipt page: connect → sign → "You received X."
6. **White-label** — open the demo host: same widget, one import, partner branding.
