// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {externalEuint64} from "encrypted-types/EncryptedTypes.sol";

/**
 * @title IDisperseConfidential
 * @author TokenOps
 * @notice Interface for the DisperseConfidential singleton contract.
 *
 * Supports three disperse modes:
 *  1. `disperseConfidentialTokens`              - Per-user wallets, caller-provided subtotals; gas fee
 *  2. `disperseConfidentialTokensWithTokenFee`  - Per-user wallets, caller-provided subtotals; token fee on total
 *  3. `disperseConfidentialTokenDirect`         - Direct transferFrom per recipient; no holding; gas fee
 *
 * @custom:security-contact security@zama.ai
 */
interface IDisperseConfidential {
    // ============================================================
    //                           STRUCTS
    // ============================================================

    /**
     * @notice Consolidated fee configuration (single-slot packed).
     * @param gasFeeEnabled Whether gas fees are enabled globally.
     * @param tokenFeeEnabled Whether token fees are enabled globally.
     * @param defaultGasFee Default gas fee per recipient in wei (uint96 max ~79.2B ETH).
     * @param defaultTokenFee Default token fee in basis points (e.g., 500 = 5%, max 10000).
     */
    struct FeeConfig {
        bool gasFeeEnabled;
        bool tokenFeeEnabled;
        uint96 defaultGasFee;
        uint16 defaultTokenFee;
    }

    // ============================================================
    //                           EVENTS
    // ============================================================

    // solhint-disable gas-indexed-events

    /**
     * @notice Emitted when a confidential token disperse completes.
     * @param token The ERC-7984 token address.
     * @param sender The initiating account.
     * @param recipientCount The number of recipients.
     * @param feeType Fee and distribution mode: 0=Gas+Wallet, 1=Token+Wallet, 2=Gas+Direct.
     */
    event ConfidentialTokensDispersed(
        address indexed token,
        address indexed sender,
        uint256 recipientCount,
        uint8 feeType
    );

    /**
     * @notice Emitted when the fee configuration is updated.
     * @param config The new fee configuration.
     */
    event FeeConfigUpdated(FeeConfig config);

    /**
     * @notice Emitted when a custom fee is set for a user.
     * @param user The user address.
     * @param gasFee The custom gas fee in wei.
     * @param tokenFee The custom token fee in basis points.
     */
    event CustomFeeSet(address indexed user, uint96 gasFee, uint16 tokenFee);

    /**
     * @notice Emitted when a custom fee is removed for a user.
     * @param user The user address.
     */
    event CustomFeeDisabled(address indexed user);

    /**
     * @notice Emitted when accumulated gas fees are withdrawn.
     * @param to The recipient of the withdrawn ETH.
     * @param amount The amount of ETH withdrawn.
     */
    event GasFeeWithdrawn(address indexed to, uint256 amount);

    /**
     * @notice Emitted when accumulated token fees are withdrawn.
     * @param token The ERC-7984 token address.
     * @param to The recipient of the withdrawn tokens.
     * @param amount The encrypted amount actually transferred (returned by
     *        `confidentialTransfer`). May be less than the requested amount
     *        on partial transfer; the reserve is decremented by this value.
     */
    event TokenFeeWithdrawn(address indexed token, address indexed to, euint64 amount);

    /**
     * @notice Emitted when the max batch size for holding/wallet-mode disperses is updated.
     * @param oldSize The previous max batch size.
     * @param newSize The new max batch size.
     */
    event MaxBatchSizeHoldingUpdated(uint256 oldSize, uint256 newSize);

    /**
     * @notice Emitted when the max batch size for direct-mode disperses is updated.
     * @param oldSize The previous max batch size.
     * @param newSize The new max batch size.
     */
    event MaxBatchSizeDirectUpdated(uint256 oldSize, uint256 newSize);

    /**
     * @notice Emitted when the max batch size for token-fee mode disperses is updated.
     * @param oldSize The previous max batch size.
     * @param newSize The new max batch size.
     */
    event MaxBatchSizeTokenFeeUpdated(uint256 oldSize, uint256 newSize);

    /**
     * @notice Emitted when the admin rescues stuck confidential tokens.
     * @param token The ERC-7984 token address.
     * @param to The recipient of the rescued tokens.
     */
    event ConfidentialTokensRescued(address indexed token, address indexed to);

