# DisperseKit — Research Synthesis & Build Decisions

Date: 2026-07-02. Synthesized from the five research docs in this directory (`tokenops-disperse.md`, `relayer-sdk.md`, `hardhat-template.md`, `erc7984.md`, `sepolia-config.md`) plus the verified TokenOps source now restored to `/Users/santo/dispersekit/packages/contracts/reference/`.

Ground-truth priority applied throughout: installed package source/types > official docs > blog posts.

---

## 0. Cross-check: contradictions between reports & resolutions

| # | Apparent conflict | Resolution (authoritative source) |
|---|---|---|
| 1 | `@tokenops/sdk@1.1.1` peer-depends on **`@zama-fhe/sdk ^3.0.0`** (+ `@zama-fhe/react-sdk ^3.0.0`), while the relayer research pins **`@zama-fhe/relayer-sdk@0.4.4`** | Not a contradiction — two different client stacks for the *same* protocol artifacts. Encrypted inputs (`handles` + `inputProof`) and userDecrypt are relayer-level primitives; the contract only sees `bytes32`/`bytes`. **Decision: do NOT take `@tokenops/sdk` as a runtime dependency** (its `@zama-fhe/sdk` v3 encryptor API is unresearched); use `@zama-fhe/relayer-sdk@0.4.4` directly against the contract ABI (copied statically from the verified source/SDK). This matches the bounty ecosystem examples. |
| 2 | "`SepoliaConfig`" means two different things | Name collision, both real: the **Solidity** contract `SepoliaConfig` no longer exists in `@fhevm/solidity@0.11.1` (use `ZamaEthereumConfig`; verified in installed package source — docs/blogs showing `is SepoliaConfig` are stale ≤0.8.x-era). The **JS** export `SepoliaConfig` from `@zama-fhe/relayer-sdk/web` exists and is correct. Never mix them up. |
| 3 | Docs vs SDK 0.4.4: docs show `relayerUrl: relayer.testnet.zama.cloud`, `gatewayChainId: 55815`, string `startTimestamp`, `publicDecrypt` returning a bare record, root package import | **SDK source (0.4.4) wins on every point** (installed `lib/web.d.ts`/`lib/web.js` read directly): relayer `https://relayer.testnet.zama.org`, gatewayChainId `10901`, `createEIP712` asserts **number** timestamps, `publicDecrypt` returns `{clearValues, abiEncodedClearValues, decryptionProof}`, and only `/web`, `/bundle`, `/node` subpath exports exist. Docs are stale vs 0.4.4. |
| 4 | `awaitDecryptionOracle` mentioned in Zama docs vs absent from `@fhevm/hardhat-plugin@0.4.2` | Installed `.d.ts` wins: it does not exist in 0.4.2. Use `publicDecrypt*`/`userDecrypt*` helpers. |
| 5 | Live singleton batch limits: TokenOps report read **30/20/5** live, but the deployment constructor args (decoded in `reference/NOTES.md`) were **10/15/5** | Both correct at different times — the admin changed them post-deploy. Chain state at call time is authoritative, and mutable. **Never hardcode limits or fee: read `maxBatchSizeDirect()`/`maxBatchSizeHolding()`/`maxBatchSizeTokenFee()` and `getGasFee(sender)` at runtime.** |
| 6 | tokenops-disperse.md said reference source was saved to `packages/contracts/reference/` — the directory did not exist in the repo | Fixed during this synthesis: restored from scratchpad Sourcify bundle. Now contains `DisperseConfidential.sol`, `DisperseWallet.sol`, `IDisperseConfidential.sol`, `IERC7984.sol`, `IArbSys.sol`, `Errors.sol`, `metadata.json`, `constructor-args.txt`, `NOTES.md`. |
| 7 | HCU estimate caps disperse at "~20–30 recipients" (sepolia-config.md, marked UNVERIFIED) vs TokenOps live limits of 30 (wallet) / 20 (direct) | Consistent, not conflicting — TokenOps' deployed limits are themselves evidence that 20 direct / 30 wallet transfers fit under the 20M/5M HCU caps. Still verify empirically (open question #1). |
| 8 | ERC7984 uses `FHE.isAllowed(amount, msg.sender)` while Zama docs prescribe `FHE.isSenderAllowed(handle)` | Functionally identical when the argument is `msg.sender`. No action. |
| 9 | `@zama-fhe/relayer-sdk` **0.4.1** in the contracts package vs **0.4.4** in the widget | Fine — different workspaces. 0.4.1 is what `fhevm-hardhat-template`'s lockfile pins for the hardhat plugin path; 0.4.4 is the browser SDK we researched. Do not "unify" them. |

