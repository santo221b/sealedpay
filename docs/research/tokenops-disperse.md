# TokenOps Confidential Disperse — contract & SDK research

Researched: 2026-07-02. Ground truth: installed `@tokenops/sdk@1.1.1` package + Sourcify-verified on-chain source. Anything not verified from those is marked UNVERIFIED.

## Verdict: GO

The official confidential disperse contract exists, is verified, is live and unpaused on **Sepolia**, and its full Solidity source has been retrieved and saved to `/Users/santo/dispersekit/packages/smart-contracts/reference/`. The official npm SDK (`@tokenops/sdk@1.1.1`) ships the exact ABI, deployed addresses, subtotal helper, and viem/wagmi clients. No fallback contract needed.

---

## 1. Package

- **Name/version:** `@tokenops/sdk@1.1.1` (published 2026-06-23 by GitHub Actions OIDC; maintainers mike/tech/gedas @tokenops.xyz). License BSD-3-Clause-Clear.
- Repo: `https://github.com/VestingLabs/tokenops-sdk` (UNVERIFIED whether public).
- Docs: `https://docs.tokenops.xyz/sdk/fhe-disperse` (not fetched).
- Runtime dep: `abitype ^1.0.8`. Peer deps: `viem ^2.47.0`, `@zama-fhe/sdk ^3.0.0`; React entrypoint additionally needs `wagmi ^2.0.0`, `@tanstack/react-query ^5.0.0`, `@zama-fhe/react-sdk ^3.0.0`, `react >=18`.
- Relevant entrypoints: `@tokenops/sdk/fhe-disperse` (client, ABIs, encryption, subtotals) and `@tokenops/sdk/fhe-disperse/react` (wagmi hooks: `useRegister`, `usePreflightDisperse`, `useDisperse`, `useGetEncryptedFeeReserve`, ...).

### Transparent vs confidential — disambiguation

The npm package contains **only** the FHE products (`fhe-vesting`, `fhe-airdrop`, `fhe-disperse`, `testnet-faucet`). There is **no transparent Merkle "disperse-v2"** address anywhere in the package (verified by grepping all 40-hex strings in `dist/`). The confidential contract is unambiguous: `DisperseConfidential`, exported ABI `disperseConfidentialAbi`, uses `externalEuint64`/`euint64` and `@fhevm/solidity`.

## 2. Addresses (from `dist/core/addresses.d.ts`, `DEPLOYED_ADDRESSES`)

| Contract | Chain | Address |
|---|---|---|
| `DisperseConfidential` singleton | Sepolia (11155111) | `0x710dD9885Cc9986EfD234E7719483147a6d8DBb4` |
| `DisperseConfidential` singleton | Mainnet (1) | `0x4fC0d28cBe4B82D512Ad0B42F6787480Cc98cC70` |
| TTT test token (plain ERC-20, 18 dec, open mint) | Sepolia | `0x37a057Fa8C201a7bf8caF32dfa9A0878f577D92b` |
| CTTT confidential test token (ERC-7984 UUPS proxy, 6 dec, backed faucet mint) | Sepolia | `0x258F9D60dc023870e4E3109c894D834D5377361a` |
| Zama FHEVM ACL (from `dist/fhe/acl.d.ts`) | Sepolia | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| `WALLET_IMPLEMENTATION` (live read from singleton) | Sepolia | `0x2ae2f09bD343Dead4B4D9Cc2D6476a6e444b5c8a` |

**Sepolia instance exists and is live** (verified 2026-07-02 by RPC: 18,835 bytes of code, `paused() == false`).

Accessors: `getFheDisperseSingletonAddress(chainId)` / `requireFheDisperseSingletonAddress(chainId)`.

## 3. Verified source retrieval

