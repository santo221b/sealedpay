# @dispersekit/demo-host

"Acme Payroll" — a fictional partner product that proves the white-label
story. The entire DisperseKit integration in this app is:

```tsx
import { DisperseWidget, ReceiptWidget } from "@dispersekit/widget";

<DisperseWidget title="Pay contractors" theme={acmeTheme} onDispersed={…} />
<ReceiptWidget title="My pay" theme={acmeTheme} />
```

Acme's indigo brand comes entirely from the `theme` prop — same widget,
different company. The "Show the integration code" button in the UI displays
the snippet, because the one-import moment *is* the demo.

```bash
npm run dev   # http://localhost:5174
```

Note: this app consumes the widget as workspace **source**, so its
`src/styles.css` adds `@source "../../widget/src"` for Tailwind to pick up the
widget's classes. A published widget build would ship compiled CSS instead.
