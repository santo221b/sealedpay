# SealedPay Dashboard — Modals & Panels Spec

Extracted verbatim from `docs/design/handoff/DisperseKit Payroll.dc.html` (markup + `class Component` logic).
Scope: Run Payroll modal (all 4 steps), Fund Wallet, Add Employee, Notifications panel, Settings panel, Search palette, Logout modal, Profile popup, Payout reminder, Signed-out screen, Toast, notification-permission prompt, plus the shared modal shell.

Font family everywhere: `'Manrope', sans-serif`. Global input placeholder color: `#566a61`. All scrollbars hidden (`scrollbar-width:none`, `::-webkit-scrollbar{display:none}`).

---

## 0. Shared modal shell

### Scrim (overlay)
- `position:fixed; inset:0; background:#0D1411F2` (≈95% opaque dark green-black).
- z-index by layer: popover scrim (bell/gear) `z-index:3`; centered modals (remind/add/profile/fund/logout) `z-index:70`; Run Payroll `z-index:72`; signed-out screen `z-index:80`; permission prompt `z-index:80` (no scrim); toast `z-index:90`.
- Centered-modal scrims add `display:flex; align-items:center; justify-content:center` (Run Payroll adds `padding:24px`).
- Clicking the scrim closes (each panel's root calls `stopPropagation` so clicks inside don't close).

### Open animations (CSS classes)
- `.dcov` (overlay fade-in): `opacity 0→1`, `.2s ease-out both`.
- `.dcpop` (panel): `opacity:0; translateY(-8px) scale(0.96)` → rest, `.34s cubic-bezier(.2,1.06,.3,1) both`.
- `.dcpop-tl` adds `transform-origin:0 0` (used by the bell/gear popovers so they unfold from their top-left anchor corner).
- Toast: `.dctoast` = `opacity:0; translateX(-50%) translateY(-14px) scale(0.96)` → rest, `.34s cubic-bezier(.2,1.06,.3,1) both`.
- `prefers-reduced-motion: reduce`: `.dcov`/`.dcpop` become a plain `140ms` fade; `.dctoast` a `120ms` fade.

### Close animation (`closeAnim(label)`, JS Web Animations)
- Overlay (`.dcov`): `opacity 1→0`, 150ms ease-in, forwards.
- Panel (found by `data-screen-label`): `opacity 1→0; translateY(0)→translateY(-6px); scale(1)→scale(0.97)`, **170ms `cubic-bezier(.4,0,1,1)`**, then state unmounts.
- Reduced motion: plain opacity fade, same 170ms.
- Used by: Notifications popup, Settings popup, Logout modal, Profile popup, Fund wallet modal, Add employee modal, Payout reminder modal, Run payroll modal.

### Content stagger (`staggerModal(label)`)
- Runs on open of **Add employee modal**, **Fund wallet modal**, and **Run payroll modal** (and again on every Run Payroll step change).
- Direct children of the panel's inner wrapper (children of `flex-direction:column`+`gap` containers are flattened one level) animate `opacity:0; translateY(8px)` → rest, 300ms each, delay `110 + i*42`ms, easing `cubic-bezier(.22,1,.36,1)`.
- Skipped entirely under reduced motion.

### Scroll lock
`document.body.style.overflow = 'hidden'` while any of `addOpen || remindOpen || logoutOpen || searchOpen` is true (note: not applied for payroll/fund/profile in the prototype).

### Esc key
Escape closes only the **search palette** in the prototype. (Recommend extending to all modals in the real app.)

### Per-panel anchoring & container summary

| Panel | data-screen-label | Anchor | Width | Radius | Border | Background | Padding | Extra |
|---|---|---|---|---|---|---|---|---|
| Notifications popup | `Notifications popup` | absolute `left:50.4px; top:-7.2px` off the bell puck | 270px | 27px | `1px solid rgba(255,255,255,0.11)` | `rgba(52,92,72,0.21)` | 20px | `.dcpop .dcpop-tl`, `overflow:hidden`, `z-index:10`, `text-align:left`, `cursor:auto` |
| Settings popup | `Settings popup` | absolute `left:50.4px; top:-7.2px` off the gear puck | 252px | 27px | same | `rgba(52,92,72,0.21)` | 20px | same |
| Search popup | (refs) | absolute `top:calc(100% + 13px); left:0` under search bar | 468px | 28px | `0.9px solid rgba(255,255,255,0.11)` | `#121D1ABF` + `backdrop-filter:blur(6px)` | 14px | overlay is `position:fixed; inset:0; z-index:-1` inside a `z-index:60` wrapper |
| Payout reminder | `Payout reminder modal` | centered | 342px | 23.4px | `1px solid rgba(255,255,255,0.11)` | `#0D1411F2` | 25.2px | |
| Run payroll | `Run payroll modal` | centered | 468px (`max-width:100%`) | 27px | `0.9px solid rgba(255,255,255,0.11)` | `#121D1AE6` + `backdrop-filter:blur(3px)` | `26px 24px 22px 24px` | `box-shadow:0 30px 80px -30px rgba(0,0,0,0.6)`, `overflow:hidden` |
| Add employee | `Add employee modal` | centered | 387px | 23.4px | `0.9px solid rgba(255,255,255,0.11)` | `#121D1AE6` + `backdrop-filter:blur(3px)` | 25.2px | overlay div has **no** `.dcov` class (no fade-in) |
| Profile popup | `Profile popup` | centered | 342px | 35px | `1px solid rgba(255,255,255,0.11)` | `#0D1411E6` | 35px | `text-align:center` |
| Fund wallet | `Fund wallet modal` | centered | 387px | 27px | `1px solid rgba(255,255,255,0.11)` | `#121D1AE6` | 27px | |
| Logout | `Logout modal` | centered | 342px | 23.4px | `1px solid rgba(255,255,255,0.11)` | `#121D1AE6` | 25.2px | |
| Perm prompt | `Notif permission` | `position:fixed; top:74px; right:28px` | 308px | 20px | `0.9px solid rgba(255,255,255,0.11)` | `rgba(52,92,72,0.28)` + `backdrop-filter:blur(15px)` | 18px | `box-shadow:0 24px 60px -24px rgba(0,0,0,0.6)`, no scrim |
| Toast | `data-toast` | `position:fixed; top:22px; left:50%; translateX(-50%)` | auto | 899.1px (pill) | `0.9px solid {toastBorder}` | `{toastBg}` + `backdrop-filter:blur(14px)` | `11px 20px` | `box-shadow:0 18px 44px -16px rgba(0,0,0,0.55)` |
| Signed-out | `Logged out` | full-screen `fixed inset:0` | — | — | — | see §11 | — | |

