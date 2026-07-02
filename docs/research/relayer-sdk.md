# Zama Relayer SDK (`@zama-fhe/relayer-sdk`) — client-side API research

Researched 2026-07-02 for DisperseKit (Vite + React, Sepolia).

**Ground truth:** installed package `@zama-fhe/relayer-sdk@0.4.4` — `.d.ts` and `lib/web.js` source read directly from npm tarball. Docs cross-checked at `docs.zama.org` (some doc pages are stale vs 0.4.4; discrepancies flagged below).

---

## 1. Package facts

- **Latest version:** `0.4.4` (`dist-tags: { latest: '0.4.4', prerelease: '0.5.0-rc.1' }`, checked 2026-07-02).
- License BSD-3-Clause-Clear, `"type": "module"` (pure ESM), `engines: node >= 22`.
- Runtime deps (relevant to bundling): `ethers ^6.15.0`, `wasm-feature-detect ^1.8.0`, `tfhe 1.4.0-alpha.3`, `tkms ^0.12.0` (tfhe/tkms WASM is pre-bundled into `lib/web.js`; the only *external* imports of `lib/web.js` are `ethers` and `wasm-feature-detect` — no Node globals, no polyfills needed).
- Repo: https://github.com/zama-ai/relayer-sdk
- Note: Zama now also ships a higher-level `@zama-fhe/sdk` v3 + `@zama-fhe/react-sdk` ("Zama SDK") and current docs steer new apps there. The relayer-sdk remains fully supported and is what the TokenOps bounty ecosystem examples use.

### Entry points (package.json `exports`) — IMPORTANT

```json
"exports": {
  "./web":    { "types": "./lib/web.d.ts",  "import": "./lib/web.js" },
  "./bundle": { "types": "./bundle.d.ts",   "import": "./bundle.js" },
  "./node":   { "types": "./lib/node.d.ts", "import": "./lib/node.js" },
  "./package.json": "./package.json"
}
```

- **There is NO root (`.`) export in 0.4.4.** `import ... from '@zama-fhe/relayer-sdk'` throws `ERR_PACKAGE_PATH_NOT_EXPORTED` (verified by actual import attempt). Docs snippets that import from the bare package name are stale.
- **For Vite/browser use: `@zama-fhe/relayer-sdk/web`.**
- `@zama-fhe/relayer-sdk/bundle` is NOT a self-contained build — its top-level `bundle.js` is literally:
  ```js
  export const initSDK = window.relayerSDK.initSDK;
  export const createInstance = window.relayerSDK.createInstance;
  export const SepoliaConfig = window.relayerSDK.SepoliaConfig;
  export * from './lib/web';
  ```
  i.e. it expects the CDN UMD script (`https://cdn.zama.ai/relayer-sdk-js/<version>/relayer-sdk-js.umd.cjs`) to have been loaded first and populate `window.relayerSDK`. Do not use `/bundle` in a pure-npm Vite app; use `/web`.
- `/web` is browser-only (references `self`, spawns Workers) — it cannot run under plain Node (verified: `self is not defined`). Use `/node` for scripts/tests.

---

## 2. Browser initialization (Vite + React)

```ts
import {
  initSDK,
  createInstance,
  SepoliaConfig,
  type FhevmInstance,
} from '@zama-fhe/relayer-sdk/web';

await initSDK(); // loads TFHE + TKMS WASM (once; idempotent via internal flag)

const instance: FhevmInstance = await createInstance({
  ...SepoliaConfig,
  network: window.ethereum, // REQUIRED — EIP-1193 provider or RPC URL string
});
```

### Exact signatures (from `lib/web.d.ts` @ 0.4.4)

