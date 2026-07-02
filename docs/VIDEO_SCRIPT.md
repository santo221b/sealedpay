# 3-minute demo video — script

> Format per bounty rules: real person on camera, ≤3 minutes.
> Two browser windows prepared: widget playground (Sepolia, funded wallet) and
> the Acme Payroll demo host. A second wallet profile for the recipient.

## 0:00–0:20 — The problem (face to camera)

> "Every on-chain payout today is public. Run payroll on Ethereum and you've
> published everyone's salary. This is DisperseKit: confidential bulk payouts
> as a widget any product can embed — built on the audited TokenOps disperse
> contract and Zama's FHE protocol."

## 0:20–1:20 — The sender's hero moment (screen: widget)

- Paste 4–5 `address, amount` rows (or drop the CSV). *"Recipients and
  amounts — the amounts are about to disappear from public view."*
- Review screen. Point at the labels: *"total — encrypted on-chain;
  recipients — visible; that's the honest privacy model of a push payout."*
- Click **Encrypt & disperse**. Narrate the timeline as it advances:
  *"amounts encrypted in my browser — one operator authorization, time-boxed —
  one single transaction pays everyone."*
- Delivered panel: click the Etherscan link, show a `transferred` value in the
  event: *"this is what the chain sees — a ciphertext handle, not a number."*
- Click **Verify delivery**: *"one signature, and the widget decrypts what
  actually moved — because confidential transfers never revert, they silently
  send zero if you're short. We check. Delivered means delivered."*

## 1:20–1:50 — The recipient (screen: receipt page, second wallet)

- Connect recipient wallet → **Find my payments** → **Reveal my amounts**.
- *"One signature. Only I can do this — the amount decrypts for me and nobody
  else. No claim step; the tokens were already mine."*

## 1:50–2:40 — The white-label reveal (screen: Acme Payroll)

- Open the demo host: *"But here's the actual product. This is Acme Payroll —
  a fictional company. Same widget, their brand."*
- Click **Show the integration code**: *"the entire integration is this — one
  import, one component, a theme prop. Like Stripe Elements, but the thing
  being embedded is confidential money movement."*
- Run a tiny payout inside Acme to prove it's live, not a mockup.

## 2:40–3:00 — Close (face to camera)

> "Amounts hidden, delivery verified, recipients in control — and any product
> can drop it in with one import. DisperseKit, built on TokenOps and Zama.
> Repo, live demo and the embed guide are linked below."

## Shot checklist

- [ ] Funded sender wallet (Sepolia ETH + demo cUSDd minted)
- [ ] Recipient wallet with at least one prior payout received
- [ ] Etherscan tab pre-loaded on a past disperse tx (fallback if live tx is slow)
- [ ] Both dev servers (or the live Vercel URLs) open
- [ ] Mic check; screen at 1080p minimum