    /**
     * @notice Emitted when the admin rescues stuck ERC-20 tokens.
     * @param token The ERC-20 token address.
     * @param to The recipient of the rescued tokens.
     * @param amount The amount rescued.
     */
    event ERC20Rescued(address indexed token, address indexed to, uint256 amount);

    /**
     * @notice Emitted when a user registers their wallet pair.
     * @param user The registered user address.
     * @param wallet0 The first wallet clone address.
     * @param wallet1 The second wallet clone address.
     */
    event UserRegistered(address indexed user, address wallet0, address wallet1);

    /**
     * @notice Emitted once per wallet group during wallet distribution with parallel arrays
     * of recipients and their requested / transferred amounts.
     *
     * For a 2-wallet disperse, this event fires twice - once per wallet - with each event
     * carrying the subset of recipients served by that wallet.
     *
     * ACL: sender and each recipient hold persistent decrypt access on `requested` (granted
     * explicitly in the distribution loop) and on `transferred` (granted by ERC-7984's
     * `_update` to both `from` = wallet and `to` = recipient; sender is granted explicitly).
     *
     * @param sender The account that initiated the disperse (msg.sender).
     * @param wallet The source wallet for this group.
     * @param recipients The target recipients served by this wallet.
     * @param requested The encrypted amounts requested (parallel to `recipients`).
     * @param transferred The encrypted amounts actually transferred (0 entries where the
     *        wallet balance was insufficient).
     */
    event WalletDistribution(
        address indexed sender,
        address wallet,
        address[] recipients,
        euint64[] requested,
        euint64[] transferred
    );

    /**
     * @notice Emitted once per direct-mode disperse call with per-recipient arrays.
     * Both sender (= `from`) and each recipient (= `to`) hold persistent ACL on the `transferred`
     * handles via ERC-7984's `_update`. The sender and each recipient also hold persistent ACL on
     * their corresponding `requested` handle, explicitly granted before the emit.
     * @param sender The initiating account (source of funds).
     * @param recipients The target recipients for the disperse.
     * @param requested The encrypted amounts requested (parallel to `recipients`).
     * @param transferred The encrypted amounts actually transferred (0 if sender balance insufficient).
     */
    event DirectDistribution(address indexed sender, address[] recipients, euint64[] requested, euint64[] transferred);

    /**
     * @notice Emitted when one or more encrypted handles are disclosed to a third party.
     * @dev Fires once per call to {discloseHandleToParty} (length-1 `handles`) or
     * {batchDiscloseHandlesToParty}. `(discloser, party)` is fixed across every handle in the
     * emission, matching the array-emit pattern of {WalletDistribution} and {DirectDistribution}.
     * @param discloser The caller that initiated the disclosure.
     * @param party The recipient of the new persistent ACL grants.
     * @param handles The FHE-encrypted handles that were disclosed.
     */
    event HandlesDisclosedToParty(address indexed discloser, address indexed party, euint64[] handles);

    // solhint-enable gas-indexed-events

    // ============================================================
    //                    CORE DISPERSE FUNCTIONS
    // ============================================================

