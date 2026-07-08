/**
 * @dispersekit/widget — public API.
 *
 * Two layers on purpose:
 *
 * 1. THE ENGINE — one implementation of the confidential payout flow
 *    (encrypt → authorize → disperse → confirm → verify-decrypt). It has no
 *    UI opinions. Every product surface in this repo is a skin over it:
 *    <DisperseWidget /> and the payroll dashboard both import it from here
 *    and never reimplement any on-chain or cryptographic step.
 *
 * 2. READY-MADE SKINS & PARTS — the drop-in widgets, plus the presentational
 *    building blocks a custom skin (like the payroll dashboard) can reuse so
 *    status states and the verify-delivery moment stay identical everywhere.
 */

// ── 1. The engine ───────────────────────────────────────────────────────────
export { useDisperseFlow, type DisperseFlow, type FlowPhase, type DeliveryResult, type VerificationEntry } from "./hooks/useDisperseFlow";
export { DisperseProviders } from "./providers"; // self-contained wallet stack (wagmi + RainbowKit)
export { useTokenMeta } from "./hooks/useTokenMeta";
export { getFhevmInstance, type FhevmInstance, type NetworkSource } from "./lib/fhe/instance";
export { encryptAmounts, computeSubtotals, MAX_VALUES_PER_INPUT } from "./lib/fhe/encrypt";
export { userDecryptHandles, type DecryptRequest, type SignTypedDataFn } from "./lib/fhe/decrypt";
export { erc7984Abi, demoTokenAbi, disperseAbi } from "./lib/contracts/abis";
export { DISPERSE_SINGLETON, disperseAddressFor, DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID } from "./lib/contracts/addresses";
// The validated path from human input to RecipientRow[] — custom skins should
// funnel THROUGH this (serialize to `address, amount` lines) rather than
// building rows by hand, so every guard (checksum, euint64 range, rounding,
// duplicates) applies everywhere.
export { parseRecipients, csvFileToText, isValidAmountText, short, type RecipientRow, type ParseResult, type ParseIssue } from "./lib/parse";
export { formatAmount, formatEth } from "./lib/format";

// ── 2. Ready-made skins & parts ─────────────────────────────────────────────
export { DisperseWidget, type DisperseWidgetProps } from "./DisperseWidget";
export { ReceiptWidget, type ReceiptWidgetProps } from "./ReceiptWidget";
export { StatusTimeline } from "./components/StatusTimeline";
export { DeliveredPanel } from "./components/DeliveredPanel";
export { PrivacyBadge } from "./components/PrivacyBadge";
export { ConnectGate, AccountChip } from "./components/ConnectGate";
export { Button, Card, CipherChip, LockIcon, Spinner } from "./components/ui";
export { themeToCssVars, defaultTheme, type DisperseTheme } from "./theme";
