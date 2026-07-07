# SealedPay Dashboard — Screens + Shell Spec

Extracted verbatim from `docs/design/handoff/DisperseKit Payroll.dc.html` (1682 lines). Covers the app shell, HOME / TEAM / INSIGHTS / EMPLOYEE VIEW screens, and the right sidebar (Payroll Wallet + Recent activity, and the Employee-view right column). Modals/panels/toasts/search-palette internals are covered by a separate spec (the search bar itself and its trigger behavior are included here since they live in the shell).

All px values are as written (the design was scaled to 90%; `899.1px` radius = "fully rounded pill"). Font family everywhere: `'Manrope', sans-serif`. Default text color inherits `#e8f0ec` from the root.

---

## 0. Global / document

- `html, body { margin:0; padding:0; background:#070d0b; }`
- `* { box-sizing:border-box; }`
- Placeholder color (all inputs): `input::placeholder { color:#566a61; }`
- Scrollbars hidden everywhere: `*{scrollbar-width:none;-ms-overflow-style:none} *::-webkit-scrollbar{display:none;width:0;height:0}`
- Component props (theme knobs):
  - `accentColor` default `#3bbf8e` (options `#3bbf8e`, `#5fe3ab`, `#2f7d5e`)
  - `barColor` default `#8fd7c0` (options `#8fd7c0`, `#dff2ea`, `#6fc3e0`, `#8b7cf6`)

## 1. Shell

### 1.1 Root container
```
div (app root)
  width:100%; min-width:1062px; height:100vh;
  display:flex; flex-direction:column;
  font-family:'Manrope',sans-serif; color:#e8f0ec;
  position:relative; overflow:hidden;
  background:
    radial-gradient(585px 459px at 90% 45%, rgba(90,160,131,0.52), rgba(0,0,0,0) 62%),
    radial-gradient(426.01px 365.15px at -1% 70%, rgba(90,160,131,0.40), rgba(0,0,0,0) 60%),
    linear-gradient(180deg, #0c1310 0%, #101915 50%, #0d1411 100%)
```
The two radial glows are part of the root background — they never scroll (root is `overflow:hidden`; only the content column scrolls).

### 1.2 Reusable style tokens (exact strings, reused constantly below)
- **Glass inset shadow** (used on every glass card, tab pill, rail, search bar):
  `inset 0 7.2px 12.6px -7.2px rgba(255,255,255,0.056), inset 8.1px 0 16.2px -10.8px rgba(150,235,255,0.032), inset -8.1px -7.2px 16.2px -10.8px rgba(255,160,225,0.026)`
- **Standard card**: `background:rgba(110,196,186,0.16)` + glass inset shadow; radius `21.6px`; no border.
- **Rail/search surface**: `border:0.9px solid rgba(225,248,238,0.045); background:rgba(110,196,186,0.06)` + glass inset shadow.
- **Set-E status pill** (Verified / Active / Employer-only): `background:rgba(0,0,0,0); border:0.9px solid rgba(95,230,175,0.55); color:#78e9c0; font-weight:400; border-radius:899.1px` (font-size/padding vary per use, noted inline).
- **Pending pill**: same but `border:0.9px solid rgba(224,178,95,0.6); color:#e6c082`.
- **Green gradient card**: `linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%)`, radius `18px`, with two decorative circles: 153px circle at `top:-45px;right:-36px` `rgba(255,255,255,0.10)` and 99px circle at `top:-14.4px;right:50.4px` `rgba(255,255,255,0.07)` (wallet-card variant uses 144px @ `top:-36px;right:-27px` and 90px @ `top:-9px;right:54px`).
- **Row hover fill**: `style-hover="background:rgba(95,230,175,0.1)"` on `border-radius:999px` rows, `transition:background .15s`.
- **Verified check icon**: circle-check SVG, `fill:currentColor` (`#78e9c0` inside pills).

### 1.3 Floating top bar
```
div (top bar)  position:absolute; top:0; left:0; right:0; z-index:40;
               display:flex; align-items:center; gap:21.6px;
               padding:16.2px 32.4px 9px 32.4px
  ├─ div (top-edge fade)  position:absolute; inset:0; z-index:-1; pointer-events:none;
  │     background:linear-gradient(180deg, rgba(12,19,16,0.98) 0%, rgba(12,19,16,0.97) 70%, rgba(12,19,16,0.72) 84%, rgba(12,19,16,0) 100%);
  │     opacity:0; transition:opacity .25s
  │     — set to opacity 1 when content scrollTop > 6, back to 0 at top (via content onScroll handler)
  ├─ div (logo block)  display:flex; align-items:center; gap:9px
  │   ├─ seal SVG  width:30.6 height:30.6, viewBox 0 0 512 512, path fills #c9bfa8 / #e3dcc9 (inline seal mark — extract from source)
  │   └─ wordmark "SealedPay"  font-weight:700; font-size:14.4px; color:#f2f7f4
  ├─ div (search wrapper)  position:relative; z-index:60; margin-left:32.4px
  │   ├─ div (search bar)  display:flex; align-items:center; gap:9px; width:306px;
  │   │     border:0.9px solid rgba(225,248,238,0.045); background:rgba(110,196,186,0.06);
  │   │     backdrop-filter:blur(12px); + glass inset shadow;
  │   │     border-radius:899.1px; padding:10.8px 18px
  │   │   ├─ magnifier SVG 14.4×14.4, stroke #9db3aa, stroke-width 1.5
  │   │   └─ input  placeholder "Search employees or payouts";
  │   │         background:transparent; border:none; outline:none; color:#e8f0ec;
  │   │         font-size:11.7px; font-family:'Manrope'; flex:1
  │   └─ (search palette mounts here on focus — covered by the modals spec.
  │       Trigger: onFocus/onInput sets searchOpen+searchMounted; overlay is
  │       position:fixed;inset:0;z-index:-1;background:#0D1411F2; Esc or
  │       overlay-click closes. Focus animates bar scale 1→1.02 with
  │       drop-shadow(0 0 6px rgba(120,233,192,0.35)) over 220ms.)
  └─ div (right cluster)  margin-left:auto; display:flex; align-items:center; gap:12.6px
      └─ img (profile avatar)  src "avatars/avatar-profile.svg" (or localStorage 'sealedpay_avatar');
            alt "Profile"; width:39.6px; height:39.6px; border-radius:50%;
            border:1.8px solid rgba(255,255,255,0.15); object-fit:cover;
            background:linear-gradient(135deg,#34d399,#0e9f6e); cursor:pointer
            onClick → opens Profile popup
```
Note: bell + gear are NOT in the top bar — they live in the left rail (below).

