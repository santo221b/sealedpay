# SealedPay Dashboard — Data, Logic & Assets Spec

Extracted from `docs/design/handoff/DisperseKit Payroll.dc.html` (the `class Component` at the bottom of the file, the `RevealAmount` helper, and every inline SVG). This document is the data/logic/asset half of the spec; layout/markup is covered by the sibling extraction docs.

All values are copied exactly as coded. Where the prototype's coded behavior differs from the README's prose, the coded behavior is stated and flagged.

---

## 1. Component props (DC `data-props`)

Two design-time props are injected into `renderVals()`:

| Prop | Default | Options | Used for |
|---|---|---|---|
| `accentColor` | `#3bbf8e` | `#3bbf8e`, `#5fe3ab`, `#2f7d5e` | Primary buttons (Run payroll, Continue, Confirm & pay, Done, Enable, Sign back in), active tab bg, settings toggle track (on), notif badge bg, dept chip active bg, reminder-set dot |
| `barColor` | `#8fd7c0` | `#8fd7c0`, `#dff2ea`, `#6fc3e0`, `#8b7cf6` | Active month's solid bar fill in Payout Activity |

In code: `const accent = this.props.accentColor ?? '#3bbf8e'; const barColor = this.props.barColor ?? '#8fd7c0';`

---

## 2. State — every field + initial value (verbatim)

```js
state = {
  scrolled: false,          // (declared; scroll fade is actually driven imperatively via fadeRef, see §7)
  tip: null,                // 'enc' | 'ver' | null — puck tooltips on Monthly payroll / Last run
  revealRunway: false,
  searchOpen: false,
  searchMounted: false,
  searchQ: '',
  remindOpen: false,
  reminderSet: false,
  addOpen: false,
  addName: '', addRole: '', addSalary: '', addWallet: '',
  addDept: 'Engineering',
  extra: [],                // employees appended via Add Employee
  tab: 'All',               // overview tab
  bar: 'May',               // active month in Payout Activity chart
  nav: 0,                   // 0 Home / 1 Team / 2 Insights / 3 Employee View
  empIndex: 0,
  popup: null,              // 'bell' | 'gear' | null
  logoutOpen: false,
  loggedOut: false,
  maskDefault: true,        // Settings: Mask amounts by default
  reminders: true,          // Settings: Payout reminders
  autoverify: true,         // Settings: Auto-verify after payout
  revealMonthly: false,
  revealTotal: false,
  revealBalance: false,
  empReveal: false,
  empRows: {},              // per-payment-history-row reveal map, keyed by run month/id
  notifs: [                 // see §4 for the seed
    {id:1, title:'Payroll delivered',      sub:'8 employees paid · verified · Just now',        color:'#3bbf8e', read:false, tone:'ok'},
    {id:2, title:'Authorization expiring', sub:'operator access ends in 45 min · 1 h ago',      color:'#e3b25f', read:false, tone:'warn'},
    {id:3, title:'Upcoming payout',        sub:'Jul 31 · 8 employees scheduled · Yesterday',    color:'#9db3aa', read:false, tone:'info'}
  ],
  _nid: 4,                  // next notification id
  profileOpen: false,
  fundOpen: false,
  fundAmount: '',
  payrollOpen: false,
  payStep: 0,               // 0 select / 1 encrypting / 2 authorize / 3 disperse
  encIdx: 0,                // encrypting cascade cursor
  paySel: {},               // per-employee selection: absent or true = checked; explicit false = unchecked
  payReveal: false,
  authState: 'idle',        // 'idle' | 'signing' | 'done'
  dispState: 'idle',        // 'idle' | 'sending' | 'confirmed' | 'verifying' | 'done'
  deliveredN: 0,
  resultReveal: false,
  runs: [],                 // completed runs prepended (newest first)
  toast: null,              // { kind:'ok'|'err', msg, id } | null
  permPrompt: false,
  notifPerm: 'default'      // 'default' | 'granted' | 'denied'
}
```

Refs created on the class: `donutRef, fadeRef, searchBarRef, searchOverlayRef, searchPopupRef, statsRef, topAvatarRef, modalAvatarRef, gasRef, payStepBarRef, dispHeadRef` (all `React.createRef()`).

> Note: `gasRef` and `payStepBarRef` are never attached to any element in the markup. The gas chart (`initGas`) therefore never renders — it is orphaned code (config still documented in §9 for completeness). `scrolled` state is declared but unused; the scroll fade writes `fadeRef.current.style.opacity` directly.

---

## 3. EMPLOYEES seed (8, exact)

```js
EMPLOYEES = [
  { name: 'Priya Sharma',  role: 'Engineer',          dept: 'Engineering', wallet: '0x83A1…9AF2', salary: 850,   start: 0, joined: 'Feb 2026' },
  { name: 'Arjun Mehta',   role: 'Engineer',          dept: 'Engineering', wallet: '0x91B2…B3E1', salary: 780,   start: 0, joined: 'Feb 2026' },
  { name: 'Mei Lin',       role: 'Backend Engineer',  dept: 'Engineering', wallet: '0xA4C3…C4F2', salary: 720,   start: 0, joined: 'Feb 2026' },
  { name: 'Daniel Okafor', role: 'Platform Engineer', dept: 'Engineering', wallet: '0xB5D4…D5A3', salary: 650,   start: 2, joined: 'Apr 2026' },
  { name: 'Sofia Reyes',   role: 'Product Designer',  dept: 'Design',      wallet: '0xC6E5…E6B4', salary: 560.5, start: 0, joined: 'Feb 2026' },
  { name: 'Elena Petrova', role: 'Brand Designer',    dept: 'Design',      wallet: '0xD7F6…F7C5', salary: 420,   start: 3, joined: 'May 2026' },
  { name: 'Rohan Gupta',   role: 'Operations Lead',   dept: 'Operations',  wallet: '0xE8A7…A8D6', salary: 320,   start: 0, joined: 'Feb 2026' },
  { name: 'Marcus Chen',   role: 'Community Manager', dept: 'Operations',  wallet: '0xF9B8…B9E7', salary: 200,   start: 4, joined: 'Jun 2026' }
]
```

- `start` = index into HISTORY of the employee's first payroll run (their payment history is `HISTORY.slice(emp.start)` reversed — newest first).
- Salaries are monthly cUSDd. Sum of all 8 = **4,500.5** (matches "4.5K" monthly payroll and Jul/Jun run totals).
- Initials for avatar pucks: `name.split(' ').map(w => w[0]).join('')` (e.g. "PS", "AM", "ML", "DO", "SR", "EP", "RG", "MC").
- Roster row sub (Team screen): `role + ' · ' + wallet`. Search-result sub: `role + ' · ' + dept`.
- Employees added via Add Employee get: `{ name, role: addRole.trim() || 'Employee', dept: addDept, wallet, salary: parseFloat(addSalary) || 0, start: HISTORY.length (=6, i.e. no seeded history), joined: 'Jul 2026' }` appended to `extra` (roster order: EMPLOYEES then extra).

## 4. HISTORY seed (6 runs, exact)

```js
HISTORY = [
  { month: 'Feb', date: 'Feb 28, 2026', paid: 6, total: 3750.5, masked: true,  tx: '0x8b99…5206' },
  { month: 'Mar', date: 'Mar 31, 2026', paid: 6, total: 3750.5, masked: true,  tx: '0x1c2d…88aa' },
  { month: 'Apr', date: 'Apr 30, 2026', paid: 7, total: 4400.5, masked: true,  tx: '0x9e0f…41bc' },
  { month: 'May', date: 'May 31, 2026', paid: 7, total: 4400.5, masked: true,  tx: '0x77ab…c3d9' },
  { month: 'Jun', date: 'Jun 30, 2026', paid: 8, total: 4500.5, masked: true,  tx: '0x42d0…720f' },
  { month: 'Jul', date: 'Jul 5, 2026',  paid: 8, total: 4500.5, masked: false, tx: '0xc396…e025' }
]
```