---

## 1. Disperse contract decision

**Official TokenOps source: YES — available, verified, and in the repo.**

- Live Sepolia singleton: `0x710dD9885Cc9986EfD234E7719483147a6d8DBb4` (verified live & unpaused 2026-07-02; mainnet `0x4fC0d28cBe4B82D512Ad0B42F6787480Cc98cC70`).
- Full verified Solidity source (Sourcify, partial match — bytecode matches): `/Users/santo/dispersekit/packages/contracts/reference/`.
- Compiler settings **identical to our hardhat config**: solc 0.8.27, optimizer runs 800, evmVersion cancun, `bytecodeHash: none` — the reference source compiles in our template unchanged.

### Decision: deploy our own instance from the official source + keep the widget address-configurable

Rationale:
1. Local mock tests (Phase B) *require* our own deployment anyway — `DisperseConfidential is ZamaEthereumConfig`, which supports chainid 31337 out of the box.
2. On our own Sepolia instance we control fees (`defaultGasFee = 0` keeps UX friction-free) and batch limits; the ABI is byte-identical to the official singleton, so the widget works against **both** — point it at `0x710dD9...DBb4` to demo against the canonical TokenOps deployment (0.001 ETH/recipient fee applies there).
3. `direct` mode is the primary widget flow (no `register()` step, simplest UX); `wallet` mode is an optional stretch (unlinkability, 30 recipients).

Vendor the six reference `.sol` files into `packages/contracts/contracts/` (keep `reference/` as the pristine copy).

### Exact API (from verified source)

Constructor for our deployment:

```solidity
constructor(
    address admin_,          // gets DEFAULT_ADMIN/PAUSER/WITHDRAWER/FEE_MANAGER roles
    address feeCollector_,   // gets FEE_COLLECTOR_ROLE
    FeeConfig memory config_,        // { bool gasFeeEnabled; bool tokenFeeEnabled; uint96 defaultGasFee; uint16 defaultTokenFee }
    uint256 maxBatchSizeHolding_,    // 0 = unlimited
    uint256 maxBatchSizeDirect_,
    uint256 maxBatchSizeTokenFee_
)
```

Suggested args: `(deployer, deployer, { true, true, 0, 0 }, 30, 20, 5)` — fee machinery on but zero-priced (`_getGasFee` returns 0 ⇒ the exact-`msg.value` check passes with 0; verified in source, `_collectExactGasFee`), limits mirroring the live singleton so behavior matches.

Disperse entrypoints (identical on our instance and the official singleton):

```solidity
// PRIMARY — direct mode, no registration. payable: msg.value MUST == recipients.length * getGasFee(msg.sender) EXACTLY.
function disperseConfidentialTokenDirect(
    address token,
    address[] calldata recipients,
    externalEuint64[] calldata encryptedAmounts,
    bytes calldata inputProof
) external payable;

// Wallet mode (requires one-time register(token); subtotals split: group0 = first ceil(n/2) recipients -> wallet0)
function disperseConfidentialTokens(
    address token,
    address[] calldata recipients,
    externalEuint64[] calldata encryptedAmounts,
    externalEuint64[2] calldata encryptedSubtotals,   // plaintext group sums, encrypted in the SAME input batch
    bytes calldata inputProof
) external payable;

function register(address token) external;                        // once per user (wallet mode only)
function getGasFee(address user) external view returns (uint96);  // read before EVERY disperse
function maxBatchSizeDirect() external view returns (uint256);    // ditto (admin-mutable)
function isRegistered(address user) external view returns (bool);
```

Events for the receipt page: `DirectDistribution(address indexed sender, address[] recipients, euint64[] requested, euint64[] transferred)` and `ConfidentialTokensDispersed(address indexed token, address indexed sender, uint256 count, uint8 feeType)`.

### ACL grant sequence (as implemented in the official direct-mode loop — mirror this if we ever write our own)

```solidity
euint64 amount = FHE.fromExternal(encryptedAmounts[i], inputProof); // transient ACL to disperse contract only
FHE.allowThis(amount);                                              // persistent, so allow() grants below are valid
FHE.allowTransient(amount, token);                                  // token must compute on the handle in _update
euint64 result = IERC7984(token).confidentialTransferFrom(msg.sender, recipients[i], amount);
FHE.allow(amount, msg.sender);                                      // sender can decrypt intended amount
FHE.allow(amount, recipients[i]);                                   // recipient can decrypt intended amount
// `result` (actual transferred; encrypted-zero on insufficient balance) is transiently allowed to this contract
```

Precondition (all modes): the sender must have called `token.setOperator(disperseContract, uint48 until)` (ERC-7984 operator, time-bound, unlimited amount).