```ts
export declare const initSDK: ({ tfheParams, kmsParams, thread }?: {
  tfheParams?: TFHEInput;   // optional custom wasm module/path for tfhe
  kmsParams?: KMSInput;     // optional custom wasm module/path for tkms
  thread?: number;          // defaults to navigator.hardwareConcurrency
}) => Promise<boolean>;

export declare const createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;

export declare type FhevmInstanceConfig = {
  verifyingContractAddressDecryption: string;
  verifyingContractAddressInputVerification: string;
  kmsContractAddress: string;
  inputVerifierContractAddress: string;
  aclContractAddress: string;
  gatewayChainId: number;
  relayerUrl: string;
  network: Eip1193Provider | string;   // <-- not in SepoliaConfig, you must supply it
  chainId: number;
  batchRpcCalls?: boolean;
  relayerRouteVersion?: 1 | 2;         // createInstance defaults to 2 internally
} & Partial<FhevmPkeConfigType>        // optional pre-fetched publicKey/publicParams
  & { auth?: Auth; debug?: boolean };  // Auth = BearerToken | ApiKeyHeader | ApiKeyCookie
```

`createInstance` behavior (verified in `lib/web.js`):
- Reads on-chain config (KMS signers, coprocessor signers, thresholds) from the host chain via `network` provider (ethers `Contract` calls) — so `network` must be a working Sepolia provider.
- Fetches the TFHE compact public key + CRS from the relayer (`GET {relayerUrl}/v1/keyurl`, cached in-module) unless `publicKey`/`publicParams` are passed in config.
- Defaults to relayer route **v2** (`defaultRelayerVersion: 2`).

### WASM / worker loading & Vite caveats

- `lib/web.js` loads WASM via `new URL('tfhe_bg.wasm', import.meta.url)` and `new URL('kms_lib_bg.wasm', import.meta.url)`, and spawns a module worker via `new Worker(new URL('./workerHelpers.js', import.meta.url), { type: 'module' })`. `tfhe_bg.wasm` (4.7 MB), `kms_lib_bg.wasm` (0.65 MB), `workerHelpers.js` ship inside `lib/`.
- Vite supports both patterns for source files and for *non-prebundled* deps. **Add `optimizeDeps: { exclude: ['@zama-fhe/relayer-sdk'] }` to `vite.config.ts`** so esbuild dep-prebundling doesn't inline/relocate the module and break the `import.meta.url`-relative wasm/worker URLs. (UNVERIFIED against official docs — the current Zama docs do not mention `optimizeDeps`; this is the standard Vite fix for wasm-bindgen-style packages and matches community fhevm templates. Verify once in dev: if you see 404s for `tfhe_bg.wasm` or `workerHelpers.js` in the network tab, this is the fix.)
- **COOP/COEP headers are OPTIONAL.** They only enable multithreaded TFHE (SharedArrayBuffer). Without them `initSDK` logs a console warning and falls back to single-threaded WASM (verified in `initSDK` source; confirmed by docs). To enable threads in Vite dev:
  ```ts
  // vite.config.ts
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  ```
  Caution: COEP `require-corp` breaks cross-origin resources (RPC calls are fine, but some wallet iframes/images may need `crossorigin` attrs). For a bounty demo, skipping COOP/COEP (single-threaded) is acceptable — encryption of a few euint64s is still fast.
- `initSDK()` must complete before `createInstance()`; call once at app bootstrap (e.g. in a React context/provider, guarded by a module-level promise).

---

## 3. Encrypting inputs

### Exact types (0.4.4)

```ts
// on FhevmInstance:
createEncryptedInput(contractAddress: string, userAddress: string): RelayerEncryptedInput;

export declare type RelayerEncryptedInput = {
  addBool:   (value: boolean | number | bigint) => RelayerEncryptedInput;
  add8:      (value: number | bigint) => RelayerEncryptedInput;
  add16:     (value: number | bigint) => RelayerEncryptedInput;
  add32:     (value: number | bigint) => RelayerEncryptedInput;
  add64:     (value: number | bigint) => RelayerEncryptedInput;
  add128:    (value: number | bigint) => RelayerEncryptedInput;
  add256:    (value: number | bigint) => RelayerEncryptedInput;
  addAddress:(value: string) => RelayerEncryptedInput;
  getBits:   () => EncryptionBits[];
  generateZKProof(): { ... };   // low-level, not needed for normal flow
  encrypt: (options?: RelayerInputProofOptionsType) => Promise<{
    handles: Uint8Array[];      // one 32-byte Uint8Array per added value, in add-order
    inputProof: Uint8Array;     // single proof covering all values
  }>;
};

// options (all optional): { signal?: AbortSignal; timeout?: number;
//   onProgress?: (args) => void; auth?: Auth; debug?: boolean }
```