### 1.4 Body grid + scroll architecture
```
div (body row)  flex:1; min-height:0; display:flex; padding:0 0 0 32.4px
  ├─ Side rail (fixed, does not scroll)
  └─ div (content scroller)  flex:1; min-height:0; overflow-y:auto;
        padding:97.2px 32.4px 21.6px 25.2px          ← 97.2px top clears floating bar
        onScroll: fadeRef.style.opacity = scrollTop > 6 ? '1' : '0'
      ├─ div (content grid)  display:grid; grid-template-columns:1fr 368.28px;
      │     gap:25.2px; align-items:start
      │   ├─ Main column: display:flex; flex-direction:column; gap:19.8px
      │   │     (HOME | TEAM | INSIGHTS | EMPLOYEE VIEW switch here on nav state)
      │   └─ Right column (sidebar; content depends on nav — §6/§7)
      └─ Footer attribution (inside the scroller, below the grid):
            text-align:center; font-size:9.9px; color:#6f8577;
            padding:16.2px 0 9px 0; padding-top:35px
            text: "SealedPay · Powered by DisperseKit · TokenOps disperse · Zama FHE"
```
- The document body never scrolls; only this content scroller. Rail, top bar, and background glows stay fixed.
- No max-width on the content column; it fills `1fr` of the grid.

### 1.5 Left icon rail
```
div (rail)  display:flex; flex-direction:column; align-items:center;
            flex-shrink:0; width:57.6px; padding:97.2px 0 21.6px 0; z-index:5
  ├─ div (nav cluster)  flex column, align center, gap:7.2px;
  │     border:0.9px solid rgba(225,248,238,0.045); background:rgba(110,196,186,0.06);
  │     + glass inset shadow; border-radius:899.1px; padding:0
  │   ├─ Home puck    (nav 0)
  │   ├─ Team puck    (nav 1)
  │   └─ Insights puck(nav 2)
  │   Each puck: width:39.6px; height:39.6px; border-radius:50%;
  │     background:{selected ? '#f5f8f6' : 'rgba(0,0,0,0)'};
  │     display:flex; align-items:center; justify-content:center;
  │     cursor:pointer; transition:background .2s
  │   Icon: SVG 15.3×15.3, filter:drop-shadow(0 0 5.4px rgba(240,250,245,0.18));
  │     color = selected ? '#568570' : '#9db3aa'
  │     (Home icon uses fill; Team/Insights use stroke, stroke-width 2, round caps.
  │      Home = house, Team = two-people, Insights = 3 vertical bars at x 6/12/18.)
  │   Selection: navSel = (nav === 3 ? 1 : nav)  ← Team puck stays selected inside Employee View
  ├─ div (bell + gear cluster)  same pill container styling; margin-top:19.8px; gap:6.12px
  │   ├─ Bell puck  39.6px circle, transparent bg, hover background:rgba(95,230,175,0.1);
  │   │     bell SVG 15.3, stroke #9db3aa, stroke-width 2, drop-shadow as above
  │   │   ├─ unread dot (when any unread notif): position:absolute; top:9px; right:9px;
  │   │   │     width:6.3px; height:6.3px; border-radius:50%; background:#34d399
  │   │   └─ (Notifications popup anchors here at left:50.4px; top:-7.2px — other spec)
  │   └─ Gear puck  identical geometry; gear SVG stroke #9db3aa
  │         (Settings popup anchors here — other spec)
  └─ Logout button  margin-top:auto (pinned to rail bottom);
        width:39.6px; height:39.6px; border-radius:50%;
        border:0.9px solid rgba(225,248,238,0.045); background:rgba(110,196,186,0.06);
        + glass inset shadow; hover background:rgba(95,230,175,0.1);
        door/logout SVG 15.3, fill #9db3aa, drop-shadow(0 0 5.4px rgba(240,250,245,0.18))
        onClick → logoutOpen = true (closes any popup)
```

---

## 2. HOME screen (nav === 0)

Main column order: Title → Tab row → Payout Activity card → bottom row (Team donut | Monthly payroll + Last run).

### 2.1 Title
`"Payroll"` — `font-weight:500; font-size:37.8px; color:#f2f7f4; letter-spacing:0.45px; line-height:1.06`

### 2.2 Tab row
`div display:flex; gap:12.6px` with 4 pills, labels exactly: `All`, `Payouts`, `Verifications`, `Team`. State `tab` (default `'All'`); clicking sets it (cosmetic only — no content change is wired).

