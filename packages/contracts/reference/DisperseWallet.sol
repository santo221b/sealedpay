// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "../interfaces/IERC7984.sol";
import {Errors} from "../library/Errors.sol";

/**
 * @title DisperseWallet
 * @author TokenOps
 * @notice Minimal ERC-1167 clone target for per-user wallet disperse.
 *
 * Each wallet is a minimal proxy that holds tokens temporarily during a
 * disperse. The controller (DisperseConfidential) funds the wallet and then
 * calls `confidentialTransferFrom` to send tokens to recipients.
 *
 * The wallet grants the controller unlimited operator approval on each token
 * so the controller can move funds via `confidentialTransferFrom`.
 *
 * @custom:security-contact security@zama.ai
 */
contract DisperseWallet is Initializable {
    using SafeERC20 for IERC20;

    /// @notice The controller address (DisperseConfidential singleton).
    address public controller;

    /// @dev Only the controller can call this function.
    modifier onlyController() {
        if (msg.sender != controller) revert Errors.NotController();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the wallet with a controller address.
     * @dev Called once after ERC-1167 clone deployment. Cannot be re-initialized.
     *      Initializes the FHEVM coprocessor config for this clone's storage context.
     * @param controller_ The DisperseConfidential contract address.
     */
    function initialize(address controller_) external initializer {
        if (controller_ == address(0)) revert Errors.InvalidAddress();

        // Initialize FHEVM coprocessor for this clone's storage context
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());

        controller = controller_;
    }

    /**
     * @notice Approve the controller as an operator on `token`.
     * @dev Sets operator approval with max uint48 expiry (effectively permanent).
     * @param token The ERC-7984 token to approve.
     */
    function approveToken(address token) external onlyController {
        IERC7984(token).setOperator(controller, type(uint48).max);
    }

    /**
     * @notice Revoke the controller's operator approval on `token`.
     * @dev Sets operator expiry to 0 (revoked). The user can re-approve later
     *      via `approveUserWalletsForToken` if needed.
     * @param token The ERC-7984 token to revoke approval for.
     */
    function revokeToken(address token) external onlyController {
        IERC7984(token).setOperator(controller, 0);
    }

    /**
     * @notice Recover all confidential tokens of `token` to `to`.
     * @dev Used for sweeping residual dust after disperses.
     * @param token The ERC-7984 token to recover.
     * @param to The recipient of recovered tokens.
     */
    function recoverConfidentialToken(address token, address to) external onlyController {
        if (to == address(0)) revert Errors.InvalidAddress();
        euint64 balance = IERC7984(token).confidentialBalanceOf(address(this));
        if (FHE.isInitialized(balance)) {
            FHE.allowTransient(balance, token);
            IERC7984(token).confidentialTransfer(to, balance);
        }
    }

    /**
     * @notice Recover ERC-20 tokens wrongly sent to this wallet.
     * @dev Transfers the full ERC-20 balance of `token` to `to`.
     * @param token The ERC-20 token to recover.
     * @param to The recipient of recovered tokens.
     */
    function recoverERC20(address token, address to) external onlyController {
        if (to == address(0)) revert Errors.InvalidAddress();
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }
}
