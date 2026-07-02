# DisperseConfidential — verified reference source (Sourcify)

Retrieved 2026-07-02 from Sourcify for Sepolia `0x710dD9885Cc9986EfD234E7719483147a6d8DBb4` (match status: **partial** — bytecode matches, metadata hash differs). Etherscan v2 keyless API was rejected; Sourcify used instead.

- Compiler: solc **0.8.27**, optimizer enabled runs **800**, evmVersion **cancun**, `metadata.bytecodeHash: "none"` (see `metadata.json` → `settings`).
- Compilation target: `contracts/DisperseConfidential.sol : DisperseConfidential`.
- External deps in the verified bundle (vendored, exact npm versions not recorded by Sourcify): `@fhevm/solidity` (ZamaConfig/FHE/Impl/FheType/FhevmECDSA), `@openzeppelin/contracts` (>= 5.1 inferred from `ReentrancyGuardTransient`/`TransientSlot`), `encrypted-types`.
- Creator tx: `0xdf5ded0476dcf1645d6bc8d2d21fc778594c592a1c5fac089f486fc084de5eb6`.

## Constructor

```solidity
constructor(
    address admin_,          // DEFAULT_ADMIN_ROLE + PAUSER_ROLE + WITHDRAWER_ROLE + FEE_MANAGER_ROLE
    address feeCollector_,   // FEE_COLLECTOR_ROLE
    FeeConfig memory config_,        // { bool gasFeeEnabled; bool tokenFeeEnabled; uint96 defaultGasFee; uint16 defaultTokenFee }
    uint256 maxBatchSizeHolding_,    // 0 = unlimited
    uint256 maxBatchSizeDirect_,     // 0 = unlimited
    uint256 maxBatchSizeTokenFee_    // 0 = unlimited
)
```

Deployment args of the live Sepolia singleton (decoded from `constructor-args.txt`):

| Param | Value |
|---|---|
| admin_ | `0x609e9e59d9d8a1bb8be99e8d74a7a8e2e40ca763` |
| feeCollector_ | `0x609e9e59d9d8a1bb8be99e8d74a7a8e2e40ca763` |
| config_.gasFeeEnabled | true |
| config_.tokenFeeEnabled | true |
| config_.defaultGasFee | `1e15` wei (0.001 ETH per recipient) |
| config_.defaultTokenFee | 500 bps (5%) |
| maxBatchSizeHolding_ | 10 |
| maxBatchSizeDirect_ | 15 |
| maxBatchSizeTokenFee_ | 5 |

NOTE: live reads on 2026-07-02 returned batch limits **30 / 20 / 5** — the admin has changed them since deployment. Always read `maxBatchSizeHolding() / maxBatchSizeDirect() / maxBatchSizeTokenFee()` and `getGasFee(sender)` at runtime; never hardcode.

Files here are reference-only (outside hardhat `sources`); a compile-ready vendored copy belongs in `packages/contracts/contracts/` if we deploy our own instance.
