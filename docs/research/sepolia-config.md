# Zama Protocol — Sepolia Configuration & Ecosystem Facts

Research for DisperseKit (confidential token disperse widget, Zama x TokenOps bounty).
Date: 2026-07-02. Ground truth: package source pulled from npm (`@fhevm/solidity@0.11.1`, `@zama-fhe/relayer-sdk@0.4.4`) + docs.zama.org.

## 1. Package versions (npm, verified 2026-07-02)

| Package | Latest | Notes |
|---|---|---|
| `@fhevm/solidity` | **0.11.1** | Versions: 0.7.0, 0.8.0, 0.9.0/0.9.1, 0.10.0, 0.11.0, 0.11.1 |
| `@zama-fhe/relayer-sdk` | **0.4.4** | prerelease tag 0.5.0-rc.1 |

## 2. Solidity config wiring (verified from package source)

**IMPORTANT version gotcha:** the contract named `SepoliaConfig` only exists in `@fhevm/solidity` **<= 0.8.x**. From **0.9.0+ (incl. current 0.11.1)** it was replaced by **`ZamaEthereumConfig`**, which dispatches on `block.chainid` (1 = mainnet, 11155111 = Sepolia, 31337 = local mock). Many older tutorials/blog posts still show `SepoliaConfig`.

### Current pattern (`@fhevm/solidity@0.11.1`, file `config/ZamaConfig.sol`)

```solidity
import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract Disperse is ZamaEthereumConfig {
    // constructor of ZamaEthereumConfig calls:
    // FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
}
```

Exact source (0.11.1):

```solidity
abstract contract ZamaEthereumConfig {
    constructor() {
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
    }
    function confidentialProtocolId() public view returns (uint256) {
        return ZamaConfig.getConfidentialProtocolId();
    }
}
```

`CoprocessorConfig` in 0.11.1 has only 3 fields: `ACLAddress`, `CoprocessorAddress`, `KMSVerifierAddress` (the `DecryptionOracleAddress` field from 0.8.x was removed). Sepolia protocol id = `10001`.

### Legacy pattern (`@fhevm/solidity@0.8.0`) — only if pinning old version

```solidity
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
contract MyContract is SepoliaConfig { ... }
```

## 3. Sepolia protocol addresses

### Baked into `@fhevm/solidity@0.11.1` `ZamaConfig._getSepoliaConfig()` (verified source)

| Contract | Address |
|---|---|
| ACL | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| Coprocessor / FHEVMExecutor | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMSVerifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |

### From current docs (docs.zama.org contract_addresses page, matches 0.11.x)

| Contract | Address |
|---|---|
| ACL_CONTRACT | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| FHEVM_EXECUTOR_CONTRACT | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMS_VERIFIER_CONTRACT | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| HCU_LIMIT_CONTRACT | `0xa10998783c8CF88D886Bc30307e631D6686F0A22` |
| INPUT_VERIFIER_CONTRACT | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |
| DECRYPTION_ADDRESS (gateway verifying contract) | `0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478` |
| INPUT_VERIFICATION_ADDRESS (gateway verifying contract) | `0x483b9dE06E4E4C7D35CCf5837A1668487406D955` |

- Relayer URL: `https://relayer.testnet.zama.org` (SDK also defines `/v1` and `/v2` variants)
- Chain ID: `11155111` (Sepolia); Gateway chain ID: `10901`

**WARNING — stale addresses exist:** `@fhevm/solidity@0.8.0` hardcodes a *different, older* Sepolia deployment (ACL `0x687820221192C5B662b25367F70076A37bc79b6c`, Coprocessor `0x848B0066793BcC60346Da1F49049357399B8D595`, KMSVerifier `0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC`). Do not mix 0.8.x contracts with the 0.4.x relayer SDK config. Use the 0.11.1 + relayer-sdk 0.4.4 pairing.

### Frontend: `@zama-fhe/relayer-sdk@0.4.4` `SepoliaConfig` (verified source, lib/node.js)

```js
const SepoliaConfig = {
  aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
  kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
  inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
  verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
  verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
  chainId: 11155111,
  gatewayChainId: 10901,
  relayerUrl: 'https://relayer.testnet.zama.org',
};
```

## 4. Confidential tokens on Sepolia (docs.zama.org registry page)

| Token | Symbol | Address |
|---|---|---|
| Confidential USDC (Mock) | cUSDCMock | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` |
| Confidential USDT (Mock) | cUSDTMock | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |
| Confidential WETH (Mock) | cWETHMock | `0x46208622DA27d91db4f0393733C8BA082ed83158` |
| Confidential BRON (Mock) | cBRONMock | `0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891` |
| Confidential ZAMA (Mock) | cZAMAMock | `0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB` |
| Confidential tGBP (Mock) | ctGBPMock | `0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC` |
| Confidential XAUt (Mock) | cXAUtMock | `0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7` |
| Confidential tGBP | ctGBP | `0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` |

Also on that page: Wrappers Registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`, Protocol DAO `0x08e8a84c3c8c7cba165B1adcf67Ae4639eF84f52`, ProtocolFeesBurner `0xFda98943FB461310A5d26769606D302Ea89890e3`.

