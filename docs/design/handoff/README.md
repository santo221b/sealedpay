# Handoff: SealedPay (Confidential Payroll) — Onboarding + Dashboard

## Overview
SealedPay is a confidential payroll web app. An employer (payroll administrator) pays a whole team in one on-chain transaction while every salary amount stays encrypted. The product covers a first-run onboarding flow and a full dashboard: Payroll overview, Team, Insights, Employee View, and a set of modals and panels (Run Payroll, Fund Wallet, Add Employee, Notifications, Settings, search command palette, logout, profile, payout reminder). Two-layer naming: **SealedPay** is the product; **DisperseKit** is the underlying engine, referenced only in the footer attribution line.

## About the Design Files
The files in this bundle are **design references authored in HTML** (a component framework called "DC" that renders inline-styled markup with a small logic class). They are prototypes that show the intended look, copy, and behavior. **They are not production code to copy directly.** The task is to **recreate these designs in the target codebase** (a real React app) using its established patterns, component library, and animation stack (Framer Motion). Treat the HTML as the source of truth for layout, color, type, spacing, copy, and motion; re-implement the structure idiomatically.

If you open the HTML: each design is one `.dc.html` file. Markup lives between the template tags; a `class Component` holds state and a `renderVals()` method that returns values interpolated into `{{ }}` holes. Styling is inline. Read it as a spec, not as an architecture to mirror.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, glass treatment, copy, and motion are final. Recreate the UI pixel-faithfully using the codebase's existing libraries. Exact hex values, sizes, and timings are documented below.

> Note on numbers: many dimensions are non-round (e.g. 37.8px, 27.72px, 10.8px, 899.1px) because the whole dashboard was uniformly scaled to 90% of an original design. You may treat `899.1px` as "fully rounded / pill" and round odd values to the nearest sensible token in your system, keeping proportions. The onboarding file (`Onboarding v6.dc.html`) uses round values.

---

## Screens / Views

### 1. Onboarding (`Onboarding v6.dc.html`) — 6 steps, single centered glass card
A step flow on a green gradient background (bright at the bottom, darkening upward). One card, a slim top progress bar (segments fill left-to-right as steps complete), and a Back / Continue footer (no divider line). A faint oversized step numeral sits behind the card as a watermark, pushed to the right edge.

- **Step 0 — Welcome**: large seal logo (~92px) with a subtle glow wash and slow float; label "Confidential payroll" (normal weight); headline "Welcome to SealedPay" that runs a decrypt-scramble on entry; description "Pay your whole team in one transaction, salaries stay encrypted, on-chain, end to end." (weight 400). Continue label: "Let's get started".
- **Step 1 — Name**: prompt "First, what should we call you?"; glassmorphic text input (blur + saturation + top-highlight/bottom-shadow edges, radius 18px), dimmed placeholder "Enter your first name". Continue disabled until non-empty.
- **Step 2 — Role/context**: "You're the payroll administrator, [Name]." Explains the model (team of 8, salaries encrypted with Zama FHE, one transaction). Info card (rounded, circular lightning icon) notes a pre-loaded demo team and 6 months of history.
- **Step 3 — Avatar**: "Choose your avatar." Four circular avatars in a row; selected one gets a green gradient ring and scales up ~15% with a check badge. Continue disabled until one is picked.
- **Step 4 — Wallet**: "Connect your wallet." Connect button → spinner "Connecting…" → connected chip (address + Sepolia + green dot). Framed as a testnet demo. Continue disabled until connected.
- **Step 5 — All set**: chosen avatar with check badge, personalized "You're all set, [Name].", recap chips (Wallet connected / Team of 8 loaded / 6 months history). Button "Enter dashboard" persists name + avatar to localStorage and navigates to the dashboard.

Footer attribution on the landing step area: "SealedPay · Powered by DisperseKit · TokenOps disperse · Zama FHE".

