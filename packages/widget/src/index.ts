/**
 * @dispersekit/widget — public API.
 *
 * The one import a partner needs:
 *
 *   import { DisperseWidget } from "@dispersekit/widget";
 */
export { getFhevmInstance, type FhevmInstance, type NetworkSource } from "./lib/fhe/instance";
export { encryptAmounts, computeSubtotals, MAX_VALUES_PER_INPUT } from "./lib/fhe/encrypt";
export { userDecryptHandles, type DecryptRequest, type SignTypedDataFn } from "./lib/fhe/decrypt";
export { erc7984Abi, demoTokenAbi, disperseAbi } from "./lib/contracts/abis";
export { DISPERSE_SINGLETON, disperseAddressFor, DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID } from "./lib/contracts/addresses";

// Components (DisperseWidget, ReceiptWidget) are exported here as they land — see docs/PROGRESS.md.
