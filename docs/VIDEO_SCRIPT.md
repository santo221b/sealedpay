# 3-minute demo video — script

> Format per bounty rules: real person on camera, ≤3 minutes.
> Windows prepared: **SealedPay** (Sepolia, funded employer wallet with a
> small roster saved), Etherscan, and the Acme Payroll embed demo. A second
> wallet profile for the employee receipt moment.

## 0:00–0:20 — The problem (face to camera)

> "Run payroll on a public chain and you've published everyone's salary.
> This is SealedPay: confidential payroll on-chain — pay your whole team in
> one transaction, salaries stay encrypted. Built on the audited TokenOps
> disperse contract and Zama's FHE."

## 0:20–1:30 — The employer's hero moment (screen: SealedPay)

- Open on the **dashboard**: point at the stat cards — *"headcount, next
  payout — and the monthly total, masked. Every amount in this product is
  sealed by default; I can reveal it, because it's mine to reveal."* (Click
  the `••••` → reveal.)
- Flash the **People** screen: *"a roster: name, wallet, salary. Stored in my
  browser — never uploaded, never on-chain in the clear."*
- Click **Run payroll now** → review screen: *"who gets paid, the total, the
  fee — and the promise: the chain will see who got paid, never how much."*
- Confirm → narrate the timeline: *"salaries encrypted in my browser — a
  one-hour authorization — one single transaction pays everyone."*
- Success: *"delivered confidentially."* Click the Etherscan link, show a
  `transferred` handle: *"this is Alice's salary as the chain knows it."*
- Click **Verify salaries were delivered**: *"one signature — the amounts
  decrypt, for my eyes only, and match what I approved. Confidential
  transfers can't revert on a short balance, so SealedPay proves delivery
  instead of assuming it."*

## 1:30–2:00 — Private AND provable (screen: Payments)

- Open **Payments**, expand an older run: *"history stores no numbers at all
  — only the on-chain ciphertext handles. Any past payroll can be re-proven
  on demand."* Click **Verify this run** → amounts decrypt with ✓s.

## 2:00–2:40 — The engine reveal (screen: Acme demo)

- *"Under SealedPay is DisperseKit — the confidential disperse engine, as a
  one-import widget. Same engine, any product: here it is inside a fictional
  partner app, restyled with one theme prop."* Show Acme + the
  "Show the integration code" toggle.

## 2:40–3:00 — Close (face to camera)

> "Salaries sealed, delivery proven, every employee in control of their own
> number — and the engine drops into any app with one import. SealedPay,
> powered by DisperseKit, built on TokenOps and Zama. Links below."

## Shot checklist

- [ ] Employer wallet funded (Sepolia ETH + demo cUSDd minted) with a 3–5 person roster saved
- [ ] At least one prior payroll run in history (for the retro-verify moment)
- [ ] Etherscan tab pre-loaded on a past run (fallback if the live tx is slow)
- [ ] SealedPay + Acme demo open (local or live URLs)
- [ ] Mic check; screen at 1080p minimum