Used by:
- **Payout Activity** bar chart: one bar per HISTORY entry (months Feb–Jul, totals above). See §8 for bar math.
- **Payroll health** line chart x-labels (`HISTORY.map(h => h.month)`) and "Employees paid" dataset (`HISTORY.map(h => h.paid)` = `[6, 6, 7, 7, 8, 8]`).
- **Employee payment history**: `empRuns.concat(HISTORY.slice(emp.start).slice().reverse())` — new-session runs for this employee first, then seeded runs newest-first. Row fields: `date` = `h.date`, `tx` = `h.tx`, amount = the employee's own `salary` (same every row), per-row reveal keyed by `h.month` (or run id) in `state.empRows`.
- **Search "Payouts" section**: `HISTORY.slice().reverse()` filtered by `(month + ' ' + date + ' ' + tx)` contains query; row shows `date` and sub `paid + ' paid · ' + tx`, trailing "Verified" pill. Limit: 2 rows when query empty, 4 when typing. Click → `{ nav: 0, bar: h.month, searchOpen: false }`.
- Search "Employees" limit: 4 rows when query empty, 5 when typing; filter over `(name + ' ' + role + ' ' + dept + ' ' + wallet)`. Click → `{ nav: 3, empIndex: i, empReveal: false, empRows: {}, searchOpen: false }`.
- Empty state (both lists empty): "No matches. Try a name, team, or month."

### Notifications seed
See `notifs` in §2 (3 items, ids 1–3, all unread). Colors: ok `#3bbf8e`, warn `#e3b25f`, info `#9db3aa`. Rendered dot color = `n.color` when unread, `rgba(157,179,170,0.35)` when read; title color `#e8f0ec` unread / `#9db3aa` read. Badge text: `unread + ' new'` if unread > 0, else `'All read'`. New notifications prepend via `addNotif` with `id: _nid++` and `read: false`.

### Fixed value constants (as coded)
| Value | Where | Coded as |
|---|---|---|
| `'4.5K'` | Monthly payroll (Home card + Team hero) | `monthlyEl = RevealAmount({value:'4.5K', revealed:true, …})` — **always revealed in code** (the `toggleMonthly`/`revealMonthly`/`monthlyValue:'****'` plumbing exists but the rendered element ignores it). Flag: README says tap-to-reveal. |
| `'04'` | Payroll runway | `runwayEl = RevealAmount({value:'04', revealed:(showAll||revealRunway), accent:'#78e9c0'})`. Sub-line: `at 4.5K / run · {runwayHint}` where hint = `'tap to hide'`/`'tap to reveal'`. Hardcoded, not computed from balance. |
| `'22,350.50'` | Wallet balance | `balanceEl = RevealAmount({value:'22,350.50', revealed:(showAll||revealBalance), accent:'#78e9c0'})`. Eye icon toggles `revealBalance`. (22,350.50 ÷ 4,500.5 ≈ 4.97 → "04 runs left".) |
| `'25,303'` | `totalPaidValue` (revealTotal) | Computed hole exists (`(showAll||revealTotal) ? '25,303' : '****'`) but is not referenced by any markup — legacy. |
| `48` | Privacy scorecard "amounts encrypted" | Hardcoded literal `48` in markup (= 8 salaries × 6 runs). Public: "Transactions · recipients · timing" / Private: "Every amount". |
| `'Jul 5 Sun'` | Last run card value | Hardcoded in markup; sub "8 employees paid". |
| `'Jul 31'` | Next payout / Scheduled payroll | Hardcoded ("Next payout · Jul 31" / "in 26 days"). |
| `0x3F9e4A21D8f2…9bC83Fc3` | Wallet address strip (Recent activity panel) | Full-strip form. Short form `0x3F9e4A21…9bC83Fc3` used in profile popup chip and Fund-wallet "To" row. |
| `'Hi Santo!'` | `greeting` hole (unused in markup) | Fallback name "Santo" also appears in logged-out screen: "See you soon, Santo." |
| `'08'` | Donut center | Hardcoded, sub "Employees". |

`fmtAmount(v)` = `v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })` → e.g. `850`, `560.5`, `4,500.5`, `25,303`.

### Recent activity — seeded rows (Home/Team right sidebar)
Base rows are conditional on how many session runs exist (`runs.length`); each session run prepends a "Payroll run" row and pushes one base row off:

- `newActivity` = `runs.slice(0, 4)` → row: title "Payroll run", sub `r.date + ' · ' + r.paid + ' paid · ' + fmtAmount(r.total) + ' cUSDd'`, wraps in `<a href={r.url} target="_blank">`, pill "Verified".
- `showBase0` (`runs.length < 4`): "Payroll run" / "Jul 5 · 8 paid · 4,500.5 cUSDd" / pill **Verified**
- `showBase1` (`runs.length < 3`): "Employee added" / "Priya Sharma · Engineering" / pill **Active**
- `showBase2` (`runs.length < 2`): "Operator authorized" / "expires in 1 h" / pill **Pending** (amber: border `rgba(224,178,95,0.6)`, text `#e6c082`)
- `showBase3` (`runs.length < 1`): "Funds deposited" / "Jul 3 · 5,000 cUSDd" / pill **Verified**

---

## 5. Run Payroll simulation — timing cascade (exact ms)

### Step machine
`openPayroll()` resets: `{ payrollOpen:true, payStep:0, paySel:{}, payReveal:false, authState:'idle', dispState:'idle', deliveredN:0, resultReveal:false, popup:null }`.
Top progress bar fill: `((payStep + 1) / 4 * 100) + '%'` → 25/50/75/100%, `transition: width .45s cubic-bezier(.22,1,.36,1)`, gradient `linear-gradient(90deg,#3bbf8e,#78e9c0)` on 6px track `rgba(255,255,255,0.06)`.

`payContinue()`: step 0 → requires ≥1 selected, sets `payStep:1` + `runEncrypt()`; step 1 → `payStep:2`; step 2 → `runAuthorize()`; step 3 → `runDisperse()`.

Selection model: `paySel[i] !== false` means checked (default all checked). `payToggle(i)` flips (`false` ↔ `true`). `paySelectAll(all)`: if selecting all → `paySel = {}`; if deselecting → every index set `false`. The select-all label hole is `payAllChecked` = boolean `selectedList().length === allEmployees.length` — **as coded it renders "true"/"false"** (design intent: Select all / Deselect all — see Gaps).

### Step 1 — Encrypting (`runEncrypt`)
```js
runEncrypt(){ n = selectedList().length; setState({ encIdx: 0 }); k = 0;
  _encI = setInterval(() => { k++; setState({ encIdx: k });
    if (k > n) { clearInterval(_encI);
      _encT = setTimeout(() => setState({ payStep: 2 }), 900); } }, 720); }
```
- **720 ms** per card seal; card `k` (0-based) shows its real salary while `encIdx <= k`, then flips to masked (reverse reveal) — `RevealAmount({ value: fmtAmount(salary), revealed: (encIdx <= k), keepLock: true, sealGlow: true, reserve: false, accent: '#78e9c0' })`.
- After the last card seals (`k > n`), hold **900 ms**, then auto-advance to step 2.
- Spinner: 15px ring, border `2.2px solid rgba(120,233,192,0.25)`, top `#78e9c0`, `dcSpin .7s linear infinite`, label "Sealing amounts".

