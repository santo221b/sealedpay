// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

// solhint-disable

/**
 * @dev Interface for Arbitrum's ArbSys precompile, available at address `0x64` on Arbitrum chains.
 *
 * On Arbitrum, `block.number` returns the L1 (Ethereum mainnet) block number approximation.
 * This precompile provides access to the actual Arbitrum L2 block number.
 *
 * See https://docs.arbitrum.io/build-decentralized-apps/arbitrum-vs-ethereum/block-numbers-and-time
 */
interface IArbSys {
    /**
     * @dev Returns the current Arbitrum L2 block number.
     */
    function arbBlockNumber() external view returns (uint256);
}