Shared "accent" = prop `accentColor`, default `#3bbf8e` (options `#3bbf8e`, `#5fe3ab`, `#2f7d5e`). Referenced below as **accent**.

### Shared button recipes
- **Ghost/Cancel button**: `flex:1; text-align:center; background:rgba(255,255,255,0.06); border:0.9px solid rgba(255,255,255,0.09); color:#e8f0ec; font-size:12.6px; border-radius:899.1px; padding:10.8px 0; cursor:pointer; transition:background .2s`; hover `background:rgba(95,230,175,0.1)`. Font-weight varies per modal (noted inline).
- **White primary**: `background:#f5f8f6; color:#14503b`, pill, `padding:10.8px 0` (or `12.6px 0` in Run Payroll), hover `transform:scale(1.03)` (1.02 in Run Payroll), active `scale(0.97–0.98)`.
- **Accent primary**: `background:{accent}; color:#0b1512`, weight 600, pill.

### RevealAmount component (used inside Run Payroll)
- Masked state: 3 asterisks `***`, `letter-spacing:0.08em`, `font-weight:400`. Container: `font-variant-numeric:tabular-nums; font-feature-settings:"tnum"; inline-flex; white-space:nowrap; min-width:max(3, value.length)ch` (min-width 0 when `reserve:false`).
- Reveal: each digit cycles random digits (~40ms/frame), resolves left→right with 60ms stagger; each landing digit scale-pops `1 → 1.42 → 0.92 → 1` over 340ms `cubic-bezier(.22,1,.36,1)`; on completion one accent glow pulse `drop-shadow(0 0 7px rgba(accent,0.85))` over 640ms ease-out.
- Hide: digits scramble ~300ms, then whole value `blur(0)→blur(5px)` + `opacity 1→0` over 230ms `cubic-bezier(.4,0,1,1)`, swap to stars, then `blur(4px)/0.3 → blur(0)/1` 200ms ease-out. If `sealGlow:true`, glow pulse fires after hide (the "seal" flash in the Encrypting step).
- `keepLock:true` variant: a lock glyph (`0.6em`, currentColor, `margin-left:0.12em; margin-right:0.34em`, `opacity:0.85`, `rotate(-16deg)`, origin `50% 60%`) sits after the value; on reveal it animates to `rotate(8deg) translateX(12px) opacity:0` over `max(360, digits*60+240)`ms `cubic-bezier(.3,0,.4,1)`; on hide it eases back in 260ms.
- Reduced motion: instant swap + glow only.

---

## 1. RUN PAYROLL modal

### Shell
- Scrim: `fixed inset:0; z-index:72; background:#0D1411F2; flex center; padding:24px`, class `.dcov`. Click = `closePayroll()` (clears all timers, plays close anim, unmounts).
- Panel: `data-screen-label="Run payroll modal"`, class `.dcpop`; `width:468px; max-width:100%; border-radius:27px; border:0.9px solid rgba(255,255,255,0.11); background:#121D1AE6; backdrop-filter:blur(3px); box-shadow:0 30px 80px -30px rgba(0,0,0,0.6); padding:26px 24px 22px 24px; overflow:hidden; cursor:auto`.
- Opening (`openPayroll`) resets: `payStep:0, paySel:{}, payReveal:false, authState:'idle', dispState:'idle', deliveredN:0, resultReveal:false, popup:null`. Every step change replays the content stagger.

### Top progress bar
- Track: `position:absolute; top:0; left:0; right:0; height:6px; background:rgba(255,255,255,0.06); overflow:hidden; border-radius:27px 27px 0 0`.
- Fill: `height:100%; width:{(payStep+1)/4*100}%` → **25% / 50% / 75% / 100%** for steps 0–3; `background:linear-gradient(90deg,#3bbf8e,#78e9c0); transition:width .45s cubic-bezier(.22,1,.36,1)`.

### Step 0 — Select & review (`payStep === 0`)
Header row (`margin-top:10px`, space-between):
- Title: **"Run payroll"** — 19.8px / 700 / `#f2f7f4`.
- Sub: **"Review who gets paid this run."** — 11.7px / `#9db3aa`, `margin-top:3.6px`.
- Select-all control (right): 11.7px / `#78e9c0`, `cursor:pointer; user-select:none`, hover `text-decoration:underline`. Its text is bound to `{{ payAllChecked }}` — a **boolean** (`selectedCount === allEmployees.length`), so the prototype literally renders `true`/`false`. Behavior: click calls `paySelectAll(!allChecked)` — if not all checked, checks all (clears the map); if all checked, unchecks all (sets every index `false`). See Gaps.

Checklist (`display:flex; flex-direction:column; gap:2px; margin-top:14px; max-height:268px; overflow-y:auto; margin-left/right:-6px; padding:0 6px`), one row per employee (base 8 + any added), **all checked by default**:
- Row: `flex; align-items:center; gap:12px; padding:8px 8px; border-radius:14px; cursor:pointer; transition:background .15s`, hover `background:rgba(95,230,175,0.1)`. Clicking anywhere in the row toggles that employee.
- Checkbox: `width/height:19.8px; border-radius:50%` circle. Checked: `background:{accent}; border:0.9px solid rgba(0,0,0,0)`. Unchecked: `background:rgba(255,255,255,0.04); border:0.9px solid rgba(255,255,255,0.16)`. `transition:background .18s`. Check glyph: 12px polyline `20 6 9 17 4 12`, `stroke:#0b1512; stroke-width:3.2`, `opacity:1` checked / `0` unchecked, `transition:opacity .18s`.
- Avatar puck: `34.2px` circle, `background:rgba(59,191,142,0.18); border:0.9px solid rgba(255,255,255,0.06)`, initials (first letters of each name word) 11.7px / 800 / `#d3ecdd`.
- Name: 13.5px / 600 / `#eef4f1`. Sub (role, e.g. "Engineer"): 10.35px / `#9db3aa`, `margin-top:0.9px`.
- Trailing salary: 13.5px / 700 / `#eef4f1` — `{RevealAmount(salary)} cUSDd`, masked/revealed by the shared `payReveal` flag (accent `#78e9c0`).