### Step 2 — Authorize (`runAuthorize`)
```js
runAuthorize(){ if (authState==='signing'||authState==='done') return;
  setState({ authState:'signing' });
  _authT = setTimeout(() => { setState({ authState:'done' });
    setTimeout(() => setState({ payStep: 3 }), 850); }, 1500); }
```
- idle → "Authorize" button (bg `#f5f8f6`, text `#14503b`); signing (**1500 ms**) → spinner + "Confirm in your wallet"; done → green chip "Authorized" (bg `rgba(59,191,142,0.16)`, border `rgba(95,230,175,0.4)`, text `#78e9c0`, check icon); **850 ms** later auto-advance to step 3.
- Icon: person-with-key (§10.14) inside a 66px circle with `rgba(95,230,175,0.14)` pulse halo, `dcPulse 2.2s ease-in-out infinite`.
- Copy: heading "Authorize SealedPay"; body "Allow SealedPay to disperse cUSDd on your behalf · one signature · expires in 24h."

### Step 3 — Disperse & verify (`runDisperse`)
```js
runDisperse(){ if (dispState !== 'idle') return; n = selectedList().length;
  setState({ dispState:'sending', deliveredN:0 });
  _dispT = setTimeout(() => { setState({ dispState:'confirmed' });
    _dispT2 = setTimeout(() => { setState({ dispState:'verifying' }); k = 0;
      _dispI = setInterval(() => { k++; setState({ deliveredN:k });
        if (k >= n) { clearInterval(_dispI); setState({ dispState:'done' }); onPayrollSuccess(); } }, 140);
    }, 750);
  }, 1400); }
```
- sending: **1400 ms** → confirmed: **750 ms** → verifying: one "Paid" row every **140 ms** → done.
- Headline crossfade (`dispHeadline`): `'Sending payroll'` (sending) → `'Confirmed on-chain'` (confirmed | verifying) → `'Payroll delivered'` (done). On every `dispState` change, `dispHeadRef` animates `[{opacity:0, translateY(6px)} → {opacity:1, translateY(0)}]` 340ms `cubic-bezier(.22,1,.36,1)`.
- Determinate fill `dispProgress`: idle `6%`, sending `34%`, confirmed `64%`, verifying `64 + round(34 * deliveredN/n)%`, done `100%`. Bar: 7px track `rgba(255,255,255,0.06)`; fill `linear-gradient(90deg,#2f9d74,#78e9c0)`, `transition: width .5s cubic-bezier(.22,1,.36,1)`, `dcBarPulse 1.6s` brightness pulse; sheen overlay `linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)`, `background-size:220% 100%`, `dcSheen 1.15s linear infinite`.
- Status lines: "Dispersing on Sepolia" (pending = pulsing 7.2px dot `#78e9c0`; done = check with `dcCheckPop .45s`); "Verifying delivery · {deliveredN}/{n}" (pending = empty 15px ring border `rgba(255,255,255,0.14)`; active = pulsing dot; done = check).
- Per-recipient rows appear only while `dispState==='verifying'`; each flips to `✓ Paid` (`#78e9c0`, `dcCheckPop .4s`) when `k < deliveredN`.
- Idle copy: heading `Pay all {n} in one transaction`, sub "One disperse call settles every salary at once.", primary "Confirm & pay", ghost link "Simulate failure (demo)" (color `#6f8577`, hover `#e07a6a`).
- Done (success finale): 56px seal-check icon (§10.19) with `dcCheckPop .55s` + radial glow `dcBloom 1.1s`; heading "Payroll delivered"; sub `verifiedLabel` = `n + '/' + n + ' verified'`; total pill (bg `rgba(0,0,0,0.2)`, radius 14px) with `resultTotalEl` RevealAmount toggled by `resultReveal`; link label `resultRevealLabel` = `'Hide total'` / `'Reveal total (employer only)'`; "View on Etherscan" → `payRunUrl` = `runs[0].url` or fallback `https://sepolia.etherscan.io`; primary button "Done" → `closePayroll()`.

### Success side-effects (`onPayrollSuccess`)
```js
sel = selectedList(); n = sel.length; total = sel.reduce((a,o) => a + o.e.salary, 0);
day = 8 + runs.length;   // Jul 8, Jul 9, …
run = {
  id: 'r' + Date.now(),
  date: 'Jul ' + day,
  dateFull: 'Jul ' + day + ', 2026',
  month: 'Jul',
  paid: n, total: total,
  tx: '0x' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') + '…e025',
  url: 'https://sepolia.etherscan.io/tx/0x' + Math.floor(Math.random()*0xffffffff).toString(16),
  selIdx: sel.map(o => o.i)
};
runs = [run, ...runs];
addNotif({ title:'Payroll delivered', sub: n + ' paid · verified · ' + run.date, color:'#3bbf8e', tone:'ok' });
showToast('ok', 'Payroll delivered · ' + n + ' paid · verified');
```
Downstream: new run grows a stacked cap on the Jul bar (see §8), prepends a Recent-activity row, and prepends a payment-history row for each employee in `selIdx` (`empRuns` map: `{ month: r.id, date: r.dateFull, tx: r.tx, url: r.url }`).

### Failure path (`simulateFailure`)
```js
clearTimeout(_dispT); clearInterval(_dispI);
setState({ dispState:'idle', deliveredN:0 });
addNotif({ title:'Payroll failed', sub:'no funds moved · retry', color:'#e07a6a', tone:'err' });
showToast('err', 'Payroll failed · no funds moved · retry');
closePayroll();
```
No state changes downstream (no run appended).

### Toast
`showToast(kind, msg)` sets `{ toast:{kind,msg,id:Date.now()} }` and auto-dismisses after **4200 ms**. Dismiss animation: `[{opacity:1, translateY(0) scale(1)} → {opacity:0, translateY(-14px) scale(0.96)}]` 200ms `cubic-bezier(.4,0,1,1)`. Entry: `dcToastIn .34s cubic-bezier(.2,1.06,.3,1)` from `translateY(-14px) scale(0.96)`.
Toast styling by kind: ok → bg `rgba(24,58,44,0.92)`, border `rgba(95,230,175,0.45)`, check icon `#3bbf8e`; err → bg `rgba(60,34,30,0.92)`, border `rgba(224,122,106,0.5)`, "!" badge bg `rgba(224,122,106,0.9)` text `#3a1a15`.

### Other timers
- Notification-permission prompt: shows **900 ms** after mount if `notifPerm === 'default'`. "Enable" → `{notifPerm:'granted', permPrompt:false}` + toast `'Notifications enabled'`; "Not now" → `{notifPerm:'denied', permPrompt:false}`. Copy: "Enable notifications?" / "Get alerts when payroll is delivered or needs attention."
- Chart self-heal: **450 ms** after mount re-inits donut/gas charts if Chart.js registered none.
- Chart.js not yet loaded: each `init*` retries via `setTimeout(…, 150)`.
- `closePayroll()` clears all six timers/intervals (`_encT, _encI, _authT, _dispI, _dispT, _dispT2`) then runs the 170ms close animation.
- Body scroll lock: `document.body.style.overflow = 'hidden'` while `addOpen || remindOpen || logoutOpen || searchOpen`.

---

## 6. RevealAmount — scramble/reveal parameters (exact)

Props: `value` (string), `revealed` (bool), `accent` (default `'#78e9c0'`), `keepLock` (bool, default false), `maskCount` (default **3**), `reserve` (default true), `hideMs` (default **300**), `sealGlow` (bool).

Masked render: `maskCount` asterisks, `letterSpacing: '0.08em'`, `fontWeight: 400`. Container: `fontVariantNumeric:'tabular-nums'`, `fontFeatureSettings:'"tnum"'`, `display:inline-flex`, `whiteSpace:nowrap`, `minWidth: reserve===false ? 0 : max(3, value.length) + 'ch'`.