    /**
     * @notice Disperse confidential tokens using per-user wallets with caller-provided subtotals.
     *
     * The default and recommended disperse entry point. Supports up to 30 recipients
     * (30 amounts + 2 subtotals = 32 encrypted inputs).
     *
     * Recipients are partitioned into 2 sequential groups. The caller provides pre-computed
     * subtotals for each group. No on-chain tree-sum is performed — subtotals are trusted
     * from the caller because computing them on-chain would require O(N) FHE additions,
     * exceeding the 5M HCU depth limit. This is a standard FHEVM pattern: encrypted
     * computation results cannot be branched on in cleartext, so the contract cannot
     * revert on mismatch — it can only produce zero-value transfers.
     *
     * Both sender and each recipient receive permanent ACL on the transferred amount handles,
     * enabling post-transaction decryption via the emitted WalletDistribution events.
     *
     * ## Subtotal Correctness (Critical for Frontend/SDK Developers)
     *
     * The caller MUST compute subtotals correctly. Recipients are split into 2 groups:
     *
     * - Group 0 (wallet0): recipients[0 .. baseSize + remainder - 1]
     * - Group 1 (wallet1): recipients[baseSize + remainder .. count - 1]
     *
     * where `baseSize = count / 2` and `remainder = count % 2` (first wallet gets the
     * extra recipient for odd counts).
     *
     * `encryptedSubtotals[0]` MUST equal the plaintext sum of amounts for Group 0.
     * `encryptedSubtotals[1]` MUST equal the plaintext sum of amounts for Group 1.
     *
     * ## Failure Modes for Incorrect Subtotals
     *
     * Because the ERC-7984 token uses all-or-nothing transfer semantics (tryDecrease
     * returns 0 on insufficient balance, never a partial amount), incorrect subtotals
     * produce deterministic — but silent — failures:
     *
     * - **Deflated subtotals** (`subtotal < group sum`): The wallet receives fewer tokens
     *   than needed. Early recipients in the group receive their full amount until the
     *   wallet is exhausted; remaining recipients silently receive 0. The gas fee (ETH)
     *   is still consumed. No revert occurs. The `WalletDistribution` event's `transferred`
     *   handle will decrypt to 0 for affected recipients — monitor this post-transaction.
     *
     * - **Inflated subtotals** (`subtotal > group sum`): All recipients receive their
     *   correct amounts. Excess tokens remain in the wallet and MUST be swept by the
     *   sender via `recoverFromWallets`. No fund loss occurs, but tokens are temporarily
     *   locked until recovery.
     *
     * - **Both subtotals zero**: No tokens are pulled into wallets. All recipients
     *   receive 0. Gas fee is still consumed.
     *
     * In all cases, the `ConfidentialTokensDispersed` event fires regardless of outcome.
     * Frontend/SDK code SHOULD decrypt the `transferred` handles from `WalletDistribution`
     * events and alert the user if any decrypt to 0 unexpectedly.
     *
     * Requirements:
     * - Caller must have registered via `register(token)`
     * - `recipients.length >= 1` and `<= maxBatchSizeHolding` (if limit > 0)
     * - `encryptedAmounts.length == recipients.length`
     * - No zero-address recipients
     * - `msg.value == recipients.length * gasFee`
     * - Caller must have set this contract as operator on `token`
     * - Duplicate addresses in `recipients` are allowed but each consumes a separate
     *   wallet transfer. Deduplication is the caller's responsibility.
     *
     * @param token ERC-7984 token address.
     * @param recipients Array of recipient addresses.
     * @param encryptedAmounts Per-recipient encrypted amounts.
     * @param encryptedSubtotals Pre-computed encrypted subtotals for each wallet group [group0Sum, group1Sum].
     * @param inputProof Shared input proof for all encrypted inputs.
     */
    function disperseConfidentialTokens(
        address token,
        address[] calldata recipients,
        externalEuint64[] calldata encryptedAmounts,
        externalEuint64[2] calldata encryptedSubtotals,
        bytes calldata inputProof
    ) external payable;

    /**
     * @notice Disperse confidential tokens directly from sender to each recipient.
     *
     * No funds are held by this contract. Calls `confidentialTransferFrom` for each
     * recipient using the caller's balance. Gas fee collected per recipient.
     *
     * Requirements:
     * - `recipients.length >= 1` and `<= maxBatchSizeDirect` (if limit > 0)
     * - `encryptedAmounts.length == recipients.length`
     * - No zero-address recipients
     * - `msg.value == recipients.length * gasFee`
     * - Caller must have set this contract as operator on `token`
     * - Duplicate addresses in `recipients` are allowed but each consumes a separate
     *   transfer. Deduplication is the caller's responsibility.
     *
     * @param token ERC-7984 token address.
     * @param recipients Array of recipient addresses.
     * @param encryptedAmounts Per-recipient encrypted amounts.
     * @param inputProof Shared input proof for all encrypted inputs.
     */
    function disperseConfidentialTokenDirect(
        address token,
        address[] calldata recipients,
        externalEuint64[] calldata encryptedAmounts,
        bytes calldata inputProof
    ) external payable;

