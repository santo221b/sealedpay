// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

// FHEVM imports
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {externalEuint64} from "encrypted-types/EncryptedTypes.sol";

// OpenZeppelin imports
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

// Wallet
import {DisperseWallet} from "./wallet/DisperseWallet.sol";

// ERC7984 interface
import {IERC7984} from "./interfaces/IERC7984.sol";

// Arbitrum interface
import {IArbSys} from "./interfaces/IArbSys.sol";

// Local imports
import {IDisperseConfidential} from "./interfaces/IDisperseConfidential.sol";
import {Errors} from "./library/Errors.sol";

/**
 * @title DisperseConfidential
 * @author TokenOps
 * @notice Privacy-preserving token distribution using FHEVM.
 *
 * Supports dispersing encrypted ERC-7984 token amounts to multiple recipients
 * without revealing individual allocations on-chain.
 *
 * ## Disperse Modes
 *
 * | Function                                 | Fee Mode      | Wallets     |
 * |------------------------------------------|---------------|-------------|
 * | `disperseConfidentialTokens`             | Gas (ETH)     | Per-user    |
 * | `disperseConfidentialTokensWithTokenFee` | Token (on top)| Per-user    |
 * | `disperseConfidentialTokenDirect`        | Gas (ETH)     | None        |
 *
 * ## FHE Safety Rules
 *
 * - All encrypted handles stored in state have `FHE.allowThis()` called on them for
 *   persistent ACL. Transient handles only use `FHE.allowTransient`.
 * - `FHE.sub` wraps silently on underflow - always use `FHE.min` to cap first.
 * - Fee accumulation uses `euint128` for overflow headroom, cast to `euint64` for transfers.
 *
 * ## Access Control
 *
 * | Role                | Permissions                                              |
 * |---------------------|----------------------------------------------------------|
 * | `DEFAULT_ADMIN_ROLE`| set max batch size, grant/revoke all roles                |
 * | `PAUSER_ROLE`       | pause/unpause                                            |
 * | `WITHDRAWER_ROLE`   | rescue tokens                                            |
 * | `FEE_MANAGER_ROLE`  | set fees                                                 |
 * | `FEE_COLLECTOR_ROLE`| withdraw gas fees, withdraw token fees                   |
 *
 * @custom:security-contact security@zama.ai
 */