**Reveal** (`doReveal`): only digit positions scramble; non-digits render immediately.
- Random-digit cycle: new random digit every **40 ms** (`randMs`).
- Left-to-right settle: one digit locks every **60 ms** (`stagger`), driven by rAF (`settledN = floor((now-start)/60)`).
- Per-digit landing pop: `scale 1 → 1.42 → 0.92 → 1`, **340 ms**, `cubic-bezier(.22,1,.36,1)` (WAAPI).
- Completion glow: container `drop-shadow(0 0 0 accent@0)` → `drop-shadow(0 0 7px accent@0.85)` → back, **640 ms** ease-out.
- `keepLock` unlock (runs alongside): `rotate(-16deg) translateX(0) opacity .85` → `rotate(8deg) translateX(12px) opacity 0`, duration `max(360, digitCount*60 + 240)` ms, `cubic-bezier(.3,0,.4,1)`, fill forwards.
- Reduced motion or no digits: instant set + glow only.

**Hide** (`doHide`): scramble random digits for `hideMs` (300 ms default) via rAF → blur-out `[blur(0), opacity 1] → [blur(5px), opacity 0]` **230 ms** `cubic-bezier(.4,0,1,1)` → swap to stars → blur-in `[blur(4px), opacity .3] → [blur(0), opacity 1]` **200 ms** ease-out. `keepLock` relock: reverse of unlock, **260 ms** ease-out. `sealGlow: true` fires the glow pulse after sealing (used on encrypting cards). Reduced motion: instant swap.

Lock glyph inside the component: `0.6em × 0.6em`, `viewBox 0 0 100 100`, `fill currentColor`, padlock path (identical to §10.10), `marginLeft:'0.12em'`, `marginRight:'0.34em'`, `transformOrigin:'50% 60%'`, resting transform `rotate(-16deg)`, opacity 0.85.

### Every RevealAmount instance (value / revealed / options)
| Location | value | revealed | options |
|---|---|---|---|
| Monthly payroll (Home + Team hero) `monthlyEl` | `'4.5K'` | `true` (always) | `accent:'#78e9c0', lock:false, reserve:false` |
| Payroll runway `runwayEl` | `'04'` | `showAll \|\| revealRunway` | `accent:'#78e9c0'` |
| Wallet balance `balanceEl` | `'22,350.50'` | `showAll \|\| revealBalance` | `accent:'#78e9c0'` |
| Employee salary hero `empSalaryEl` | `fmtAmount(emp.salary)` | `showAll \|\| empReveal` | `accent:'#bff0d6'` |
| Payment-history row `amountEl` | `fmtAmount(emp.salary)` | `showAll \|\| empRows[h.month]` | `accent:'#78e9c0', lock:false` |
| Roster row `amountEl` (computed, not rendered in markup) | `fmtAmount(e.salary)` | `showAll` | `accent:'#78e9c0', lock:false` |
| Search-emp row `amountEl` (computed, not rendered) | `fmtAmount(e.salary)` | `showAll` | same |
| Run Payroll checklist `salaryEl` | `fmtAmount(e.salary)` | `payReveal` | `accent:'#78e9c0', lock:false` |
| Run Payroll total `payTotalEl` | `fmtAmount(Σ selected salaries)` | `payReveal` | `reserve:false` |
| Encrypting card `er.el` | `fmtAmount(salary)` | `encIdx <= k` | `keepLock:true, sealGlow:true, reserve:false` |
| Success total `resultTotalEl` | `fmtAmount(Σ selected salaries)` | `resultReveal` | `reserve:false` |

`showAll = !state.maskDefault` (Settings "Mask amounts by default" off → everything revealed globally).

---

## 7. Misc logic notes

- **Nav highlight**: `navSel = nav === 3 ? 1 : nav` (Team puck stays lit inside Employee View). Selected puck bg `#f5f8f6`, icon stroke/fill `#568570`; unselected bg transparent, stroke `#9db3aa`.
- **Scroll fade**: `onContentScroll` sets `fadeRef.current.style.opacity = scrollTop > 6 ? '1' : '0'` (top-bar gradient backdrop, `transition: opacity .25s`).
- **Esc key**: closes search only (`animateSearchOut` then unmount).
- **Employee row click** (roster or search): `{ nav: 3, empIndex: i, empReveal: false, empRows: {} }` — reveals reset per visit.
- **Settings rows**: keys `['maskDefault','reminders','autoverify']`, labels `['Mask amounts by default','Payout reminders','Auto-verify after payout']`; toggle track 36×19.8px pill, bg `accent` on / `rgba(255,255,255,0.14)` off; knob 16.2px `#f5f8f6`, `left: 18px` on / `1.8px` off, `transition: left .2s`. Static rows below divider: Token → cUSDd; Network → Sepolia Testnet.
- **Payout reminder**: body copy set = "Reminder is on for Jul 29, two days before the Jul 31 run. You can remove it anytime." / unset = "Get a nudge on Jul 29, two days before the Jul 31 payroll run." Primary label: `'Remove reminder'` / `'Set reminder'`. Confirm toggles `reminderSet` and closes. When set, a 9px `#3bbf8e` dot (border `1.8px solid #f5f8f6`) sits on the bell button of the Next payout card.
- **Add Employee**: confirm requires `addName.trim() && addWallet.trim()`; button opacity 1 vs **0.45** when invalid (`addBtnOpacity`) — note: the click handler also guards, but the button is not pointer-disabled. Fund wallet same pattern (`fundBtnOpacity`, requires `fundAmount.trim()`); `fundConfirm` just closes and clears (amount not applied).
- **Modal open/close animations**: open = `.dcpop` keyframes (`translateY(-8px) scale(0.96)` → rest, 340ms `cubic-bezier(.2,1.06,.3,1)`); anchored popovers add `.dcpop-tl` (`transform-origin: 0 0`). Close = `closeAnim(label)`: overlay fades 150ms ease-in; card `[{opacity:1, translateY(0) scale(1)} → {opacity:0, translateY(-6px) scale(0.97)}]` 170ms `cubic-bezier(.4,0,1,1)`. Screen labels used: `'Notifications popup'`, `'Settings popup'`, `'Payout reminder modal'`, `'Run payroll modal'`, `'Add employee modal'`, `'Profile popup'`, `'Fund wallet modal'`, `'Logout modal'`, `'Notif permission'`, `'Logged out'`.
- **Content stagger** (`staggerModal`): runs on open of Add employee / Fund wallet / Run payroll modals and on every `payStep` change. Direct children (flattening `flex-direction:column`+`gap` wrappers) animate `[{opacity:0, translateY(8px)} → {opacity:1, translateY(0)}]`, 300ms each, delay `110 + i*42` ms, `cubic-bezier(.22,1,.36,1)`. Skipped under reduced motion.
- **Search animations**: in — overlay fade 200ms; bar `scale(1.02)` + `drop-shadow(0 0 6px rgba(120,233,192,0.35))` 220ms; popup `translateY(-8px) scale(0.98)` → rest, 380ms, delay 80ms, `cubic-bezier(.2,1.06,.3,1)`, `transform-origin: top center`; rows (`[data-srow]`) 260ms, delay `200 + i*35` ms; labels (`[data-slabel]`) 220ms delay 180ms. Out — bar 180ms ease-out reverse; overlay 180ms ease-in; popup collapse 190ms `cubic-bezier(.4,0,1,1)` (120ms opacity-only under reduced motion).
- **New-run bar growth**: when `runs.length` changes, the newest run's cap element (`[data-cap="<run.id>"]`) animates `[{scaleY(0), opacity .4} → {scaleY(1), opacity 1}]` 520ms `cubic-bezier(.22,1,.36,1)` (guarded `cap._grew`), `transform-origin: bottom`.
- **Puck tooltips**: `tipEncOpacity` / `tipVerOpacity` = 1/0, `transition: opacity .11s ease`; labels "Encrypted" and "Verified".