- `contractAddress` = the contract that will consume the ciphertexts (`FHE.fromExternal` callee); `userAddress` = the EOA that will send the tx. Both are checksummed-validated (`getAddress` your inputs first or pass proper checksummed strings; lowercase-only addresses throw `... is not a valid address`).
- `add64` accepts `number | bigint`; values are range-checked (`> 2^64-1` throws). Use `BigInt` for token amounts.
- Builder is chainable AND mutates in place — `buffer.add64(a); buffer.add64(b);` works the same as chaining.
- `encrypt()` does client-side ZK proof generation (CPU-heavy, seconds) and **POSTs the ciphertext to the relayer** (`/v2/input-proof`) which returns coprocessor signatures; result handles are 32-byte `Uint8Array`s.

### Packing limits (verified in source)

- **Max 2048 total encrypted bits per input** (`TFHE_CRS_BITS_CAPACITY = 2048`; bool counts as 2 bits): throws `Packing more than 2048 bits in a single input ciphertext is unsupported`.
- **Max 256 values per input**: throws `Packing more than 256 variables in a single input ciphertext is unsupported`.
- ⇒ **one input can pack up to 32 × euint64** (2048/64). For DisperseKit: one `createEncryptedInput` can carry up to 32 recipient amounts in a single proof.

### Mapping to Solidity `externalEuint64`

`handles[i]` corresponds to the i-th `add*` call, in order. Each handle is passed as the matching `externalEuintXX` param (ABI type `bytes32`), plus the shared `inputProof` as `bytes`:

```ts
const buffer = instance.createEncryptedInput(disperseContractAddress, senderAddress);
buffer.add64(amount0).add64(amount1); // BigInt values
const { handles, inputProof } = await buffer.encrypt();

// ethers v6 accepts Uint8Array for bytes32/bytes params directly:
await disperse.doDisperse(handles[0], handles[1], inputProof);
```

```solidity
function doDisperse(externalEuint64 a, externalEuint64 b, bytes calldata proof) external {
  euint64 x = FHE.fromExternal(a, proof);
  euint64 y = FHE.fromExternal(b, proof);
  ...
}
```

For dynamic counts, `externalEuint64[]` + one `bytes proof` works the same way (each array element = one handle).

---

## 4. User decryption (private read of a handle)

### Exact signatures (0.4.4)

```ts
generateKeypair(): { publicKey: string; privateKey: string };
// hex WITHOUT 0x prefix (BytesHexNo0x). ML-KEM keypair generated in WASM.

createEIP712(
  publicKey: string,            // keypair.publicKey (0x-prefixed or not — normalized)
  contractAddresses: string[],
  startTimestamp: number,       // MUST be a number in 0.4.4 (assertIsUintNumber) — old docs pass strings; that throws now
  durationDays: number,         // number, 1..365
): KmsUserDecryptEIP712Type;

userDecrypt(
  handles: HandleContractPair[],   // { handle: Uint8Array | string; contractAddress: string }
  privateKey: string,              // keypair.privateKey
  publicKey: string,               // keypair.publicKey
  signature: string,               // EIP-712 signature; leading 0x is auto-stripped internally
  contractAddresses: string[],     // same list signed in the EIP-712 (max 10)
  userAddress: string,             // the signer address
  startTimestamp: number,          // same value as signed
  durationDays: number,            // same value as signed
  options?: { signal?: AbortSignal; timeout?: number; onProgress?; auth?; debug? },
): Promise<UserDecryptResults>;

export declare type HandleContractPair = {
  handle: Uint8Array | string;     // bytes32 handle (e.g. from a contract view returning euint64)
  contractAddress: string;
};

export declare type UserDecryptResults = Readonly<Record<`0x${string}`, bigint | boolean | `0x${string}`>>;
// keyed by the 0x-prefixed handle; euintXX -> bigint, ebool -> boolean, eaddress -> 0x-string
```