    /**
     * @notice Disperse confidential tokens using per-user wallets with token fee on the total.
     *
     * Computes a BPS fee on the sum of caller-provided subtotals and pulls it from the
     * sender to the contract reserve. Then pulls the (post-fee-check) subtotals into the
     * caller's registered wallet pair and distributes individual amounts to recipients.
     *
     * If the subtotals overflow euint64 when summed, or if the fee pull fails (sender has
     * insufficient balance for the fee), all subtotals are zeroed via FHE.select and
     * recipients receive nothing. The transaction still succeeds (no revert) because
     * encrypted computation results cannot be branched on in cleartext — this is inherent
     * to FHEVM. The fee reserve accumulates 0 on failure.
     *
     * ## Subtotal Correctness (Critical for Frontend/SDK Developers)
     *
     * All subtotal rules from `disperseConfidentialTokens` apply here. Additionally:
     *
     * - **Fee is computed on `subtotal0 + subtotal1`**, not on `sum(amounts[])`.
     *   If subtotals are inflated, the caller overpays the fee (self-harm only — the
     *   protocol collects more, but the caller can recover excess tokens from wallets).
     *   If subtotals are deflated, the fee is proportionally lower, but so is the
     *   actual distribution — there is no way to underpay fees while fully distributing.
     *
     * - **The sender must hold `subtotal0 + subtotal1 + fee` tokens** and have approved
     *   this contract as operator. The fee is pulled first. If the sender's balance
     *   covers the fee but not the subtotals, the fee is consumed and subtotals pull
     *   less than expected — some recipients silently receive 0.
     *
     * - **On subtotal sum overflow** (subtotal0 + subtotal1 > type(uint64).max):
     *   Both subtotals are zeroed, fee is computed on 0 (so 0 fee pulled), and all
     *   recipients receive 0. The transaction succeeds as a silent no-op.
     *
     * ## Failure Modes
     *
     * See `disperseConfidentialTokens` for subtotal mismatch failure modes. Additional
     * token-fee-specific failures:
     *
     * - **Fee pull failure**: If `confidentialTransferFrom` for the fee returns 0
     *   (insufficient sender balance), both subtotals are zeroed. No tokens move.
     *   The `ConfidentialTokensDispersed` event still fires. Monitor
     *   `WalletDistribution` events' `transferred` handles for post-hoc verification.
     *
     * - **Subtotal overflow**: Detected by `FHE.ge(total, subtotal0)`. Both subtotals
     *   and the fee are zeroed. Clean no-op.
     *
     * Requirements:
     * - Caller must have registered via `register(token)`
     * - `recipients.length >= 1` and `<= maxBatchSizeTokenFee` (if limit > 0)
     * - `encryptedAmounts.length == recipients.length`
     * - No zero-address recipients
     * - Caller must have set this contract as operator on `token`
     * - Duplicate addresses in `recipients` are allowed but each consumes a separate
     *   wallet transfer. Deduplication is the caller's responsibility.
     *
     * @param token ERC-7984 token address.
     * @param recipients Array of recipient addresses.
     * @param encryptedAmounts Per-recipient encrypted amounts.
     * @param encryptedSubtotals Pre-computed encrypted subtotals for each wallet group [group0Sum, group1Sum].
     * @param inputProof Shared input proof for all encrypted inputs.
     */
    function disperseConfidentialTokensWithTokenFee(
        address token,
        address[] calldata recipients,
        externalEuint64[] calldata encryptedAmounts,
        externalEuint64[2] calldata encryptedSubtotals,
        bytes calldata inputProof
    ) external;

    // ============================================================
    //                   USER WALLET FUNCTIONS
    // ============================================================

    /**
     * @notice Register the caller's dedicated wallet pair for disperseConfidentialTokens.
     * Deploys 2 deterministic ERC-1167 clones and approves them for `token`.
     * Can only be called once per user. Use `approveUserWalletsForToken` for additional tokens.
     *
     * Requirements:
     * - `token` must not be the zero address.
     *
     * @param token The ERC-7984 token to approve on the wallets.
     */
    function register(address token) external;

    /**
     * @notice Check if a user has registered their wallet pair.
     * @param user The user address to check.
     * @return True if the user has registered.
     */
    function isRegistered(address user) external view returns (bool);

    /**
     * @notice Returns the wallet address for a registered user.
     * @param user The user address.
     * @param index The wallet index (0 or 1). Reverts for any other value.
     * @return The wallet address, or address(0) if not registered.
     */
    function getUserWallet(address user, uint256 index) external view returns (address);