- Etherscan API v2 without a key: **rejected** (`Missing/Invalid API Key`).
- **Sourcify: worked.** `https://sourcify.dev/server/files/any/11155111/0x710dD9885Cc9986EfD234E7719483147a6d8DBb4` returned the full bundle, match status `partial` (bytecode match; metadata hash differs). 33 files incl. `contracts/DisperseConfidential.sol`, `contracts/wallet/DisperseWallet.sol`, interfaces, `@fhevm/solidity` libs, OZ contracts, metadata.json, constructor args.
- Compiler: **solc 0.8.27**, optimizer on (runs 800), evmVersion `cancun`, `bytecodeHash: none`. Pragma `solidity 0.8.27`.
- Saved to `/Users/santo/dispersekit/packages/smart-contracts/reference/` (6 project .sol files + NOTES.md with constructor args and compiler settings).

## 4. Contract shape (confirmed FHE/confidential)

`DisperseConfidential is IDisperseConfidential, ZamaEthereumConfig, AccessControl, Pausable, ReentrancyGuardTransient`. Imports `{FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol"` and `{externalEuint64} from "encrypted-types/EncryptedTypes.sol"`. Tokens are **ERC-7984** (`IERC7984`: `confidentialTransfer`, `confidentialTransferFrom`, `confidentialBalanceOf`, `setOperator(address,uint48)`, `isOperator`).

### Exact disperse entrypoints

```solidity
// Wallet mode, ETH gas fee. payable: msg.value MUST equal recipients.length * getGasFee(msg.sender)
function disperseConfidentialTokens(
    address token,
    address[] calldata recipients,
    externalEuint64[] calldata encryptedAmounts,
    externalEuint64[2] calldata encryptedSubtotals,
    bytes calldata inputProof
) external payable;

// Direct mode (no holding wallets), ETH gas fee. payable, same exact-fee rule.
function disperseConfidentialTokenDirect(
    address token,
    address[] calldata recipients,
    externalEuint64[] calldata encryptedAmounts,
    bytes calldata inputProof
) external payable;

// Wallet mode, token fee (bps, charged on top of total). NOT payable.
function disperseConfidentialTokensWithTokenFee(
    address token,
    address[] calldata recipients,
    externalEuint64[] calldata encryptedAmounts,
    externalEuint64[2] calldata encryptedSubtotals,
    bytes calldata inputProof
) external;
```

Supporting user functions:

```solidity
function register(address token) external;                       // once per user; deploys 2 deterministic wallet clones, initializes, approves token
function approveUserWalletsForToken(address token) external;     // approve wallets for additional tokens
function revokeUserWalletsForToken(address token) external;
function recoverFromWallets(address token, address to) external; // sweep residual dust
function recoverERC20FromWallets(address token, address to) external;
function isRegistered(address user) external view returns (bool);
function getUserWallet(address user, uint256 index) external view returns (address); // index 0 or 1
function getGasFee(address user) external view returns (uint96);
function getTokenFee(address user) external view returns (uint16);
function getFeeAmounts(address user) external view returns (bool isCustomFee, uint96 gasFee, uint16 tokenFee);
function feeConfig() external view returns (bool gasFeeEnabled, bool tokenFeeEnabled, uint96 defaultGasFee, uint16 defaultTokenFee);
function discloseHandleToParty(euint64 handle, address party) external;
function batchDiscloseHandlesToParty(euint64[] calldata handles, address party) external;
```

### Events

```solidity
event ConfidentialTokensDispersed(address indexed token, address indexed sender, uint256 count, uint8 feeType); // feeType: 0=gas-wallet, 1=token, 2=gas-direct  [indexing UNVERIFIED beyond ABI names; taken from source]
event UserRegistered(address indexed user, address wallet0, address wallet1);
event WalletDistribution(address indexed sender, address wallet, address[] recipients, euint64[] amounts, euint64[] results); // one per wallet group
event DirectDistribution(address indexed sender, address[] recipients, euint64[] requested, euint64[] transferred);
event HandlesDisclosedToParty(address indexed discloser, address indexed party, euint64[] handles);
```

(`euint64` = `bytes32` in the ABI; `externalEuint64` = `bytes32`.)

### Errors (contracts/library/Errors.sol)

`EmptyRecipients, ArrayLengthMismatch, BatchTooLarge(uint256,uint256), ZeroAddressRecipient, InsufficientAmount(uint256 sent, uint256 required), InvalidAddress, UserNotRegistered, UserAlreadyRegistered, HandleNotAllowed, ContractNotAllowed, TransferFailed, NotController, InvalidWalletIndex, EmptyBatch, TokenFeeTooHigh, CustomFeeNotSet`.