Footer (`margin-top:14px; padding-top:14px; border-top:0.9px solid rgba(255,255,255,0.09)`, space-between):
- Left label: **"Total to disperse · "** 10.35px / `#9db3aa`, followed by an inline toggle span `#78e9c0; cursor:pointer` with text **"Reveal"** (masked) / **"Hide"** (revealed) — toggles `payReveal` (affects rows + total together).
- Left value (baseline row, `gap:6px; margin-top:2.7px`): total `RevealAmount(fmtAmount(sum of selected salaries))` 19.8px / 700 / `#f2f7f4` (`reserve:false`), then **"cUSDd"** 11.7px / `#9db3aa`. Number format: `toLocaleString('en-US', {min 0, max 1 fraction digits})` → e.g. `4,500.5`.
- Right block (`text-align:right`): count 19.8px / 700 / `#f2f7f4` = selected count **zero-padded to 2** (`String(n).padStart(2,'0')` → "08"); below, **"recipients"** 10.35px / `#9db3aa`, `margin-top:2.7px`. Both update live on every toggle.
- Continue button: `margin-top:16px`, accent primary — **"Continue"**, 13.5px / 600 / `#0b1512`, pill, `padding:12.6px 0`, hover `scale(1.02)`, active `scale(0.98)`. **No-op when 0 recipients selected** (guard in `payContinue`). Click → `payStep:1` + `runEncrypt()`.

### Step 1 — Encrypting (`payStep === 1`)
Header (`margin-top:10px`):
- Title: **"Encrypting {n} salaries in your browser"** — 19.8px / 700 / `#f2f7f4` ({n} = selected count; no trailing ellipsis in the file).
- Sub: **"Amounts are sealed locally before anything is sent."** — 11.7px / `#9db3aa`, `margin-top:3.6px`.

Cards: `display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:16px` — **two per row**, one card per *selected* employee, in selection order:
- Card: `flex; align-items:center; gap:8px; padding:8px 11px; border-radius:13px; background:rgba(255,255,255,0.03); border:0.9px solid rgba(255,255,255,0.05); min-width:0`.
- Avatar puck 29px (same fill/border as step 0), initials 10.35px / 800 / `#d3ecdd`.
- Name: 12.15px / 600 / `#eef4f1`, `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`, `flex:1`.
- Amount: 12.15px / 600 / `#cfe0d8`, `flex-shrink:0` — `RevealAmount` with `revealed: encIdx <= k`, `keepLock:true`, `sealGlow:true`, `reserve:false`, accent `#78e9c0`.
  - **Before seal**: real salary shown with the drifted-open lock. **Seal** (when the 720ms cascade index passes the card): digits scramble ~300ms → blur-collapse 230ms → `***` + lock rotates back closed (260ms) → one green glow pulse (640ms). Cards seal top-left → bottom-right, one every **720ms**.
- Spinner row (`flex center; gap:9px; margin-top:16px; font-size:11.7px; color:#9db3aa`): 15px ring — `border:2.2px solid rgba(120,233,192,0.25); border-top-color:#78e9c0; animation:dcSpin .7s linear infinite` — plus text **"Sealing amounts"**. Holds until the last card seals.
- Timing (`runEncrypt`): `encIdx` starts 0, increments every 720ms; when `encIdx > n` (all sealed) wait **900ms**, then auto-advance to `payStep:2`.

### Step 2 — Authorize (`payStep === 2`)
Centered column (`text-align:center; padding:14px 6px 6px 6px; margin-top:8px`):
- Icon: 66px square, centered; behind it `position:absolute; inset:0; border-radius:50%; background:rgba(95,230,175,0.14); animation:dcPulse 2.2s ease-in-out infinite` (dcPulse: opacity .5↔.85, scale 1↔1.08). Glyph: person-with-key SVG, 30px, `fill:#78e9c0`. `margin-bottom:6px`.
- Title: **"Authorize SealedPay"** — 19.8px / 700 / `#f2f7f4`, `margin-top:10px`.
- Body: **"Allow SealedPay to disperse cUSDd on your behalf · one signature · expires in 24h."** — 12.6px / `#9db3aa`, `margin-top:8px; line-height:1.55; max-width:330px`.

Button (three exclusive sub-states, all `margin-top:14px`, pill, `padding:12.6px 0`, 13.5px / 600, full-width, centered):
1. `authState:'idle'` — **"Authorize"**: `background:#f5f8f6; color:#14503b`, hover `scale(1.02)`, active `scale(0.98)`. Click → `runAuthorize()`.
2. `authState:'signing'` — `background:rgba(255,255,255,0.05); border:0.9px solid rgba(255,255,255,0.1); color:#cfdcd6`, flex-center `gap:9px`: 15px spinner (same ring as step 1) + text **"Confirm in your wallet"**. Lasts **1500ms**.
3. `authState:'done'` — `background:rgba(59,191,142,0.16); border:0.9px solid rgba(95,230,175,0.4); color:#78e9c0`, `gap:7px`: 15px circular-check SVG (currentColor) + text **"Authorized"**. Holds **850ms**, then auto-advance to `payStep:3`.
- `runAuthorize` is guarded: returns if already `signing`/`done` (re-clicks do nothing). Note: the README's "Already authorized → brief 'Already authorized' then skip" path is **not** implemented in this file — state resets to `idle` on every open (see Gaps).

### Step 3 — Disperse & verify (`payStep === 3`)
Wrapper: `data-payfinale; margin-top:10px; border-radius:18px; position:relative`. Three sub-states off `dispState`: `idle` → (`sending` → `confirmed` → `verifying`) → `done`.

