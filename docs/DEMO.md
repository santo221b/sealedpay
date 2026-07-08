# Running the demo end-to-end

> The flagship demo is **SealedPay** — see the root [README](../README.md) "For judges" walkthrough. The steps below run the underlying engine directly in the widget playground.

1. **Setup** — [SETUP.md](SETUP.md) steps 1–4 (Sepolia deploy + `.env` addresses).
2. **Fund the sender** — in the widget playground, mint demo cTokens to the connected wallet (open faucet).
3. **Disperse** — paste a `recipient, amount` list, watch encrypting → authorizing → dispersing → delivered.
4. **Verify privacy** — open the tx on Etherscan: recipients visible, every amount an opaque ciphertext handle.
5. **Receive** — switch to a recipient wallet on the receipt page: connect → sign → "You received X."
6. **See a full product** — [SealedPay](https://sealedpay.vercel.app) is a complete confidential payroll dashboard built on the same engine.