---

## 8. Payout Activity bar chart (custom HTML, not Chart.js)

Constants (in `renderVals`): `CH = 111.6` (chart height px), `capColor = '#b3ecd5'` (declared, **unused** — run caps reuse `barColor`/hatch).

- Hatch pattern per barColor option: `hatchMap = { '#8fd7c0': ['#87a69a','#28382f'], '#dff2ea': ['#9db0a7','#2e3b35'], '#6fc3e0': ['#84acbf','#1d3a47'], '#8b7cf6': ['#8388b5','#252a52'] }`; `hatch = repeating-linear-gradient(135deg, hp[0] 0 1.35px, hp[1] 1.35px 5.85px)`.
- Session runs are bucketed per month: `runSegs[month]` (runs reversed → oldest first). `monthTotal(h) = h.total + Σ runSegs[h.month].total`; `monthPaid(h) = h.paid + Σ paid`.
- Y scale: `maxVal = max(monthTotal)`; if `maxVal <= 5000` → `yStep=1000, niceMax=5000`; else `yStep = ceil(maxVal/5/1000)*1000, niceMax = yStep*5`. Labels top-to-bottom: `[5,4,3,2,1,0].map(i => fmtK(yStep*i))` where `fmtK(0)='0'`, round thousands → `'5k'…'1k'`, else one decimal + `'k'`. Default: `5k 4k 3k 2k 1k 0`.
- Bar segments (bottom-up, `flex-direction:column-reverse`, `gap:3px`, width 54px, radius `13.86px`): base `height = max(h.total/niceMax*CH, 3)px`; each run cap `height = max(r.total/niceMax*CH, 8)px`, `data-cap={r.id}`. Fill: active month → `barColor` solid; others → hatch.
- Active month (`state.bar`, default `'May'`; set on bar `onMouseEnter`, or via search payout result): shows glass tooltip `fmtAmount(monthTotal) + ' cUSDd · ' + monthPaid + ' paid'` (e.g. "4,400.5 cUSDd · 7 paid") and a halo ring above the bar: 24.3px circle, `border: 5.4px solid #f5f8f6`, `box-shadow: 0 0 9px 2.7px rgba(240,248,232,0.30), 0 0 23.4px 9px rgba(240,248,232,0.12), inset 0 0 8.1px 1.8px rgba(245,252,248,0.40)`. Tooltip pill: bg `rgba(57,70,67,0.82)`, `backdrop-filter: blur(9px)`, border `0.9px solid rgba(255,255,255,0.14)`, inset highlights, text `#cfd8d6` 10.8px, offset `translateX(-64%)` above the bar.

---

## 9. Chart.js configs (v4.4.1 via CDN, as written)

### 9.1 Team donut (`initDonut`, canvas `donutRef`, 144×144 wrapper)
```js
new Chart(el.getContext('2d'), {
  type: 'doughnut',
  data: {
    labels: ['Engineering', 'Design', 'Operations'],
    datasets: [{
      data: [4, 2, 2],
      backgroundColor: ['#8b7cf6', '#d7ee59', '#3bbf8e'],
      borderWidth: 0,
      borderRadius: 16,
      spacing: 5,
      hoverOffset: 4
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    rotation: 253,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(236,244,240,0.96)',
        titleColor: '#20302a',
        bodyColor: '#20302a',
        titleFont: { family: 'Manrope', weight: '700' },
        bodyFont: { family: 'Manrope', weight: '600' },
        displayColors: false,
        padding: 10,
        cornerRadius: 10,
        callbacks: { label: (c) => ' ' + [4, 2, 2][c.dataIndex] + ' people' }
      }
    }
  }
});
```
HTML legend beside it (not Chart.js): `[{label:'Engineering', amount:'4 people', color:'#8b7cf6'}, {label:'Design', amount:'2 people', color:'#d7ee59'}, {label:'Operations', amount:'2 people', color:'#3bbf8e'}]`. Center overlay: "08" (19.8px/700) over "Employees" (9.9px `#9db3aa`).

### 9.2 Payroll health dual-axis line (`initStats`, canvas `statsRef`, 252px-tall wrapper)
```js
new Chart(el.getContext('2d'), {
  type: 'line',
  data: {
    labels: this.HISTORY.map((h) => h.month),        // ['Feb','Mar','Apr','May','Jun','Jul']
    datasets: [
      { label: 'Employees paid', yAxisID: 'y',
        data: this.HISTORY.map((h) => h.paid),       // [6, 6, 7, 7, 8, 8]
        borderColor: '#3bbf8e', backgroundColor: 'rgba(59,191,142,0.10)',
        fill: true, tension: 0.45, borderWidth: 3,
        pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: '#3bbf8e' },
      { label: 'Gas (ETH)', yAxisID: 'y1',
        data: [0.0013, 0.0013, 0.0014, 0.0014, 0.0015, 0.0015],
        borderColor: '#8b7cf6', backgroundColor: 'rgba(139,124,246,0.08)',
        fill: true, tension: 0.45, borderWidth: 3,
        pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: '#8b7cf6' }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(236,244,240,0.96)',
        titleColor: '#20302a', bodyColor: '#20302a',
        titleFont: { family: 'Manrope', weight: '700' },
        bodyFont: { family: 'Manrope', weight: '600' },
        displayColors: false, padding: 10, cornerRadius: 10,
        callbacks: { label: (c) => c.dataset.yAxisID === 'y' ? ' ' + c.parsed.y + ' paid' : ' ' + c.parsed.y.toFixed(4) + ' ETH' }
      }
    },
    scales: {
      x:  { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8ba297', font: { family: 'Manrope', size: 11 } } },
      y:  { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 2, color: '#8ba297', font: { family: 'Manrope', size: 11 } } },
      y1: { position: 'right', min: 0, max: 0.002, grid: { drawOnChartArea: false }, ticks: { color: '#8ba297', font: { family: 'Manrope', size: 11 }, callback: (v) => v === 0 ? '0' : v.toFixed(4) } }
    }
  }
});
```
HTML legend above the chart: dot `#3bbf8e` "Employees paid"; dot `#8b7cf6` "Gas (ETH)".

### 9.3 Orphaned gas sparkline (`initGas`, `gasRef` — **no canvas in markup**, never renders)
```js
new Chart(el.getContext('2d'), {
  type: 'line',
  data: {
    labels: this.HISTORY.map((h) => h.month),
    datasets: [{
      data: [0.0013, 0.0026, 0.004, 0.0054, 0.0069, 0.0089],
      borderColor: (c) => {   // horizontal gradient #2f7d5e → #5fe3ab across chartArea
        const area = c.chart.chartArea;
        if (!area) return '#5fe3ab';
        const g = c.chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
        g.addColorStop(0, '#2f7d5e'); g.addColorStop(1, '#5fe3ab');
        return g;
      },
      borderWidth: 4, borderCapStyle: 'round', borderJoinStyle: 'round',
      cubicInterpolationMode: 'monotone', tension: 0.45, pointRadius: 0, fill: false
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false, layout: { padding: 4 }, events: [],
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } }
  }
});
```
Do not implement unless a cumulative-gas sparkline is added back; documented so the datasets aren't lost.

---

## 10. localStorage

**Read** (this file never writes):
- `sealedpay_avatar` — profile avatar src, fallback `'avatars/avatar-profile.svg'`. Synced imperatively into `topAvatarRef` + `modalAvatarRef` on mount and every update (`syncAvatars`).
- `sealedpay_name` — profile display name, `.trim()`, fallback `'Santo'`.