**Idle (`dispState:'idle'`):**
- Title: **"Pay all {n} in one transaction"** — 19.8px / 700 / `#f2f7f4`.
- Sub: **"One disperse call settles every salary at once."** — 11.7px / `#9db3aa`, `margin-top:3.6px`.
- Button: `margin-top:20px`, accent primary pill `padding:12.6px 0`, 13.5px / 600 / `#0b1512` — **"Confirm & pay"** (hover 1.02 / active 0.98). Click → `runDisperse()`.
- Failure affordance: `margin-top:10px; text-align:center; font-size:10.35px; color:#6f8577; cursor:pointer; user-select:none`, hover `color:#e07a6a` — **"Simulate failure (demo)"**.

**Active (`sending`/`confirmed`/`verifying`):**
- Headline (crossfades on each state change — element animates `opacity:0 translateY(6px)` → rest, 340ms `cubic-bezier(.22,1,.36,1)`), 19.8px / 700 / `#f2f7f4`, in order:
  1. `sending` → **"Sending payroll"**
  2. `confirmed` / `verifying` → **"Confirmed on-chain"**
  3. `done` → **"Payroll delivered"** (shown in the finale, below)
- Sub (static): **"One disperse call settles every salary at once."** — 11.7px / `#9db3aa`.
- Progress bar (`margin-top:18px`): track `height:7px; border-radius:999px; background:rgba(255,255,255,0.06); overflow:hidden`. Fill: `background:linear-gradient(90deg,#2f9d74,#78e9c0); border-radius:999px; transition:width .5s cubic-bezier(.22,1,.36,1); animation:dcBarPulse 1.6s ease-in-out infinite` (brightness 1↔1.16). Sheen overlay inside the fill: `linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%); background-size:220% 100%; animation:dcSheen 1.15s linear infinite`.
  - Width by state: idle-ish fallback **6%**, `sending` **34%**, `confirmed` **64%**, `verifying` **64 + round(34 × delivered/n)%**, `done` **100%**.
- Status lines (`flex column; gap:10px; margin-top:16px`, each row `flex; gap:9px; font-size:12.6px`):
  - Line 1 — **"Dispersing on Sepolia"** (`color:#cfe0d8`). Leading indicator: while pending (`sending`), a 7.2px `#78e9c0` dot pulsing (`dcBarPulse 1.2s`) inside a 15px slot; once `confirmed`+ it becomes a 15px `#78e9c0` circular-check with `animation:dcCheckPop .45s cubic-bezier(.22,1,.36,1) both` (scale 0 → 1.18 → 1).
  - Line 2 — **"Verifying delivery · {delivered}/{n}"** (`color:#9db3aa`), live count. Indicator: empty 15px ring `border:1.8px solid rgba(255,255,255,0.14)` while `sending`/`confirmed`; pulsing dot while `verifying`; spring check when `done`.
- Per-recipient rows (only while `verifying`): `flex column; gap:2px; margin-top:14px; max-height:150px; overflow-y:auto; margin-left/right:-6px; padding:0 6px`. Row: `flex; gap:11px; padding:6px` — 29px initials puck (10.35/800/`#d3ecdd`), name 12.6px / 600 / `#eef4f1` ellipsized. When row index < `deliveredN`, a trailing badge appears: `flex; gap:5px; color:#78e9c0; font-size:10.35px; animation:dcCheckPop .4s cubic-bezier(.22,1,.36,1) both` — 13px check icon + text **"Paid"**. Rows flip one every **140ms**.
- Timing (`runDisperse`): `sending` **1400ms** → `confirmed` **750ms** → `verifying`, then `deliveredN` increments every **140ms**; when it reaches n → `dispState:'done'` + `onPayrollSuccess()`.

**Success finale (`dispState:'done'`):** centered column, `text-align:center; padding:12px 6px 4px 6px`:
- Check bloom: 78px container; behind it `inset:-12px; border-radius:50%; background:radial-gradient(circle, rgba(95,230,175,0.2), transparent 72%); animation:dcBloom 1.1s ease-out both` (scale .55→1, opacity 0→1→0.6). Glyph: 56px receipt-check SVG, `fill:#3bbf8e`, `animation:dcCheckPop .55s cubic-bezier(.22,1,.36,1) both`.
- Headline: **"Payroll delivered"** — 22px / 700 / `#f2f7f4`, `margin-top:14px`.
- Verified line: **"{n}/{n} verified"** (e.g. "8/8 verified") — 12.6px / `#9db3aa`, `margin-top:6px`.
- Total pill (clickable, toggles `resultReveal`): `flex; align-items:baseline; gap:6px; margin-top:18px; background:rgba(0,0,0,0.2); border-radius:14px; padding:11px 18px; cursor:pointer` — `RevealAmount(total)` 15px / 700 / `#f2f7f4` (scramble→settle on reveal) + **"cUSDd"** 11.7px / `#9db3aa`.
- Reveal toggle link (also toggles `resultReveal`): 10.35px / `#78e9c0`, `margin-top:9px`, hover underline — **"Reveal total (employer only)"** / **"Hide total"**.
- Etherscan link: `<a target="_blank">` **"View on Etherscan"** — 11.7px / `#9db3aa`, `margin-top:14px; text-decoration:none`, hover `color:#e8f0ec`. Href = the new run's URL `https://sepolia.etherscan.io/tx/0x{random hex}` (fallback `https://sepolia.etherscan.io`).
- Done button: `margin-top:18px; width:100%`, accent primary pill `padding:12.6px 0`, 13.5px / 600 / `#0b1512` — **"Done"** → `closePayroll()`.

**On success (`onPayrollSuccess`)** — side effects outside the modal:
- Prepend run `{date:'Jul {8+runs.length}', paid:n, total, tx:'0x……e025', url}` to `runs` (feeds Recent activity, chart cap, employee histories).
- Add unread notification: title **"Payroll delivered"**, sub **"{n} paid · verified · {date}"**, dot `#3bbf8e`.
- Toast (ok): **"Payroll delivered · {n} paid · verified"**.