### Demo token

- Primary: **CTTT** `0x258F9D60dc023870e4E3109c894D834D5377361a` (TokenOps' own ERC-7984 faucet token, 6 decimals) when demoing against the official singleton.
- Also deploy our own `DemoConfidentialToken` (ERC7984 + ZamaEthereumConfig + public `mint()` faucet — complete code in `erc7984.md` §4) for mock tests and a fully self-contained demo. Zama's cUSDTMock `0x4E7B06D78965594eB5EF5414c357ca21E1554491` is a fallback (mint-and-wrap, signature unverified).

---

## 2. Pinned versions

### `packages/contracts` (already scaffolded — matches research; keep)

| Package | Version |
|---|---|
| `hardhat` | ^2.28.6 (Hardhat **2**, not 3) |
| `ethers` | ^6.16.0 |
| `@fhevm/solidity` | ^0.11.1 (resolves 0.11.1) |
| `@fhevm/hardhat-plugin` | ^0.4.2 |
| `@fhevm/mock-utils` | ^0.4.2 |
| `@zama-fhe/relayer-sdk` | ^0.4.1 (template lockfile pairing — leave as-is here) |
| `encrypted-types` | ^0.0.4 |
| `@openzeppelin/confidential-contracts` | **0.5.1 exact** (its peerDeps pin `@fhevm/solidity` to exactly 0.11.1) |
| `@openzeppelin/contracts` | ^5.6.1 |
| `hardhat-deploy` | ^0.11.45 |
| `typechain` ^8.3.2 / `@typechain/hardhat` ^9.1.0 / `@typechain/ethers-v6` ^0.5.1, `chai` ^4.5.0, `typescript` ^5.9.3 | per template |

Solidity: compiler **0.8.27**, optimizer runs **800**, evmVersion **cancun**, `bytecodeHash: "none"` (already in `hardhat.config.ts`; also exactly matches the TokenOps verified build). Contract pragmas: our contracts `^0.8.27` (union of ERC7984 `^0.8.27` and FHE `^0.8.24`; TokenOps source is `0.8.27`).

### `packages/widget` (already scaffolded — matches research; keep)

| Package | Version | Note |
|---|---|---|
| `@zama-fhe/relayer-sdk` | **^0.4.4** | Caret is safe (excludes `0.5.0-rc.1` prerelease). Import ONLY from `@zama-fhe/relayer-sdk/web`. |
| `viem` | ^2.38.0 | |
| `wagmi` | ^2.19.0 | |
| `@tanstack/react-query` | ^5.90.0 | |
| `react` / `react-dom` | ^19.2.7 | |
| `vite` | ^8.1.1 | add `optimizeDeps.exclude: ['@zama-fhe/relayer-sdk']` (see footgun #1) |

Do **not** add: `@tokenops/sdk` (would drag unresearched `@zama-fhe/sdk` v3 peers), `ethers` (relayer-sdk bundles its own internally; our app code stays viem/wagmi).

---

## 3. Exact client code path (widget, direct mode)

### 3.1 Init SDK (once, at widget bootstrap)

```ts
// fhevm.ts
import { initSDK, createInstance, SepoliaConfig, type FhevmInstance } from '@zama-fhe/relayer-sdk/web';

let instancePromise: Promise<FhevmInstance> | null = null; // singleton — survives React StrictMode double-invoke

export function getFhevm(): Promise<FhevmInstance> {
  instancePromise ??= (async () => {
    await initSDK();                       // loads TFHE+KMS WASM; single-thread fallback without COOP/COEP
    return createInstance({
      ...SepoliaConfig,                    // relayer https://relayer.testnet.zama.org, gatewayChainId 10901
      network: window.ethereum,            // REQUIRED (EIP-1193 or RPC url) — used for on-chain config + ACL reads
    });
  })();
  return instancePromise;
}
```

```ts
// vite.config.ts additions
optimizeDeps: { exclude: ['@zama-fhe/relayer-sdk'] },
```

### 3.2 Encrypt N amounts (one input, one proof; +2 subtotals only in wallet mode)

```ts
import { getAddress, toHex } from 'viem';

const instance = await getFhevm();
// Bind to (DISPERSE CONTRACT, SENDER EOA) — not the token. Checksum both.
const input = instance.createEncryptedInput(getAddress(disperseAddress), getAddress(sender));
for (const amt of amounts) input.add64(amt);          // bigint, base units (CTTT: 6 decimals). Direct mode: n <= min(maxBatchSizeDirect(), 32)
// Wallet mode ONLY — 2 extra values in the SAME batch (30 amounts + 2 subtotals = 32 = exact packing cap):
// const g0 = amounts.slice(0, Math.ceil(n / 2)).reduce((a, b) => a + b, 0n);  // ceil(n/2) rule from source
// const g1 = amounts.slice(Math.ceil(n / 2)).reduce((a, b) => a + b, 0n);
// input.add64(g0).add64(g1);
const { handles, inputProof } = await input.encrypt(); // Uint8Array[] (32B each, add-order) + shared proof; CPU-heavy + relayer POST
```

### 3.3 setOperator (separate tx, once per token+expiry)

```ts
// wagmi writeContract — ERC-7984 on the token
const until = Math.floor(Date.now() / 1000) + 7 * 86400; // uint48 unix expiry, inclusive
await writeContractAsync({
  address: tokenAddress,
  abi: erc7984Abi,
  functionName: 'setOperator',
  args: [disperseAddress, until],
});
// skip if already set: publicClient.readContract({ ..., functionName: 'isOperator', args: [sender, disperseAddress] })
```

### 3.4 Disperse call (exact msg.value!)

```ts
const gasFee = await publicClient.readContract({ address: disperseAddress, abi: disperseAbi, functionName: 'getGasFee', args: [sender] }); // uint96
const maxBatch = await publicClient.readContract({ address: disperseAddress, abi: disperseAbi, functionName: 'maxBatchSizeDirect' });

const hash = await writeContractAsync({
  address: disperseAddress,
  abi: disperseAbi,
  functionName: 'disperseConfidentialTokenDirect',
  args: [
    tokenAddress,
    recipients,                          // address[], length must equal handles used
    handles.map((h) => toHex(h)),        // externalEuint64[] = bytes32[]
    toHex(inputProof),                   // bytes
  ],
  value: gasFee * BigInt(recipients.length), // MUST be exact or Errors.InsufficientAmount (0 on our instance, 0.001 ETH/recipient on official singleton)
});
```

### 3.5 Recipient userDecrypt

Recipient decrypts either (a) their token **balance** handle (contract pair = token) or (b) the per-transfer **amount** handle from the `DirectDistribution` event (contract pair = disperse contract — the disperse contract called `FHE.allow(amount, recipient)` and `FHE.allowThis`).

```ts
const instance = await getFhevm();
const handle = await publicClient.readContract({ address: tokenAddress, abi: erc7984Abi, functionName: 'confidentialBalanceOf', args: [recipient] }); // bytes32

const keypair = instance.generateKeypair();                 // ephemeral, per session
const startTimestamp = Math.floor(Date.now() / 1000);       // NUMBER (0.4.4 asserts) — not in the future
const durationDays = 7;                                     // number, 1..365
const contractAddresses = [tokenAddress];                   // max 10; must match the pairs below

const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
const signature = await walletClient.signTypedData({
  account: recipient,
  domain: eip712.domain as any,                             // { name:'Decryption', version:'1', chainId: 11155111, verifyingContract }
  types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  primaryType: 'UserDecryptRequestVerification',
  message: eip712.message as any,
});

const results = await instance.userDecrypt(
  [{ handle, contractAddress: tokenAddress }],              // pair contract = the contract that allowThis'd the handle
  keypair.privateKey, keypair.publicKey,
  signature,                                                // 0x prefix auto-stripped
  contractAddresses, recipient, startTimestamp, durationDays,
);
const clearBalance = results[handle] as bigint;             // keyed by 0x-handle; euint64 -> bigint
```

The SDK pre-checks the ACL on-chain and fails fast if `FHE.allow(handle, user)` was never granted. Sender-side "review what I sent" uses the same flow with the `requested` handles from `DirectDistribution` and `contractAddress = disperseAddress`.

### 3.6 Hardhat test equivalent (mock mode, Phase B)

```ts
import { fhevm } from 'hardhat';
import { FhevmType } from '@fhevm/hardhat-plugin';
const enc = await fhevm.createEncryptedInput(disperseAddr, alice.address).add64(1_000_000n).add64(2_000_000n).encrypt();
await disperse.connect(alice).disperseConfidentialTokenDirect(tokenAddr, [bob.address, carol.address], [enc.handles[0], enc.handles[1]], enc.inputProof);
const clear = await fhevm.userDecryptEuint(FhevmType.euint64, await token.confidentialBalanceOf(bob.address), tokenAddr, bob); // bigint
```

---

## 4. Top 5 footguns for THIS build

1. **Relayer SDK import & bundling.** No root export in 0.4.4 — `import from '@zama-fhe/relayer-sdk'` throws; use **`/web`** (never `/bundle`, which requires a CDN UMD script). Add `optimizeDeps.exclude: ['@zama-fhe/relayer-sdk']` to Vite so `import.meta.url`-relative WASM/worker URLs survive (UNVERIFIED in official docs — confirm in dev: 404s on `tfhe_bg.wasm`/`workerHelpers.js` mean this is the fix). COOP/COEP headers optional (single-thread fallback is fine for a demo). Guard `initSDK()`/`createInstance()` behind a module-level singleton promise (React StrictMode).

2. **Exact-fee and mutable limits on the disperse contract.** Gas-fee modes revert unless `msg.value == recipients.length * getGasFee(sender)` **exactly** (over- or under-paying both revert with `InsufficientAmount`). Fee and batch limits are admin-mutable (already changed once on the live singleton: 10/15/5 at deploy → 30/20/5 now). Read `getGasFee(sender)` and `maxBatchSizeDirect()` immediately before every disperse; never hardcode.

3. **Encrypted-input binding.** `createEncryptedInput(disperseContractAddress, senderAddress)` — the **disperse contract** (the `FHE.fromExternal` callee), *not the token*; and the disperse tx **must be sent from that same EOA** or proof verification fails. Addresses must be checksummed (`getAddress`), amounts as `bigint`. Packing cap: 2048 bits = **32 × euint64 per input** (direct mode ≤ 20 is fine; wallet mode 30 + 2 subtotals = exactly 32). All amounts + subtotals must share ONE input/proof.

4. **Silent encrypted-zero "failures".** ERC-7984 never reverts on insufficient balance — `_update` does `FHE.select(success, amount, 0)` and transfers encrypted zero; the disperse tx *succeeds* and events still fire. An expired/missing operator DOES revert (`ERC7984UnauthorizedSpender`), but balance shortfalls do not. Widget must preflight: userDecrypt the sender's own balance, compare with the client-side sum, and check `isOperator(sender, disperse)` before sending. Post-tx "success" UI must not claim delivery without decrypting `transferred` handles or balances.

5. **Version-locked API names — trust installed source, not docs/blogs.** Contract side: `ZamaEthereumConfig` (the Solidity `SepoliaConfig` contract is gone in `@fhevm/solidity@0.11.1`; 0.8.x even hardcodes a stale protocol deployment — never downgrade). Client side (0.4.4): `createEIP712`/`userDecrypt` take **number** timestamps; `userDecrypt` results keyed by 0x-handle; `publicDecrypt` returns `{clearValues, ...}` wrapper; max 10 contract addresses per decrypt request; EIP-712 domain is `{ name: 'Decryption', version: '1' }` with `verifyingContract = 0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478`. Plugin side (0.4.2): no `awaitDecryptionOracle`.

(Honorable mentions: `FHE.allowThis` before `FHE.allow` on any stored/granted handle; `FHE.allowTransient(handle, token)` before every `confidentialTransferFrom`; use the plain — not `AndCall` — transfer variants; custom hardhat tasks need `await fhevm.initializeCLIApi()`.)

---

## 5. Open questions (only testable against live Sepolia)

1. **HCU headroom:** does a max-size direct disperse (20 recipients = 20× fromExternal + transfer chains) actually fit under the 20M global / 5M sequential HCU caps? TokenOps' live limits imply yes; measure with `fhevm.computeTransactionHCU(receipt)` in mock and confirm gas/success on Sepolia at n = 5, 10, 20.
2. **Live singleton parameters at demo time:** `getGasFee`, `maxBatchSize*`, `paused()` are admin-mutable — re-read on demo day; widget already reads them at runtime.
3. **CTTT faucet:** exact mint/faucet function signature and per-call limits of `0x258F9D6...361a` (and, as fallback, the `mint` signature of cUSDTMock's underlying ERC-20 via `underlying()`); read on Etherscan/Sourcify during Phase B.
4. **Vite `optimizeDeps.exclude` necessity:** verify WASM + worker load correctly in `vite dev` AND `vite build && vite preview` (the fix is community-standard but not in official docs).
5. **Relayer performance/limits in practice:** encryption latency for a 20-value input (client-side ZK proof, seconds), relayer rate limits on `/v2/input-proof` and userDecrypt on Sepolia (no API key required today — confirm still true), and end-to-end userDecrypt latency for the receipt page.
6. **Registration/wallet mode economics (stretch scope only):** gas cost of `register(token)` (deploys 2 clones) and whether wallet-mode unlinkability is worth the extra tx for the demo.
7. **Bounty guidance thread:** the Zama community forum Special Bounty Track category couldn't be scraped (Discourse lazy-load) — check in a real browser for TokenOps-specific judging guidance.
