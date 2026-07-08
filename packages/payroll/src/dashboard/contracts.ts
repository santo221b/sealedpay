/**
 * Dashboard integration contracts — the fixed interface between the App
 * shell (owns ALL state + real engine wiring) and the presentational
 * screens/modals built from the design extraction specs.
 *
 * Rules for implementers:
 * - Components in src/dashboard/** are PRESENTATION ONLY: no engine imports,
 *   no wagmi writes, no localStorage. Everything arrives via these props.
 * - Masking: a value renders revealed when `showAll || <its reveal flag>`.
 *   `showAll` = Settings "Mask amounts by default" turned off.
 * - Never render "..." or an em-dash in user-facing text.
 */
import type { SeedNotification } from "../lib/seed";

/* ── Entities (seed + live, already merged by the shell) ─────────────────── */

export interface Person {
  id: string;
  name: string;
  role: string;
  dept: string;
  /** Full checksummed address (display with shortWallet()). */
  wallet: string;
  /** Monthly salary in cUSDd, numeric (format with fmtAmount()). */
  salary: number;
  joined: string;
  /** True for a pre-loaded demo employee (not one the user added). */
  sample?: boolean;
}

export interface RunView {
  id: string;
  month: string; // 'Feb' | ... | 'Jul'
  date: string; // 'Jul 5'
  dateFull: string; // 'Jul 5, 2026'
  paid: number;
  total: number;
  tx: string;
  url: string; // real Etherscan URL
  live: boolean; // true = executed this session/from real history
  verified?: boolean;
}

export interface PayRow {
  key: string;
  date: string;
  tx: string;
  url: string;
  /** Known plaintext (seed rows / already-decrypted live rows); undefined until a live row is decrypted. */
  amount?: number;
  live: boolean;
  /** Seed rows are historical/verified; a live row is verified only after its decrypt-verify step. */
  verified?: boolean;
  /** True while this row's real decryption is in flight. */
  decrypting?: boolean;
}

export type NavIndex = 0 | 1 | 2 | 3;
export type PopupKind = "bell" | "gear" | null;

export interface NotificationItem extends SeedNotification {}

/* ── Shell-provided state bundle (single prop object per screen) ─────────── */

export interface DashboardData {
  people: Person[];
  runs: RunView[]; // newest first, live + seed merged
  monthly: { value: string | undefined; revealed: boolean; toggle: () => void };
  runway: { value: string | undefined; revealed: boolean; pending: boolean; toggle: () => void; hint: string };
  balance: { value: string | undefined; revealed: boolean; pending: boolean; toggle: () => void; error?: string };
  encryptedCount: number; // privacy scorecard: total amounts encrypted across history
  employerAddress?: string; // full address when connected
  profile: { name: string; avatar: string };
  showAll: boolean; // settings.maskDefault === false
  activeBar: string; // Payout Activity active month
  setActiveBar: (month: string) => void;
  reminderSet: boolean;
}

/* ── Per-screen props ────────────────────────────────────────────────────── */

export interface HomeScreenProps {
  data: DashboardData;
  tab: string;
  setTab: (tab: string) => void;
  /** Open the Add-employee modal (used by the empty team state). */
  onAddEmployee: () => void;
  /** Navigate to the Insights screen (the Payout Activity "View All"). */
  onViewInsights: () => void;
}

export interface TeamScreenProps {
  data: DashboardData;
  onRunPayroll: () => void;
  onAddEmployee: () => void;
  onOpenEmployee: (id: string) => void;
}

export interface InsightsScreenProps {
  data: DashboardData;
}

export interface EmployeeViewProps {
  person: Person;
  rows: PayRow[];
  salaryRevealed: boolean;
  onToggleSalary: () => void;
  /** Seed rows toggle locally; live rows trigger a REAL handle decryption. */
  onToggleRow: (row: PayRow) => void;
  rowRevealed: (row: PayRow) => boolean;
  showAll: boolean;
  paymentsCount: string; // zero-padded, e.g. "06"
  onBack: () => void;
  employerAddress?: string;
  /** Open the Run Payroll flow for just this one employee. */
  onPay: () => void;
}

export interface WalletSidebarProps {
  data: DashboardData;
  onFund: () => void;
  activity: ActivityRow[];
}

export interface ActivityRow {
  key: string;
  title: string;
  sub: string;
  pill: "Verified" | "Active" | "Pending";
  url?: string;
  icon: "run" | "person" | "key" | "deposit";
  /** Pre-loaded demo row (vs a real, on-chain action this session). */
  sample?: boolean;
}

/* ── Modal / panel props (all rendered by the shell) ─────────────────────── */

export interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  notifs: NotificationItem[];
  onRead: (id: number) => void;
  onMarkAllRead: () => void;
}

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  maskDefault: boolean;
  reminders: boolean;
  autoverify: boolean;
  onToggle: (key: "maskDefault" | "reminders" | "autoverify", value: boolean) => void;
  /** Testing shortcut: jump to the recipient "My pay" view (via a notice). */
  onViewRecipient: () => void;
  /** Remove the pre-loaded demo team + history, keeping only real data. */
  onClearSamples: () => void;
  /** Whether any sample data is still present (hides the clear button once gone). */
  hasSamples: boolean;
}

export interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  /** Returns an error string to display, or null on success (shell validates + persists). */
  onAdd: (values: { name: string; role: string; salary: string; dept: string; wallet: string }) => string | null;
  /** Present → edit mode: prefills the form and switches the copy to "Save". */
  initial?: { name: string; role: string; salary: string; dept: string; wallet: string };
  /** Edit mode only: remove this employee (rendered as a confirm inside the modal). */
  onRemove?: () => void;
}

export interface FundWalletModalProps {
  open: boolean;
  onClose: () => void;
  employerShort: string; // destination display
  employerFull?: string; // full address, for the copy button
  busy: boolean;
  /** idle → confirming (awaiting wallet signature) → minting (tx on-chain). */
  phase: "idle" | "confirming" | "minting";
  /** Real faucet mint; resolves true on success (shell closes + refreshes balance). */
  onFund: (amount: string) => Promise<boolean>;
}

export interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  people: Person[];
  runs: RunView[];
  onPickPerson: (id: string) => void;
  onPickRun: (run: RunView) => void;
}

export interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export interface ProfilePopupProps {
  open: boolean;
  onClose: () => void;
  name: string;
  avatar: string;
  employerShort?: string;
}

export interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  reminderSet: boolean;
  onConfirm: () => void;
}

export interface ToastState {
  kind: "ok" | "err";
  msg: string;
  id: number;
}

export interface PermissionPromptProps {
  open: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}