### 2. Dashboard shell (`DisperseKit Payroll.dc.html`)
Fixed left icon rail + floating transparent top bar (logo left; search center; bell, settings gear, profile avatar right). Only the content column scrolls; the rail and the two background glows are fixed. A top-edge fade appears over the content only when scrolled. Left rail: three nav pucks (Home, Team, Insights), a bell + gear cluster, and a logout button pinned to the bottom. The selected nav puck is a solid light fill; unselected icons are muted glowing white.

Three primary screens switch in the content column (`nav` state 0/1/2), plus an Employee View (nav 3).

- **Payroll overview (Home)**: title "Payroll"; tab row (All / Payouts / Verifications / Team); **Payout Activity** bar chart (6 months Feb–Jul, y-axis 0–5k, active month solid green, others lavender diagonal-hatch; hovering a bar shows a glass tooltip; a completed run appears as a matching stacked cap on its month's bar); **Team** donut (Chart.js doughnut, 8 employees split Engineering 4 / Design 2 / Operations 2, legend at right); **Monthly payroll** card (masked amount "4.5K", tap toggles reveal; encrypted hover tooltip on a puck); **Last run** card ("Jul 5 Sun", 8 employees paid, verified puck).
- **Team**: title "Team" + primary "Run payroll" button and secondary "Add employee" button; two hero cards (Headcount gradient card; Monthly payroll encrypted card); **Employees** roster list (up to 5 visible then internal scroll) — each row: avatar initials puck, name, role · wallet, Active pill; clicking a row opens Employee View.
- **Insights**: title "Insights"; **Payroll health** dual-axis line chart (Chart.js: Employees paid vs Gas ETH); **Payroll runway** card (masked "04 runs left", tap reveals, employer-only); **Privacy scorecard** card ("48 amounts encrypted", Public: transactions · recipients · timing / Private: every amount).
- **Employee View**: title = employee name; Back button (top-right, quiet outlined ghost) + Connected chip; **Salary** hero card on a green gradient (large "Salary" label, Reveal toggle, masked "*** cUSDd / month", wallet + Sepolia); three stat cards (Payments received "06" / Team / Role); **Payment history** list (up to 6 rows then internal scroll) — date, tx · Etherscan link, masked amount, Verified badge; per-row tap reveals that amount.

### 3. Right sidebar (Home & Team): Payroll Wallet
Stacked-card wallet: two ghost card layers behind a green gradient balance card ("Available balance", masked "*** cUSDd", eye toggle at the end reveals, "+" fund button opens Fund Wallet). Below it a frosted glass **Recent activity** panel (its own blurred glow behind it, white translucent glisten hairlines top + right): address strip (0x…, Sepolia), a divider, "Recent activity" header, then activity rows (Payroll run / Employee added / Operator authorized / Funds deposited, each with an icon puck, title, muted sub, and a status pill). New payroll runs prepend here.

### 4. Modals & panels (all share the frosted-glass modal style + open/close motion)
- **Run Payroll** (4-step stepper; see below) — the primary flow.
- **Fund Wallet**: amount input, destination address row, Cancel / Fund wallet. Content staggers in.
- **Add Employee**: full name, role, monthly salary, team chips (Engineering/Design/Operations), wallet address (required, truncated-address placeholder). Add disabled until name + wallet filled; content staggers in.
- **Notifications panel** (bell dropdown, top-left anchored): header with unread-count badge + "Mark all read"; rows with colored unread dot, title, sub. Clicking a row marks it read.
- **Settings panel** (gear dropdown): toggles (Mask amounts by default, Payout reminders, Auto-verify after payout), Token (cUSDd), Network (Sepolia Testnet). "Mask amounts by default" globally controls masking.
- **Search command palette**: focus the top-bar search → overlay dims + blurs, panel unfolds from the bar, results stagger in (Employees + Payouts sections, live-filtered). Esc / overlay-click closes.
- **Logout modal**: "Log out?" with Cancel and a warning-red **outlined** confirm button.
- **Profile popup**: large avatar (hover: lift + tilt + green glow), big name, role, wallet chip.
- **Payout reminder**: bell on the Next payout card; Set / Remove reminder; sets a green dot indicator.
- **Signed-out screen**: full-screen, seal logo, "You've been logged out", "Sign back in".
- **Toast**: slides in top-center on payroll success (verified icon, "Payroll delivered · 8/8 verified") or failure (amber/red, "Payroll failed · no funds moved · retry").
- **Notification permission prompt**: in-app glass prompt on first load (Enable / Not now), emulating the browser permission ask.

### Run Payroll modal — 4 steps
Larger glass modal, top progress bar fills on advance.
1. **Select & review**: checklist of 8 employees (all checked by default), select-all toggle, avatar + name + role + masked salary per row; live footer "Total to disperse: *** cUSDd (Reveal)" + "N recipients" (zero-padded, e.g. 08), updating on toggle. Rows stagger in. Continue.
2. **Encrypting**: "Encrypting 8 salaries in your browser…" Cards laid out two per row; each card shows its real salary, then scrambles and settles to masked "***" (reverse of a reveal), cascading ~720ms apart at the standard reveal speed; spinner holds until the last card seals; green glow on completion, then auto-advance.
3. **Authorize**: "Authorize SealedPay to disperse cUSDd on your behalf · one signature · expires in 24h." Person-with-key icon pulses; Authorize → spinner "Confirm in your wallet…" → spring check + green ripple → auto-advance. (If already authorized, brief "Already authorized" then skip.)
4. **Disperse & verify**: "Confirm & pay" → single crossfading headline "Sending payroll" → "Confirmed on-chain" → "Payroll delivered"; a determinate left-to-right progress fill with a sheen sweep; status lines (Dispersing… / Verifying delivery…) light up with spring checks; per-recipient rows flip to green "Paid" with a check-pop cascade (~140ms apart) → "Done — 8/8 delivered". Success finale: centered big check with a green glow bloom, "8/8 verified", optional employer-only total reveal (scramble→settle), a real "View on Etherscan" link, and a single "Done" button. A "Simulate failure (demo)" affordance triggers the failure path (toast + amber/red notification, no state changes downstream).

On a successful run: prepend a "Payroll run" row to Recent activity (with a real Etherscan link), grow a new matching bar into Payout Activity for the current month, and prepend a new payment row to each paid employee's history. Fire the success toast + add a Notifications-panel item (unread).

---

## Interactions & Behavior
- **Navigation**: left-rail pucks switch nav 0/1/2; Employee View is nav 3 (Team icon stays highlighted while inside it). Back returns to Team.
- **Masking**: amounts are masked by default (3 stars, weight 400). Per-value tap toggles reveal on: Monthly payroll (stays revealed once shown), Payroll runway, wallet balance (eye), employee salary hero, and individual payment-history rows. The Settings "Mask amounts by default" toggle flips masking globally; individual reveals still work on top.
- **Reveal animation** (see RevealAmount below): scramble-and-settle on reveal, blur-to-stars collapse on hide.
- **Search**: focusing the bar mounts the palette; typing filters employees (name/role/team/wallet) and payouts (month/date/tx); a result navigates to that employee or that month's chart. Esc or overlay-click closes.
- **Notifications**: unread items show a colored dot and increment the bell badge; clicking a row marks it read and decrements the badge; "Mark all read" clears all; the bell's green dot hides when all read. New notifications prepend.
- **Scroll architecture**: the document itself does not scroll; only the content column does. Background glows + left rail + top bar stay fixed. A top-edge content fade fades in once scrolled and out at the top.
- **Hover/active**: primary buttons scale 1.03 on hover with a soft green glow ring, 0.97 on tap. Rows brighten on hover (rounded pill background). Profile avatar lifts + tilts on hover.
- **Reduced motion**: every animation has a `prefers-reduced-motion` fallback (instant swap / plain opacity, no movement or stagger).

## State Management
State variables (from the dashboard logic class) to reproduce:
- `nav` (0 Home / 1 Team / 2 Insights / 3 Employee View), `empIndex` (selected employee), `tab` (overview tab), `bar` (active chart month, default 'May').
- Reveal flags: `revealMonthly`, `revealTotal`/`revealRunway`, `revealBalance`, `empReveal`, `empRows` (per-history-row map), plus global `maskDefault` (Settings).
- Settings toggles: `maskDefault`, `reminders`, `autoverify`; `reminderSet`.
- Modals/panels: `popup` ('bell' | 'gear' | null), `logoutOpen`, `loggedOut`, `profileOpen`, `addOpen` (+ form fields addName/addRole/addSalary/addWallet/addDept), `fundOpen` (+ fundAmount), `remindOpen`; search `searchOpen`/`searchMounted`/`searchQ`; scroll `scrolled`.
- Run Payroll: `payrollOpen`, `payStep` (0–3), `paySel` (per-employee selection map), `payReveal`, encrypting/authorize/disperse sub-states, delivered count, result reveal, and `runs` (completed runs appended to chart/activity/history).
- Notifications: `notifs` array (`{id, title, sub, color, read}`), `toast`/toast kind, notification-permission prompt + status.
- Roster: base 8 `EMPLOYEES` + `extra` (added via Add Employee). Payment history derives from a `HISTORY` array (6 runs) plus `runs`.

---

## Design Tokens

### Color palette
Backgrounds
- Body base: `#070d0b`
- App gradient: `linear-gradient(180deg, #0c1310 0%, #101915 50%, #0d1411 100%)`
- Fixed glows (dashboard): emerald radial `rgba(73,169,130, ~0.32–0.40)` at top-right (~90% x, 25% y) and a smaller one bottom-left; tuned low-saturation.
- Onboarding background: green gradient, brighter at bottom, darkening upward.
- Modal/overlay scrim: `#0D1411F2` (≈95% opaque) with backdrop blur.

Accent / status greens
- Primary accent: `#3bbf8e` (default; a user tweak variant is `#5fe3ab`)
- Outlined-pill text & glow: `#78e9c0`
- Live/online dot: `#34d399`
- Puck background (icon circles): `rgba(59,191,142,0.18)`
- Set E status pill (Verified/Active/Encrypted, unified): background transparent, border `rgba(95,230,175,0.55)`, text/icon `#78e9c0`, radius pill, weight 400.

Warning / danger
- Pending pill: text `#e6c082`, border `rgba(224,178,95,0.6)`, transparent bg.
- Logout confirm (warning-red outline): bg `rgba(224,110,98,0.1)`, border `rgba(224,110,98,0.5)`, text `#eb8f85`.

Text
- Headings/strong: `#f2f7f4`; near-white `#eef4f1`, `#e8f0ec`
- Secondary: `#cfdcd6`
- Muted: `#9db3aa`
- Subtle (activity subs): `#9eada5` (and `#7b8f85` for the dimmest)
- On-accent button text: soft white `#f5f8f6` or dark green `#14503b` (never pure black)

Glass surfaces
- Standard card: `background: rgba(110,196,186,0.16)` with `box-shadow: inset 0 7.2px 12.6px -7.2px rgba(255,255,255,0.056), inset 8.1px 0 16.2px -10.8px rgba(150,235,255,0.032), inset -8.1px -7.2px 16.2px -10.8px rgba(255,160,225,0.026)` (a faint white top-edge + cyan/pink chromatic inner rims); no border.
- Dimmer card variant: `rgba(110,196,186,0.07)` (Payroll Wallet container).
- Side-rail / search bar surface: `background: rgba(110,196,186,0.06)`, border `rgba(225,248,238,0.045)`, `backdrop-filter: blur(12px)`.
- Recent activity panel: darker translucent fill over a blurred green glow, with white-translucent glisten hairlines on top + right edges.
- Green gradient card (balance / salary hero / headcount): `linear-gradient` emerald.

### Typography
- Family: **Manrope** (weights 400, 500, 600, 700, 800). Tabular numerals (`font-variant-numeric: tabular-nums`) on all amount displays so digits don't jitter.
- Page titles: 37.8px / 500 (letter-spacing ~0.45px).
- Section headers (card titles): 17.1px / 400.
- Big card values: 27px / 700 (Team hero 25.2px; wallet balance similar).
- Employee/row names: 15px / 600. Row subs: 11.7px / 400.
- Body/secondary: 10.8–13.5px. Micro-labels (ENCRYPTED etc.): 9–11.7px / 800, letter-spacing ~0.9px, muted.
- Logo wordmark: 14.4px / 700.

### Spacing / radius / shadow
- Card padding: ~18–22px; card gap: ~19.8px; content column padding-top ~97px (clears the floating top bar).
- Radius: cards 21.6–24px; search popup 28px; modals ~26px; small controls 12.6–16px; pills fully rounded (`899.1px`); Recent-activity bottom corners enlarged (~47px) to match the wallet container.
- Icon pucks: 27.72px (card) / 36–40px (rows) circles.
- Shadows: the inset triple-rim glass shadow above; modals add a soft drop shadow; buttons add a green glow ring on hover (`0 0 0 1px rgba(120,233,192,0.4), 0 6px 22px -6px rgba(59,191,142,0.6)`).

---

## Animation Inventory (re-implement in Framer Motion)
All animations use only transform / opacity / filter and have reduced-motion fallbacks. Reuse the same signatures app-wide so motion reads as one system.

- **Scramble / reveal (RevealAmount)**: trigger = reveal toggle or Settings unmask. Each numeric char cycles random digits ~40ms/frame, then resolves left-to-right with ~60ms stagger; each landing digit does a spring scale-pop (≈ stiffness 500 / damping 30; keyframes 1 → 1.42 → 0.92 → 1 over ~340ms, ease `cubic-bezier(.22,1,.36,1)`); on completion one soft accent-green glow pulse (~640ms). **Hide**: reverse — blur-to-stars collapse (~230ms, `cubic-bezier(.4,0,1,1)`), then settle back. Digits use tabular-nums; masked state = 3 stars weight 400. A `keepLock` variant (wallet balance, salary hero) shows a lock that drifts right + rotates open + fades as the number reveals, and eases back on hide.
- **Encrypting step (reverse reveal)**: real number → scramble → settle to stars, cascading ~720ms per card; spinner holds until the last seals; green glow on completion.
- **Ghost step numeral flip (onboarding)**: the oversized watermark number behind the card changes per step; animate as a number-flip/roll (translateY + opacity swap).
- **Onboarding progress bar**: each segment fills with a left-to-right gradient wipe as its step completes; a subtle sheen sweep runs on the current segment. Bars are slim (~3px).
- **Onboarding entrances**: card springs in (opacity 0 + y 24 + scale 0.97 → rest, ~620ms `cubic-bezier(.22,1,.36,1)`); per-step content items stagger (opacity 0 + y 20 → 0, ~75ms apart). Welcome headline runs the decrypt-scramble. Landing seal has a slow float + soft glow-pulse aura.
- **Modal open**: overlay fades in ~200ms; panel springs from opacity 0 / y 20 / scale 0.96 (spring ≈ stiffness 400 / damping 30). Anchored popovers (Notifications/Settings) unfold from their top corner; centered modals bloom from center.
- **Modal close** (snappier ~170–190ms): overlay fades out; panel collapses to opacity 0 / y -6 / scale 0.97 (`cubic-bezier(.4,0,1,1)`). Use AnimatePresence so exits play on Cancel / overlay-click / Esc.
- **Form content stagger** (Add Employee, Fund Wallet): after the panel opens, inner fields rise in (opacity 0 + y 8 → 0, ~42ms apart, ~300ms each).
- **Search palette**: overlay dim + backdrop-blur fade (~200ms); search bar focus-lift (scale 1 → 1.02 + green glow ring, ~220ms); popup unfolds downward from the bar (opacity 0 / y -8 / scale 0.98 → rest, springy, transform-origin top, starting ~80ms after overlay); result rows stagger (opacity 0 / y 6 → 0, ~35ms apart) once the popup is ~halfway. Close is one quick collapse (no per-row stagger), snappier than open.
- **Determinate disperse fill**: left-to-right progress bar with a moving sheen sweep and a subtle brightness pulse; status lines illuminate with spring checks on completion.
- **Per-recipient "Paid" cascade**: rows flip to green Paid with a spring check-pop, ~140ms apart down the list.
- **Success finale**: centered check with a green glow bloom; optional total reveal via scramble→settle.
- **Toasts**: slide in from top-center (opacity + y), auto-dismiss; AnimatePresence exit.
- **Hover/tap**: primary buttons whileHover scale 1.03 + green glow, whileTap scale 0.97; rows brighten to a rounded hover fill; profile avatar hover = scale 1.06 + rotate -2.5° + green drop-shadow (~300ms).
- **Chart run added**: the new run's bar grows in (scaleY 0 → 1 from the bottom) rather than snapping; matches the month's existing bar styling (solid if active, hatch otherwise).
- **Puck tooltips** (Monthly payroll "Encrypted", Last run "Verified"): instant custom fade pill on hover (~110ms), not native title.

---

## Screen + Component Map
Reusable components (create these; note where reused):
- **RevealAmount** — masked/reveal amount with scramble-settle + optional drifting lock. Used in: Monthly payroll, Payroll runway, wallet balance, salary hero, roster rows, payment-history rows, Run Payroll totals + encrypting cards. (One component, consistent everywhere.)
- **StatusChip / Pill** — Set E green-outlined unified pill (Verified / Active / Encrypted / Employer-only) + amber Pending variant. Used in: Last run, roster, Recent activity, Insights, search results, Run Payroll.
- **StatCard (glass card)** — the inset-glow glass surface with title + value + footer row. Used across all three screens and the Employee View stat cards.
- **EmployeeRow** — avatar-initials puck + name + role/wallet + trailing pill; clickable. Used in: Team roster, search results, Run Payroll checklist (with checkbox), Employee payment history (icon puck variant).
- **IconPuck** — circular translucent-green icon container (27.72 / 36 / 40px). Used in Recent activity, history, search, encrypting cards, Run Payroll status.
- **WalletChip / AddressStrip** — 0x address + Sepolia + green dot. Used in wallet panel, Employee View Connected chip, profile popup.
- **RunTimeline** — Run Payroll step 4 status lines + determinate fill + per-recipient cascade.
- **Stepper / ProgressBar** — onboarding segment bar and Run Payroll top progress bar.
- **Modal shell** — frosted glass container + scrim + open/close motion (+ optional content stagger). Wraps every modal/panel listed above.
- **BarChart (Payout Activity)** — custom bars with hatch/solid states + glass tooltip + stacked run caps. **DonutChart (Team)** and **LineChart (Payroll health)** use Chart.js.
- **Toast**, **NotificationItem**, **SettingToggle**, **NavPuck**, **PrimaryButton / SecondaryButton / GhostButton**.

Screens → sections:
- Onboarding: Card + Stepper + per-step content (Seal, NameInput, RoleInfoCard, AvatarPicker, WalletConnect, AllSetRecap).
- Home: Title, TabRow, BarChart, DonutChart+Legend, Monthly payroll StatCard, Last run StatCard, right sidebar Wallet panel.
- Team: Title + PrimaryButton(Run payroll) + SecondaryButton(Add employee), 2 hero cards, Employees roster (EmployeeRow list), right sidebar Wallet panel.
- Insights: Title, LineChart card, Payroll runway StatCard, Privacy scorecard card.
- Employee View: Title, Back(GhostButton) + WalletChip, Salary hero card (RevealAmount), 3 StatCards, Payment history (EmployeeRow/history variant).

---

## Real vs Simulated (wire these to live logic later)
Everything below is currently **mock / seed data or a simulated action**. Flag each for real wiring:
- **Amounts & masking**: all salary/total/balance values are seed constants (e.g. 4.5K monthly, 22,350.50 balance, 25,303 total, per-employee salaries). Masking/reveal is pure UI state, not real decryption. Wire to real encrypted values + client-side decrypt (employee decrypts with their own wallet signature; the employer does not hold employee keys).
- **Wallet connect** (onboarding + implied elsewhere): simulated connect button → spinner → fixed address `0x3F9e4A21…9bC83Fc3`. Wire to a real wallet provider.
- **Run Payroll steps**: encrypt / authorize / disperse / verify are all timed simulations (setTimeout cascades). Wire to real FHE encryption, authorization signature, and the disperse transaction + on-chain verification.
- **Payroll runway ("04 runs left")** and **Privacy scorecard ("48 amounts encrypted")**: computed from seed constants; wire to real balance ÷ monthly total and real run history.
- **Notifications**: seed array; permission prompt is an in-app emulation of `Notification.requestPermission()`; read state and badge are in-memory (persist to localStorage / backend). Success/failure toasts are triggered by the simulated run (and a manual "Simulate failure" affordance).
- **Etherscan links**: use real Sepolia URLs but the tx hashes are seed values. Wire to actual tx hashes from real transactions.
- **Payment history / Recent activity / Payout Activity chart**: seeded from a 6-run `HISTORY` array; new runs are appended in-memory during the simulated flow. Wire to real run history.
- **Add Employee / Fund Wallet**: forms update in-memory only (new employees appended to the roster; fund amount not applied). Wire to real mutations. Add Employee requires a wallet address (never generate one client-side).
- **Onboarding**: name + chosen avatar persist to `localStorage` (`sealedpay_name`, `sealedpay_avatar`, `sealedpay_onboarded`) and the dashboard reads them for the profile. Wire to real user/account data.
- **Team donut / Payroll health chart**: Chart.js with seed datasets.

## Assets
- **Avatars** (`avatars/`): `avatar-1.svg`, `avatar-2.svg`, `avatar-3.svg` (onboarding picker options) and `avatar-profile.svg` (default profile). These are path-based SVGs; reuse as-is or replace with your asset pipeline.
- **Logo / seal**: inline SVG (the SealedPay seal mark) embedded in the markup; extract from the files. Wordmark is text ("SealedPay", Manrope 700).
- **Icons**: inline SVGs throughout (search, bell, gear, logout, nav Home/Team/Insights, lock/encrypted, receipt-check for verified, document-with-check for history, person-with-key for authorize, calendar, eye, arrows, etc.). Replace with your icon set, matching each glyph.
- **Fonts**: Manrope via Google Fonts (`@400;500;600;700;800`).
- **Charts**: Chart.js v4 (doughnut + dual-axis line). The Payout Activity bar chart is custom HTML/CSS, not Chart.js.

## Files
- `Onboarding v6.dc.html` — the onboarding flow (6 steps), final minimal green-gradient version.
- `DisperseKit Payroll.dc.html` — the full dashboard: Home / Team / Insights / Employee View + all modals, panels, the search palette, and the Run Payroll flow.
- `avatars/` — avatar + profile SVGs used by both files.
- `support.js` — the DC runtime the prototypes load; **reference only**, do not port. It just makes the `.dc.html` files render in a browser.

> The two `.dc.html` files open directly in a browser if you want to click through the exact intended behavior and motion before implementing.
