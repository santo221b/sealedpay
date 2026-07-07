# Onboarding — extracted implementation spec

Source: `docs/design/handoff/Onboarding v6.dc.html` (entire file, 393 lines).
Font: **Manrope** via Google Fonts, weights `400;500;600;700;800`. Base text color of the page wrapper: `#e8f0ec`.

All values below are copied exactly from the inline styles / script. Strings in quotes are VERBATIM copy (including typographic apostrophes `’` and ellipsis `…` where shown).

---

## 1. Global CSS (from `<helmet>` style block)

```css
html,body { margin:0; padding:0; background:#0b100e; }
* { box-sizing:border-box; scrollbar-width:none; -ms-overflow-style:none; }
*::-webkit-scrollbar { display:none; width:0; height:0; }
input::placeholder { color:#6a7e75; }
@keyframes spin       { to { transform:rotate(360deg) } }
@keyframes floaty     { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-9px) } }
@keyframes glowpulse  { 0%,100% { opacity:0.5 } 50% { opacity:0.85 } }
@keyframes dcStepSheen{ 0% { transform:translateX(-130%) } 100% { transform:translateX(230%) } }
@keyframes dcAurora1  { 0% { transform:translate(0,0) scale(1) } 50% { transform:translate(6%,-5%) scale(1.16) } 100% { transform:translate(0,0) scale(1) } }
@keyframes dcAurora2  { 0% { transform:translate(0,0) scale(1.12) } 50% { transform:translate(-6%,4%) scale(1) } 100% { transform:translate(0,0) scale(1.12) } }
@media (prefers-reduced-motion: reduce){ .dcaurora{animation:none !important} .floaty-el{animation:none !important} }
```

Shared JS easing constant: `EASE = 'cubic-bezier(0.22,1,0.36,1)'`.

---

## 2. Layout tree (page)

```
Page wrapper (div)
├─ Aurora blob 1 (fixed decorative)
├─ Aurora blob 2 (fixed decorative)
├─ Ghost step numeral watermark (absolute, right side)
├─ Card container (the onboarding "card")
│  ├─ Progress bar row (6 segments)
│  ├─ Content stage (min-height 328px; renders exactly ONE of Steps 0–5)
│  └─ Footer row (Back / Continue)
└─ Attribution line (absolute, bottom-center)
```

### 2.1 Page wrapper
- `min-height:100vh; width:100%; display:flex; flex-direction:column; justify-content:center`
- `font-family:'Manrope',sans-serif; color:#e8f0ec; position:relative; overflow:hidden; padding:40px`
- Background (green glow bright at bottom-center, darkening upward — two layers, exact):
  ```
  background:
    radial-gradient(135% 82% at 50% 124%, rgba(78,206,152,0.6), rgba(46,148,116,0.14) 40%, rgba(0,0,0,0) 66%),
    linear-gradient(180deg, #070c0a 0%, #0a110e 48%, #0c1712 100%);
  ```
- Behind everything, `html,body` background is `#0b100e`.

### 2.2 Aurora blobs (class `dcaurora`, both `pointer-events:none; z-index:0; border-radius:50%`)
1. `position:absolute; bottom:-22%; left:8%; width:62%; height:72%; background:radial-gradient(circle, rgba(78,206,152,0.13), rgba(0,0,0,0) 70%); filter:blur(46px); animation:dcAurora1 17s ease-in-out infinite`
2. `position:absolute; bottom:-14%; right:6%; width:52%; height:62%; background:radial-gradient(circle, rgba(46,148,116,0.11), rgba(0,0,0,0) 70%); filter:blur(56px); animation:dcAurora2 22s ease-in-out infinite`

Reduced motion: both animations disabled (`animation:none`).

