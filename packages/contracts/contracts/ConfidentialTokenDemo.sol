// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * @title ConfidentialTokenDemo
 * @notice A minimal ERC-7984 confidential token for the DisperseKit demo, with an
 * open faucet so anyone can try the widget on Sepolia without asking us for funds.
 *
 * Confidentiality note: the faucet `mint` takes a PLAINTEXT amount on purpose —
 * a faucet has nothing to hide, and a plaintext mint needs no input proof, which
 * keeps "step 0: get demo tokens" to a single click. Everything that matters
 * afterwards (balances, every transfer amount) is encrypted end-to-end by ERC-7984.
 *
 * There is deliberately NO encrypted-mint variant: an uncapped encrypted amount
 * can't be range-checked in cleartext, so a single malicious mint of 2^64-1
 * would saturate the encrypted total supply and silently brick the faucet for
 * everyone after (ERC-7984 mints add encrypted zero on overflow).
 */
contract ConfidentialTokenDemo is ERC7984, ZamaEthereumConfig {
    /// @dev Faucet cap per call — generous for demos, useless for abuse (6 decimals).
    uint64 public constant MAX_FAUCET_MINT = 1_000_000e6;

    error FaucetAmountTooLarge(uint64 requested, uint64 max);

    constructor() ERC7984("Confidential Demo Dollar", "cUSDd", "") {}

    /// @notice Open faucet: mint `amount` (plaintext, 6 decimals) to `to`.
    function mint(address to, uint64 amount) external {
        if (amount > MAX_FAUCET_MINT) revert FaucetAmountTooLarge(amount, MAX_FAUCET_MINT);
        // FHE.asEuint64 trivially encrypts the plaintext; from here on the amount
        // only ever exists on-chain as a ciphertext handle.
        _mint(to, FHE.asEuint64(amount));
    }
}