### The EIP-712 object returned by `createEIP712`

```ts
{
  types: {
    EIP712Domain: [ {name:'name',type:'string'}, {name:'version',type:'string'},
                    {name:'chainId',type:'uint256'}, {name:'verifyingContract',type:'address'} ],
    UserDecryptRequestVerification: [
      { name: 'publicKey',         type: 'bytes' },
      { name: 'contractAddresses', type: 'address[]' },
      { name: 'startTimestamp',    type: 'uint256' },
      { name: 'durationDays',      type: 'uint256' },
      { name: 'extraData',         type: 'bytes' },
    ],
  },
  primaryType: 'UserDecryptRequestVerification',
  domain: {
    name: 'Decryption',
    version: '1',
    chainId: <host chainId, 11155111>,   // number/bigint — stringify carefully
    verifyingContract: <verifyingContractAddressDecryption>,
  },
  message: {
    publicKey: '0x…',                    // 0x-prefixed
    contractAddresses: [...],
    startTimestamp: '…',                 // stringified numbers in the message
    durationDays: '…',
    extraData: '0x00',                   // SDK hardcodes 0x00
  },
}
```

### Full flow (ethers v6 signer)

```ts
const keypair = instance.generateKeypair();
const startTimestamp = Math.floor(Date.now() / 1000);  // number; must NOT be in the future
const durationDays = 7;                                 // number; 1..365
const contractAddresses = [disperseContractAddress];

const eip712 = instance.createEIP712(
  keypair.publicKey, contractAddresses, startTimestamp, durationDays,
);

// ethers signTypedData: EIP712Domain must NOT be in types
const signature = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message,
);

const results = await instance.userDecrypt(
  [{ handle: ciphertextHandle, contractAddress: disperseContractAddress }],
  keypair.privateKey,
  keypair.publicKey,
  signature,                 // 0x prefix fine — stripped internally
  contractAddresses,
  await signer.getAddress(),
  startTimestamp,
  durationDays,
);
const clear: bigint = results[ciphertextHandle] as bigint;
```

Raw `eth_signTypedData_v4` variant (no ethers signer): pass
`JSON.stringify({ types: eip712.types, primaryType: eip712.primaryType, domain: {...eip712.domain, chainId: Number(eip712.domain.chainId)}, message: eip712.message })`
as the second param — the full `types` incl. `EIP712Domain` is correct for `eth_signTypedData_v4`. (Convert any `bigint` in `domain.chainId` before stringifying.)

### Validation performed client-side by `userDecrypt` (verified in source)

- Max **10** `contractAddresses` (`MAX_USER_DECRYPT_CONTRACT_ADDRESSES = 10`).
- `durationDays` in `1..365`; `startTimestamp` not in the future; `startTimestamp + durationDays*86400 >= now` (else "User decrypt request has expired").
- Total decrypted bits across handles ≤ 2048 per call.
- **ACL pre-check via on-chain call**: it queries the ACL contract (`persistAllowed`) for every (handle, userAddress) pair using the `network` provider — the contract must have called `FHE.allow(handle, userAddress)` (and `FHE.allowThis`) or `userDecrypt` throws before hitting the relayer.
- Relayer response is verified + decrypted in WASM (TKMS) against the KMS signers fetched at `createInstance` time.

The keypair is ephemeral — generate per session (or per request); no need to persist.

---

## 5. Public decryption

```ts
publicDecrypt(
  handles: (string | Uint8Array)[],
  options?: RelayerPublicDecryptOptionsType,
): Promise<PublicDecryptResults>;

export declare type PublicDecryptResults = Readonly<{
  clearValues: Readonly<Record<`0x${string}`, bigint | boolean | `0x${string}`>>; // keyed by handle
  abiEncodedClearValues: `0x${string}`;
  decryptionProof: `0x${string}`;       // usable for on-chain verification paths
}>;
```