**Failure path (`simulateFailure`)**:
- Clears disperse timers, resets `dispState:'idle'`, `deliveredN:0` — **no downstream state changes** (no run, no chart bar, no history rows).
- Adds unread notification: title **"Payroll failed"**, sub **"no funds moved · retry"**, dot `#e07a6a`.
- Toast (err): **"Payroll failed · no funds moved · retry"**.
- Closes the modal (close anim).

---

## 2. Fund Wallet modal

Opened by the "+" button on the wallet balance card (`fundOpen`). Scrim `.dcov` z-70; panel `.dcpop`, 387px, radius 27px, border `1px solid rgba(255,255,255,0.11)`, bg `#121D1AE6`, padding 27px. Content staggers in.

- Title: **"Fund wallet"** — 19.8px / 700 / `#f2f7f4`.
- Sub: **"Top up the payroll wallet so the next run has enough cUSDd."** — 11.7px / `#9db3aa`, `margin-top:5.4px; line-height:1.5`.
- Field (`margin-top:19.8px`): label **"Amount (cUSDd)"** — 9.9px / `#9db3aa`, `margin-bottom:5.4px`. Input: placeholder **"5,000"**, `width:100%; background:rgba(255,255,255,0.05); border:0.9px solid rgba(255,255,255,0.09); border-radius:10.8px; padding:9.9px 12.6px; color:#e8f0ec; font-size:11.7px; outline:none`.
- Destination row: `margin-top:14.4px; background:rgba(255,255,255,0.04); border-radius:12.6px; padding:10.8px 12.6px`, space-between — **"To"** 11.7px / `#e8f0ec` · **"0x3F9e4A21…9bC83Fc3"** 11.7px / `#9db3aa`.
- Buttons (`gap:10.8px; margin-top:23.4px`): **"Cancel"** ghost (weight 600) → close anim, clears amount. **"Fund wallet"** white primary (12.6px / **700**), `opacity:0.45` while amount is empty/whitespace, `1` otherwise. Confirm closes + clears the field — the prototype does **not** actually block the click when empty (opacity-only), and the amount is not applied to the balance (mock).

---

## 3. Add Employee modal

Opened by the Team screen's "Add employee" button (`addOpen`). Overlay `fixed inset:0; z-index:70; background:#0D1411F2` (no `.dcov` class → no fade-in animation in the prototype). Panel `.dcpop`, 387px, radius 23.4px, border `0.9px solid rgba(255,255,255,0.11)`, `backdrop-filter:blur(3px)`, bg `#121D1AE6`, padding 25.2px. Content staggers in.

- Title: **"Add employee"** — 19.8px / 700 / `#f2f7f4`.
- Sub: **"They get a claim link to view their salary privately."** — 11.7px / `#9db3aa`, `margin-top:5.4px; line-height:1.5`.
- Fields column: `gap:12.6px; margin-top:19.8px`. All labels 9.9px / `#9db3aa`, `margin-bottom:5.4px`. All inputs share the Fund-Wallet input style (bg `rgba(255,255,255,0.05)`, border `0.9px rgba(255,255,255,0.09)`, radius 10.8px, padding `9.9px 12.6px`, 11.7px `#e8f0ec`).
  1. **"Full name"** — placeholder **"Jane Cooper"**.
  2. Two-column grid (`1fr 1fr; gap:10.8px`):
     - **"Role"** — placeholder **"Engineer"**.
     - **"Monthly salary (cUSDd)"** — placeholder **"850"**.
  3. **"Team"** — chip row (`gap:7.2px`), chips **"Engineering" / "Design" / "Operations"**: 10.8px, pill, `padding:7.2px 14.4px; cursor:pointer; transition:background .15s, color .15s`. Selected: `background:{accent}; color:#0b1512`. Unselected: `background:rgba(255,255,255,0.05); color:#cfdcd6`. Default selected: **Engineering**.
  4. **"Wallet address"** — placeholder **"0x71C0…8a4E"**.
- Buttons (`gap:10.8px; margin-top:23.4px`): **"Cancel"** ghost (weight **500**) → close anim (fields retained). **"Add employee"** white primary (12.6px / 600), `opacity:0.45` unless BOTH name and wallet are non-empty after trim (then `1`); the confirm handler also hard-guards (`return` if either is empty).
- On confirm: appends `{name, role: role||'Employee', dept: selected chip, wallet, salary: parseFloat(salary)||0, joined:'Jul 2026'}` to the roster; closes; resets all fields and dept back to Engineering.

---

## 4. Notifications panel (bell popover)

Trigger: bell puck in the left rail (`popup:'bell'`, toggles). While any popover is open a scrim `fixed inset:0; z-index:3; background:#0D1411F2` (`.dcov`) sits behind; clicking it plays `closeAnim` on the popover. Bell unread indicator on the puck itself: 6.3px dot `#34d399` at `top:9px; right:9px`, shown while any notification is unread.

Panel: `data-screen-label="Notifications popup"`, classes `.dcpop .dcpop-tl` (unfolds from top-left); `position:absolute; left:50.4px; top:-7.2px` (right of the bell puck); `width:270px; border-radius:27px; border:1px solid rgba(255,255,255,0.11); background:rgba(52,92,72,0.21); padding:20px; z-index:10; overflow:hidden; text-align:left; cursor:auto`.

Header (space-between):
- Left group (`gap:7.2px`): title **"Notifications"** — 13.5px / 700 / `#f2f7f4`; badge — `background:#3bbf8e; color:#0b1512; font-size:9px; font-weight:400; border-radius:899.1px; padding:1.8px 7.2px`, text **"{unread} new"** (e.g. "3 new") when unread > 0, else **"All read"**.
- Right (only when unread > 0): **"Mark all read"** — 9.9px / `#78e9c0`, `cursor:pointer; user-select:none`, hover underline. Marks all read (badge → "All read", link disappears, bell dot hides).