## 5. Subtotal mechanics (wallet mode)

- Each registered user has **two** ERC-1167 clone wallets at deterministic addresses (`Clones.predictDeterministicAddress(WALLET_IMPLEMENTATION, keccak256(abi.encodePacked(user, uint256(0 or 1))))`).
- `encryptedSubtotals` is a fixed `externalEuint64[2]`: the plaintext sums of the amounts for each wallet group, encrypted client-side in the **same encrypted input batch** as the amounts (single shared `inputProof`).
- **Split rule** (`_distributeFromWallets` with wCount=2): `baseSize = count / 2`, `remainder = count % 2`; **group0 = first `baseSize + remainder` recipients → wallet0; group1 = remaining `baseSize` recipients → wallet1** (i.e. group0 gets ceil(n/2)). The SDK exports `computeSubtotals(amounts: bigint[]): { group0: bigint; group1: bigint }` implementing exactly this.
- Flow: contract calls `FHE.fromExternal` on both subtotals, then `FHE.allowTransient(subtotalK, token)` + `IERC7984(token).confidentialTransferFrom(msg.sender, walletK, subtotalK)` — pulling from the sender into the two wallets — then transfers each per-recipient amount out of the owning wallet via `confidentialTransferFrom(wallet, recipient, amount)`.
- If a supplied subtotal is less than the group's amounts sum, ERC-7984 transfers silently clamp (no revert; transferred handles reflect actuals). If inflated, residue stays in the subwallet — recover with `recoverFromWallets`. Purpose of the 2-wallet split: on-chain observers cannot link the sender's single debit to per-recipient credits (amounts are encrypted; subtotals split the flow).
- Token-fee mode additionally: sweeps pre-existing wallet balances back to sender (anti-fee-evasion), computes fee = `total * feeBps / 10000` in euint128 with overflow guard, pulls fee via `confidentialTransferFrom(msg.sender, address(this), fee)`, and zeroes both subtotals under FHE `select` if the fee pull fails or the subtotal sum overflows — the tx still succeeds but disperses 0.

## 6. Operator authorization expectations

- **All modes:** sender must first call `token.setOperator(singleton, until)` (ERC-7984, `uint48` unix expiry) so the singleton can `confidentialTransferFrom` the sender's balance. SDK helper: `setOperator({ publicClient, walletClient, token, spender, deadline? })`, default deadline `ERC7984_OPERATOR_MAX_DEADLINE` (2^48−1); `revokeOperator` sets `until = 0`.
- **Wallet modes:** additionally requires one-time `register(token)`; during registration each subwallet calls `token.setOperator(controller, type(uint48).max)` so the singleton can move funds out of the subwallets. For other tokens later, call `approveUserWalletsForToken(token)`.
- **Direct mode:** no registration needed; only the sender→singleton operator grant.

## 7. ACL grants in the contract (pattern to mirror)