    /**
     * @notice Approve the caller's existing wallets for an additional token.
     * Callable only by the registered user themselves (no admin required).
     * @param token The ERC-7984 token to approve.
     */
    function approveUserWalletsForToken(address token) external;

    /**
     * @notice Revoke the controller's operator approval on `token` for the caller's wallets.
     * Callable only by the registered user themselves. The user can re-approve later
     * via `approveUserWalletsForToken` if needed.
     * @param token The ERC-7984 token to revoke approval for.
     */
    function revokeUserWalletsForToken(address token) external;

    /**
     * @notice Recover all residual confidential tokens from the caller's own wallets.
     *
     * Callable only by the registered user themselves. Sends all tokens from both
     * wallets to the specified recipient address.
     *
     * This is the primary recovery mechanism when subtotals are incorrect:
     * - If subtotals were inflated (more tokens pulled into wallets than distributed),
     *   the excess remains in the wallets and can be swept here.
     * - If subtotals were deflated, some recipients received 0 but the tokens that
     *   were successfully pulled into wallets and not distributed also remain and can
     *   be recovered here.
     *
     * Frontend/SDK code SHOULD call this function after detecting a subtotal mismatch
     * (i.e., when any `WalletDistribution` event's `transferred` handle decrypts to 0
     * unexpectedly).
     *
     * @param token The ERC-7984 token to recover.
     * @param to The recipient of the recovered tokens.
     */
    function recoverFromWallets(address token, address to) external;

    /**
     * @notice Recover ERC-20 tokens accidentally sent to the caller's wallets.
     * @param token The ERC-20 token to recover.
     * @param to The recipient of the recovered tokens.
     */
    function recoverERC20FromWallets(address token, address to) external;

    // ============================================================
    //                   FEE COLLECTOR FUNCTIONS
    // ============================================================

    /**
     * @notice Withdraw accumulated native ETH gas fees.
     *
     * Requirements:
     * - Caller must have `FEE_COLLECTOR_ROLE`.
     *
     * @param to Recipient of the withdrawn ETH.
     * @param amount Amount of ETH to withdraw (in wei).
     */
    function withdrawGasFee(address to, uint256 amount) external;