### 2.3 Ghost step numeral watermark
- `position:absolute; top:50%; right:9%; transform:translateY(-50%)`
- `font-family:'Manrope',sans-serif; font-weight:800; font-size:300px; line-height:1; letter-spacing:-0.05em`
- `font-variant-numeric:tabular-nums; font-feature-settings:'tnum'`
- `perspective:900px; color:rgba(120,233,192,0.055); pointer-events:none; user-select:none; z-index:0`
- Content is TWO spans: a static `<span>0</span>` plus a digit span (`display:inline-block; transform-origin:center center; backface-visibility:hidden`) containing `stepDigit`.
- `stepDigit = String(step + 1).padStart(2, '0').slice(-1)` → the watermark reads **"01" … "06"**, and only the second (units) digit animates on step change.
- Digit flip animation (`flipDigit()`, runs in `componentDidUpdate` whenever `step` changes; Web Animations API):
  - Keyframes: `{ transform:'rotateX(-90deg)', opacity:0 }` → `{ transform:'rotateX(12deg)', opacity:1, offset:0.72 }` → `{ transform:'rotateX(0deg)', opacity:1 }`
  - `duration:360, easing:EASE, fill:'both'`
  - Skipped entirely under `prefers-reduced-motion: reduce`.
  - **Difference vs README**: README's animation inventory describes this as a "number-flip/roll (translateY + opacity swap)"; the actual implementation is a 3D **rotateX** flip (with `perspective:900px` on the parent), not translateY.