- ⚠️ **0.4.4 returns the wrapper object above; older docs show `publicDecrypt` returning the plain handle→value record.** In 0.4.4 read `result.clearValues[handle]`.
- Only applies to handles the contract has marked publicly decryptable (`FHE.makePubliclyDecryptable(handle)` in Solidity); the SDK pre-checks `isAllowedForDecryption` on the ACL and throws otherwise.
- Same ≤2048-bits-per-call limit. No signature/keypair needed — anyone can call it.
- Use for DisperseKit only if some aggregate (e.g. total dispersed) is deliberately made public; per-recipient amounts should stay on `userDecrypt`.

---

## 6. `SepoliaConfig` exact contents (0.4.4, printed at runtime)

```ts
export declare const SepoliaConfig: Omit<FhevmInstanceConfig, 'network'>;
// value:
{
  aclContractAddress:                        '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
  kmsContractAddress:                        '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
  inputVerifierContractAddress:              '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
  verifyingContractAddressDecryption:        '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
  verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
  chainId: 11155111,
  gatewayChainId: 10901,
  relayerUrl: 'https://relayer.testnet.zama.org',
}
```

- Also exported: `SepoliaConfigV1` / `SepoliaConfigV2` (same addresses, `relayerUrl` suffixed `/v1` or `/v2`), `MainnetConfig{,V1,V2}`.
- **Relayer URL (Sepolia): `https://relayer.testnet.zama.org`** (SDK appends `/v1` or `/v2` routes; `createInstance` defaults to v2). No API key needed on Sepolia (`auth` unset).
- ⚠️ Stale-docs discrepancies vs 0.4.4 (trust the SDK): docs pages still show `relayerUrl: https://relayer.testnet.zama.cloud`, `gatewayChainId: 55815`, and different contract addresses — those belong to older protocol deployments.
- Other useful exports from `/web`: `initSDK`, `createInstance`, `TFHE_CRS_BITS_CAPACITY` (2048), `TFHE_ZKPROOF_CIPHERTEXT_CAPACITY` (256), `FhevmHandle` (parse/inspect a handle: type, chainId, etc.), `InputProof`, `isAddress`, `isChecksummedAddress`, error classes (`RelayerErrorBase` subclasses, `getErrorCauseCode`, `getErrorCauseStatus`).

---

## 7. Gotchas checklist for DisperseKit

1. Import from **`@zama-fhe/relayer-sdk/web`** — root import throws in 0.4.4.
2. Pin `@zama-fhe/relayer-sdk@0.4.4` (a `0.5.0-rc.1` prerelease exists; don't drift).
3. `createInstance({ ...SepoliaConfig, network: window.ethereum })` — `network` is mandatory and used for on-chain reads (config load + ACL checks).
4. `initSDK()` before `createInstance()`; both are async; guard with a singleton promise in React (StrictMode double-invoke).
5. Vite: `optimizeDeps.exclude: ['@zama-fhe/relayer-sdk']`; COOP/COEP optional (single-thread fallback works).
6. Addresses passed to `createEncryptedInput` must be checksummed (use ethers `getAddress`).
7. One encrypted input ≤ 2048 bits ⇒ ≤ 32 `add64` calls; chunk recipient lists above 32.
8. `createEIP712` / `userDecrypt` take `startTimestamp`/`durationDays` as **numbers** in 0.4.4 (docs' string examples throw).
9. `userDecrypt` result is keyed by the 0x-prefixed handle string; values are `bigint` for euint64.
10. `publicDecrypt` returns `{ clearValues, abiEncodedClearValues, decryptionProof }` in 0.4.4 — not a bare record.
11. Decryption requires the Solidity side to have done `FHE.allow(handle, user)` (+ `FHE.allowThis(handle)`) — the SDK checks the ACL client-side first and fails fast.

## Sources

- Installed package `@zama-fhe/relayer-sdk@0.4.4` (`lib/web.d.ts`, `lib/web.js`, `package.json`) — primary.
- https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/{initialization,webapp,input,user-decryption,public-decryption}.md (fetched 2026-07-02; partly stale vs 0.4.4 as flagged).
- https://github.com/zama-ai/relayer-sdk ; https://github.com/zama-ai/fhevm-react-template (now on `@zama-fhe/sdk` v3 — context only).
