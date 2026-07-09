/**
 * Payslip export — a clean printable document for one revealed payment,
 * generated entirely client-side (the decrypted amount never leaves the
 * browser; printing to PDF is the browser's own dialog).
 *
 * Deliberately restrained: white paper, one accent, the on-chain proof (tx
 * hash + Etherscan link) as the document's anchor of trust.
 */
import type { MyPayment } from "../lib/myPay";

export function exportPayslip(opts: {
  payment: MyPayment;
  amountText: string;
  symbol: string;
  recipient: string;
  recipientName?: string;
  employerName?: string;
}) {
  const { payment, amountText, symbol, recipient, recipientName, employerName } = opts;
  const when = payment.timestamp
    ? new Date(payment.timestamp).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : "Time unavailable";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>SealedPay payslip · ${esc(payment.txHash.slice(0, 10))}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #16211c; background: #fff; padding: 56px 60px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16211c; padding-bottom: 18px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.2px; }
  .brand small { display: block; font-size: 11px; font-weight: 500; color: #5c6f66; margin-top: 3px; }
  .doc { text-align: right; font-size: 11px; color: #5c6f66; line-height: 1.6; }
  .amount { margin: 44px 0 8px; }
  .amount .label { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: #5c6f66; }
  .amount .value { font-size: 44px; font-weight: 800; margin-top: 6px; }
  .amount .value span { font-size: 18px; font-weight: 600; color: #2e9478; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 36px; font-size: 12.5px; }
  td { padding: 11px 0; border-bottom: 1px solid #e3e9e6; vertical-align: top; }
  td.k { width: 190px; color: #5c6f66; }
  td.v { font-weight: 600; word-break: break-all; }
  .mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11.5px; font-weight: 500; }
  .note { margin-top: 40px; font-size: 10.5px; color: #7a8a82; line-height: 1.65; border-left: 3px solid #2e9478; padding-left: 14px; }
  a { color: #2e9478; }
  @media print { body { padding: 40px 44px; } }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">SealedPay<small>Confidential payroll · payslip</small></div>
    <div class="doc">Generated ${esc(new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }))}<br/>Network · Sepolia testnet</div>
  </div>

  <div class="amount">
    <div class="label">Payment received</div>
    <div class="value">${esc(amountText)}<span>${esc(symbol)}</span></div>
  </div>

  <table>
    ${recipientName ? `<tr><td class="k">Paid to</td><td class="v">${esc(recipientName)}</td></tr>` : ""}
    <tr><td class="k">Recipient wallet</td><td class="v mono">${esc(recipient)}</td></tr>
    ${employerName ? `<tr><td class="k">Employer</td><td class="v">${esc(employerName)}</td></tr>` : ""}
    <tr><td class="k">From wallet</td><td class="v mono">${esc(payment.from)}</td></tr>
    <tr><td class="k">Settled</td><td class="v">${esc(when)}</td></tr>
    <tr><td class="k">Transaction</td><td class="v mono"><a href="${esc(payment.url)}">${esc(payment.txHash)}</a></td></tr>
  </table>

  <p class="note">
    This amount was transferred as an encrypted value (Zama FHE · ERC-7984 confidential token). On-chain, the amount is
    an opaque ciphertext handle — it was decrypted locally in the recipient's browser with their wallet signature to
    produce this document. Verify the transaction independently on Etherscan via the hash above.
  </p>

  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 180); });</script>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,width=760,height=920");
  if (!w) return; // popup blocked — the button stays, the user can retry
  w.document.write(html);
  w.document.close();
}