Both reads are wrapped in try/catch (storage may be unavailable). Keys are **written** by the onboarding file (`sealedpay_name`, `sealedpay_avatar`, `sealedpay_onboarded`).

---

## 11. ASSETS — every distinct inline SVG (verbatim)

Sizes below are as used at each site; the geometry (viewBox + paths) is identical across reuses of a glyph.

### 11.1 Seal logo (SealedPay mark)
Top bar 30.6×30.6; signed-out screen 50.4×50.4 (same markup, only width/height differ).
```html
<svg width="30.6" height="30.6" viewBox="0 0 512 512" fill="none"><path fill="#c9bfa8" d="M38.992 42.84a7.723 7.723 0 0 1-7.265-5.107 7.722 7.722 0 0 1 4.647-9.883L68.03 16.444a7.723 7.723 0 0 1 5.236 14.53L41.609 42.381a7.692 7.692 0 0 1-2.617.459zM62.581 76.511a7.721 7.721 0 0 1-6.503-11.876l19.135-29.994a7.722 7.722 0 1 1 13.02 8.307L69.098 72.942a7.715 7.715 0 0 1-6.517 3.569z"></path><path fill="#e3dcc9" d="M121.948 276.016s27.637 72.5.756 91.11c-13.597 9.414-43.483 24.888-54.647 35.966-7.168 7.113-2.134 19.34 7.964 19.365l53.628.132c18.325.045 36.415-4.212 52.738-12.542 26.58-13.563 62.419-39.576 76.033-85.008z"></path><path fill="#e3dcc9" d="M480.697 354.34c.625-21.492-6.902-42.495-21.194-58.56-54.344-63.219-185.243-40.515-231.495-114.791-40.411-50.987-1.287-107.243-32.058-149.643C180.634 13.92 170.808.396 108.174.396 99.716 1.899 66.59-4.1 61.796 6.212a13.06 13.06 0 0 0 .339 14.974c63.066 76.152 10.821 60.009 7.713 144.573-5.159 56.561-.686 87.609 21.009 140.13 42.59 114.409 164.866 85.865 261.538 87.593 8.02.143 11.06 10.736 4.251 14.976l-.166.103c-27.992 18.259-62.495 19.128-94.316 12.415-19.662-.15-6.349 31.567 4.419 41.622 2.7 2.58 3.492 6.569 1.93 9.96-6.352 12.954-7.239 47.959 11.899 37.53 22.129-18.871 48.269-43.172 78.175-47.431 61.074-4.576 115.323-16.059 121.561-89.683l.012-.005c.255-4.833.34-13.681.537-18.629z"></path><path fill="#c9bfa8" d="M459.503 295.78c-54.344-63.219-185.243-40.515-231.495-114.791-40.411-50.987-1.287-107.243-32.058-149.643C181.073 14.42 171.371 1.176 113.429.43c21.457 5.639 29.112 15.806 39.094 27.713 30.771 44.45-8.353 115.782 32.058 169.235 46.252 77.867 177.151 54.065 231.495 120.341 14.292 16.841 21.819 38.86 21.194 61.391-.197 5.187-.282 14.463-.538 19.529l-.012.005c-1.91 23.627-8.324 41.141-18.051 54.22 33.193-10.542 57.432-32.149 61.478-79.893l.012-.005c.256-4.832.341-13.68.538-18.628.625-21.49-6.902-42.494-21.194-58.558z"></path><path fill="#c9bfa8" d="M124.11 46.385a7.722 7.722 0 0 1-7.722-7.722v-6.067c0-4.265 3.457-7.722 7.722-7.722s7.722 3.457 7.722 7.722v6.067a7.722 7.722 0 0 1-7.722 7.722z"></path></svg>
```

### 11.2 Search (magnifier) — top-bar search field
```html
<svg width="14.4" height="14.4" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#9db3aa" stroke-width="1.5"></circle><line x1="11" y1="11" x2="15" y2="15" stroke="#9db3aa" stroke-width="1.5" stroke-linecap="round"></line></svg>
```

### 11.3 Send / payout arrow — search "Payouts" result puck
```html
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cfe5d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4z"></path></svg>
```

### 11.4 Nav — Home (rail puck 0; fill is dynamic: `#568570` selected / `#9db3aa` unselected)
```html
<svg width="15.3" height="15.3" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 0 5.4px rgba(240,250,245,0.18))"><path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732z" fill="{{ nav0Stroke }}"></path></svg>
```

### 11.5 Nav — Team / users (rail puck 1; `stroke="{{ nav1Stroke }}"`)
```html
<svg width="15.3" height="15.3" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 0 5.4px rgba(240,250,245,0.18))" stroke="{{ nav1Stroke }}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
```

### 11.6 Nav — Insights / bar chart (rail puck 2; `stroke="{{ nav2Stroke }}"`)
```html
<svg width="15.3" height="15.3" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 0 5.4px rgba(240,250,245,0.18))" stroke="{{ nav2Stroke }}" stroke-width="2" stroke-linecap="round"><line x1="6" y1="20" x2="6" y2="12"></line><line x1="12" y1="20" x2="12" y2="6"></line><line x1="18" y1="20" x2="18" y2="10"></line></svg>
```

### 11.7 Bell
Rail (15.3, stroke `#9db3aa`, with drop-shadow filter); Payout-reminder modal icon (18, stroke `#e8f0ec`); Next-payout remind button (15.3, stroke `#14503b`, stroke-width 2.5); permission prompt (17, stroke `#78e9c0`). Geometry:
```html
<svg width="15.3" height="15.3" viewBox="0 0 24 24" fill="none" stroke="#9db3aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg>
```

### 11.8 Gear / settings (rail)
```html
<svg width="15.3" height="15.3" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 0 5.4px rgba(240,250,245,0.18))" stroke="#9db3aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
```