Rows (`flex column; gap:3.6px; margin-top:9px`); row anatomy: `flex; gap:9px; padding:7.2px; border-radius:999px; cursor:pointer; transition:background .15s`, hover `background:rgba(95,230,175,0.1)`:
- Unread dot: `7.2px` circle, `margin-top:4.5px`; color = notification color when unread, `rgba(157,179,170,0.35)` when read.
- Title: 11.25px / 600; `#e8f0ec` unread → `#9db3aa` read.
- Sub: 9.9px / `#9db3aa`, `margin-top:0.9px`.
- Clicking a row marks it read (decrements badge). New notifications prepend.

Seed notifications (in order):
1. **"Payroll delivered"** / **"8 employees paid · verified · Just now"** — dot `#3bbf8e`.
2. **"Authorization expiring"** / **"operator access ends in 45 min · 1 h ago"** — dot `#e3b25f`.
3. **"Upcoming payout"** / **"Jul 31 · 8 employees scheduled · Yesterday"** — dot `#9db3aa`.

Runtime-added: "Payroll delivered" (`#3bbf8e`) and "Payroll failed" (`#e07a6a`) — see Run Payroll §1.

---

## 5. Settings panel (gear popover)

Trigger: gear puck (`popup:'gear'`). Same scrim/close as Notifications. Panel identical shell but `width:252px`, `data-screen-label="Settings popup"`.

- Title: **"Settings"** — 13.5px / 700 / `#f2f7f4`.
- Toggle rows (`flex column; margin-top:5.4px`; each row space-between, `padding:9px 0`): label 11.7px / `#e8f0ec` (no sub-line in the file). Toggle: track `width:36px; height:19.8px; border-radius:899.1px; transition:background .2s` — on: `{accent}`, off: `rgba(255,255,255,0.14)`. Knob: `16.2px` circle `#f5f8f6`, `top:1.8px`, `left:18px` on / `1.8px` off, `transition:left .2s`.
  1. **"Mask amounts by default"** — default ON. Controls global masking (`maskDefault`); turning it OFF reveals all amounts app-wide (individual reveals still stack on top).
  2. **"Payout reminders"** — default ON.
  3. **"Auto-verify after payout"** — default ON.
- Divider: `height:0.9px; background:rgba(255,255,255,0.09); margin:5.4px 0`.
- Static rows (space-between, `padding:9px 0`; label 11.7px / `#e8f0ec`, value 10.8px / `#9db3aa`):
  - **"Token"** → **"cUSDd"**
  - **"Network"** → **"Sepolia Testnet"**

---

## 6. Search command palette

Trigger: focusing (or typing in) the top-bar search input mounts the palette (`searchMounted`/`searchOpen`).

Search bar (top bar, always visible): `flex; gap:9px; border:0.9px solid rgba(225,248,238,0.045); background:rgba(110,196,186,0.06); backdrop-filter:blur(12px); box-shadow:` triple inset glass rim `; border-radius:899.1px; padding:10.8px 18px; width:306px`. Magnifier icon 14.4px stroke `#9db3aa`. Input: transparent, no border/outline, `color:#e8f0ec; font-size:11.7px`, placeholder **"Search employees or payouts"** (placeholder color `#566a61`).

While open:
- Overlay: `position:fixed; inset:0; background:#0D1411F2` placed at `z-index:-1` inside the search wrapper (which is `z-index:60`), so the bar + popup float above the dimmed app. Click = close. **Esc** also closes.
- Focus lift (JS): bar animates `scale(1)→scale(1.02)` + `drop-shadow(0 0 6px rgba(120,233,192,0.35))`, 220ms `cubic-bezier(.22,1,.36,1)`, held while open; reversed over 180ms on close. Overlay fades in 200ms.
- Popup: `position:absolute; top:calc(100% + 13px); left:0; width:468px; border-radius:28px; border:0.9px solid rgba(255,255,255,0.11); backdrop-filter:blur(6px); padding:14px; overflow:hidden; background:#121D1ABF`. Unfolds downward (`transform-origin:top center`): `opacity:0; translateY(-8px); scale(0.98)` → rest, 380ms delay 80ms, `cubic-bezier(.2,1.06,.3,1)`.
- Result rows stagger: `opacity:0; translateY(6px)` → rest, 260ms each, delay `200 + i*35`ms; section labels fade in 220ms at delay 180ms.
- Close: bar de-lift 180ms + overlay fade-out 180ms ease-in + popup collapse (`translateY(-8px) scale(0.98)`, 190ms `cubic-bezier(.4,0,1,1)`), no per-row stagger.

Sections (both live-filtered by the query, case-insensitive):
- **"Employees"** — section label 11.7px / `#9db3aa`, `padding:7px 12px 4.5px 12px`. Matches against `name + role + dept + wallet`. Shows up to **4** with empty query, **5** when typing.
  - Row: `flex; gap:13px; padding:9.5px 12px; border-radius:999px; cursor:pointer; transition:background .15s`, hover `background:rgba(95,230,175,0.1)`.
  - Avatar puck 38px (`rgba(59,191,142,0.18)` bg, `0.9px rgba(255,255,255,0.06)` border), initials 12px / 800 / `#d3ecdd`.
  - Name 15px / 600 / `#eef4f1`; sub 11.7px / `#9db3aa`, `margin-top:1.5px` — format **"{role} · {dept}"** (e.g. "Engineer · Engineering").
  - Click → opens that Employee View (nav 3), closes search.
- **"Payouts"** — label same style, `padding:11px 12px 4.5px 12px`. Matches `month + date + tx` over HISTORY (newest first). Up to **2** with empty query, **4** when typing.
  - Row: same shell; 38px puck contains a 15px paper-plane/send icon (`stroke:#cfe5d8; stroke-width:2`).
  - Title = date, e.g. **"Jul 5, 2026"** — 15px / 600. Sub — **"{paid} paid · {tx}"** (e.g. "8 paid · 0xc396…e025").
  - Trailing pill: **"Verified"** — `background:transparent; border:0.9px solid rgba(95,230,175,0.55); color:#78e9c0; font-size:10.8px; font-weight:400; border-radius:899.1px; padding:4px 11px; margin-left:auto`.
  - Click → navigates Home (nav 0) and activates that month's chart bar, closes search.