### 2.4 Card container
- `width:100%; max-width:540px; margin-left:9%; position:relative; z-index:2`
- **Note / difference vs README**: README §Screens calls this a "single centered glass card"; in the actual file the container has **no background, border, radius, or shadow of its own** (the "glass" treatment appears only on inner elements like the input and info card), and it is offset left with `margin-left:9%` (vertically centered by the page's flex `justify-content:center`), not horizontally centered.
- Entrance (first mount only, via `animateIn(true)` on `requestAnimationFrame` after mount): keyframes `{ opacity:0, transform:'translateY(24px) scale(0.97)' }` → `{ opacity:1, transform:'translateY(0) scale(1)' }`, `duration:620, easing:EASE, fill:'both'`. (Matches README: "card springs in … ~620ms cubic-bezier(.22,1,.36,1)".)

### 2.5 Attribution line
- `position:absolute; bottom:22px; left:0; right:0; text-align:center`
- `font-size:11px; color:rgba(233,244,238,0.62); text-shadow:0 1px 5px rgba(6,20,14,0.55)`
- Text: `SealedPay · Powered by DisperseKit · TokenOps disperse · Zama FHE`
- Present on ALL steps (it lives on the page wrapper, not inside a step).

---

## 3. Progress bar (6 segments)

Row: `display:flex; align-items:center; gap:6px; margin-bottom:30px`. One segment per step (`TOTAL = 6`).

Each segment (track):
- `position:relative; border-radius:999px; flex:1; background:rgba(255,255,255,0.1); overflow:hidden`
- Height is dynamic: `3px` if `i <= step` (filled/current), `2px` if future. `transition:height .4s ease, filter .2s ease`
- Clickable ONLY when `i < step` (completed segments navigate back via `go(i)`): `cursor:pointer` and hover style `filter:brightness(1.4)`. Future/current segments: `cursor:default`, no hover.

Fill layer (inside track):
- `position:absolute; inset:0; transform-origin:left center; transform:scaleX(fill)` where `fill = i <= step ? 1 : 0`
- `background:linear-gradient(90deg, #2f9d74, #78e9c0); border-radius:999px`
- `transition:transform .6s cubic-bezier(.22,1,.36,1)` → left-to-right wipe as a step is reached.

Sheen (rendered only on the CURRENT segment, `i === step`, inside the fill layer):
- `position:absolute; inset:0; background:linear-gradient(100deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 62%)`
- `animation:dcStepSheen 1.5s ease-in-out infinite; pointer-events:none` (translateX -130% → 230%).

Matches README inventory ("segments fill with left-to-right gradient wipe … sheen sweep on the current segment … slim ~3px"). Extra detail not in README: unfilled segments are 2px and grow to 3px, and completed segments are click-to-go-back with a brightness hover.

---

## 4. Content stage + step transitions

Stage div: `min-height:328px; display:flex; flex-direction:column`. Exactly one step block renders at a time (conditional on `step`). Each step's outer div: `flex:1; display:flex; flex-direction:column; justify-content:center` (steps 0 and 5 additionally `align-items:center; text-align:center`).

**Step-content entrance** (`animateIn()` — runs on mount and after every step change):
- Stage itself: `{opacity:0}` → `{opacity:1}`, `duration:320, fill:'both'`.
- Every element tagged `data-anim` inside the stage staggers: keyframes `{ opacity:0, transform:'translateY(20px)' }` → `{ opacity:1, transform:'translateY(0)' }`, `duration:560, delay:50 + i*75, easing:EASE, fill:'both'`. (README says "opacity 0 + y 20 → 0, ~75ms apart" — matches; README omits the 50ms base delay and 560ms duration.)

**Step-content exit** (`go(next)`):
- Guarded by `transitioning` flag; ignores calls while animating; ignores `next < 0 || next >= 6`.
- Stage animates `{ opacity:1, transform:'translateY(0)' }` → `{ opacity:0, transform:'translateY(dir)' }` where `dir = -16px` going forward, `+16px` going back; `duration:240, easing:'cubic-bezier(0.4,0,1,1)', fill:'both'`. On finish, state updates to the new step and `animateIn(false)` runs. (Not itemized in README's inventory — README only lists entrances.)
- No-WAAPI fallback: instant state swap then `animateIn(false)`.

---

## 5. Steps — exact copy + styles

### Step 0 — Welcome (centered)
Layout (top→bottom, all `data-anim` unless noted):
1. **Seal logo block**: `position:relative; width:128px; height:128px; display:flex; align-items:center; justify-content:center; margin-bottom:8px`
   - Glow wash (not `data-anim`, inside block): `position:absolute; inset:-14px; border-radius:50%; background:radial-gradient(circle, rgba(90,200,150,0.12), rgba(0,0,0,0) 72%); animation:glowpulse 3.4s ease-in-out infinite` (opacity 0.5 ↔ 0.85).
   - Float wrapper (`class="floaty-el"`): `animation:floaty 5s ease-in-out infinite` (translateY 0 ↔ -9px). Reduced motion: disabled.
   - Inside: the seal SVG at **92×92** (full markup in §8).
2. Eyebrow label: `font-size:12px; font-weight:400; letter-spacing:0.4px; color:#78e9c0; margin-top:20px` — text: `Confidential payroll`
3. Headline: `font-family:'Manrope',sans-serif; font-weight:700; font-size:34px; line-height:1.15; margin-top:12px; letter-spacing:0.2px` — text: `Welcome to SealedPay`. Runs the decrypt-scramble on entry (§7.1).
4. Description: `font-size:15px; font-weight:400; color:#9db3aa; margin-top:14px; max-width:400px; line-height:1.55` — text: `Pay your whole team in one transaction. Salaries stay encrypted, on-chain, end to end.`
   - **Copy difference vs README**: README quotes it with a comma splice ("…one transaction, salaries stay encrypted…"); the file uses a period: "…one transaction. Salaries stay encrypted…".

Footer: no Back (empty placeholder div keeps space-between alignment). Continue label: `Let's get started` (straight apostrophe). Always enabled.

### Step 1 — Name
1. Eyebrow: `font-size:12px; font-weight:600; letter-spacing:0.4px; color:#78e9c0` — `Get started`
2. Heading: `font-weight:700; font-size:29px; margin-top:12px; line-height:1.2` — `First, what should we call you?`
3. Sub: `font-size:14px; color:#9db3aa; margin-top:12px; line-height:1.5` — `We’ll use your name to personalize the workspace.`
4. Input wrapper: `margin-top:26px`. The glass input (`<input>`):
   - placeholder: `Enter your first name` (placeholder color `#6a7e75` from global CSS)
   - ```
     width:100%; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.14);
     border-radius:98px; padding:17px 22px; color:#f2f7f4; font-size:17px;
     font-family:'Manrope',sans-serif; outline:none;
     backdrop-filter:blur(22px) saturate(1.3); -webkit-backdrop-filter:blur(22px) saturate(1.3);
     box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.12),   /* top highlight */
                 inset 0 -1px 0 0 rgba(0,0,0,0.15),        /* bottom shadow */
                 0 10px 30px -14px rgba(0,0,0,0.55);       /* drop */
     transition:border .2s;
     ```
   - Focus style: `border:1px solid rgba(95,230,175,0.6)`
   - **Difference vs README**: README's step list says input radius **18px**; the file uses `border-radius:98px` (pill).
   - `onInput` writes `state.name` (controlled).

Continue: label `Continue`; **disabled until** the first whitespace-separated token of `name.trim()` is non-empty (`first.length > 0`).

### Step 2 — Role / context
1. Eyebrow: `font-size:12px; font-weight:600; letter-spacing:0.4px; color:#78e9c0` — `Your role`
2. Heading: `font-weight:700; font-size:29px; margin-top:12px; line-height:1.25` — `You’re the payroll administrator{{ nameComma }}`
   - `nameComma = first ? ', ' + first + '.' : '.'` → e.g. `You’re the payroll administrator, Ada.` or `You’re the payroll administrator.` if no name.
3. Body: `font-size:14.5px; color:#9db3aa; margin-top:16px; line-height:1.6` — verbatim:
   `You run confidential payroll for a team of 8. Salaries are encrypted on-chain with Zama FHE. You approve one transaction, and everyone gets paid without exposing a single amount.`
   — where `one transaction` is wrapped in `<span style="color:#cfe0d8">`.
4. **Acknowledgment card** (clickable, toggles `understood`):
   - `display:flex; align-items:flex-start; gap:14px; margin-top:22px; background:rgba(110,196,186,0.17); border:1px solid rgba(255,255,255,0.13); border-radius:20px; padding:18px 20px; cursor:pointer; user-select:none`
   - Left check circle: `width:26px; height:26px; border-radius:50%; flex-shrink:0; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:background .2s, border .2s`
     - unchecked: `background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.18)`
     - checked: `background:#3bbf8e; border:1px solid rgba(0,0,0,0)`
     - Checkmark SVG inside: 14×14, viewBox `0 0 24 24`, `stroke:#08331f; stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round`, polyline `20 6 9 17 4 12`; `opacity: understood ? 1 : 0; transition:opacity .18s`
     - On checking ON: circle pops `scale(1) → scale(1.22) → scale(1)`, `duration:300, easing:EASE` (no pop when unchecking).
   - Text: `font-size:13.5px; color:#c2d0c9; line-height:1.55` — verbatim:
     `We’ve pre-loaded a demo team and 6 months of payroll history so you can explore right away. Any real payroll you run settles live on Sepolia, and those transactions appear here in the UI with their own Etherscan links, on top of the sample data.`
     — where `6 months of payroll history` is `<span style="color:#f2f7f4; font-weight:600">`.
   - **Difference vs README**: README describes this as a passive "info card (rounded, circular lightning icon)". Actual: it is an interactive acknowledgment toggle with a **check circle** (no lightning icon), and **Continue is disabled until it is checked** (`canContinue = understood`), which README does not mention.

Continue: `Continue`, disabled until `understood === true`.

### Step 3 — Avatar
1. Eyebrow: `font-size:12px; font-weight:600; letter-spacing:0.4px; color:#78e9c0` — `Your profile`
2. Heading: `font-weight:700; font-size:29px; margin-top:12px` — `Choose your avatar`
3. Sub: `font-size:14px; color:#9db3aa; margin-top:12px` — `Pick a face for your admin profile.`
4. Picker row: `display:flex; gap:15px; margin-top:28px; justify-content:center` — 4 identical items using sources (in order): `avatars/avatar-1.svg`, `avatars/avatar-2.svg`, `avatars/avatar-3.svg`, `avatars/avatar-profile.svg`.

Each avatar item (clickable → `setState({avatar: src})`):
- Ring wrapper: `position:relative; width:104px; height:104px; border-radius:50%; cursor:pointer; padding:4px; transition:background .25s, transform .2s`
  - `background`: selected → `linear-gradient(135deg, #5fe3ab, #2f9d74)`; unselected → `rgba(255,255,255,0.08)`
  - `transform`: selected → `scale(1.15)`; unselected → `none`
  - hover style: `transform:translateY(-4px)` (note: as written, hover replaces the transform, so a selected avatar loses its 1.15 scale while hovered — replicate or intentionally combine)
- `<img>`: `width:100%; height:100%; border-radius:50%; object-fit:cover; background:rgba(20,40,32,0.6); display:block; alt="Avatar"`
- Selected check badge (only when selected): `position:absolute; bottom:2px; right:2px; width:28px; height:28px; border-radius:50%; background:#3bbf8e; border:3px solid #101915; display:flex; align-items:center; justify-content:center` containing check SVG 14×14, `stroke:#08331f; stroke-width:3.5`, polyline `20 6 9 17 4 12`.

Continue: `Continue`, disabled until an avatar is selected (`!!avatar`). Single-select; no deselect.

### Step 4 — Wallet
1. Eyebrow: `font-size:12px; font-weight:600; letter-spacing:0.4px; color:#78e9c0` — `Connect`
2. Heading: `font-weight:700; font-size:29px; margin-top:12px` — `Connect your wallet`
3. Sub: `font-size:14px; color:#9db3aa; margin-top:12px; line-height:1.5` — `Payroll settles from your wallet on the Sepolia testnet. No real funds, it’s a demo.`
4. Wallet area (`margin-top:26px`) — exactly one of three states (`state.wallet`: `'idle' | 'connecting' | 'connected'`):

**Idle — Connect button** (click → connect):
- `display:flex; align-items:center; justify-content:center; gap:10px; background:#3bbf8e; color:#08331f; font-size:15px; font-weight:500; border-radius:85px; padding:16px 0; cursor:pointer; transition:transform .15s`
- hover `transform:scale(1.02)`; active `transform:scale(0.98)`
- Wallet icon SVG: 19×19, viewBox `0 0 24 24`, `stroke:#08331f; stroke-width:2; round caps/joins`; paths: `<rect x="2" y="6" width="20" height="13" rx="2.5"/>`, `<path d="M16 12h.01"/>`, `<path d="M2 9h16a2 2 0 0 1 2 2"/>`
- Label: `Connect wallet`

**Connecting** (auto after click; lasts **1250ms** via `setTimeout`):
- Container: `display:flex; align-items:center; justify-content:center; gap:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#cfdcd6; font-size:15px; font-weight:600; border-radius:15px; padding:16px 0`
- Spinner: `width:18px; height:18px; border-radius:50%; border:2.5px solid rgba(120,233,192,0.25); border-top-color:#78e9c0; animation:spin 0.7s linear infinite`
- Label: `Connecting…`

**Connected chip** (animates in: `{opacity:0, transform:'scale(0.94)'}` → `{opacity:1, transform:'scale(1)'}`, `duration:450, easing:EASE, fill:'both'`):
- Container: `display:flex; align-items:center; gap:13px; background:rgba(110,196,186,0.14); border:1px solid rgba(95,230,175,0.35); border-radius:86px; padding:16px 18px`
- Check puck: `width:38px; height:38px; border-radius:50%; background:rgba(95,230,175,0.18); flex-shrink:0; centered` with check SVG 18×18, `stroke:#78e9c0; stroke-width:2.5`, polyline `20 6 9 17 4 12`
- Text column (`flex:1`):
  - `font-size:14px; font-weight:600; color:#eef4f1` — `Wallet connected`
  - `font-size:12px; color:#9db3aa; margin-top:2px` — `0x3F9e4A21…9bC83Fc3 · Sepolia`
- Live dot: `width:8px; height:8px; border-radius:50%; background:#34d399`

`connectWallet()` no-ops unless `wallet === 'idle'` (idempotent). Continue: `Continue`, disabled until `wallet === 'connected'`.

### Step 5 — All set (centered)
1. **Chosen-avatar block**: `position:relative; width:96px; height:96px; margin-bottom:6px`
   - Ring backdrop: `position:absolute; inset:0; border-radius:50%; background:rgba(95,230,175,0.14); border:1px solid rgba(95,230,175,0.3)`
   - `<img alt="You">` (src set imperatively in `animateIn()` to `state.avatar || AVATARS[0]`; initial src is a 1px transparent GIF data URI): `position:absolute; inset:6px; width:84px; height:84px; border-radius:50%; object-fit:cover; background:rgba(20,40,32,0.6)`
   - Check badge: `position:absolute; bottom:0; right:0; width:30px; height:30px; border-radius:50%; background:#3bbf8e; border:3px solid #101915; centered` with check SVG 15×15, `stroke:#08331f; stroke-width:3.5`, polyline `20 6 9 17 4 12`
2. Eyebrow: `font-size:12px; font-weight:400; letter-spacing:0.4px; color:#78e9c0; margin-top:18px` — `All set`
3. Heading: `font-weight:700; font-size:31px; margin-top:8px` — `You’re all set{{ nameComma }}` → e.g. `You’re all set, Ada.`
4. Sub: `font-size:14.5px; color:#9db3aa; margin-top:12px; max-width:380px; line-height:1.55` — `Your workspace is ready. Everything below is live. Reveal amounts, run payroll, explore the team.`
5. Recap chips row: `display:flex; gap:10px; margin-top:22px; flex-wrap:wrap; justify-content:center` — three chips, each:
   - `display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0); border:1px solid rgba(95,230,175,0.5); color:#78e9c0; font-size:12px; border-radius:999px; padding:6px 13px`
   - Chip 1: leading dot `width:6px; height:6px; border-radius:50%; background:#34d399` + text `Wallet connected`
   - Chip 2 (no dot): `Team of 8 loaded`
   - Chip 3 (no dot): `6 months history`

Continue: label **`Let's go`** (straight apostrophe); always enabled; clicking calls `finish()` (§6).
- **Copy difference vs README**: README says the final button is "Enter dashboard"; the file's label is `Let's go`.

---

## 6. Footer (Back / Continue)

Row: `display:flex; align-items:center; justify-content:space-between; margin-top:26px`. No divider line.

**Back** (rendered only when `step > 0`; on step 0 an empty `<div></div>` holds the left slot):
- `font-size:14px; color:#9db3aa; cursor:pointer; padding:11px 18px; border-radius:999px; transition:background .2s, color .2s; user-select:none`
- hover: `background:rgba(255,255,255,0.05); color:#e8f0ec`
- Label: `Back`. Click → `go(step - 1)`.

**Continue** (always rendered):
- `display:flex; align-items:center; gap:8px; background:#3bbf8e; color:#08331f; font-size:14.5px; font-weight:500; border-radius:999px; padding:13px 26px; transition:transform .15s, opacity .25s; user-select:none`
- hover: `transform:scale(1.03)` (applies even when disabled, per the prototype)
- Trailing chevron SVG: 15×15, viewBox `0 0 24 24`, `stroke:#08331f` (same as text color), `stroke-width:2.75; round caps/joins`, polyline `9 6 15 12 9 18`
- Enabled/disabled per step (see table). Disabled ⇒ `opacity:0.4; cursor:not-allowed` and click is ignored; enabled ⇒ `opacity:1; cursor:pointer`.

| Step | Label | Enabled when |
|---|---|---|
| 0 Welcome | `Let's get started` | always |
| 1 Name | `Continue` | first name token non-empty |
| 2 Role | `Continue` | acknowledgment card checked (`understood`) |
| 3 Avatar | `Continue` | an avatar selected |
| 4 Wallet | `Continue` | `wallet === 'connected'` |
| 5 All set | `Let's go` | always → `finish()` |

Click on last step → `finish()`; otherwise → `go(step + 1)`.

---

## 7. Component class (logic)

```
state = { step: 0, name: '', avatar: '', wallet: 'idle', understood: false, transitioning: false }
TOTAL = 6
AVATARS = ['avatars/avatar-1.svg', 'avatars/avatar-2.svg', 'avatars/avatar-3.svg', 'avatars/avatar-profile.svg']
EASE = 'cubic-bezier(0.22,1,0.36,1)'
```
Refs: `cardRef`, `contentRef`, `walletCardRef`, `chosenImgRef`, `numRef`, `digitRef`, `checkRef`, `welcomeRef`.

- `componentDidMount`: `requestAnimationFrame(() => animateIn(true))`; then `setTimeout(() => scrambleWelcome(), 280)`.
- `componentDidUpdate`: if `step` changed → `flipDigit()`.
- `go(next)`: step navigation with exit animation (§4); blocked while `transitioning`.
- `connectWallet()`: `'idle'` → `'connecting'` → (after 1250ms) → `'connected'` + chip scale-in.
- Derived: `first = name.trim().split(' ')[0] || ''`; `nameComma = first ? ', ' + first + '.' : '.'`.
- Unused-but-present renderVals outputs (safe to ignore): `avatars` array (per-item `{src, selected, ring, onPick}` — the markup uses the flattened `ring1..4/sel1..4/pick1..4/scale1..4` instead), `stepNum` (`'01'`-style two-digit string), `chosenAvatarSrc`.

### 7.1 Decrypt-scramble (`scrambleWelcome`) — exact parameters
Target string: `'Welcome to SealedPay'`. Runs on the Welcome headline only, starting **280ms** after mount.
- Reduced motion: set text instantly, no animation.
- Glyph pool: `'*#$%'` (4 chars, uniform random).
- Constants: `scrStart = 0` (all chars scramble), `per = 82` (ms per character resolve stagger), `hold = 102` (ms initial hold before char 0 resolves), flicker interval = **75ms** (random glyphs re-roll at most every 75ms; between flickers the previous random frame is reused from `cache`).
- Per rAF frame at elapsed `t`: for each index `i` — spaces always render as-is; the real character locks in once `t >= i * per + hold`; otherwise a random glyph (re-rolled only on flicker frames).
- Loop ends at `t >= target.length * per + hold + 60`, then the exact target text is set.
- **Difference vs README**: README's RevealAmount spec (40ms/frame cycle, 60ms stagger, spring scale-pop per digit, glow pulse) does NOT apply here — the welcome scramble is a separate, simpler implementation: 75ms flicker, 82ms stagger, 102ms hold, symbol glyphs `*#$%`, no per-char scale pop, no glow.

### 7.2 `finish()` — localStorage + navigation
```js
localStorage.setItem('sealedpay_onboarded', '1');                                  // always
if (name.trim()) localStorage.setItem('sealedpay_name', this.state.name.trim());  // trimmed full input
if (avatar)      localStorage.setItem('sealedpay_avatar', this.state.avatar);     // e.g. 'avatars/avatar-2.svg'
// wrapped in try/catch {} — storage failures are swallowed
window.location.href = 'DisperseKit%20Payroll.dc.html';                            // → dashboard
```

---

## 8. Seal logo SVG (verbatim, rendered 92×92 inside the 128×128 block)

```html
<svg width="92" height="92" viewBox="0 0 512 512" fill="none"><path fill="#c9bfa8" d="M38.992 42.84a7.723 7.723 0 0 1-7.265-5.107 7.722 7.722 0 0 1 4.647-9.883L68.03 16.444a7.723 7.723 0 0 1 5.236 14.53L41.609 42.381a7.692 7.692 0 0 1-2.617.459zM62.581 76.511a7.721 7.721 0 0 1-6.503-11.876l19.135-29.994a7.722 7.722 0 1 1 13.02 8.307L69.098 72.942a7.715 7.715 0 0 1-6.517 3.569z"></path><path fill="#e3dcc9" d="M121.948 276.016s27.637 72.5.756 91.11c-13.597 9.414-43.483 24.888-54.647 35.966-7.168 7.113-2.134 19.34 7.964 19.365l53.628.132c18.325.045 36.415-4.212 52.738-12.542 26.58-13.563 62.419-39.576 76.033-85.008z"></path><path fill="#e3dcc9" d="M480.697 354.34c.625-21.492-6.902-42.495-21.194-58.56-54.344-63.219-185.243-40.515-231.495-114.791-40.411-50.987-1.287-107.243-32.058-149.643C180.634 13.92 170.808.396 108.174.396 99.716 1.899 66.59-4.1 61.796 6.212a13.06 13.06 0 0 0 .339 14.974c63.066 76.152 10.821 60.009 7.713 144.573-5.159 56.561-.686 87.609 21.009 140.13 42.59 114.409 164.866 85.865 261.538 87.593 8.02.143 11.06 10.736 4.251 14.976l-.166.103c-27.992 18.259-62.495 19.128-94.316 12.415-19.662-.15-6.349 31.567 4.419 41.622 2.7 2.58 3.492 6.569 1.93 9.96-6.352 12.954-7.239 47.959 11.899 37.53 22.129-18.871 48.269-43.172 78.175-47.431 61.074-4.576 115.323-16.059 121.561-89.683l.012-.005c.255-4.833.34-13.681.537-18.629z"></path><path fill="#c9bfa8" d="M459.503 295.78c-54.344-63.219-185.243-40.515-231.495-114.791-40.411-50.987-1.287-107.243-32.058-149.643C181.073 14.42 171.371 1.176 113.429.43c21.457 5.639 29.112 15.806 39.094 27.713 30.771 44.45-8.353 115.782 32.058 169.235 46.252 77.867 177.151 54.065 231.495 120.341 14.292 16.841 21.819 38.86 21.194 61.391-.197 5.187-.282 14.463-.538 19.529l-.012.005c-1.91 23.627-8.324 41.141-18.051 54.22 33.193-10.542 57.432-32.149 61.478-79.893l.012-.005c.256-4.832.341-13.68.538-18.628.625-21.49-6.902-42.494-21.194-58.558z"></path><path fill="#c9bfa8" d="M124.11 46.385a7.722 7.722 0 0 1-7.722-7.722v-6.067c0-4.265 3.457-7.722 7.722-7.722s7.722 3.457 7.722 7.722v6.067a7.722 7.722 0 0 1-7.722 7.722z"></path></svg>
```

Palette: `#e3dcc9` (body) + `#c9bfa8` (shading/whiskers). Same mark appears on the dashboard at smaller sizes.

---

## 9. Animation summary (implementation vs README inventory)

| Animation | Implemented as | vs README |
|---|---|---|
| Card entrance | opacity 0 / y24 / scale .97 → rest, 620ms, `cubic-bezier(.22,1,.36,1)`, first mount only | Match |
| Per-step item stagger | `data-anim` items: opacity 0 / y20 → 0, 560ms each, delay 50 + i×75ms, same ease; stage also fades 320ms | Match (README omits 560ms/50ms base) |
| Step exit | stage → opacity 0, y ∓16px (direction-aware), 240ms `cubic-bezier(.4,0,1,1)` | Not in README inventory |
| Welcome decrypt-scramble | glyphs `*#$%`, 75ms flicker, 82ms/char stagger, 102ms hold, starts +280ms | README's RevealAmount params (40ms/60ms + spring pop) do NOT apply here |
| Ghost numeral flip | rotateX −90° → 12° (offset .72) → 0°, 360ms, EASE, perspective 900px | README says translateY roll — actual is rotateX flip |
| Progress fill | scaleX 0→1, origin left, .6s `cubic-bezier(.22,1,.36,1)`; height 2px→3px .4s | Match (~3px slim) |
| Progress sheen | current segment only, white 65% band, translateX −130%→230%, 1.5s ease-in-out infinite | Match |
| Seal float | translateY 0↔−9px, 5s ease-in-out infinite | Match ("slow float") |
| Seal glow pulse | aura opacity .5↔.85, 3.4s ease-in-out infinite | Match ("glow-pulse aura") |
| Aurora blobs | 2 blurred radial blobs drifting/scaling, 17s & 22s ease-in-out infinite | Not in README inventory |
| Understood check pop | scale 1→1.22→1, 300ms EASE (on check only) | Not in README inventory |
| Wallet spinner | 18px ring, 0.7s linear infinite | Match (spinner) |
| Connected chip in | opacity 0 / scale .94 → 1, 450ms EASE | Not detailed in README |
| Avatar select | background .25s, transform .2s CSS transitions; selected scale(1.15); hover translateY(−4px) | Match (~15% scale) |
| Buttons hover/tap | Continue hover scale 1.03; Connect hover 1.02 / active 0.98 | Match (README: 1.03 / 0.97 tap — Continue has no active style here) |
| Reduced motion | auroras + float via CSS media query; scramble + digit flip check `matchMedia` in JS; WAAPI entrances/exits NOT gated | README claims every animation has a fallback — stagger/exit/card entrance are not gated in the prototype; gate them in the real build |

---

## 10. Discrepancies vs README (consolidated)

1. Final button label is `Let's go`, not "Enter dashboard".
2. Welcome description uses a period, not a comma: "…in one transaction. Salaries stay encrypted…".
3. Name input radius is `98px` (pill), not 18px.
4. Step 2 card is an interactive acknowledgment checkbox (check circle, gates Continue), not a passive lightning-icon info card.
5. Ghost numeral animates with rotateX flip, not translateY roll; watermark is two digits ("01"–"06") with only the units digit flipping.
6. Card container has no glass background/border of its own and sits at `margin-left:9%` (not horizontally centered).
7. Welcome scramble parameters differ from the RevealAmount component spec (see §7.1 / §9).
8. WAAPI-driven entrances/exits lack reduced-motion gating in the prototype; add it in the real implementation per README's blanket rule.