    /**
     * @notice Withdraw accumulated encrypted token fees.
     *
     * Withdrawal is capped at the available reserve using `FHE.min` to prevent
     * silent underflow. ERC-7984 `confidentialTransfer` can transfer less than
     * the requested amount without reverting; the reserve is therefore
     * decremented by the amount actually transferred (returned by the token),
     * not the requested amount, keeping reserve and contract balance in sync.
     * The {TokenFeeWithdrawn} event carries that actually-transferred handle.
     *
     * Requirements:
     * - Caller must have `FEE_COLLECTOR_ROLE`.
     *
     * @param token ERC-7984 token address.
     * @param to Recipient of the withdrawn tokens.
     * @param encryptedAmount Encrypted amount to withdraw.
     * @param inputProof Input proof for `encryptedAmount`.
     */
    function withdrawTokenFee(
        address token,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external;

    /**
     * @notice Grants the caller persistent ACL on the encrypted fee reserve for
     *         `token` and returns the reserve handle.
     *
     * If no fees have accrued the returned handle is the zero-handle and no ACL
     * grant is written. Callers check `FHE.isInitialized` (or zero-hash) off-chain
     * before attempting `userDecrypt`.
     *
     * Requirements:
     * - Caller must have `FEE_COLLECTOR_ROLE` or `DEFAULT_ADMIN_ROLE`.
     *
     * @param token ERC-7984 token address to query.
     * @return reserve The encrypted reserve handle (zero-handle if no fees accrued).
     */
    function accessEncryptedFeeReserve(address token) external returns (euint64 reserve);

    // ============================================================
    //                    FEE MANAGER FUNCTIONS
    // ============================================================

    /**
     * @notice Set the fee configuration (fee values and toggles).
     *
     * Requirements:
     * - Caller must have `FEE_MANAGER_ROLE`.
     * - `config.defaultTokenFee <= 10000`.
     *
     * @param config The new fee configuration.
     */
    function setFeeConfig(FeeConfig calldata config) external;

    /**
     * @notice Set the max batch size for wallet-mode (holding) disperses.
     *
     * Setting to 0 disables the limit (app-side determines optimal batch size).
     *
     * Requirements:
     * - Caller must have `DEFAULT_ADMIN_ROLE`.
     *
     * @param size New maximum batch size (0 = no limit).
     */
    function setMaxBatchSizeHolding(uint256 size) external;

    /**
     * @notice Set the max batch size for direct-mode confidential disperses.
     *
     * Setting to 0 disables the limit (app-side determines optimal batch size).
     *
     * Requirements:
     * - Caller must have `DEFAULT_ADMIN_ROLE`.
     *
     * @param size New maximum batch size (0 = no limit).
     */
    function setMaxBatchSizeDirect(uint256 size) external;

    /**
     * @notice Set the max batch size for token-fee mode disperses.
     *
     * Setting to 0 disables the limit (app-side determines optimal batch size).
     *
     * Requirements:
     * - Caller must have `DEFAULT_ADMIN_ROLE`.
     *
     * @param size New maximum batch size (0 = no limit).
     */
    function setMaxBatchSizeTokenFee(uint256 size) external;

    /**
     * @notice Set a custom fee override for a specific user.
     *
     * Requirements:
     * - Caller must have `FEE_MANAGER_ROLE`.
     * - `tokenFee <= 10000`.
     * - `user != address(0)`.
     *
     * @param user The user address to apply the custom fee to.
     * @param gasFee Custom gas fee in wei per recipient.
     * @param tokenFee Custom token fee in basis points.
     */
    function setCustomFee(address user, uint96 gasFee, uint16 tokenFee) external;

    /**
     * @notice Remove the custom fee override for a specific user.
     *
     * Requirements:
     * - Caller must have `FEE_MANAGER_ROLE`.
     * - Custom fee must exist for `user`.
     *
     * @param user The user address to remove the custom fee from.
     */
    function disableCustomFee(address user) external;

    // ============================================================
    //                      ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Pause all disperse functions (emergency circuit breaker).
     *
     * Requirements:
     * - Caller must have `PAUSER_ROLE`.
     */
    function pause() external;

    /**
     * @notice Unpause all disperse functions.
     *
     * Requirements:
     * - Caller must have `PAUSER_ROLE`.
     */
    function unpause() external;

    /**
     * @notice Rescue stuck confidential tokens from the contract.
     *
     * Transfers the contract's balance minus any reserved fee amount for the given
     * token to `to`. Uses `FHE.min` to cap the reserve at the contract balance
     * before subtracting, preventing silent underflow.
     *
     * Requirements:
     * - Caller must have `WITHDRAWER_ROLE`.
     *
     * @param token ERC-7984 token address.
     * @param to Recipient of the rescued tokens.
     */
    function rescueConfidentialTokens(address token, address to) external;

    /**
     * @notice Rescue stuck ERC-20 tokens from the contract.
     *
     * Transfers the contract's entire ERC-20 balance of `token` to `to`.
     * Use this for non-ERC-7984 tokens accidentally sent to the contract.
     *
     * Requirements:
     * - Caller must have `WITHDRAWER_ROLE`.
     *
     * @param token ERC-20 token address.
     * @param to Recipient of the rescued tokens.
     */
    function rescueERC20(address token, address to) external;

    // ============================================================
    //                    DISCLOSURE FUNCTIONS
    // ============================================================

    /**
     * @notice Grants `party` persistent FHE ACL on `handle`.
     *
     * Lets anyone who already holds ACL on a disperse-context handle re-share it
     * with a third party - for example, a sender hands off decrypt rights on their
     * own `requested` amount to an accountant. FHEVM ACL is append-only: once
     * granted, `party`'s decrypt access cannot be revoked.
     *
     * Works for handles where disperse holds persistent ACL (`requested` /
     * `amounts` handles from {WalletDistribution} and {DirectDistribution}, and
     * the fee-reserve handle from {accessEncryptedFeeReserve}). ERC-7984-derived
     * `transferred` handles are granted only under the token contract's scope;
     * calling this function with one reverts with {ContractNotAllowed}. Decrypt
     * those via `tokenAddress` scope instead.
     *
     * Requirements:
     * - `party` must not be the zero address.
     * - Caller must hold FHE ACL on `handle` (`FHE.isSenderAllowed`).
     * - This contract must hold FHE ACL on `handle` (`FHE.isAllowed`).
     *
     * Emits a {HandlesDisclosedToParty} event carrying a length-1 `handles` array.
     *
     * @param handle The encrypted handle to re-share.
     * @param party The address receiving persistent decrypt access.
     */
    function discloseHandleToParty(euint64 handle, address party) external;

    /**
     * @notice Batch variant of {discloseHandleToParty}.
     *
     * Atomically grants `party` persistent ACL on every handle in `handles`.
     * Reverts on the first handle that fails the caller-ACL or contract-ACL
     * check; no partial grants are written. Gas and HCU scale linearly with
     * `handles.length`.
     *
     * Requirements:
     * - `party` must not be the zero address.
     * - `handles` must not be empty.
     * - Caller must hold FHE ACL on every handle.
     * - This contract must hold FHE ACL on every handle.
     *
     * Emits a {HandlesDisclosedToParty} event carrying the full `handles` array.
     *
     * @param handles The encrypted handles to re-share.
     * @param party The address receiving persistent decrypt access.
     */
    function batchDiscloseHandlesToParty(euint64[] calldata handles, address party) external;

    // ============================================================
    //                       VIEW FUNCTIONS
    // ============================================================

    /// @notice Returns the current fee configuration.
    /// @return gasFeeEnabled Whether gas fees are enabled.
    /// @return tokenFeeEnabled Whether token fees are enabled.
    /// @return defaultGasFee The gas fee in wei.
    /// @return defaultTokenFee The token fee in basis points.
    function feeConfig()
        external
        view
        returns (bool gasFeeEnabled, bool tokenFeeEnabled, uint96 defaultGasFee, uint16 defaultTokenFee);

    /// @notice Returns the max batch size for wallet-mode (holding) disperses (0 = no limit).
    /// @return The max batch size.
    function maxBatchSizeHolding() external view returns (uint256);

    /// @notice Returns the max batch size for direct-mode confidential disperses (0 = no limit).
    /// @return The max batch size.
    function maxBatchSizeDirect() external view returns (uint256);

    /// @notice Returns the max batch size for token-fee mode disperses (0 = no limit).
    /// @return The max batch size.
    function maxBatchSizeTokenFee() external view returns (uint256);

    /// @notice Returns the block number at which this contract was deployed.
    /// @return The deployment block number.
    function DEPLOYMENT_BLOCK_NUMBER() external view returns (uint256);

    /**
     * @notice Returns the resolved gas fee for a given user (custom if set, else default).
     * @param user The user address to query.
     * @return The resolved gas fee in wei.
     */
    function getGasFee(address user) external view returns (uint96);

    /**
     * @notice Returns the resolved token fee (in BPS) for a given user.
     * @param user The user address to query.
     * @return The resolved token fee in basis points.
     */
    function getTokenFee(address user) external view returns (uint16);

    /**
     * @notice Returns whether a custom fee is configured for the given user.
     * @param user The user address to query.
     * @return True if the user has a custom fee set.
     */
    function hasCustomFee(address user) external view returns (bool);

    /**
     * @notice Returns both resolved fees for a user in a single call.
     *
     * Respects global fee toggles and per-user custom fee overrides.
     *
     * @param user The user address to query.
     * @return isCustomFee Whether the user has a custom fee override.
     * @return gasFee The resolved gas fee in wei.
     * @return tokenFee The resolved token fee in basis points.
     */
    function getFeeAmounts(address user) external view returns (bool isCustomFee, uint96 gasFee, uint16 tokenFee);

    /**
     * @notice Returns the custom fee override details for a user.
     *
     * Returns raw stored values regardless of global toggle state.
     *
     * @param user The user address to query.
     * @return enabled Whether the user has a custom fee set.
     * @return gasFee The custom gas fee in wei (0 if not set).
     * @return tokenFee The custom token fee in basis points (0 if not set).
     */
    function getCustomFee(address user) external view returns (bool enabled, uint96 gasFee, uint16 tokenFee);

    // ============================================================
    //                    WALLET MANAGEMENT
    // ============================================================

    /// @notice Returns the wallet implementation address (ERC-1167 master copy).
    /// @return The wallet implementation address.
    function WALLET_IMPLEMENTATION() external view returns (address);
}