- Every per-recipient amount handle: `FHE.allowThis(amount)` immediately after `FHE.fromExternal` (persistent ACL so later `FHE.allow` grants survive).
- Before every token transfer: `FHE.allowTransient(handle, token)` so the token contract may consume the handle.
- After each transfer: `FHE.allow(amount, msg.sender)` and `FHE.allow(amount, recipients[i])` — recipient and sender can decrypt the intended amount; wallet mode also `FHE.allow(result, msg.sender)` (actual transferred amount to sender only; in direct mode the `result` handle gets no explicit grant from the disperser — the token's own transfer ACLs apply).
- Subtotal handles get only `allowTransient` to the token (never persisted, never disclosed).
- Encrypted fee reserve: stored per-token with `FHE.allowThis`; `accessEncryptedFeeReserve(token)` grants view to fee-collector/admin.
- Disclosure: `discloseHandleToParty` / `batchDiscloseHandlesToParty` re-grant any handle the caller is allowed on (`FHE.isSenderAllowed` + contract allowed) to an auditor address.

## 8. Fees, limits, roles (live Sepolia values, read 2026-07-02)

- `feeConfig() = (gasFeeEnabled: true, tokenFeeEnabled: true, defaultGasFee: 1e15 wei = 0.001 ETH per recipient, defaultTokenFee: 500 bps = 5%)`.
- Gas-fee modes revert unless `msg.value == recipients.length * getGasFee(sender)` **exactly** (`Errors.InsufficientAmount`). Always read `getGasFee(sender)` (custom overrides exist) before sending.
- Batch limits (live): wallet/holding **30**, direct **20**, token-fee **5**. Read via `maxBatchSizeHolding() / maxBatchSizeDirect() / maxBatchSizeTokenFee()` (admin-changeable; 0 = unlimited).
- Roles (AccessControl): `DEFAULT_ADMIN_ROLE`, `PAUSER_ROLE`, `WITHDRAWER_ROLE`, `FEE_MANAGER_ROLE`, `FEE_COLLECTOR_ROLE`. Admin/feeCollector at deployment: `0x609e9e59d9d8a1bb8be99e8d74a7a8e2e40ca763`.

## 9. SDK client surface (dist/fhe-disperse)

```ts
import { createConfidentialDisperseClient, computeSubtotals,
         disperseConfidentialAbi, disperseWalletAbi,
         setOperator, revokeOperator, ERC7984_OPERATOR_MAX_DEADLINE } from "@tokenops/sdk/fhe-disperse";

type DisperseMode = "wallet" | "wallet-token-fee" | "direct";
const client = createConfidentialDisperseClient({ publicClient, walletClient, encryptor /* RelayerNode from @zama-fhe/sdk, or @zama-fhe/react-sdk instance */ });
await client.register({ token });
const report = await client.preflightDisperse({ user, token, recipients, amounts, mode }); // report.ready / report.blockerErrors (TokenOpsSdkError[])
const { hash } = await client.disperse({ token, mode, recipients, amounts }); // encrypts amounts+subtotals, attaches exact msg.value
```

`client.disperse` validates inputs, computes subtotals with the contract's exact split rule, encrypts everything in one input batch, computes `msg.value`, and dispatches to the right function by mode. React hooks live in `@tokenops/sdk/fhe-disperse/react`. Encryption uses Zama relayer (`@zama-fhe/sdk ^3.0.0`, `RelayerNode` + `SepoliaConfig`; browser: `@zama-fhe/react-sdk ^3.0.0`).

Amount type is **euint64**; CTTT has **6 decimals** — amounts fit u64 comfortably.

## 10. What was tried / caveats

- `npm view @tokenops/sdk` → found immediately; installed `1.1.1` into scratch and grepped types + ABIs (all signatures above come from the installed package or the verified source).
- Etherscan v2 API keyless → NOTOK (needs key). Sourcify → full source bundle, `partial` match (metadata-hash mismatch only; bytecode matches). Mainnet copy not fetched (out of scope).
- Sourcify metadata does not record dependency package versions; OZ imports include `ReentrancyGuardTransient`/`TransientSlot` ⇒ OZ ≥ 5.1 (UNVERIFIED exact version). `@fhevm/solidity` sources are vendored in the bundle.
- The role constants exported by the SDK (`FEE_COLLECTOR_ROLE = 0x2dca0f5c...`, etc.) match `keccak256("FEE_COLLECTOR_ROLE")`-style definitions in the source (values not independently recomputed — UNVERIFIED, but ABI-consistent).

## GO/NO-GO

**GO.** Use the official Sepolia singleton `0x710dD9885Cc9986EfD234E7719483147a6d8DBb4` with `@tokenops/sdk@1.1.1`. For DisperseKit's widget: `direct` mode is the simplest UX (no registration; needs only `setOperator` + `disperseConfidentialTokenDirect` + exact `msg.value = n * 0.001 ETH`, max 20 recipients on Sepolia); `wallet` mode adds unlinkability (register once, max 30 recipients). Test with CTTT (`0x258F9D6...361a`, faucet-mintable, 6 decimals).