- The mock tokens are wrappers over underlying mock ERC-20s whose mint functions are **public with a 1M limit** — i.e. anyone can mint the underlying and wrap into the confidential token. cUSDTMock is the natural pick for a disperse demo. (Exact mint function signature on the underlying: UNVERIFIED — read the underlying ERC-20 via the wrapper's `underlying()` on Etherscan during Phase B.)

## 5. ACL semantics (`FHE.allow*`) — verified against FHE.sol 0.11.1 source

Exact signatures (overloaded per type; euint64 shown, same shape for ebool/euint8/16/32/128/256/eaddress):

```solidity
function allow(euint64 value, address account) internal returns (euint64);
function allowThis(euint64 value) internal returns (euint64);              // = allow(value, address(this))
function allowTransient(euint64 value, address account) internal returns (euint64); // EIP-1153 transient, current tx only
function isSenderAllowed(euint64 value) internal view returns (bool);
function isAllowed(euint64 value, address account) internal view returns (bool);
function makePubliclyDecryptable(euint64 value) internal returns (euint64);
```

They return the handle, so chaining works: `ct.allowThis().allow(recipient);`

Rules / footguns (documented):
- **Missing `allowThis` bug:** every new ciphertext produced in a tx (result of `FHE.add`, `FHE.select`, `FHE.fromExternal`, ...) that is stored for later use MUST get `FHE.allowThis(ct)` or the contract itself cannot operate on it in future transactions. For user decryption, the value needs BOTH `FHE.allowThis(ct)` and `FHE.allow(ct, user)`.
- **`isSenderAllowed` check:** any external function accepting an existing ciphertext handle must `require(FHE.isSenderAllowed(handle), "...")`; otherwise an attacker can replay someone else's handle and binary-search the victim's balance from tx success/failure (documented inference attack).
- `allowTransient` is the cheap choice when passing a ciphertext to another contract within the same tx (e.g. disperse contract -> token's `confidentialTransferFrom`).
- Only an address already allowed on a handle can grant further allowances on it.

## 6. No branching on encrypted values — `FHE.select`

`if (encryptedCond)` is impossible; comparisons return `ebool`. Documented pattern:

```solidity
euint64 bid = FHE.fromExternal(encryptedValue, inputProof);
ebool isAbove = FHE.lt(highestBid, bid);
highestBid = FHE.select(isAbove, bid, highestBid);
FHE.allowThis(highestBid);
```

`FHE.select(ebool cond, T ifTrue, T ifFalse)` — both branches always computed.

## 7. HCU limits (docs, development-guide/hcu)

- **Global limit: 20,000,000 HCU per transaction.**
- **Sequential (depth) limit: 5,000,000 HCU per transaction.** Exceeding either reverts (enforced via HCULimit contract `0xa10998783c8CF88D886Bc30307e631D6686F0A22`).
- Sample euint64 costs (scalar / non-scalar): `add` 133k/162k, `sub` 133k/162k, `le` 119k/149k, `select` 55k, `cast` 32.

Implication for max recipients per disperse (euint64 amounts): a transfer per recipient is roughly `sub` (sender balance, sequential) + `add` (recipient balance) + a `le`/`select` pair for underflow-safe transfer, ~ 500k HCU non-scalar per recipient against the 20M global cap → order of ~35-40 recipients max; the sequential 5M cap on the chained sender-balance `sub` (~162k each) binds at ~25-30 sequential ops. **Rule of thumb: cap the widget at ~20 recipients per tx and verify empirically on Sepolia.** (The per-disperse arithmetic above is my estimate, not doc text — mark UNVERIFIED until measured.)

## 8. Faucets

- **Sepolia ETH:** standard third-party faucets — Alchemy (`alchemy.com/faucets/ethereum-sepolia`), Chainlink (`faucets.chain.link/sepolia`), Infura/QuickNode etc. Zama does not run its own Sepolia ETH faucet.
- **Confidential test tokens:** the official cTokenMocks' underlying ERC-20s have public mint (1M limit); mint the underlying, then wrap via the token wrapper / Confidential Wrapper Registry app. Web results also mention a Zama testnet portal faucet flow with USDZ -> shielded cUSDZ (Shield section), but that appears tied to the Zama testnet program rather than the Sepolia cTokenMocks — UNVERIFIED, prefer the mint-and-wrap path.

## 9. Bounty forum check

`https://community.zama.org/c/developer-program/special-bounty-track/31` currently shows only the category description thread ("About the Special Bounty Track category", by alakazamzam, 2026-05-28). No pinned TokenOps-disperse guidance was retrievable via fetch (Discourse lazy-loads thread lists; content may exist but was not visible) — UNVERIFIED / re-check in a browser if needed.

## 10. Recommended stack for DisperseKit

- Contracts: `@fhevm/solidity@0.11.1`, inherit `ZamaEthereumConfig`, plus `@fhevm/hardhat-plugin` for local mock (chainid 31337 config is baked in: ACL `0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D`, Coprocessor `0xe3a9105a3a932253A70F126eb1E3b589C643dD24`, KMSVerifier `0x901F8942346f7AB3a01F6D7613119Bca447Bb030`).
- Frontend: `@zama-fhe/relayer-sdk@0.4.4`, `createInstance(SepoliaConfig)`; relayer `https://relayer.testnet.zama.org`.
- Token for demo: cUSDTMock `0x4E7B06D78965594eB5EF5414c357ca21E1554491`.