### 11.9 Logout (door-arrow, ornate)
Rail bottom (15.3, `fill="#9db3aa"`, drop-shadow filter); Logout modal icon (18, `fill="#e8f0ec"`, no filter). Geometry:
```html
<svg width="15.3" height="15.3" viewBox="0 0 512 512" fill="#9db3aa" style="filter:drop-shadow(0 0 5.4px rgba(240,250,245,0.18))"><path d="M511.9 228.01s-.01-.08-.02-.12c-.06-.59-.15-1.18-.27-1.76 0-.04-.02-.08-.03-.13-.73-3.49-2.44-6.82-5.15-9.53l-68.06-68.06c-3.71-3.71-8.57-5.57-13.44-5.57s-9.72 1.85-13.43 5.56c-7.42 7.42-7.42 19.45 0 26.87l35.66 35.66H316.09c-10.49 0-19 8.51-19 19s8.51 19 19 19h130.99l-35.64 35.64c-7.42 7.42-7.42 19.45 0 26.87 3.71 3.71 8.57 5.57 13.43 5.57s9.72-1.85 13.43-5.57l67.68-67.68c2.42-2.28 4.24-5.17 5.21-8.45v-.02c.17-.57.31-1.15.43-1.74.02-.08.02-.17.04-.25.09-.51.17-1.02.22-1.54.04-.39.04-.77.06-1.16 0-.22.03-.43.03-.66v-.04c0-.63-.03-1.26-.1-1.89z"></path><path d="M274.74 53.09c22.78 5.09 46.04 26.19 55.35 50.22 2.92 7.53 10.1 12.14 17.72 12.14 2.28 0 4.61-.42 6.86-1.29 9.78-3.79 14.64-14.8 10.85-24.58-14.02-36.18-47.25-65.77-82.68-73.61l-.24-.05c-29.27-6.08-59.57-9.07-92.62-9.13-33.07.06-63.37 3.04-92.69 9.13l-.25.05c-18.62 4.12-36.44 14.21-51.2 27.88-3.82 2.81-7.25 6.44-10.32 10.72-.5.59-.98 1.2-1.43 1.82C21.84 71.23 12.94 88.74 9.41 106.9 4.81 130.02-.4 189.94.02 229.93c-.23 21.46 1.17 48.66 3.22 72.83 1.1 15.5 2.35 28.98 3.56 37.66 5.91 43.73 32.8 92.23 62.56 112.84l.17.12c20.9 14.08 42.5 25.43 66.1 34.71 23.54 9.14 45.15 14.68 66.05 16.94l.17.02c1.32.12 2.65.18 3.96.18 26.52 0 50.05-23.74 57.41-57.72v-.01c6.51-1.04 12.96-2.21 19.36-3.54l.24-.05c35.43-7.84 68.66-37.43 82.68-73.61 3.79-9.78-1.07-20.79-10.85-24.58-2.26-.88-4.58-1.29-6.86-1.29-7.62 0-14.8 4.61-17.72 12.14-9.31 24.02-32.57 45.12-55.35 50.22-2.3.48-4.61.92-6.91 1.36 1.98-25.72 3.48-58.61 3.29-83.98.3-38.76-3.41-98.45-6.7-122.2-5.91-43.73-32.8-92.23-62.56-112.84l-.17-.12c-20.88-14.07-42.49-25.42-66.1-34.71-4.15-1.61-8.24-3.11-12.28-4.5h-.03c21.17-3.35 42.78-4.96 66.7-5 30.33.05 58.08 2.77 84.76 8.31zm-94.43 67.33c9.52 6.63 19.92 19.33 28.54 34.88 9.31 16.79 15.67 35.17 17.91 51.75 0 .04.01.08.02.12 3.09 22.32 6.62 80.55 6.34 116.69v.59c.17 22.14-1.05 53.1-3.18 80.79l-.06.86c-.46 8.39-1.88 24.82-3.74 33.13-.02.08-.03.15-.05.23-3.93 18.12-14.3 27.77-20.28 27.77-.14 0-.28 0-.42-.01-17.42-1.92-35.72-6.67-55.93-14.51-20.91-8.23-40.08-18.29-58.6-30.76-9.51-6.64-19.89-19.33-28.5-34.85-9.31-16.79-15.67-35.17-17.91-51.75 0-.04-.01-.08-.02-.12-1.05-7.55-2.25-20.36-3.29-35.14-.01-.18-.03-.35-.04-.53-2.16-25.41-3.28-50.64-3.09-69.22v-.8c-.41-39.54 4.89-96.26 8.66-115.2.01-.06.02-.12.03-.17 2.3-11.8 8.6-24.19 17.75-34.87.41-.47.8-.96 1.19-1.45.85-.1 2.1-.19 3.83-.19 14.55 0 34.85 5.83 41.48 8.08 3.6 1.24 7.23 2.57 10.8 3.96 20.91 8.23 40.06 18.28 58.55 30.73z"></path></svg>
```

### 11.10 Chevron-right ("View All" links: Payout Activity, Team, Recent activity)
```html
<svg width="10.8" height="10.8" viewBox="0 0 24 24" fill="none" stroke="#9db3aa" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
```

### 11.11 Lock / padlock
Monthly-payroll Encrypted puck (10.59×10.59, `fill="currentColor"` inside `#78e9c0` container); Employer-only pill (9.9); Salary hero Reveal button (11.7, `fill="#14503b"`); RevealAmount drifting lock (0.6em, currentColor). Geometry:
```html
<svg width="10.59" height="10.59" viewBox="0 0 100 100" fill="currentColor"><path d="M75.745 37.602v-9.31c0-14.186-11.59-25.792-25.793-25.792S24.144 14.106 24.144 28.292v9.31c-6.998.602-12.397 6.397-12.397 13.601v32.601A13.65 13.65 0 0 0 25.442 97.5h49.116a13.65 13.65 0 0 0 13.695-13.696v-32.6c0-7.205-5.51-13-12.508-13.602zM54.861 72.12v4.374c0 1.3-1.054 2.355-2.355 2.355h-5.012a2.355 2.355 0 0 1-2.355-2.355V72.12a8.821 8.821 0 0 1-4.021-7.426c0-4.892 3.974-8.882 8.882-8.882s8.882 3.99 8.882 8.882c0 3.12-1.599 5.859-4.021 7.426zm7.79-34.722H37.254v-9.105c0-6.998 5.7-12.698 12.698-12.698 6.999 0 12.699 5.7 12.699 12.698v9.105z"></path></svg>
```

### 11.12 Verified check-circle (the workhorse glyph)
Used at: Last-run Verified puck (11.56, currentColor); search payout pill / history pill / activity pills (9.9); Authorized chip (15); disperse status spring checks (15, `fill="#78e9c0"`, `animation:dcCheckPop .45s cubic-bezier(.22,1,.36,1) both`); per-recipient Paid (13, currentColor, `dcCheckPop .4s`); success toast (20, `fill="#3bbf8e"`). Geometry:
```html
<svg width="11.56" height="11.56" viewBox="0 0 32 32" fill="currentColor"><path d="M16 1C7.72 1 1 7.72 1 16s6.72 15 15 15 15-6.72 15-15S24.28 1 16 1zm7.5 12.32-7 8c-.39.45-.94.68-1.5.68-.44 0-.88-.14-1.25-.44l-5-4a2.001 2.001 0 0 1-.079-3.055c.742-.666 1.889-.617 2.667.005l3.044 2.436a.493.493 0 0 0 .678-.06l5.44-6.206c.72-.83 1.99-.91 2.82-.18.83.72.91 1.99.18 2.82z"></path></svg>
```

### 11.13 Play triangle — "Run payroll" primary button
```html
<svg width="14.4" height="14.4" viewBox="0 0 24 24" fill="none" stroke="#0b1512" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 3 19 12 5 21 5 3"></polyline></svg>
```

### 11.14 Chevron-left — Employee View "Back" button
```html
<svg width="12.6" height="12.6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
```

### 11.15 Receipt-with-check (document + check-circle) — payment-history row pucks and "Payroll run" activity rows
```html
<svg width="17" height="17" viewBox="1 1 22 22" fill="#cfe5d8"><path d="M17 22.75A5.75 5.75 0 1 1 22.75 17 5.757 5.757 0 0 1 17 22.75zm0-10A4.25 4.25 0 1 0 21.25 17 4.255 4.255 0 0 0 17 12.75z"></path><path d="M16 22.75H4A2.752 2.752 0 0 1 1.25 20V4A2.752 2.752 0 0 1 4 1.25h12A2.752 2.752 0 0 1 18.75 4v8.1a.75.75 0 1 1-1.5 0V4A1.252 1.252 0 0 0 16 2.75H4A1.252 1.252 0 0 0 2.75 4v16A1.252 1.252 0 0 0 4 21.25h12a.948.948 0 0 0 .229-.021.764.764 0 0 1 .926.731.746.746 0 0 1-.643.743 2.521 2.521 0 0 1-.512.047z"></path><path d="M13 7.75H6a.75.75 0 0 1 0-1.5h7a.75.75 0 0 1 0 1.5zM11 11.75H6a.75.75 0 0 1 0-1.5h5a.75.75 0 0 1 0 1.5zM16.5 18.75a.744.744 0 0 1-.53-.22l-1-1a.75.75 0 1 1 1.06-1.06l.47.469 1.47-1.469a.75.75 0 1 1 1.06 1.06l-2 2a.744.744 0 0 1-.53.22z"></path></svg>
```

