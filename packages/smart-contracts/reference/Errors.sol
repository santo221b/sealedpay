// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title Errors
 * @author TokenOps
 * @notice Custom errors for the DisperseConfidential system.
 *
 * @custom:security-contact security@zama.ai
 */
library Errors {
    // ============================================================
    //                       VALIDATION ERRORS
    // ============================================================

    /// @dev Recipients array is empty.
    error EmptyRecipients();

    /// @dev Arrays have mismatched lengths.
    error ArrayLengthMismatch();

    /// @dev Batch size exceeds the configured maximum.
    error BatchTooLarge(uint256 requested, uint256 max);

    /// @dev A recipient address is the zero address.
    error ZeroAddressRecipient();

    /// @dev ETH sent does not match the required gas fee (must be exact).
    /// @param sent The amount sent.
    /// @param required The amount required.
    error InsufficientAmount(uint256 sent, uint256 required);

    /// @dev Token fee in basis points exceeds BASIS_POINTS (10000).
    error TokenFeeTooHigh(uint16 fee);

    /// @dev The provided address is the zero address.
    error InvalidAddress();

    /// @dev The supplied batch array is empty.
    error EmptyBatch();

    // ============================================================
    //                       OPERATION ERRORS
    // ============================================================

    /// @dev A native ETH transfer failed.
    error TransferFailed();

    /// @dev Custom fee entry does not exist for the given user.
    error CustomFeeNotSet();

    // ============================================================
    //                       WALLET ERRORS
    // ============================================================

    /// @dev Caller is not the wallet controller.
    error NotController();

    /// @dev Wallet index must be 0 or 1.
    error InvalidWalletIndex();

    // ============================================================
    //                  USER REGISTRATION ERRORS
    // ============================================================

    /// @dev User has already registered their wallet pair.
    error UserAlreadyRegistered();

    /// @dev User has not registered their wallet pair.
    error UserNotRegistered();

    // ============================================================
    //                   DISCLOSURE ERRORS
    // ============================================================

    /// @dev The caller does not hold FHE ACL access on the supplied handle.
    error HandleNotAllowed();

    /// @dev This contract does not hold FHE ACL access on the supplied handle
    /// (the handle was never granted to `address(this)`).
    error ContractNotAllowed();
}