Per pill: `font-size:12.6px; border-radius:899.1px; padding:9.9px 21.6px; cursor:pointer; transition:background .2s, color .2s; user-select:none; border:none; font-weight:400`
- **Active**: `background:{accentColor}` (#3bbf8e), `color:#0b1512`, `box-shadow:none`
- **Inactive**: `background:rgba(110,196,186,0.16)`, `color:#9db3aa`, box-shadow = glass inset shadow

### 2.3 Payout Activity card
```
card  background:rgba(110,196,186,0.16); + glass inset shadow;
      border-radius:21.6px; padding:19.8px 23.4px 16.2px 23.4px
  ├─ header row  flex; align-items:center; justify-content:space-between
  │   ├─ "Payout Activity"  font-weight:400; font-size:17.1px
  │   └─ "View All" + chevron-right  flex; gap:3.6px; font-size:10.8px; color:#9db3aa;
  │        cursor:pointer; hover color:#e8f0ec; chevron SVG 10.8×10.8 stroke #9db3aa w2
  │        onClick → nav = 2 (Insights)
  ├─ chart row  display:flex; gap:12.6px; margin-top:16.2px
  │   ├─ Y axis  flex column; justify-content:space-between; height:111.6px;
  │   │    font-size:9.9px; color:#8ba297; padding-bottom:1.8px; width:28.8px; flex-shrink:0
  │   │    labels top→bottom: "5k","4k","3k","2k","1k","0"
  │   │    (computed: yStep=1000, niceMax=5000 while max month total ≤ 5000;
  │   │     else yStep=ceil(max/5/1000)*1000, niceMax=yStep*5; label fmt: 0→"0",
  │   │     multiples of 1000 → "{v/1000}k", else "{(v/1000).toFixed(1)}k")
  │   └─ Bars  flex:1; display:grid; grid-template-columns:repeat({6},1fr);
  │        gap:19.8px; align-items:end; height:111.6px; position:relative
  │        one cell per HISTORY month (Feb…Jul), onMouseEnter → bar = month (persists; default 'May')
  │        cell: flex column; align-items:center; height:111.6px; justify-content:flex-end;
  │              position:relative; cursor:pointer
  │        └─ segments stack  position:relative; width:54px; display:flex;
  │              flex-direction:column-reverse; gap:3px
  │            ├─ base segment: width:54px; height:max(total/niceMax*111.6, 3)px;
  │            │    border-radius:13.86px; transform-origin:bottom; transition:background .25s;
  │            │    background: active month → barColor (#8fd7c0 solid)
  │            │                inactive     → hatch pattern (below)
  │            ├─ run-cap segments (one per completed Run-Payroll run in that month,
  │            │    stacked above the base via column-reverse; data-cap="{run.id}"):
  │            │    same width/radius/bg rules; height:max(runTotal/niceMax*111.6, 8)px
  │            │    New cap animates in: scaleY 0→1 + opacity 0.4→1, 520ms cubic-bezier(.22,1,.36,1)
  │            └─ when active (bar === month), two extra absolutely-positioned elements:
  │                ├─ glass tooltip: position:absolute; bottom:calc(100% + 21.6px); left:50%;
  │                │    transform:translateX(-64%); background:rgba(57,70,67,0.82);
  │                │    backdrop-filter:blur(9px); border:0.9px solid rgba(255,255,255,0.14);
  │                │    box-shadow:inset 0 0.9px 0 0 rgba(255,255,255,0.16), inset 0 -0.9px 0 0 rgba(255,255,255,0.04);
  │                │    color:#cfd8d6; font-size:10.8px; font-weight:400; border-radius:899.1px;
  │                │    padding:6.3px 10.8px; white-space:nowrap; z-index:3
  │                │    text: "{fmtAmount(monthTotal)} cUSDd · {monthPaid} paid"  e.g. "4,400.5 cUSDd · 7 paid"
  │                └─ ring marker: position:absolute; top:-12.6px; left:50%;
  │                     transform:translateX(-50%); width:24.3px; height:24.3px;
  │                     border-radius:50%; border:5.4px solid #f5f8f6; background:transparent;
  │                     box-shadow:0 0 9px 2.7px rgba(240,248,232,0.30),
  │                                0 0 23.4px 9px rgba(240,248,232,0.12),
  │                                inset 0 0 8.1px 1.8px rgba(245,252,248,0.40); z-index:3
  └─ month labels row  display:grid; grid-template-columns:repeat(6,1fr); gap:19.8px;
        margin-left:41.4px; margin-top:7.2px
        each: text-align:center; font-size:9.9px; color:#8ba297 — "Feb" … "Jul"
```
**Hatch pattern CSS** (inactive bars), keyed off `barColor`:
`repeating-linear-gradient(135deg, {light} 0 1.35px, {dark} 1.35px 5.85px)` where
`#8fd7c0 → ['#87a69a','#28382f']` (default), `#dff2ea → ['#9db0a7','#2e3b35']`, `#6fc3e0 → ['#84acbf','#1d3a47']`, `#8b7cf6 → ['#8388b5','#252a52']`.

**Chart seed data** (`HISTORY`):
| month | date | paid | total | tx |
|---|---|---|---|---|
| Feb | Feb 28, 2026 | 6 | 3750.5 | 0x8b99…5206 |
| Mar | Mar 31, 2026 | 6 | 3750.5 | 0x1c2d…88aa |
| Apr | Apr 30, 2026 | 7 | 4400.5 | 0x9e0f…41bc |
| May | May 31, 2026 | 7 | 4400.5 | 0x77ab…c3d9 |
| Jun | Jun 30, 2026 | 8 | 4500.5 | 0x42d0…720f |
| Jul | Jul 5, 2026 | 8 | 4500.5 | 0xc396…e025 |

Amount formatting everywhere: `toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:1})` (e.g. `4,500.5`).

### 2.4 Bottom row
`div display:grid; grid-template-columns:1.35fr 1fr; gap:19.8px`

#### Team donut card (left)
```
card  glass 0.16; radius 21.6px; padding:16.2px 23.4px; display:flex; flex-direction:column
  ├─ header: "Team" (17.1px/400) | "View All"+chevron (same styles as §2.3) → nav = 1
  └─ body  flex; align-items:center; gap:23.4px; margin-top:7.2px; flex:1
      ├─ donut wrapper  position:relative; width:144px; height:144px
      │   ├─ <canvas> (Chart.js doughnut, display:block)
      │   └─ center overlay  absolute inset 0; flex column center
      │       ├─ "08"  font-weight:700; font-size:19.8px
      │       └─ "Employees"  font-size:9.9px; color:#9db3aa
      └─ legend  flex column; gap:16.2px — 3 rows, each:
            flex; align-items:flex-start; gap:8.1px
            ├─ dot 8.1×8.1 circle, margin-top:3.6px, background:{color}
            └─ ├─ label  font-size:11.7px; font-weight:600; color:#e8f0ec
               └─ amount font-size:10.8px; color:#9db3aa
          rows: Engineering/"4 people"/#8b7cf6 · Design/"2 people"/#d7ee59 · Operations/"2 people"/#3bbf8e
```
Chart.js doughnut config: `data [4,2,2]`, `labels ['Engineering','Design','Operations']`, `backgroundColor ['#8b7cf6','#d7ee59','#3bbf8e']`, `borderWidth:0, borderRadius:16, spacing:5, hoverOffset:4`; options `cutout:'68%', rotation:253, maintainAspectRatio:false, legend off`; tooltip: `backgroundColor rgba(236,244,240,0.96), titleColor/bodyColor #20302a, Manrope 700/600, displayColors:false, padding:10, cornerRadius:10, label = " {n} people"`.

#### Monthly payroll + Last run (right, stacked)
`div flex column; gap:19.8px` — two cards, each `glass 0.16; radius 21.6px; padding:13.5px 21.6px; flex:1`.

**Monthly payroll card**
```
  ├─ header row: "Monthly payroll"  17.1px / 400
  ├─ value: <span>{monthlyEl} cUSDd</span>  font-weight:700; font-size:27px;
  │    margin-top:7.2px; white-space:nowrap
  │    monthlyEl = RevealAmount(value:'4.5K', revealed:true, accent:'#78e9c0', reserve:false)
  │    ⚠ As coded this value is ALWAYS revealed ("4.5K cUSDd"); no click handler on this card.
  │      (README describes a masked/tap-reveal state — see gaps.)
  └─ footer row  flex; justify-content:space-between; margin-top:9px
      ├─ "8 salaries"  10.8px; #9db3aa
      └─ ENCRYPTED puck + tooltip  (wrapper position:relative; display:flex;
            onMouseEnter → tip='enc', onMouseLeave → tip=null)
          ├─ puck: 27.72×27.72 circle; background:rgba(95,230,175,0.14);
          │    border:0.9px solid rgba(95,230,175,0.35); color:#78e9c0;
          │    lock SVG 10.59×10.59 fill currentColor
          └─ tooltip pill: position:absolute; bottom:calc(100% + 7px); left:50%;
               transform:translateX(-50%); background:rgba(18,30,25,0.97); color:#e8f0ec;
               font-size:9.9px; font-weight:500; padding:4.5px 9px; border-radius:7.2px;
               white-space:nowrap; pointer-events:none; transition:opacity .11s ease;
               box-shadow:0 6px 16px -6px rgba(0,0,0,0.6);
               border:0.9px solid rgba(255,255,255,0.09); z-index:30;
               opacity:{tip==='enc' ? 1 : 0}
               text: "Encrypted"
```

**Last run card** — identical anatomy:
- Header: `"Last run"` 17.1px/400
- Value: `"Jul 5 Sun"` — 27px/700, margin-top 7.2px (row has `gap:8.1px`)
- Footer left: `"8 employees paid"` 10.8px #9db3aa
- Footer right: same 27.72px puck but with circle-check SVG 11.56×11.56; tooltip text `"Verified"` (opacity keyed to `tip==='ver'`).

---

## 3. TEAM screen (nav === 1)

Main column order: Title row → 2 hero cards → Employees roster card.

### 3.1 Title row
```
div  flex; align-items:center; justify-content:space-between
  ├─ "Team"  37.8px / 500; #f2f7f4; letter-spacing:0.45px
  └─ div  flex; align-items:center; gap:10.8px
      ├─ "Add employee" (secondary)  background:rgba(110,196,186,0.16); + glass inset shadow;
      │    color:#cfdcd6; font-size:12.6px; font-weight:500; border-radius:899.1px;
      │    padding:9.9px 19.8px; cursor:pointer; transition:transform .15s;
      │    hover transform:scale(1.03)
      │    onClick → addOpen = true (Add Employee modal)
      └─ "Run payroll" (primary)  flex; gap:7.2px; background:{accentColor};
           color:#0b1512; font-size:12.6px; font-weight:600; border-radius:899.1px;
           padding:9.9px 21.6px; transition:transform .15s, box-shadow .2s;
           hover: transform:scale(1.03); box-shadow:0 0 0 1px rgba(120,233,192,0.4), 0 6px 22px -6px rgba(59,191,142,0.6)
           active: transform:scale(0.97)
           leading play-triangle SVG 14.4×14.4 stroke #0b1512 w2.5
           onClick → opens Run Payroll modal
```

### 3.2 Hero cards
`div display:grid; grid-template-columns:1fr 1fr; gap:19.8px`

**Headcount gradient card (left)**
```
div  position:relative; border-radius:18px;
     background:linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%);
     padding:19.8px; overflow:hidden; min-height:171px
  ├─ deco circle 153px @ top:-45px right:-36px  rgba(255,255,255,0.10)
  ├─ deco circle 99px  @ top:-14.4px right:50.4px  rgba(255,255,255,0.07)
  ├─ top row (space-between): "Headcount" 10.8px rgba(240,250,245,0.85)
  │     | "ACTIVE" 11.7px / 800; letter-spacing:0.9px; rgba(240,250,245,0.9)
  ├─ "8 employees"  25.2px / 700; #fff; margin-top:18px
  ├─ "3 departments"  10.8px; rgba(240,250,245,0.75); margin-top:1.8px
  └─ bottom row (space-between, align-items:flex-end, margin-top:16.2px):
        "6 payroll runs completed"  12.6px; letter-spacing:0.45px; rgba(240,250,245,0.95)
        | "since Feb 2026"  9.9px; rgba(240,250,245,0.7)
```

**Monthly payroll encrypted card (right)**
```
div  position:relative; border-radius:18px; background:rgba(110,196,186,0.16);
     + glass inset shadow; padding:19.8px; overflow:hidden; min-height:171px
  ├─ deco circle 153px @ top:-45px right:-36px  rgba(139,124,246,0.12)   ← purple tint
  ├─ top row: "Monthly payroll" 10.8px #9db3aa
  │     | "ENCRYPTED" 11.7px / 800; letter-spacing:0.9px; #9db3aa
  ├─ value row  onClick → toggle revealMonthly;  flex; gap:8.1px;
  │     700 / 25.2px; #f2f7f4; margin-top:18px; cursor:pointer
  │     <span>{monthlyEl} cUSDd</span>   (same always-revealed RevealAmount as Home — see gaps)
  ├─ "8 salaries · encrypted on-chain"  10.8px; #9db3aa; margin-top:1.8px
  └─ bottom row (space-between, flex-end, margin-top:16.2px):
        "Next payout · Jul 31"  12.6px; letter-spacing:0.45px; #cfdcd6
        | "in 26 days"  9.9px; #9db3aa
```

### 3.3 Employees roster card
```
card  glass 0.16; radius 21.6px; padding:19.8px 23.4px
  ├─ header (space-between): "Employees" 17.1px/400
  │     | "{count} people" 10.8px #9db3aa   (e.g. "8 people"; count = 8 + added extras)
  └─ list  flex column; gap:5.4px; margin:10.8px -12.6px 0 -12.6px;
        padding:0 12.6px; max-height:273.6px; overflow-y:auto; overflow-x:hidden
        ← internal scroll threshold: ~5 rows visible, rest scroll
      row (per employee, clickable):
        flex; align-items:center; gap:11.7px; padding:7.2px 12.6px; border-radius:999px;
        cursor:pointer; transition:background .15s; hover background:rgba(95,230,175,0.1)
        onClick → nav=3, empIndex=i, empReveal=false, empRows={}
        ├─ avatar puck  36×36 circle; background:rgba(59,191,142,0.18);
        │     border:0.9px solid rgba(255,255,255,0.06); centered initials
        │     initials: first letter of each name word (e.g. "PS"); 800 / 11.7px; #d3ecdd
        ├─ ├─ name  13.5px / 600; #eef4f1
        │  └─ sub   "{role} · {wallet}"  10.35px; #9db3aa; margin-top:0.9px
        │       e.g. "Engineer · 0x83A1…9AF2"
        └─ trailing  margin-left:auto; flex; gap:9px
            └─ "Active" pill  Set-E pill; font-size:10.8px; padding:4px 13px
```

**Employee seed data** (`EMPLOYEES`):
| name | role | dept | wallet | salary | start | joined |
|---|---|---|---|---|---|---|
| Priya Sharma | Engineer | Engineering | 0x83A1…9AF2 | 850 | 0 | Feb 2026 |
| Arjun Mehta | Engineer | Engineering | 0x91B2…B3E1 | 780 | 0 | Feb 2026 |
| Mei Lin | Backend Engineer | Engineering | 0xA4C3…C4F2 | 720 | 0 | Feb 2026 |
| Daniel Okafor | Platform Engineer | Engineering | 0xB5D4…D5A3 | 650 | 2 | Apr 2026 |
| Sofia Reyes | Product Designer | Design | 0xC6E5…E6B4 | 560.5 | 0 | Feb 2026 |
| Elena Petrova | Brand Designer | Design | 0xD7F6…F7C5 | 420 | 3 | May 2026 |
| Rohan Gupta | Operations Lead | Operations | 0xE8A7…A8D6 | 320 | 0 | Feb 2026 |
| Marcus Chen | Community Manager | Operations | 0xF9B8…B9E7 | 200 | 4 | Jun 2026 |

(`start` = index into HISTORY of first paid run; payment history = `HISTORY.slice(start)` reversed, plus any live runs that included this employee.)

---

## 4. INSIGHTS screen (nav === 2)

Main column order: Title → Payroll health chart card → grid(Payroll runway | Privacy scorecard).

### 4.1 Title
`"Insights"` — 37.8px / 500; #f2f7f4; letter-spacing:0.45px

### 4.2 Payroll health line-chart card
```
card  glass 0.16; radius 21.6px; padding:19.8px 23.4px
  ├─ header (space-between)
  │   ├─ "Payroll health"  17.1px / 400
  │   └─ legend  flex; gap:14.4px — two chips (dot 8.1px circle + label 10.8px #9db3aa, gap 6.3px):
  │        #3bbf8e "Employees paid"  ·  #8b7cf6 "Gas (ETH)"
  └─ chart wrapper  position:relative; height:252px; margin-top:14.4px  → <canvas>
```
Chart.js line config (dual axis): labels = HISTORY months (Feb…Jul).
- Dataset "Employees paid" (axis `y`): data `[6,6,7,7,8,8]` (from HISTORY.paid); `borderColor:#3bbf8e; backgroundColor:rgba(59,191,142,0.10); fill:true; tension:0.45; borderWidth:3; pointRadius:0; pointHoverRadius:5; pointBackgroundColor:#3bbf8e`
- Dataset "Gas (ETH)" (axis `y1`): data `[0.0013, 0.0013, 0.0014, 0.0014, 0.0015, 0.0015]`; `borderColor:#8b7cf6; backgroundColor:rgba(139,124,246,0.08)`; rest identical.
- Options: `interaction {mode:'index', intersect:false}`; legend off; tooltip = same light style as donut (`rgba(236,244,240,0.96)`, `#20302a`, Manrope 700/600, padding 10, cornerRadius 10, displayColors:false) with labels `" {y} paid"` / `" {y.toFixed(4)} ETH"`.
- Scales: `x` grid `rgba(255,255,255,0.04)`, ticks `#8ba297` Manrope 11; `y` min 0 max 10 stepSize 2, grid `rgba(255,255,255,0.05)`; `y1` right side, min 0 max 0.002, `drawOnChartArea:false`, tick callback `v===0 ? '0' : v.toFixed(4)`.

### 4.3 Bottom grid
`div display:grid; grid-template-columns:1fr 1fr; gap:19.8px`

**Payroll runway card**
```
card  glass 0.16; radius 21.6px; padding:18px 21.6px
  ├─ "Payroll runway"  16.2px / 400
  ├─ value block  onClick → toggle revealRunway;  700 / 27px; margin-top:7.2px; cursor:pointer
  │   ├─ {runwayEl}  RevealAmount(value:'04', revealed: showAll || revealRunway, accent:'#78e9c0')
  │   │     masked default → "***" (weight 400)
  │   └─ "runs left"  (font-weight:700, same 27px line)
  └─ footer (space-between, margin-top:5.4px)
      ├─ "at 4.5K / run · {hint}"  10.8px; #9db3aa
      │     hint = revealed ? "tap to hide" : "tap to reveal"
      └─ "Employer-only" pill  Set-E pill w/ leading lock SVG 9.9×9.9;
            flex; gap:4.5px; font-size:9.9px; padding:4.5px 10.8px
```

**Privacy scorecard card**
```
card  glass 0.16; radius 21.6px; padding:18px 21.6px
  ├─ "Privacy scorecard"  16.2px / 400
  ├─ value row  flex; align-items:baseline; gap:6.3px; margin-top:7.2px
  │   ├─ "48"  700 / 27px
  │   └─ "amounts encrypted"  12.6px; #9db3aa
  └─ two-column strip  flex; gap:14.4px; margin-top:12.6px; padding-top:12.6px;
        border-top:0.9px solid rgba(255,255,255,0.08)
      ├─ col flex:1
      │   ├─ "Public"  9.9px / 600; letter-spacing:0.2px; #9db3aa
      │   └─ "Transactions · recipients · timing"  10.35px; #c2d0c9; margin-top:3.6px; line-height:1.4
      └─ col flex:1
          ├─ "Private"  9.9px / 600; letter-spacing:0.2px; #78e9c0
          └─ "Every amount"  10.35px; #c2d0c9; margin-top:3.6px; line-height:1.4
```

---

## 5. EMPLOYEE VIEW (nav === 3)

Entered by clicking a roster row or an employee search result. Team rail puck stays selected. Main column order: Title → chip/back row → Salary hero → Payment history card → footnote. (The 3 stat cards live in the RIGHT column — §7.)

### 5.1 Title
`{employee name}` (e.g. "Priya Sharma") — 37.8px / 500; #f2f7f4; letter-spacing:0.45px

### 5.2 Connected chip + Back row
```
div  flex; align-items:center; justify-content:space-between; gap:12.6px
  ├─ Connected chip (left)  flex; gap:7.2px; background:rgba(110,196,186,0.16);
  │     + glass inset shadow; color:#9db3aa; font-weight:400; font-size:12.6px;
  │     border-radius:899.1px; padding:9.9px 21.6px; user-select:none
  │   ├─ dot 6.3×6.3 circle #34d399
  │   └─ "Connected · {wallet}"   e.g. "Connected · 0x83A1…9AF2"
  └─ Back button (right, ghost outline)  onClick → nav = 1
        flex; gap:6.3px; background:transparent; border:0.9px solid rgba(255,255,255,0.14);
        color:#b8c6bf; font-weight:500; font-size:12.6px; border-radius:899.1px;
        padding:9px 18px; transition:background .2s, color .2s;
        hover: background:rgba(255,255,255,0.06); color:#e8f0ec
        chevron-left SVG 12.6×12.6 stroke currentColor w2.5 + "Back"
```

### 5.3 Salary hero card
```
div  position:relative; border-radius:18px;
     background:linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%);
     padding:19.8px; overflow:hidden; min-height:171px
  ├─ deco circles 153px/99px (as §3.2 headcount card)
  ├─ top row  space-between; position:relative; z-index:1
  │   ├─ "Salary"  25.2px; rgba(240,250,245,0.85)
  │   └─ Reveal toggle  onClick → toggle empReveal
  │        flex; gap:5.4px; background:#f5f8f6; color:#14503b; 700 / 11.7px;
  │        border-radius:899.1px; padding:9px 18px; white-space:nowrap; flex-shrink:0;
  │        transition:transform .15s; hover scale(1.05); active scale(0.95)
  │        lock SVG 11.7×11.7 fill #14503b + label: "Reveal" | "Hide"
  ├─ amount row  flex; gap:9px; 700 / 25.2px; #fff; margin-top:12.6px
  │     <span>{empSalaryEl}{" cUSDd / month"}</span>
  │     empSalaryEl = RevealAmount(value: fmtAmount(salary), revealed: showAll || empReveal,
  │                                accent:'#bff0d6')  → masked "*** cUSDd / month"
  ├─ "Decrypted locally with your wallet signature. Only you and your employer can see this."
  │     10.8px; rgba(240,250,245,0.75); margin-top:3.6px
  └─ bottom row  space-between; align-items:flex-end; margin-top:16.2px
      ├─ "{wallet}"  12.6px; letter-spacing:0.9px; rgba(240,250,245,0.95)
      └─ "cUSDd · Sepolia"  9.9px; rgba(240,250,245,0.7)
```

### 5.4 Payment history card
```
card  glass 0.16; radius 21.6px; padding:19.8px 23.4px
  ├─ header (space-between): "Payment history" 17.1px/400
  │     | "{n} payments" 10.8px #9db3aa   (n = rows, e.g. "6 payments")
  └─ list  flex column; gap:5.4px; margin:10.8px -12.6px 0 -12.6px; padding:0 12.6px;
        max-height:270.9px; overflow-y:auto; overflow-x:hidden   ← ~6 rows then scroll
      row:  flex; align-items:center; gap:11.7px; padding:7.2px 12.6px;
            border-radius:999px; transition:background .15s; hover rgba(95,230,175,0.1)
        ├─ icon puck  36×36 circle; background:rgba(59,191,142,0.18);
        │     border:0.9px solid rgba(255,255,255,0.06);
        │     receipt-with-check SVG 17×17 fill #cfe5d8
        ├─ ├─ date  "{h.date}"  13.5px / 600; #eef4f1   e.g. "Jul 5, 2026"
        │  └─ sub  "{h.tx} · Etherscan"  10.35px; #9db3aa; margin-top:0.9px; white-space:nowrap
        │       "Etherscan" span: color:#4ecba0; cursor:pointer; hover text-decoration:underline
        │       e.g. "0xc396…e025 · Etherscan"
        └─ trailing  margin-left:auto; flex; gap:9px
            ├─ amount  onClick → toggles THIS row's reveal (empRows[h.month]);
            │     13.5px / 700; #eef4f1; cursor:pointer
            │     "{amountEl} cUSDd" — RevealAmount(value: fmtAmount(emp.salary),
            │        revealed: showAll || empRows[key], accent:'#78e9c0') → masked "*** cUSDd"
            └─ "Verified" badge  Set-E pill w/ circle-check SVG 9.9×9.9;
                  flex; gap:3.6px; font-size:9px; padding:2.7px 9px
```
History rows = live runs that included this employee (newest first, real Etherscan URLs), then `HISTORY.slice(emp.start)` reversed (newest first). Every row shows the employee's own monthly salary as the amount.

### 5.5 Footnote (below the card, in main column)
`"Amounts are encrypted on-chain. Etherscan proves each payment happened; the amount itself stays private."` — 10.8px; #9db3aa; line-height:1.6

---

## 6. Right sidebar — Payroll Wallet (shown whenever nav !== 3, i.e. Home, Team AND Insights)

Right grid column, width 368.28px.

### 6.1 Container
```
div  background:rgba(110,196,186,0.07);            ← dimmer glass variant
     + glass inset shadow;
     border-radius:25.2px 25.2px 42.3px 42.3px;     ← enlarged bottom corners
     padding:19.8px 19.8px 18px 19.8px; display:flex; flex-direction:column; gap:0
  ├─ header: "Payroll Wallet"  18px / 500
  ├─ stacked card block (§6.2)
  └─ Recent activity panel (§6.3) — overlaps upward
```

### 6.2 Stacked balance card
```
div (stack wrapper)  position:relative; margin-top:43px; height:156.6px;
                     margin-left:1.35px; margin-right:1.35px
  ├─ ghost layer 1 (back):  position:absolute; top:0; left:21.6px; right:21.6px;
  │     height:36px; border-radius:14.4px 14.4px 0 0;
  │     background:rgba(94,190,158,0.28); border:0.9px solid rgba(170,235,210,0.14)
  ├─ ghost layer 2 (mid):   position:absolute; top:10.8px; left:10.8px; right:10.8px;
  │     height:36px; border-radius:14.4px 14.4px 0 0;
  │     background:rgba(94,190,158,0.46); border:0.9px solid rgba(170,235,210,0.20)
  └─ balance card (front):  position:absolute; top:23.4px; left:0; right:0; height:183.6px;
        border-radius:18px; background:linear-gradient(135deg,#41b091 0%,#2e9478 50%,#26826a 100%);
        padding:18px 19.8px; overflow:hidden
        (card is taller than the 156.6px wrapper — its bottom is tucked under the activity panel)
      ├─ deco circle 144px @ top:-36px right:-27px  rgba(255,255,255,0.10)
      ├─ deco circle 90px  @ top:-9px right:54px    rgba(255,255,255,0.07)
      └─ top row  flex; space-between; align-items:flex-start
          ├─ left block
          │   ├─ label row  flex; gap:7.2px; font-size:10.8px;
          │   │     color:rgba(240,250,245,0.85); margin-top:12.6px
          │   │   ├─ "Available balance"
          │   │   └─ eye toggle  onClick → toggle revealBalance; cursor:pointer;
          │   │        opacity:0.85 (hover 1); eye SVG 12.6×12.6 stroke rgba(240,250,245,0.9) w2
          │   └─ value  flex; gap:9px; margin-top:1.8px
          │       └─ div  font-weight:400; font-size:23.4px; color:#fff;
          │             line-height:1.15; min-width:118.8px
          │           {balanceEl}                      ← RevealAmount(value:'22,350.50',
          │                                               revealed: showAll || revealBalance,
          │                                               accent:'#78e9c0'); masked "***"
          │           └─ nested div "cUSDd"  font-weight:700  (second line)
          └─ "+" fund button  title="Fund"; onClick → fundOpen = true
                39.6×39.6 circle; background:#f5f8f6; z-index:1; flex-shrink:0;
                transition:transform .15s; hover scale(1.08); active scale(0.94)
                plus SVG 16.2×16.2 stroke #14503b w2.5
```

### 6.3 Recent activity glass panel
```
div  position:relative; z-index:1;
     margin:-16px -19.8px -18px -19.8px (top/right/bottom/left — bleeds to container edges);
     border:0.9px solid rgba(255,255,255,0.05); border-radius:42.3px;
     box-shadow:0px 0px 23.4px -7.2px #00000000 (transparent, effectively none);
     backdrop-filter:blur(5px); padding:14.4px 19.8px 22px 19.8px;
     overflow:hidden; background-color:#21212145
  ├─ blurred glow (behind content):  position:absolute; top:-54px; left:10.8px; right:10.8px;
  │     height:171px; border-radius:19.8px;
  │     background:linear-gradient(135deg,#41b091 0%,#2e9478 55%,#26826a 100%);
  │     filter:blur(27px); opacity:0.55; pointer-events:none
  ├─ glisten hairline TOP:  position:absolute; top:0; left:54px; right:9px;
  │     height:1.35px; border-radius:1.8px;
  │     background:linear-gradient(90deg, rgba(235,255,246,0) 0%, rgba(235,255,246,0.10) 40%,
  │                rgba(235,255,246,0.45) 78%, rgba(235,255,246,0.22) 100%); pointer-events:none
  ├─ glisten hairline RIGHT:  position:absolute; top:9px; right:0; height:44%; width:1.35px;
  │     border-radius:1.8px;
  │     background:linear-gradient(180deg, rgba(235,255,246,0.30) 0%, rgba(235,255,246,0.42) 12%,
  │                rgba(235,255,246,0.10) 60%, rgba(235,255,246,0) 100%); pointer-events:none
  └─ content (position:relative)
      ├─ address strip:  "0x3F9e4A21D8f2…9bC83Fc3"  12.6px; letter-spacing:0.9px;
      │     color:#ffffff; padding-left:21.15px
      ├─ "Sepolia"  9.9px; rgba(240,250,245,0.85); margin-top:2.7px; padding-left:21.15px
      ├─ divider  height:0.63px; background:rgba(255,255,255,0.10);
      │     margin:14.4px -19.8px 0 -19.8px (full-bleed)
      ├─ header row  space-between; margin-top:20px
      │   ├─ "Recent activity"  17.1px / 400
      │   └─ "View All" + chevron  (same 10.8px #9db3aa style; no handler wired)
      └─ rows  flex column; gap:22px; margin-top:20px
```
**Row anatomy** (shared): `flex; align-items:center; gap:11.7px; padding:9px 7.2px; margin:-5.4px -7.2px; border-radius:999px; cursor:pointer; transition:background .15s; hover background:rgba(95,230,175,0.1)`
- icon puck: 36×36 circle; `background-color:#3FAC8D5A; border:0.9px solid rgba(255,255,255,0.06)`; icon SVG stroke/fill `#cfe5d8` (16.2–17px)
- title: 13.5px / 600; #eef4f1
- sub: 10.35px; **#9eada5**; margin-top:0.9px
- trailing pill: margin-left:auto; font-size:**9px**; font-weight 400; radius pill; padding 4.5px 9px
  - Verified variant adds leading circle-check SVG 9.9×9.9, `flex; gap:3.6px`

**Seed rows** (top→bottom; each disappears as live runs accumulate — showBase0 while runs<4, base1 while runs<3, base2 while runs<2, base3 while runs<1):
1. receipt-check icon · **"Payroll run"** · sub `"Jul 5 · 8 paid · 4,500.5 cUSDd"` · pill **Verified** (green, with check)
2. person-plus icon · **"Employee added"** · sub `"Priya Sharma · Engineering"` · pill **Active** (green, no icon)
3. key icon · **"Operator authorized"** · sub `"expires in 1 h"` · pill **Pending** (amber: border rgba(224,178,95,0.6), text #e6c082)
4. deposit-box icon · **"Funds deposited"** · sub `"Jul 3 · 5,000 cUSDd"` · pill **Verified**

**Live run rows** (prepended above the seeds after each successful payroll run, max 4 shown): rendered as `<a href="{run.url}" target="_blank">` with `text-decoration:none` and the same row anatomy; title `"Payroll run"`, sub `"{date} · {n} paid · {total} cUSDd"` (e.g. "Jul 8 · 8 paid · 4,500.5 cUSDd"), Verified pill.

---

## 7. Right sidebar — Employee View column (nav === 3)

Replaces the Payroll Wallet in the right grid column. Wrapper: `flex column; gap:19.8px`.

### 7.1 "Next payout" container
Same container style as §6.1 (`rgba(110,196,186,0.07)`, radius `25.2px 25.2px 42.3px 42.3px`, padding `19.8px 19.8px 18px`), except header **"Next payout"** is `18px / 400` (weight 400, not 500).

**Stacked card**: same ghost layers as §6.2, but wrapper `margin-top:16.2px` and front card `height:216px` plus an outer glow: `box-shadow:0 9px 32.4px -3.6px rgba(64,185,150,0.35), 0 0 63px -7.2px rgba(64,185,150,0.22)`.
```
  ├─ left block
  │   ├─ "Scheduled payroll"  10.8px; rgba(240,250,245,0.85); margin-top:12.6px
  │   └─ "Jul 31"  700 / 28.8px; #fff; margin-top:1.8px
  └─ bell button  title="Remind me"; onClick → remindOpen = true
        39.6×39.6 circle #f5f8f6; hover scale(1.08); active scale(0.94);
        bell SVG 15.3 stroke #14503b w2.5
      └─ reminder-set dot (when reminderSet): position:absolute; top:0.9px; right:0.9px;
            9×9 circle; background:#3bbf8e; border:1.8px solid #f5f8f6
```

**Wallet details glass panel** (overlaps card like §6.3, differences): `margin-top:-21.6px`; `background:rgba(13,22,18,0.21); backdrop-filter:blur(6.3px)`; padding `14.4px 19.8px 18px`; same blurred glow + both glisten hairlines; divider is `height:0.9px`.
```
  ├─ "{empWallet}"  12.6px; ls 0.9px; #fff; padding-left:21.15px
  ├─ "Sepolia"      9.9px; rgba(240,250,245,0.85); margin-top:2.7px; padding-left:21.15px
  ├─ divider
  ├─ "Wallet details"  17.1px / 400; margin-top:16.2px
  └─ rows (flex column, margin-top:7.2px; each row space-between, padding:9px 0;
        label 11.7px #e8f0ec | value 10.8px #9db3aa):
        Token → "cUSDd" · Network → "Sepolia Testnet" · Frequency → "Monthly" · Joined → "{emp.joined}"
```

### 7.2 The 3 stat cards
`div display:grid; grid-template-columns:1fr 1fr; gap:19.8px` below the Next payout container. Each card: glass 0.16; radius 21.6px; padding 18px 21.6px; label 10.8px #9db3aa; value 18px / 500, margin-top 5.4px.
1. **"Payments received"** → `{empPayCountPadded}` (zero-padded, e.g. "06")
2. **"Team"** → `{emp.dept}` (e.g. "Engineering")
3. **"Role"** → `{emp.role}` (e.g. "Engineer") — spans both columns: `grid-column:1 / -1`

---

## 8. RevealAmount (masking component used by every amount above)

- **Masked state**: renders `***` (maskCount=3) with `letter-spacing:0.08em; font-weight:400`.
- Container: `font-variant-numeric:tabular-nums; font-feature-settings:"tnum"; display:inline-flex; align-items:center; white-space:nowrap; min-width:max(3, value.length)ch` (min-width 0 when `reserve:false`).
- **Reveal**: digits scramble at ~40ms/frame, settle left→right with 60ms stagger; each settled digit pops `scale 1 → 1.42 → 0.92 → 1` over 340ms `cubic-bezier(.22,1,.36,1)`; on completion one glow pulse `drop-shadow(0 0 7px {accent}@0.85)` over 640ms ease-out.
- **Hide**: digits scramble ~300ms, then whole span blurs out `blur(5px) + opacity 0` over 230ms `cubic-bezier(.4,0,1,1)`, swaps to `***`, fades back `blur(4px)/0.3 → blur(0)/1` over 200ms ease-out.
- `keepLock:true` variant adds a lock glyph (0.6em, currentColor) after the digits, idle `rotate(-16deg)` opacity 0.85; on reveal it animates `rotate(8deg) translateX(12px) → opacity 0` (dur = max(360, digits*60+240)); relocks over 260ms on hide. (Only used in the Run-Payroll encrypting cards in this file.)
- Reduced motion: instant swap + glow only.
- Global setting `maskDefault` (Settings toggle, default true): `showAll = !maskDefault` force-reveals every amount; per-value reveals layer on top.

## 9. State + conditionals affecting these screens (recap)

| State | Default | Effect here |
|---|---|---|
| `nav` | 0 | 0 Home / 1 Team / 2 Insights / 3 Employee View; rail puck selected = nav (3 maps to Team puck) |
| `tab` | 'All' | Home tab pill active styling only |
| `bar` | 'May' | Active chart month: solid fill + tooltip + ring marker; set on bar mouseenter (persists) |
| `empIndex` | 0 | Which employee the Employee View shows |
| `scrolled` (via fadeRef) | — | Top-bar fade opacity 1 when content scrollTop > 6 |
| `maskDefault` | true | false ⇒ all amounts revealed |
| `revealMonthly` | false | toggled by Team hero card click (value currently always-revealed, see gaps) |
| `revealRunway` | false | Insights runway "04" reveal; hint text swaps tap to reveal/hide |
| `revealBalance` | false | Wallet balance "22,350.50" reveal (eye icon) |
| `empReveal` | false | Salary hero reveal; button label Reveal/Hide; reset on entering Employee View |
| `empRows` | {} | Per-history-row reveal map; reset on entering Employee View |
| `reminderSet` | false | Green dot on Next-payout bell button |
| `runs` | [] | Completed runs: prepend Recent-activity row (drops seed rows), add chart run-cap (grows in via scaleY), prepend employee history rows |
| notifs unread > 0 | true (3 unread) | Bell puck green dot visible |

## 10. Numbers shown (seed values)
Monthly payroll "4.5K" · balance "22,350.50" · runway "04" · privacy "48 amounts encrypted" · donut 4/2/2 of 8 · last run "Jul 5 Sun", "8 employees paid" · next payout "Jul 31" / "in 26 days" · profile name fallback "Santo" (localStorage `sealedpay_name`).