- No-results state (when neither section matches): `padding:20px 12px; text-align:center; font-size:13.5px; color:#9db3aa` — **"No matches. Try a name, team, or month."**

---

## 7. Logout modal

Trigger: logout puck at the rail bottom (`logoutOpen`, also closes any popover). Scrim `.dcov` z-70. Panel `.dcpop`, 342px, radius 23.4px, border `1px rgba(255,255,255,0.11)`, bg `#121D1AE6`, padding 25.2px.

- Icon puck: `43.2px` circle, `background:rgba(255,255,255,0.06); border:0.9px solid rgba(255,255,255,0.08)`, 18px logout-arrow SVG `fill:#e8f0ec`.
- Title: **"Log out?"** — 19.8px / 700 / `#f2f7f4`, `margin-top:14.4px`.
- Body: **"You'll be signed out of SealedPay on this device."** — 11.7px / `#9db3aa`, `margin-top:5.4px; line-height:1.5`.
- Buttons (`gap:10.8px; margin-top:21.6px`):
  - **"Cancel"** — ghost, weight 600 → close anim.
  - **"Log out"** — warning-red **outlined**: `background:rgba(224,110,98,0.1); border:0.9px solid rgba(224,110,98,0.5); color:#eb8f85; font-size:12.6px; font-weight:600`, pill, `padding:10.8px 0`, hover `scale(1.03)`. Confirm → closes modal + shows Signed-out screen.

---

## 8. Profile popup

Trigger: top-bar avatar (`profileOpen`). Scrim `.dcov` z-70. Panel `.dcpop`, 342px, `border-radius:35px`, border `1px rgba(255,255,255,0.11)`, bg `#0D1411E6`, `padding:35px`, `text-align:center`.

- Avatar: `<img src="avatars/avatar-profile.svg">` (synced with `localStorage sealedpay_avatar`), `width/height:250px; border-radius:50%; object-fit:cover; background:transparent; cursor:pointer; transition:transform .3s cubic-bezier(.22,1,.36,1), filter .3s ease`; hover: `transform:scale(1.06) rotate(-2.5deg); filter:drop-shadow(0 10px 24px rgba(52,211,153,0.35))`.
- Name: 34.2px / 700 / `#f2f7f4`, `margin-top:18px; letter-spacing:0.3px` — from `localStorage sealedpay_name`, fallback **"Santo"**.
- Role: **"Payroll administrator"** — 12.6px / `#9db3aa`, `margin-top:5.4px`.
- Wallet chip: `flex; gap:6.3px; background:transparent; border:0.9px solid rgba(95,230,175,0.55); color:#78e9c0; font-size:10.8px; border-radius:899.1px; padding:5.4px 12.6px; margin-top:14.4px` — 6.3px dot `#34d399` + **"0x3F9e4A21…9bC83Fc3"**.

---

## 9. Payout reminder modal

Trigger: bell button on the Next payout card (Employee View sidebar) — the white 39.6px circular button; when a reminder is set it shows a dot `9px; background:#3bbf8e; border:1.8px solid #f5f8f6` at `top:0.9px; right:0.9px`.

Scrim `.dcov` z-70. Panel `.dcpop`, 342px, radius 23.4px, border `1px rgba(255,255,255,0.11)`, **bg `#0D1411F2`**, padding 25.2px.

- Icon puck: `43.2px` circle `rgba(255,255,255,0.06)` / border `rgba(255,255,255,0.08)`, 18px bell SVG stroke `#e8f0ec`.
- Title: **"Payout reminder"** — 19.8px / 700 / `#f2f7f4`, `margin-top:14.4px`.
- Body — 11.7px / `#9db3aa`, `margin-top:5.4px; line-height:1.5`, two variants:
  - reminder NOT set: **"Get a nudge on Jul 29, two days before the Jul 31 payroll run."**
  - reminder set: **"Reminder is on for Jul 29, two days before the Jul 31 run. You can remove it anytime."**
- Buttons (`gap:10.8px; margin-top:21.6px`):
  - **"Cancel"** — ghost, weight 600 → close anim.
  - Primary — white primary (12.6px / **700**): **"Set reminder"** (not set) / **"Remove reminder"** (set). Confirm toggles `reminderSet` and closes (no close anim on confirm — instant unmount).

---

## 10. Notification-permission prompt

Auto-appears **900ms after load** if permission is still `'default'`. No scrim. `.dcpop`; `position:fixed; top:74px; right:28px; z-index:80; width:308px; border-radius:20px; border:0.9px solid rgba(255,255,255,0.11); background:rgba(52,92,72,0.28); backdrop-filter:blur(15px); box-shadow:0 24px 60px -24px rgba(0,0,0,0.6); padding:18px`.

- Header row (`flex; align-items:flex-start; gap:11px`): 34px circle `rgba(95,230,175,0.14)` with 17px bell SVG stroke `#78e9c0`; then:
  - Title: **"Enable notifications?"** — 13.5px / 600 / `#f2f7f4`.
  - Body: **"Get alerts when payroll is delivered or needs attention."** — 11.25px / `#9db3aa`, `margin-top:3px; line-height:1.45`.
- Buttons (`gap:9px; margin-top:14px`, each `flex:1; padding:8.5px 0`, pill):
  - **"Not now"** — `background:rgba(255,255,255,0.06); border:0.9px solid rgba(255,255,255,0.09); color:#cfdcd6; font-size:11.7px; font-weight:500`, hover `background:rgba(255,255,255,0.1)`. → permission `'denied'`, prompt dismissed.
  - **"Enable"** — accent bg, `color:#0b1512; font-size:11.7px; font-weight:600`, hover `scale(1.03)`. → permission `'granted'`, prompt dismissed, ok-toast **"Notifications enabled"**.

---

## 11. Signed-out screen

Shown after logout confirm (`loggedOut`). `position:fixed; inset:0; z-index:80; background:radial-gradient(810px 540px at 70% 20%, rgba(52,148,106,0.40), rgba(0,0,0,0) 62%), linear-gradient(135deg, #0b1210 0%, #0d1714 50%, #0a100e 100%)`; content centered column, `text-align:center`:

- Seal logo SVG, 50.4px (same mark as the top-bar logo; palette `#c9bfa8` / `#e3dcc9`).
- Headline: **"You've been logged out"** — 25.2px / 700 / `#f2f7f4`, `margin-top:18px`.
- Sub: **"See you soon, Santo."** — 12.6px / `#9db3aa`, `margin-top:7.2px` (name hardcoded in the file — see Gaps).
- Button: **"Sign back in"** — accent bg, `color:#0b1512; font-size:12.6px; font-weight:700`, pill, `padding:11.7px 30.6px; margin-top:23.4px`, hover `scale(1.04)`. → back to dashboard, nav reset to Home (0).

---

## 12. Toast

`data-toast`, class `.dctoast` (slide in from top-center). `position:fixed; top:22px; left:50%; transform:translateX(-50%); z-index:90; display:flex; align-items:center; gap:10px; border-radius:899.1px; padding:11px 20px; cursor:pointer; backdrop-filter:blur(14px); box-shadow:0 18px 44px -16px rgba(0,0,0,0.55); border:0.9px solid {border}; background:{bg}`.

- Message: 12.6px / 600 / `#f2f7f4`.
- **Success ("ok") variant**: bg `rgba(24,58,44,0.92)`, border `rgba(95,230,175,0.45)`; leading icon = 20px circular-check SVG `fill:#3bbf8e`.
- **Failure ("err") variant**: bg `rgba(60,34,30,0.92)`, border `rgba(224,122,106,0.5)`; leading icon = 19px circle `background:rgba(224,122,106,0.9)` containing **"!"** 11px / 700 / `#3a1a15`.
- Exact copy used in the prototype:
  - ok: **"Payroll delivered · {n} paid · verified"** (e.g. "Payroll delivered · 8 paid · verified")
  - err: **"Payroll failed · no funds moved · retry"**
  - ok: **"Notifications enabled"**
- Auto-dismiss after **4200ms**; click dismisses. Exit animation: `opacity 1→0; translateY(0)→-14px; scale 1→0.96`, 200ms `cubic-bezier(.4,0,1,1)`.

---

## 13. State & trigger map (modals only)

| State | Values | Opens via | Closes via |
|---|---|---|---|
| `popup` | `'bell' \| 'gear' \| null` | bell/gear puck click (toggles) | scrim click (closeAnim), opening Run Payroll, logout click |
| `logoutOpen` | bool | rail logout puck | Cancel (anim) / Log out (→ `loggedOut:true`) |
| `loggedOut` | bool | logout confirm | "Sign back in" (→ nav 0) |
| `profileOpen` | bool | top-bar avatar | scrim (anim) |
| `fundOpen` (+ `fundAmount`) | bool, string | wallet "+" button | Cancel/scrim (anim, clears amount) / Fund wallet (clears) |
| `addOpen` (+ `addName/addRole/addSalary/addWallet/addDept`) | bool, strings, dept default `'Engineering'` | "Add employee" button | Cancel/scrim (anim) / confirm (appends + resets) |
| `remindOpen`, `reminderSet` | bool, bool | Next-payout bell | Cancel/scrim (anim) / confirm (toggles set) |
| `searchOpen`/`searchMounted`, `searchQ` | bool, string | input focus or typing | Esc / overlay click (animated out, then unmount) |
| `payrollOpen`, `payStep` 0–3, `paySel` map, `payReveal`, `encIdx`, `authState` `'idle'\|'signing'\|'done'`, `dispState` `'idle'\|'sending'\|'confirmed'\|'verifying'\|'done'`, `deliveredN`, `resultReveal` | | "Run payroll" button (resets all) | scrim / Done / simulate-failure (all clear timers + anim) |
| `permPrompt`, `notifPerm` | bool, `'default'\|'granted'\|'denied'` | 900ms timer on load | Enable / Not now |
| `toast` | `{kind:'ok'\|'err', msg}` \| null | showToast | 4200ms timer / click |
| `notifs` | `{id, title, sub, color, read, tone}[]` | seeded (3) + run success/failure + prepend | row click marks read; "Mark all read" |

Employee seed data used in the modal rows (name / role / salary): Priya Sharma / Engineer / 850 · Arjun Mehta / Engineer / 780 · Mei Lin / Backend Engineer / 720 · Daniel Okafor / Platform Engineer / 650 · Sofia Reyes / Product Designer / 560.5 · Elena Petrova / Brand Designer / 420 · Rohan Gupta / Operations Lead / 320 · Marcus Chen / Community Manager / 200. Default all-selected total: **4,500.5** → footer shows `4,500.5 cUSDd` on reveal, `***` masked; recipients `08`.

---

## 14. Gaps / prototype quirks (decide before implementing)

1. **Select-all label is a boolean**: the step-0 select-all control renders `{{ payAllChecked }}` (true/false), not copy. Intended strings are unspecified — suggest "Deselect all" / "Select all".
2. **"Already authorized" skip** (README §Run Payroll step 3) is not implemented — `authState` resets to `'idle'` on every open, and there is no "Already authorized" string in the file.
3. **Toast copy mismatch vs README**: README says "Payroll delivered · 8/8 verified"; the file emits "Payroll delivered · {n} paid · verified".
4. **Settings toggle sub-lines**: README/assignment mention "label + sub" per toggle; the file has labels only.
5. **Fund Wallet confirm isn't gated**: the button dims to opacity 0.45 when empty but the click handler still closes; Add Employee *is* hard-gated. Recommend gating both.
6. **Signed-out screen name is hardcoded** ("See you soon, Santo.") while the profile popup reads `localStorage sealedpay_name` — likely should be personalized the same way.
7. **Add Employee overlay lacks `.dcov`** (no fade-in) unlike every other centered modal — almost certainly an oversight; use the standard scrim.
8. **Encrypting headline** lacks the trailing ellipsis the README shows ("…browser…"); file text is "Encrypting {n} salaries in your browser".
9. **Esc** only closes the search palette; other modals close via scrim/buttons only.
10. **Scroll lock** applies only for add/remind/logout/search — not payroll/fund/profile.
