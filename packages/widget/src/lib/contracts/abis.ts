/**
 * Minimal ABIs — only what the widget touches.
 *
 * `euint64` / `externalEuint64` are `bytes32` at the ABI level; ciphertext
 * handles travel as plain 32-byte values.
 */
import { parseAbi } from "viem";

/** ERC-7984 confidential token (OpenZeppelin implementation). */
export const erc7984Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function isOperator(address holder, address spender) view returns (bool)",
  "function setOperator(address operator, uint48 until)",
  "event OperatorSet(address indexed holder, address indexed operator, uint48 until)",
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
]);

/** Demo token faucet (ConfidentialTokenDemo only — not part of ERC-7984). */
export const demoTokenAbi = parseAbi(["function mint(address to, uint64 amount)"]);

/** TokenOps DisperseConfidential singleton — the subset the widget uses. */
export const disperseAbi = parseAbi([
  // direct mode: sender → each recipient via operator permission, no holding
  "function disperseConfidentialTokenDirect(address token, address[] recipients, bytes32[] encryptedAmounts, bytes inputProof) payable",
  // wallet mode: pulls two caller-supplied subtotals into per-user wallets, then distributes
  "function disperseConfidentialTokens(address token, address[] recipients, bytes32[] encryptedAmounts, bytes32[2] encryptedSubtotals, bytes inputProof) payable",
  "function register(address token)",
  "function isRegistered(address user) view returns (bool)",
  "function approveUserWalletsForToken(address token)",
  "function recoverFromWallets(address token, address to)",
  "function getGasFee(address user) view returns (uint96)",
  "function maxBatchSizeDirect() view returns (uint256)",
  "function maxBatchSizeHolding() view returns (uint256)",
  "function paused() view returns (bool)",
  // delivery confirmation: decrypt `transferred` (token ACL scope); audit `requested` (disperse ACL scope)
  "event DirectDistribution(address indexed sender, address[] recipients, bytes32[] requested, bytes32[] transferred)",
  "event WalletDistribution(address indexed sender, address wallet, address[] recipients, bytes32[] requested, bytes32[] transferred)",
  "event ConfidentialTokensDispersed(address indexed token, address indexed sender, uint256 recipientCount, uint8 feeType)",
]);
