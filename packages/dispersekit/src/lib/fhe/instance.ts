/**
 * Singleton access to the Zama relayer SDK.
 *
 * Import path must be `@zama-fhe/relayer-sdk/web` — the package has no root
 * export in 0.4.4, and `/bundle` expects a CDN script tag. `/web` ships the
 * WASM + worker files and resolves them relative to import.meta.url (see the
 * matching `optimizeDeps.exclude` in vite.config.ts).
 */
import {
  createInstance,
  initSDK,
  SepoliaConfig,
  type FhevmInstance,
  type FhevmInstanceConfig,
} from "@zama-fhe/relayer-sdk/web";

export type NetworkSource = FhevmInstanceConfig["network"]; // EIP-1193 provider or RPC URL

// initSDK loads ~5 MB of TFHE/TKMS WASM; run it exactly once even under React
// StrictMode double-invokes, and reuse one instance per network source.
let sdkReady: Promise<boolean> | undefined;
const instances = new Map<unknown, Promise<FhevmInstance>>();

export function getFhevmInstance(network: NetworkSource): Promise<FhevmInstance> {
  let cached = instances.get(network);
  if (!cached) {
    cached = (async () => {
      sdkReady ??= initSDK();
      await sdkReady;
      // createInstance reads protocol config on-chain via `network` and fetches
      // the FHE public key + CRS from the Sepolia relayer (cached SDK-side).
      return createInstance({ ...SepoliaConfig, network });
    })();
    instances.set(network, cached);
    // A failed init (e.g. flaky RPC) must not poison the cache forever.
    cached.catch(() => instances.delete(network));
  }
  return cached;
}

export type { FhevmInstance };
