# X thread — draft

> Post with the demo video attached to tweet 1. Tag @zama_fhe, hashtag
> #ZamaDeveloperProgram. Add the live demo + repo links when deployed.

**1/**
Run payroll on a public chain and you've published everyone's salary.

We built SealedPay: confidential payroll on-chain. Pay your whole team in one
transaction — salaries stay encrypted. Built on TokenOps confidential
disperse × @zama_fhe FHE.

🧵👇 #ZamaDeveloperProgram

**2/**
The employer flow: a roster, one button.

Salaries are encrypted *in the browser* — one ZK proof covers the whole batch
— and a single transaction pays everyone. On-chain, each salary is an opaque
ciphertext handle. [screenshot: dashboard + run timeline]

**3/**
Honest privacy model (this matters):
🔒 hidden — every salary, and the payroll total
👁️ visible — employee wallet addresses, and that a payroll ran

That's inherent to pushing tokens. What each person earns stays sealed.
[screenshot: "What stays private?"]

**4/**
FHE has a sharp edge: confidential transfers can't revert on insufficient
balance — they silently move an encrypted *zero*.

So SealedPay proves delivery instead of assuming it: one signature decrypts
what actually moved, per employee. [screenshot: verified panel]

**5/**
Private AND provable, retroactively: payout history stores no amounts at all
— only on-chain ciphertext handles. Any past payroll can be re-verified on
demand, and each employee can decrypt only their own salary. Enforced by the
on-chain FHE ACL, not by a promise. [screenshot: history verify]

**6/**
Under the hood is DisperseKit — our confidential disperse engine, packaged as
a one-import widget:

```tsx
import { DisperseWidget } from "@dispersekit/widget";
<DisperseWidget token={TOKEN} theme={yourBrand} />
```

Same engine, any product. [screenshot: Acme embed]

**7/**
Stack: @zama_fhe relayer SDK (client-side encrypt + user-decrypt), ERC-7984
confidential token (time-boxed operator model), and TokenOps' audited
DisperseConfidential singleton on Sepolia — we run against the real, verified
deployment.

**8/**
SealedPay (live demo): <vercel-url>
DisperseKit playground: <vercel-url-2>
Repo (docs incl. a 5-minute embed guide): <repo-url>

Built for the Zama Developer Program Season 3 special bounty track with
@tokenops. Feedback welcome 🧡