contract DisperseConfidential is
    IDisperseConfidential,
    ZamaEthereumConfig,
    AccessControl,
    Pausable,
    ReentrancyGuardTransient
{
    using SafeERC20 for IERC20;

    // ============================================================
    //                           ROLES
    // ============================================================

    /// @notice Role identifier for addresses authorized to pause/unpause the contract.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role identifier for addresses authorized to rescue stuck tokens.
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    /// @notice Role identifier for addresses authorized to set fees.
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    /// @notice Role identifier for addresses authorized to withdraw collected fees.
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");

    // ============================================================
    //                        CONSTANTS
    // ============================================================

    /// @notice Denominator for basis point fee calculations (10000 = 100%).
    uint256 public constant BASIS_POINTS = 10_000;

    /// @notice Mode id emitted in {ConfidentialTokensDispersed.feeType}: gas fee, wallet-mode distribution.
    uint8 public constant FEE_TYPE_GAS = 0;

    /// @notice Mode id emitted in {ConfidentialTokensDispersed.feeType}: token fee, wallet-mode distribution.
    uint8 public constant FEE_TYPE_TOKEN = 1;

    /// @notice Mode id emitted in {ConfidentialTokensDispersed.feeType}: gas fee, direct (no-holding) distribution.
    uint8 public constant FEE_TYPE_GAS_DIRECT = 2;

    // ============================================================
    //                       IMMUTABLES
    // ============================================================

    /// @notice Block number at which this contract was deployed.
    uint256 public immutable DEPLOYMENT_BLOCK_NUMBER;

    /// @notice The ERC-1167 master copy address for wallet clones.
    address public immutable WALLET_IMPLEMENTATION;

    // ============================================================
    //                         STATE
    // ============================================================

    /// @notice Consolidated fee configuration.
    FeeConfig public feeConfig;

    /// @notice Max recipients for holding-mode disperses (gas fee).
    uint256 public maxBatchSizeHolding;

    /// @notice Max recipients for direct-mode confidential disperses (gas fee).
    uint256 public maxBatchSizeDirect;

    /// @notice Max recipients for token-fee mode disperses (euint128 fee math).
    uint256 public maxBatchSizeTokenFee;

    /// @dev Per-user custom fee overrides (single-slot packed: bool + uint96 + uint16 = 1 + 12 + 2 = 15 bytes).
    struct CustomFee {
        bool enabled;
        uint96 gasFee;
        uint16 tokenFee;
    }
    mapping(address user => CustomFee customFee) private _customFees;

    /// @dev Encrypted token fee reserves per token address.
    mapping(address token => euint64 reservedAmount) private _tokenFeeReserved;

    /// @notice Per-user wallet pair for the wallet-mode disperse.
    struct UserWallets {
        address wallet0;
        address wallet1;
    }
    mapping(address user => UserWallets wallets) private _userWallets;

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    /**
     * @notice Initializes the contract with roles and default configuration.
     *
     * The FHE coprocessor is initialized automatically via `ZamaEthereumConfig`.
     * The wallet implementation is deployed in the constructor as an immutable.
     *
     * @param admin_ Address receiving `DEFAULT_ADMIN_ROLE`, `PAUSER_ROLE`, `WITHDRAWER_ROLE`, and `FEE_MANAGER_ROLE`.
     * @param feeCollector_ Address receiving `FEE_COLLECTOR_ROLE`.
     * @param config_ Initial fee configuration.
     * @param maxBatchSizeHolding_ Max batch size for wallet-mode disperses (0 = no limit).
     * @param maxBatchSizeDirect_ Max batch size for direct-mode disperses (0 = no limit).
     * @param maxBatchSizeTokenFee_ Max batch size for token-fee mode disperses (0 = no limit).
     */
    constructor(
        address admin_,
        address feeCollector_,
        FeeConfig memory config_,
        uint256 maxBatchSizeHolding_,
        uint256 maxBatchSizeDirect_,
        uint256 maxBatchSizeTokenFee_
    ) {
        if (admin_ == address(0) || feeCollector_ == address(0)) {
            revert Errors.InvalidAddress();
        }
        if (config_.defaultTokenFee > BASIS_POINTS) revert Errors.TokenFeeTooHigh(config_.defaultTokenFee);

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PAUSER_ROLE, admin_);
        _grantRole(WITHDRAWER_ROLE, admin_);
        _grantRole(FEE_MANAGER_ROLE, admin_);
        _grantRole(FEE_COLLECTOR_ROLE, feeCollector_);

        feeConfig = config_;
        maxBatchSizeHolding = maxBatchSizeHolding_;
        maxBatchSizeDirect = maxBatchSizeDirect_;
        maxBatchSizeTokenFee = maxBatchSizeTokenFee_;

        // Deploy wallet implementation once — immutable, shared by all per-user clones
        WALLET_IMPLEMENTATION = address(new DisperseWallet());

        DEPLOYMENT_BLOCK_NUMBER = _getBlockNumberish();
    }

    // ============================================================
    //                    CORE DISPERSE FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function disperseConfidentialTokens(
        address token,
        address[] calldata recipients,
        externalEuint64[] calldata encryptedAmounts,
        externalEuint64[2] calldata encryptedSubtotals,
        bytes calldata inputProof
    ) external payable nonReentrant whenNotPaused {
        if (token == address(0)) revert Errors.InvalidAddress();

        // 1. Load user wallets from storage
        UserWallets storage uw = _userWallets[msg.sender];
        if (uw.wallet0 == address(0)) revert Errors.UserNotRegistered();

        // 2. Validate
        uint256 count = recipients.length;
        _validateBatch(recipients, encryptedAmounts.length, maxBatchSizeHolding);
        _collectExactGasFee(count);

        // 3. Emit before interactions (CEI)
        emit ConfidentialTokensDispersed(token, msg.sender, count, FEE_TYPE_GAS);

        // 4. Convert encrypted amounts (N handles)
        euint64[] memory amounts = new euint64[](count);
        for (uint256 i = 0; i < count; ++i) {
            amounts[i] = FHE.fromExternal(encryptedAmounts[i], inputProof);
            // Grant persistent ACL so downstream FHE.allow grants on this handle survive.
            FHE.allowThis(amounts[i]);
        }

        // 5. Convert encrypted subtotals (2 handles)
        euint64 subtotal0 = FHE.fromExternal(encryptedSubtotals[0], inputProof);
        euint64 subtotal1 = FHE.fromExternal(encryptedSubtotals[1], inputProof);

        // 6. Pull subtotals from sender to user wallets
        FHE.allowTransient(subtotal0, token);
        IERC7984(token).confidentialTransferFrom(msg.sender, uw.wallet0, subtotal0);
        FHE.allowTransient(subtotal1, token);
        IERC7984(token).confidentialTransferFrom(msg.sender, uw.wallet1, subtotal1);

        // 7. Distribute from wallets to recipients
        address[] memory walletAddrs = new address[](2);
        walletAddrs[0] = uw.wallet0;
        walletAddrs[1] = uw.wallet1;
        _distributeFromWallets(token, recipients, amounts, count, 2, walletAddrs);
    }

    /// @inheritdoc IDisperseConfidential
    function disperseConfidentialTokenDirect(
        address token,
        address[] calldata recipients,
        externalEuint64[] calldata encryptedAmounts,
        bytes calldata inputProof
    ) external payable nonReentrant whenNotPaused {
        if (token == address(0)) revert Errors.InvalidAddress();

        uint256 count = recipients.length;
        _validateBatch(recipients, encryptedAmounts.length, maxBatchSizeDirect);
        _collectExactGasFee(count);

        // Emit before interactions (CEI)
        emit ConfidentialTokensDispersed(token, msg.sender, count, FEE_TYPE_GAS_DIRECT);

        euint64[] memory amounts = new euint64[](count);
        euint64[] memory results = new euint64[](count);

        // Convert and transfer each amount directly from sender to recipient
        for (uint256 i = 0; i < count; ++i) {
            euint64 amount = FHE.fromExternal(encryptedAmounts[i], inputProof);
            // Grant persistent ACL so FHE.allow to sender and recipient below are valid.
            FHE.allowThis(amount);
            FHE.allowTransient(amount, token);
            euint64 result = IERC7984(token).confidentialTransferFrom(msg.sender, recipients[i], amount);
            FHE.allow(amount, msg.sender);
            FHE.allow(amount, recipients[i]);
            amounts[i] = amount;
            results[i] = result;
        }
        emit DirectDistribution(msg.sender, recipients, amounts, results);
    }

    /// @inheritdoc IDisperseConfidential
    function disperseConfidentialTokensWithTokenFee(
        address token,
        address[] calldata recipients,
        externalEuint64[] calldata encryptedAmounts,
        externalEuint64[2] calldata encryptedSubtotals,
        bytes calldata inputProof
    ) external nonReentrant whenNotPaused {
        if (token == address(0)) revert Errors.InvalidAddress();

        // 1. Load user wallets, validate registration
        UserWallets storage uw = _userWallets[msg.sender];
        if (uw.wallet0 == address(0)) revert Errors.UserNotRegistered();

        // 2. Validate batch
        uint256 count = recipients.length;
        _validateBatch(recipients, encryptedAmounts.length, maxBatchSizeTokenFee);

        // 3. Emit before interactions (CEI)
        emit ConfidentialTokensDispersed(token, msg.sender, count, FEE_TYPE_TOKEN);

        // 4. Convert encrypted inputs: N amounts + 2 subtotals
        euint64[] memory amounts = new euint64[](count);
        for (uint256 i = 0; i < count; ++i) {
            amounts[i] = FHE.fromExternal(encryptedAmounts[i], inputProof);
            // Grant persistent ACL so downstream FHE.allow grants on this handle survive.
            FHE.allowThis(amounts[i]);
        }
        euint64 subtotal0 = FHE.fromExternal(encryptedSubtotals[0], inputProof);
        euint64 subtotal1 = FHE.fromExternal(encryptedSubtotals[1], inputProof);

        // 5. Sweep any pre-existing wallet balances back to sender to prevent
        //    fee evasion via direct wallet pre-funding.
        DisperseWallet(uw.wallet0).recoverConfidentialToken(token, msg.sender);
        DisperseWallet(uw.wallet1).recoverConfidentialToken(token, msg.sender);

        // 6. Compute and collect token fee on the total (sum of subtotals)
        (subtotal0, subtotal1) = _collectTokenFeeOnTotal(token, subtotal0, subtotal1);

        // 7. Pull subtotals from sender to user wallets
        FHE.allowTransient(subtotal0, token);
        IERC7984(token).confidentialTransferFrom(msg.sender, uw.wallet0, subtotal0);
        FHE.allowTransient(subtotal1, token);
        IERC7984(token).confidentialTransferFrom(msg.sender, uw.wallet1, subtotal1);

        // 8. Distribute from wallets to recipients
        address[] memory walletAddrs = new address[](2);
        walletAddrs[0] = uw.wallet0;
        walletAddrs[1] = uw.wallet1;
        _distributeFromWallets(token, recipients, amounts, count, 2, walletAddrs);
    }

    // ============================================================
    //                   USER WALLET FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function register(address token) external whenNotPaused {
        if (token == address(0)) revert Errors.InvalidAddress();
        if (_userWallets[msg.sender].wallet0 != address(0)) revert Errors.UserAlreadyRegistered();

        bytes32 salt0 = keccak256(abi.encodePacked(msg.sender, uint256(0)));
        bytes32 salt1 = keccak256(abi.encodePacked(msg.sender, uint256(1)));

        // Predict addresses for CEI: effects + event before interactions
        address w0 = Clones.predictDeterministicAddress(WALLET_IMPLEMENTATION, salt0);
        address w1 = Clones.predictDeterministicAddress(WALLET_IMPLEMENTATION, salt1);

        _userWallets[msg.sender] = UserWallets(w0, w1);
        emit UserRegistered(msg.sender, w0, w1);

        // Interactions: deploy clones, initialize, approve
        Clones.cloneDeterministic(WALLET_IMPLEMENTATION, salt0);
        Clones.cloneDeterministic(WALLET_IMPLEMENTATION, salt1);
        DisperseWallet(w0).initialize(address(this));
        DisperseWallet(w1).initialize(address(this));
        DisperseWallet(w0).approveToken(token);
        DisperseWallet(w1).approveToken(token);
    }

    /// @inheritdoc IDisperseConfidential
    function approveUserWalletsForToken(address token) external whenNotPaused {
        UserWallets storage uw = _userWallets[msg.sender];
        if (uw.wallet0 == address(0)) revert Errors.UserNotRegistered();
        DisperseWallet(uw.wallet0).approveToken(token);
        DisperseWallet(uw.wallet1).approveToken(token);
    }

    /// @inheritdoc IDisperseConfidential
    function revokeUserWalletsForToken(address token) external whenNotPaused {
        UserWallets storage uw = _userWallets[msg.sender];
        if (uw.wallet0 == address(0)) revert Errors.UserNotRegistered();
        DisperseWallet(uw.wallet0).revokeToken(token);
        DisperseWallet(uw.wallet1).revokeToken(token);
    }

    /// @inheritdoc IDisperseConfidential
    function recoverFromWallets(address token, address to) external nonReentrant {
        if (to == address(0)) revert Errors.InvalidAddress();
        UserWallets storage uw = _userWallets[msg.sender];
        if (uw.wallet0 == address(0)) revert Errors.UserNotRegistered();
        DisperseWallet(uw.wallet0).recoverConfidentialToken(token, to);
        DisperseWallet(uw.wallet1).recoverConfidentialToken(token, to);
    }

    /// @inheritdoc IDisperseConfidential
    function recoverERC20FromWallets(address token, address to) external nonReentrant {
        if (to == address(0)) revert Errors.InvalidAddress();
        UserWallets storage uw = _userWallets[msg.sender];
        if (uw.wallet0 == address(0)) revert Errors.UserNotRegistered();
        DisperseWallet(uw.wallet0).recoverERC20(token, to);
        DisperseWallet(uw.wallet1).recoverERC20(token, to);
    }

    /// @inheritdoc IDisperseConfidential
    function isRegistered(address user) external view returns (bool) {
        return _userWallets[user].wallet0 != address(0);
    }

    /// @inheritdoc IDisperseConfidential
    function getUserWallet(address user, uint256 index) external view returns (address) {
        if (index == 0) return _userWallets[user].wallet0;
        if (index == 1) return _userWallets[user].wallet1;
        revert Errors.InvalidWalletIndex();
    }

    // ============================================================
    //                   FEE COLLECTOR FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function withdrawGasFee(address to, uint256 amount) external onlyRole(FEE_COLLECTOR_ROLE) nonReentrant {
        if (to == address(0)) revert Errors.InvalidAddress();
        emit GasFeeWithdrawn(to, amount);
        _sendEth(to, amount);
    }

    /// @inheritdoc IDisperseConfidential
    function withdrawTokenFee(
        address token,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyRole(FEE_COLLECTOR_ROLE) nonReentrant {
        if (to == address(0)) revert Errors.InvalidAddress();

        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);

        // Cap withdrawal at available reserve
        euint64 availableFee = _tokenFeeReserved[token];
        euint64 withdrawAmount = FHE.min(requested, availableFee);

        // Transfer first so reserve decrements by actual transferred (prevents desync)
        FHE.allowTransient(withdrawAmount, token);
        euint64 transferred = IERC7984(token).confidentialTransfer(to, withdrawAmount);

        // Deduct from reserve by the actual transferred amount
        _tokenFeeReserved[token] = _subtractFromEncryptedReserve(_tokenFeeReserved[token], transferred);

        // Grant fee collector persistent ACL for post-tx decryption
        FHE.allow(transferred, msg.sender);

        emit TokenFeeWithdrawn(token, to, transferred);
    }

    /// @inheritdoc IDisperseConfidential
    function accessEncryptedFeeReserve(address token) external returns (euint64 reserve) {
        if (!hasRole(FEE_COLLECTOR_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, FEE_COLLECTOR_ROLE);
        }
        reserve = _tokenFeeReserved[token];
        if (FHE.isInitialized(reserve)) {
            FHE.allow(reserve, msg.sender);
        }
    }

    // ============================================================
    //                    FEE MANAGER FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function setFeeConfig(FeeConfig calldata config) external onlyRole(FEE_MANAGER_ROLE) {
        if (config.defaultTokenFee > BASIS_POINTS) revert Errors.TokenFeeTooHigh(config.defaultTokenFee);
        feeConfig = config;
        emit FeeConfigUpdated(config);
    }

    /// @inheritdoc IDisperseConfidential
    function setMaxBatchSizeHolding(uint256 size) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldSize = maxBatchSizeHolding;
        maxBatchSizeHolding = size;
        emit MaxBatchSizeHoldingUpdated(oldSize, size);
    }

    /// @inheritdoc IDisperseConfidential
    function setMaxBatchSizeDirect(uint256 size) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldSize = maxBatchSizeDirect;
        maxBatchSizeDirect = size;
        emit MaxBatchSizeDirectUpdated(oldSize, size);
    }

    /// @inheritdoc IDisperseConfidential
    function setMaxBatchSizeTokenFee(uint256 size) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldSize = maxBatchSizeTokenFee;
        maxBatchSizeTokenFee = size;
        emit MaxBatchSizeTokenFeeUpdated(oldSize, size);
    }

    /// @inheritdoc IDisperseConfidential
    function setCustomFee(address user, uint96 gasFee, uint16 tokenFee) external onlyRole(FEE_MANAGER_ROLE) {
        if (user == address(0)) revert Errors.InvalidAddress();
        if (tokenFee > BASIS_POINTS) revert Errors.TokenFeeTooHigh(tokenFee);
        _customFees[user] = CustomFee({enabled: true, gasFee: gasFee, tokenFee: tokenFee});
        emit CustomFeeSet(user, gasFee, tokenFee);
    }

    /// @inheritdoc IDisperseConfidential
    function disableCustomFee(address user) external onlyRole(FEE_MANAGER_ROLE) {
        if (!_customFees[user].enabled) revert Errors.CustomFeeNotSet();
        delete _customFees[user];
        emit CustomFeeDisabled(user);
    }

    // ============================================================
    //                      ADMIN FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @inheritdoc IDisperseConfidential
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @inheritdoc IDisperseConfidential
    function rescueConfidentialTokens(address token, address to) external onlyRole(WITHDRAWER_ROLE) nonReentrant {
        if (to == address(0)) revert Errors.InvalidAddress();

        euint64 contractBalance = IERC7984(token).confidentialBalanceOf(address(this));
        euint64 feeReserve = _tokenFeeReserved[token];

        // Safe subtraction: cap feeReserve at contractBalance before subtracting
        euint64 cappedReserve = FHE.min(feeReserve, contractBalance);
        euint64 available = FHE.sub(contractBalance, cappedReserve);

        // Emit before interaction (CEI)
        emit ConfidentialTokensRescued(token, to);

        _sendConfidentialTokens(token, to, available);
    }

    /// @inheritdoc IDisperseConfidential
    function rescueERC20(address token, address to) external onlyRole(WITHDRAWER_ROLE) nonReentrant {
        if (to == address(0)) revert Errors.InvalidAddress();
        uint256 balance = IERC20(token).balanceOf(address(this));
        emit ERC20Rescued(token, to, balance);
        IERC20(token).safeTransfer(to, balance);
    }

    // ============================================================
    //                    DISCLOSURE FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function discloseHandleToParty(euint64 handle, address party) external {
        euint64[] memory handles = new euint64[](1);
        handles[0] = handle;
        _discloseHandlesToParty(handles, party);
    }

    /// @inheritdoc IDisperseConfidential
    function batchDiscloseHandlesToParty(euint64[] calldata handles, address party) external {
        _discloseHandlesToParty(handles, party);
    }

    // ============================================================
    //                       VIEW FUNCTIONS
    // ============================================================

    /// @inheritdoc IDisperseConfidential
    function getGasFee(address user) external view returns (uint96) {
        return _getGasFee(user);
    }

    /// @inheritdoc IDisperseConfidential
    function getTokenFee(address user) external view returns (uint16) {
        return _getTokenFee(user);
    }

    /// @inheritdoc IDisperseConfidential
    function hasCustomFee(address user) external view returns (bool) {
        return _customFees[user].enabled;
    }

    /// @inheritdoc IDisperseConfidential
    function getFeeAmounts(address user) external view returns (bool isCustomFee, uint96 gasFee, uint16 tokenFee) {
        return (_customFees[user].enabled, _getGasFee(user), _getTokenFee(user));
    }

    /// @inheritdoc IDisperseConfidential
    function getCustomFee(address user) external view returns (bool enabled, uint96 gasFee, uint16 tokenFee) {
        CustomFee storage cf = _customFees[user];
        return (cf.enabled, cf.gasFee, cf.tokenFee);
    }

    // ============================================================
    //                      INTERNAL HELPERS
    // ============================================================

    /// @dev Returns the L2 block number on Arbitrum, or `block.number` on other chains.
    function _getBlockNumberish() internal view returns (uint256) {
        address arbSys = 0x0000000000000000000000000000000000000064;

        if (arbSys.code.length > 0) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, bytes memory data) = arbSys.staticcall(
                abi.encodeWithSelector(IArbSys.arbBlockNumber.selector)
            );
            if (success && data.length > 31) {
                return abi.decode(data, (uint256));
            }
        }

        return block.number;
    }

    /// @notice Validates batch inputs: non-empty, matching lengths, within limit, no zero-address recipients.
    /// @param recipients Array of recipient addresses to validate.
    /// @param amountsLength Length of the corresponding encrypted amounts array (must equal `recipients.length`).
    /// @param limit Maximum allowed batch size; 0 means no limit is enforced.
    function _validateBatch(address[] calldata recipients, uint256 amountsLength, uint256 limit) internal pure {
        uint256 count = recipients.length;
        if (count == 0) revert Errors.EmptyRecipients();
        if (count != amountsLength) revert Errors.ArrayLengthMismatch();
        if (limit > 0 && count > limit) revert Errors.BatchTooLarge(count, limit);
        for (uint256 i = 0; i < count; ++i) {
            if (recipients[i] == address(0)) revert Errors.ZeroAddressRecipient();
        }
    }

    /// @notice Computes a BPS token fee on the sum of subtotals, pulls it from
    /// `msg.sender`, and accumulates in the token reserve. Zeroes both subtotals
    /// on overflow or fee pull failure.
    /// @param token The ERC-7984 token address.
    /// @param subtotal0 Encrypted subtotal for wallet group 0.
    /// @param subtotal1 Encrypted subtotal for wallet group 1.
    /// @return The (possibly zeroed) subtotal0 after fee collection.
    /// @return The (possibly zeroed) subtotal1 after fee collection.
    function _collectTokenFeeOnTotal(
        address token,
        euint64 subtotal0,
        euint64 subtotal1
    ) internal returns (euint64, euint64) {
        uint16 feeBps = _getTokenFee(msg.sender);
        if (feeBps == 0) return (subtotal0, subtotal1);

        // Sum subtotals in euint64 with overflow guard
        euint64 total = FHE.add(subtotal0, subtotal1);
        ebool noOverflow = FHE.ge(total, subtotal0);
        euint64 zero = FHE.asEuint64(0);
        subtotal0 = FHE.select(noOverflow, subtotal0, zero);
        subtotal1 = FHE.select(noOverflow, subtotal1, zero);

        // Compute and pull fee (separate stack frames via helper calls)
        euint64 fee = _computeBpsFee(FHE.select(noOverflow, total, zero), feeBps);
        (euint64 transferred, ebool feeSuccess) = _pullFee(token, fee);

        // Zero subtotals on fee failure
        subtotal0 = FHE.select(feeSuccess, subtotal0, zero);
        subtotal1 = FHE.select(feeSuccess, subtotal1, zero);

        // Accumulate fee in reserve (zero on failure)
        _tokenFeeReserved[token] = _addToEncryptedReserve(
            _tokenFeeReserved[token],
            FHE.select(feeSuccess, transferred, zero)
        );

        return (subtotal0, subtotal1);
    }

    /// @notice Computes `amount * feeBps / BASIS_POINTS` using euint128 to avoid multiplication overflow.
    /// @param amount The encrypted token amount on which to compute the fee.
    /// @param feeBps The fee rate in basis points (1 bps = 0.01%).
    /// @return The computed fee as an encrypted euint64, rounded down.
    function _computeBpsFee(euint64 amount, uint16 feeBps) private returns (euint64) {
        return FHE.asEuint64(FHE.div(FHE.mul(FHE.asEuint128(amount), uint128(feeBps)), uint128(BASIS_POINTS)));
    }

    /// @notice Pulls `fee` from `msg.sender` to this contract and returns transferred amount with success flag.
    /// @param token The ERC-7984 token address to pull the fee from.
    /// @param fee The encrypted fee amount to transfer from `msg.sender`.
    /// @return transferred The actual encrypted amount transferred (may be 0 on insufficient balance).
    /// @return success Whether the full fee was successfully pulled (`transferred == fee`).
    function _pullFee(address token, euint64 fee) private returns (euint64, ebool) {
        FHE.allowTransient(fee, token);
        euint64 transferred = IERC7984(token).confidentialTransferFrom(msg.sender, address(this), fee);
        return (transferred, FHE.eq(transferred, fee));
    }

    /// @dev Returns the resolved gas fee for `user` (custom override if set, else global default; 0 if disabled).
    function _getGasFee(address user) internal view returns (uint96) {
        if (!feeConfig.gasFeeEnabled) return 0;
        CustomFee storage cf = _customFees[user];
        return cf.enabled ? cf.gasFee : feeConfig.defaultGasFee;
    }

    /// @dev Returns the resolved token fee in BPS for `user`
    /// (custom override if set, else global default; 0 if disabled).
    function _getTokenFee(address user) internal view returns (uint16) {
        if (!feeConfig.tokenFeeEnabled) return 0;
        CustomFee storage cf = _customFees[user];
        return cf.enabled ? cf.tokenFee : feeConfig.defaultTokenFee;
    }

    /// @dev Reverts unless `msg.value` exactly equals `count * gasFee` for the caller.
    function _collectExactGasFee(uint256 count) internal view {
        uint256 totalFee = count * _getGasFee(msg.sender);
        if (msg.value != totalFee) revert Errors.InsufficientAmount(msg.value, totalFee);
    }

    /// @dev Grants transient ACL on `amount` to `token` and calls `confidentialTransfer`.
    function _sendConfidentialTokens(address token, address to, euint64 amount) internal {
        FHE.allowTransient(amount, token);
        IERC7984(token).confidentialTransfer(to, amount);
    }

    /// @notice Partitions recipients across `wCount` wallets and distributes encrypted amounts from each.
    /// @param token The ERC-7984 token address being distributed.
    /// @param recipients The full array of recipient addresses.
    /// @param amounts The encrypted amounts corresponding 1:1 to recipients.
    /// @param count The number of recipients (== recipients.length == amounts.length).
    /// @param wCount The number of wallets to distribute across.
    /// @param walletAddrs The wallet addresses to distribute from, one per wallet group.
    function _distributeFromWallets(
        address token,
        address[] calldata recipients,
        euint64[] memory amounts,
        uint256 count,
        uint256 wCount,
        address[] memory walletAddrs
    ) internal {
        uint256 baseSize = count / wCount;
        uint256 remainder = count % wCount;
        uint256 offset = 0;

        for (uint256 w = 0; w < wCount; ++w) {
            uint256 groupSize = baseSize + (w < remainder ? 1 : 0);
            _distributeFromSingleWallet(token, walletAddrs[w], recipients, amounts, offset, groupSize);
            offset += groupSize;
        }
    }

    /// @dev Transfers `groupSize` encrypted amounts from a single `wallet` to consecutive recipients starting
    /// at `offset`.
    /// Emits a single batched {WalletDistribution} per wallet group.
    function _distributeFromSingleWallet(
        address token,
        address wallet,
        address[] calldata recipients,
        euint64[] memory amounts,
        uint256 offset,
        uint256 groupSize
    ) internal {
        if (groupSize == 0) return;

        euint64[] memory walletAmounts = new euint64[](groupSize);
        euint64[] memory walletResults = new euint64[](groupSize);

        for (uint256 j = 0; j < groupSize; ++j) {
            uint256 idx = offset + j;
            FHE.allowTransient(amounts[idx], token);
            euint64 result = IERC7984(token).confidentialTransferFrom(wallet, recipients[idx], amounts[idx]);
            FHE.allow(amounts[idx], msg.sender);
            FHE.allow(amounts[idx], recipients[idx]);
            FHE.allow(result, msg.sender);
            walletAmounts[j] = amounts[idx];
            walletResults[j] = result;
        }
        emit WalletDistribution(
            msg.sender,
            wallet,
            recipients[offset:offset + groupSize],
            walletAmounts,
            walletResults
        );
    }

    /// @dev Adds `amount` to `currentReserve` with persistent ACL. Handles the uninitialized-reserve case
    /// (first fee accumulation for a token) by storing `amount` directly.
    ///
    /// Uses uncapped `FHE.add` instead of `FHESafeMath.tryIncrease`
    /// Overflow is unreachable in practice: the reserve can only grow by fee amounts deducted from
    /// individual disperse calls, each capped at `type(uint64).max`. Accumulated fees would need to
    /// exceed `2^64 - 1` (~18.4e18) to wrap, which requires more value locked than any ERC-7984
    /// token's total supply.
    function _addToEncryptedReserve(euint64 currentReserve, euint64 amount) internal returns (euint64) {
        if (FHE.isInitialized(currentReserve)) {
            euint64 newReserve = FHE.add(currentReserve, amount);
            FHE.allowThis(newReserve);
            return newReserve;
        } else {
            FHE.allowThis(amount);
            return amount;
        }
    }

    /// @dev Subtracts `amount` from `currentReserve` using raw FHE.sub (no FHE.min cap).
    function _subtractFromEncryptedReserve(euint64 currentReserve, euint64 amount) internal returns (euint64) {
        euint64 newReserve = FHE.sub(currentReserve, amount);
        FHE.allowThis(newReserve);
        return newReserve;
    }

    /// @dev Sends `amount` wei to `to` via low-level call. Reverts with {Errors.TransferFailed} on failure.
    function _sendEth(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert Errors.TransferFailed();
    }

    /// @dev Shared implementation for {discloseHandleToParty} and {batchDiscloseHandlesToParty}.
    /// `(discloser, party)` is fixed across the batch, so a single array-shaped event is
    /// emitted once after the loop
    function _discloseHandlesToParty(euint64[] memory handles, address party) internal {
        if (party == address(0)) revert Errors.InvalidAddress();
        uint256 count = handles.length;
        if (count == 0) revert Errors.EmptyBatch();
        for (uint256 i = 0; i < count; ++i) {
            if (!FHE.isSenderAllowed(handles[i])) revert Errors.HandleNotAllowed();
            if (!FHE.isAllowed(handles[i], address(this))) revert Errors.ContractNotAllowed();
            FHE.allow(handles[i], party);
        }
        emit HandlesDisclosedToParty(msg.sender, party, handles);
    }
}