### 11.16 Eye — wallet balance reveal toggle
```html
<svg width="12.6" height="12.6" viewBox="0 0 24 24" fill="none" stroke="rgba(240,250,245,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>
```

### 11.17 Plus — Fund button (white circle on balance card)
```html
<svg width="16.2" height="16.2" viewBox="0 0 24 24" fill="none" stroke="#14503b" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
```

### 11.18 Person-plus — "Employee added" activity row
```html
<svg width="16.2" height="16.2" viewBox="0 0 24 24" fill="none" stroke="#cfe5d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
```

### 11.19 Key — "Operator authorized" activity row
```html
<svg width="16.2" height="16.2" viewBox="0 0 24 24" fill="none" stroke="#cfe5d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
```

### 11.20 Deposit-box (box with down-arrow) — "Funds deposited" activity row
```html
<svg width="17" height="17" viewBox="0 0 32 32" fill="#cfe5d8"><path fill-rule="evenodd" d="M25 19h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3h2V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3zM7 21H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-2v2h1a1 1 0 0 1 0 2H6a1 1 0 1 1 0-2h1zm16 2V5a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1v18zm-7.555-2.167-3-2.001a1 1 0 0 1 1.11-1.664l1.445.963V13a1 1 0 0 1 2 0v5.131l1.445-.963a1.001 1.001 0 0 1 1.11 1.663l-3 2.001c-.164.108-.356.168-.555.168s-.391-.06-.555-.168z"></path></svg>
```

### 11.21 Person-with-key — Run Payroll step 2 (Authorize) hero icon
```html
<svg width="30" height="30" viewBox="1 1 22 22" fill="#78e9c0" fill-rule="evenodd"><circle cx="11.5" cy="6.744" r="5.5"></circle><path d="M11.25 21.756v-2.055c0-.465.184-.91.513-1.238l1.99-1.99a4.991 4.991 0 0 1 .908-3.106 18.9 18.9 0 0 0-3.161-.261c-3.322 0-6.263.831-8.089 2.076-1.393.95-2.161 2.157-2.161 3.424v1.45a1.697 1.697 0 0 0 1.7 1.7z"></path><path d="M18.152 20.208a4.003 4.003 0 1 0-2.233-6.786 3.997 3.997 0 0 0-1.127 3.427L12.47 19.17a.75.75 0 0 0-.22.531V22c0 .414.336.75.75.75h2.299a.75.75 0 0 0 .531-.22zm-.17-3.19a1.085 1.085 0 1 1 1.535-1.533 1.085 1.085 0 0 1-1.535 1.533z"></path></svg>
```

### 11.22 Checkbox check — Run Payroll checklist rows (opacity animated 0↔1)
```html
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b1512" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:{{ pe.checkOpacity }};transition:opacity .18s"><polyline points="20 6 9 17 4 12"></polyline></svg>
```

### 11.23 Seal-document + check-circle — success finale (56×56)
```html
<svg width="56" height="56" viewBox="0 0 64 64" fill="#3bbf8e" style="animation:dcCheckPop .55s cubic-bezier(.22,1,.36,1) both"><path d="M43 25.25c-9.787 0-17.75 7.962-17.75 17.75S33.213 60.75 43 60.75 60.75 52.788 60.75 43 52.787 25.25 43 25.25zm9.723 12.623L42.116 48.48c-.34.341-.789.512-1.237.512s-.896-.17-1.237-.512l-6.365-6.364a.75.75 0 1 1 1.06-1.06l6.365 6.363a.25.25 0 0 0 .354 0l10.606-10.606a.75.75 0 1 1 1.06 1.06zm.148-33.647a1.735 1.735 0 0 0-1.755.006l-3.119 1.825a.25.25 0 0 1-.253 0l-4.12-2.41a1.749 1.749 0 0 0-1.767 0l-4.12 2.41a.256.256 0 0 1-.253 0L33.375 3.65a1.75 1.75 0 0 0-1.77 0l-4.109 2.408a.252.252 0 0 1-.253 0l-4.11-2.409a1.753 1.753 0 0 0-1.767 0l-4.119 2.41a.255.255 0 0 1-.253 0l-3.11-1.823a1.734 1.734 0 0 0-1.754-.009c-.55.316-.88.884-.88 1.52V57.5c0 1.26-.501 2.399-1.304 3.25h25.61a19.352 19.352 0 0 1-10.574-11H18.5a.75.75 0 0 1 0-1.5h5.99a19.165 19.165 0 0 1-.74-5.25c0-.084.012-.166.013-.25H18.5a.75.75 0 0 1 0-1.5h5.339c.175-1.93.636-3.776 1.34-5.5h-6.68a.75.75 0 0 1 0-1.5h7.376a19.335 19.335 0 0 1 4.229-5.5H18.5a.75.75 0 0 1 0-1.5h13.467A19.126 19.126 0 0 1 43 23.75a19.14 19.14 0 0 1 10.75 3.289V5.743a1.73 1.73 0 0 0-.879-1.517zM46.5 21.75h-28a.75.75 0 0 1 0-1.5h28a.75.75 0 0 1 0 1.5zm0-7h-28a.75.75 0 0 1 0-1.5h28a.75.75 0 0 1 0 1.5zM9.75 57.5a3.25 3.25 0 0 1-6.5 0V43.25h6.5z"></path></svg>
```

### Non-SVG assets
- `avatars/avatar-profile.svg` — top-bar avatar (39.6×39.6, `border:1.8px solid rgba(255,255,255,0.15)`, fallback bg `linear-gradient(135deg,#34d399,#0e9f6e)`) and profile modal (250×250); overridden by `localStorage.sealedpay_avatar`.
- Font: Manrope via Google Fonts `@400;500;600;700;800`.
- Chart.js: `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`.

---

## 12. Global keyframes defined in the file (for reference)

```css
@keyframes dcOvKf{from{opacity:0}to{opacity:1}}
@keyframes dcPopKf{from{opacity:0;transform:translateY(-8px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.dcov{animation:dcOvKf .2s ease-out both}
.dcpop{animation:dcPopKf .34s cubic-bezier(.2,1.06,.3,1) both}
.dcpop-tl{transform-origin:0 0}
@keyframes dcSpin{to{transform:rotate(360deg)}}
@keyframes dcShim{0%{background-position:120% 0}100%{background-position:-120% 0}}   /* unused */
@keyframes dcPulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:0.85;transform:scale(1.08)}}
@keyframes dcFlow{0%{transform:translateX(-130%)}100%{transform:translateX(340%)}}   /* unused */
@keyframes dcSealOut{0%{opacity:1;filter:blur(0)}100%{opacity:0;filter:blur(3px);transform:scale(0.9)}}  /* unused */
@keyframes dcSealIn{0%{opacity:0;transform:scale(0.5)}60%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}  /* unused */
@keyframes dcSheen{0%{background-position:130% 0}100%{background-position:-130% 0}}
@keyframes dcBloom{0%{opacity:0;transform:scale(0.55)}55%{opacity:1}100%{opacity:0.6;transform:scale(1)}}
@keyframes dcCheckPop{0%{transform:scale(0);opacity:0}62%{transform:scale(1.18);opacity:1}100%{transform:scale(1)}}
@keyframes dcBarPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.16)}}
@keyframes dcToastIn{from{opacity:0;transform:translateX(-50%) translateY(-14px) scale(0.96)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.dctoast{animation:dcToastIn .34s cubic-bezier(.2,1.06,.3,1) both}
@media (prefers-reduced-motion: reduce){ .dcov,.dcpop{animation:dcOvKf .14s ease-out both} .dctoast{animation:dcToastIn .12s ease-out both} }
/* Scrollbars hidden globally: scrollbar-width:none; ::-webkit-scrollbar{display:none} */
/* input::placeholder{color:#566a61} */
```
