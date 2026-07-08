# @dispersekit/demo-host

The **DisperseKit SDK documentation site** — a single-page integration guide
for [`@dispersekit/widget`](../widget). It is the source of the docs published
at [dispersekit-demo.vercel.app](https://dispersekit-demo.vercel.app).

It walks the whole public surface with real, copy-paste examples: install,
provider setup, `parseRecipients`, `useTokenMeta`, the `useDisperseFlow` phase
machine, recipient decryption (`getFhevmInstance` + `userDecryptHandles`), and
`formatAmount`, plus an API reference. It also frames the two foundations the
SDK is powered by, Zama FHE (encryption) and TokenOps (confidential transfers),
and features SealedPay as the flagship case study: a full product built
entirely on the SDK.

Every snippet is faithful to the real API in [`../widget/src`](../widget) and
to how the payroll app ([`../payroll`](../payroll)) actually calls it.

```bash
npm run dev   # http://localhost:5174   (from repo root: npm run dev:demo)
```

## Notes

- Pure docs. There is no wallet connection or live transaction here. The
  runnable widget lives at the widget playground, and the live product lives at
  [SealedPay](https://sealedpay.vercel.app).
- Code highlighting is a small built-in tokenizer (no heavy dependency), so the
  samples stay lightweight and on-theme.
- Dark, teal-accented single page with a sticky sidebar and scroll-spy, built
  with React, Vite, and Framer Motion.
