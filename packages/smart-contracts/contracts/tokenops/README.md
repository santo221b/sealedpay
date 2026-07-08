# TokenOps DisperseConfidential — verified source reference

Retrieved: 2026-07-02, via Sourcify (`https://sourcify.dev/server/files/any/11155111/0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`, match status: **partial** — runtime bytecode matched, metadata hash differs).

## Deployment

| Item | Value |
|---|---|
| Contract | `DisperseConfidential` (singleton, non-upgradeable) |
| Sepolia (chainid 11155111) | `0x710dD9885Cc9986EfD234E7719483147a6d8DBb4` |
| Mainnet (chainid 1) | `0x4fC0d28cBe4B82D512Ad0B42F6787480Cc98cC70` |
| Sepolia `WALLET_IMPLEMENTATION` (live read) | `0x2ae2f09bD343Dead4B4D9Cc2D6476a6e444b5c8a` |
| Creator tx (Sepolia) | `0xdf5ded0476dcf1645d6bc8d2d21fc778594c592a1c5fac089f486fc084de5eb6` |
| Address source | `@tokenops/sdk@1.1.1` → `DEPLOYED_ADDRESSES.fheDisperse.disperseConfidentialSingleton` |

## Compiler settings (from Sourcify metadata.json)

- solc `0.8.27+commit.40a35a09`
- optimizer: enabled, runs = 800
- evmVersion: `cancun`
- metadata: `bytecodeHash: "none"`, `useLiteralContent: true`
- compilationTarget: `contracts/DisperseConfidential.sol:DisperseConfidential`
- License: MIT (contract files); SDK package license BSD-3-Clause-Clear

## Constructor args (Sepolia deployment)

```
admin_               = 0x609e9e59d9d8a1bb8be99e8d74a7a8e2e40ca763
feeCollector_        = 0x609e9e59d9d8a1bb8be99e8d74a7a8e2e40ca763
config_.gasFeeEnabled    = true
config_.tokenFeeEnabled  = true
config_.defaultGasFee    = 1_000_000_000_000_000 wei (0.001 ETH per recipient)
config_.defaultTokenFee  = 500 bps (5%)
maxBatchSizeHolding_ = 10   (live value now: 30)
maxBatchSizeDirect_  = 15   (live value now: 20)
maxBatchSizeTokenFee_= 5    (live value now: 5)
```

Live state read 2026-07-02 via publicnode RPC: `paused() = false`,
`feeConfig() = (true, true, 1e15, 500)`, batch limits 30 / 20 / 5.

## Files in this directory

| File | Original path in verified sources |
|---|---|
| `DisperseConfidential.sol` | `contracts/DisperseConfidential.sol` (main contract) |
| `DisperseWallet.sol` | `contracts/wallet/DisperseWallet.sol` (ERC-1167 clone target) |
| `IDisperseConfidential.sol` | `contracts/interfaces/IDisperseConfidential.sol` |
| `IERC7984.sol` | `contracts/interfaces/IERC7984.sol` |
| `IArbSys.sol` | `contracts/interfaces/IArbSys.sol` |
| `Errors.sol` | `contracts/library/Errors.sol` |

External deps in the verified bundle (NOT copied here; install instead):
`@fhevm/solidity` (FHE.sol, Impl.sol, FheType.sol, ZamaConfig.sol,
cryptography/FhevmECDSA.sol), `encrypted-types/EncryptedTypes.sol`
(externalEuint64), and `@openzeppelin/contracts` (AccessControl, Clones,
Initializable, SafeERC20, Pausable, ReentrancyGuardTransient, Create2,
TransientSlot, LowLevelCall — the ReentrancyGuardTransient/TransientSlot
combination implies OZ v5.1+). Exact package versions are not recorded in the
metadata; remappings were empty (sources vendored flat). Full raw bundle is
reproducible from the Sourcify URL above.

Note: import paths in these copied files are relative to the original layout
(`./wallet/DisperseWallet.sol`, `../interfaces/...`). Adjust if compiling from
this flat directory.
