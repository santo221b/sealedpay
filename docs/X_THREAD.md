# X thread — draft

> Post with the demo video attached to tweet 1. Tag @zama_fhe, hashtag
> #ZamaDeveloperProgram. Add the live demo + repo links when deployed.

**1/**
Every on-chain payout is public. Payroll, grants, airdrops — amounts for the
whole world to read.

We built DisperseKit: confidential bulk payouts as a one-import widget, on
@zama_fhe's FHE protocol + the audited TokenOps disperse contract.

🧵👇 #ZamaDeveloperProgram

**2/**
The sender flow: paste recipients + amounts → one click.

Amounts are encrypted *in the browser* — a single ZK proof covers the whole
batch — and one transaction pays everyone. On-chain, each amount is an opaque
ciphertext handle. [screenshot: review + timeline]

**3/**
Honest privacy model (this matters):
🔒 hidden — every amount, and the total
👁️ visible — recipient addresses, and that a payout happened

That's inherent to pushing tokens. The amounts are the secret, and they stay
one. [screenshot: "What stays private?"]

**4/**
FHE has a sharp edge: confidential transfers can't revert on insufficient
balance — they silently move an encrypted *zero*.

DisperseKit decrypts what actually moved after every payout (one signature)
and flags any zeros. Delivered means delivered. [screenshot: verified panel]

**5/**
Recipients get a receipt view: connect → one EIP-712 signature → "you
received X", decrypted locally. Only they can perform that read — enforced by
the on-chain FHE ACL, not by a promise. [screenshot: receipt]

**6/**
And the whole point — it's white-label:

```tsx
import { DisperseWidget } from "@dispersekit/widget";
<DisperseWidget token={TOKEN} theme={yourBrand} />
```

Same widget, your product, your colors. Here it is living inside a fictional
"Acme Payroll". [screenshot: Acme]

**7/**
Under the hood: @zama_fhe relayer SDK (client-side encrypt + user-decrypt),
ERC-7984 confidential token (operator model, time-boxed), and TokenOps'
audited DisperseConfidential singleton on Sepolia — we run against the real,
verified deployment.

**8/**
Live demo: <vercel-url>
Acme embed demo: <vercel-url-2>
Repo (docs incl. a 5-minute embed guide): <repo-url>

Built for the Zama Developer Program Season 3 special bounty track with
@tokenops. Feedback welcome 🧡
