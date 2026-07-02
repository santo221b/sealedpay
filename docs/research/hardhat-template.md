# Zama FHEVM Hardhat Template — Research Notes

Source of truth: shallow clone of https://github.com/zama-ai/fhevm-hardhat-template (template version `0.4.1`, cloned 2026-07-02), plus the **installed** `node_modules` from its `package-lock.json` (`npm ci` was run and inspected). Everything below is verified against that clone unless marked UNVERIFIED.

Clone location (scratch): `/private/tmp/claude-501/-Users-santo-dispersekit/41f3ce7f-97fe-46be-ad24-7668190ba0b3/scratchpad/fhevm-hardhat-template`

## TL;DR for DisperseKit

- Hardhat **2.x** (2.28.6), ethers **v6** (6.16.0), Solidity **0.8.27** compiler / `pragma ^0.8.24` in contracts.
- FHEVM stack: `@fhevm/solidity` 0.11.1, `@fhevm/hardhat-plugin` 0.4.2, `@fhevm/mock-utils` 0.4.2, `@zama-fhe/relayer-sdk` 0.4.1, `encrypted-types` 0.0.4.
- Deployment via **hardhat-deploy** (0.11.45) `deploy/` scripts + custom tasks in `tasks/`.
- `npx hardhat test` works fully offline in mock mode — **verified by actually running it** (3 passing, Sepolia suite auto-skips). No docker, no relayer, no external services.
- Config inheritance: the template's contract inherits **`ZamaEthereumConfig`** from `@fhevm/solidity/config/ZamaConfig.sol`. NOTE: the older `SepoliaConfig` contract mentioned in many docs/blogs **no longer exists** in `@fhevm/solidity` 0.11.1 — `ZamaEthereumConfig` now switches on `block.chainid` (1 = mainnet, 11155111 = Sepolia, 31337 = local mock) and reverts `ZamaProtocolUnsupported()` otherwise.
- `@openzeppelin/confidential-contracts` is **NOT** in the template. Latest on npm is `0.5.1` and its deps pin `@fhevm/solidity: 0.11.1` (matches the template) plus `@openzeppelin/contracts ^5.6.1` — so it can be added cleanly if DisperseKit wants `ConfidentialFungibleToken`.

## Repo layout

```
fhevm-hardhat-template/
├── contracts/FHECounter.sol
├── deploy/deploy.ts            # hardhat-deploy script
├── tasks/accounts.ts
├── tasks/FHECounter.ts         # CLI interaction tasks (encrypt/decrypt from terminal)
├── test/FHECounter.ts          # mock-mode test (skips on Sepolia)
├── test/FHECounterSepolia.ts   # Sepolia test (skips in mock)
├── hardhat.config.ts
├── tsconfig.json
└── package.json
```

## 1. package.json — dependencies (exact locked versions from package-lock)

Runtime `dependencies`:

| Package | Range | Locked |
|---|---|---|
| `@fhevm/solidity` | ^0.11.1 | **0.11.1** |
| `@fhevm/mock-utils` | ^0.4.2 | **0.4.2** |
| `encrypted-types` | ^0.0.4 | **0.0.4** |

Key `devDependencies`:

| Package | Range | Locked |
|---|---|---|
| `hardhat` | ^2.28.6 | **2.28.6** (Hardhat **2**, not 3) |
| `ethers` | ^6.16.0 | **6.16.0** |
| `@fhevm/hardhat-plugin` | ^0.4.2 | **0.4.2** |
| `@zama-fhe/relayer-sdk` | ^0.4.1 | **0.4.1** |
| `hardhat-deploy` | ^0.11.45 | **0.11.45** |
| `@nomicfoundation/hardhat-ethers` | ^3.1.3 | 3.1.3 |
| `@nomicfoundation/hardhat-chai-matchers` | ^2.1.0 | 2.1.0 |
| `@nomicfoundation/hardhat-network-helpers` | ^1.1.2 | 1.1.2 |
| `@nomicfoundation/hardhat-verify` | ^2.1.3 | 2.1.3 |
| `typechain` | ^8.3.2 | **8.3.2** |
| `@typechain/hardhat` | ^9.1.0 | 9.1.0 |
| `@typechain/ethers-v6` | ^0.5.1 | 0.5.1 |
| `chai` | ^4.5.0 | 4.5.0 (chai 4, not 5) |
| `mocha` | ^10.0.10 types / ^11.7.5 | 11.7.5 |
| `typescript` | ^5.9.3 | 5.9.3 |
| `ts-node` | ^10.9.2 | 10.9.2 |
| `hardhat-gas-reporter` | ^2.3.0 | 2.3.0 |
| `solidity-coverage` | ^0.8.17 | 0.8.17 |
| `cross-env`, `rimraf`, `solhint`, eslint/prettier stack | — | see template |

Not present: `@openzeppelin/confidential-contracts`, `@openzeppelin/contracts`, `dotenv` (uses `hardhat vars` instead).

`engines`: node >=20, npm >=7. Also has a large `overrides` block pinning `elliptic`, `axios`, `undici`, `ws`, `minimatch` etc. for security (copy it if you copy the package.json).

### npm scripts

```json
"scripts": {
  "clean": "rimraf ./fhevmTemp ./artifacts ./cache ./coverage ./types ./coverage.json ./dist && npm run typechain",
  "compile": "cross-env TS_NODE_TRANSPILE_ONLY=true hardhat compile",
  "coverage": "cross-env SOLIDITY_COVERAGE=true hardhat coverage --solcoverjs ./.solcover.js --temp artifacts --testfiles \"test/**/*.ts\" && npm run typechain",
  "lint": "npm run lint:sol && npm run lint:ts && npm run prettier:check",
  "lint:sol": "solhint --max-warnings 0 \"contracts/**/*.sol\"",
  "lint:ts": "eslint .",
  "postcompile": "npm run typechain",
  "test": "hardhat test",
  "test:sepolia": "hardhat test --network sepolia",
  "typechain": "cross-env TS_NODE_TRANSPILE_ONLY=true hardhat typechain",
  "chain": "hardhat node --network hardhat --no-deploy",
  "deploy:localhost": "hardhat deploy --network localhost",
  "deploy:sepolia": "hardhat deploy --network sepolia",
  "verify:sepolia": "hardhat verify --network sepolia"
}
```

Note: the plugin compiles FHEVM mock precompiles into a `./fhevmTemp` dir (cleaned by `clean`).

## 2. hardhat.config.ts (verbatim, copy-pasteable)

Config secrets use Hardhat's `vars` store (`npx hardhat vars set MNEMONIC` / `INFURA_API_KEY` / `ETHERSCAN_API_KEY`), not `.env`.

```ts
import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/FHECounter";

// Run 'npx hardhat vars setup' to see the list of variables that need to be set

const MNEMONIC: string = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY: string = vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: vars.get("ETHERSCAN_API_KEY", ""),
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    anvil: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        bytecodeHash: "none",
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
```

Plugin wiring: `import "@fhevm/hardhat-plugin"` is all that's needed — it adds `hre.fhevm` (also re-exported as `import { fhevm } from "hardhat"`), auto-detects mock vs real network (mock when chainId 31337 hardhat network), and injects the FHEVM mock coprocessor. There is NO fhevm-specific config block in `HardhatUserConfig`.

## 3. Deployment — hardhat-deploy

`deploy/deploy.ts` (verbatim):

```ts
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  console.log(`FHECounter contract: `, deployedFHECounter.address);
};
export default func;
func.id = "deploy_fheCounter"; // id required to prevent reexecution
func.tags = ["FHECounter"];
```

- `npx hardhat deploy --network sepolia` / `--network localhost`.
- Tests/tasks look deployments up via `deployments.get("FHECounter")`.
- Verify: `npx hardhat verify --network sepolia <ADDRESS>` (hardhat-verify + etherscan key).

## 4. Example contract — FHECounter.sol

Pragma: `pragma solidity ^0.8.24;` (compiled with 0.8.27, evmVersion cancun).

Imports and inheritance (exact):

```solidity
import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHECounter is ZamaEthereumConfig { ... }
```

Key patterns in the contract body:

```solidity
euint32 private _count;

function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
    _count = FHE.add(_count, encryptedEuint32);
    FHE.allowThis(_count);          // contract keeps access
    FHE.allow(_count, msg.sender);  // caller can user-decrypt
}
```

`ZamaEthereumConfig` (from installed `@fhevm/solidity@0.11.1` `config/ZamaConfig.sol`) is:

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

`ZamaConfig.getEthereumCoprocessorConfig()` picks addresses by `block.chainid`:
- chainId 11155111 (Sepolia): `ACL 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D`, `Coprocessor 0x92C920834Ec8941d2C77D188936E1f7A6f49c127`, `KMSVerifier 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` (protocol id 10001)
- chainId 31337 (local mock): `ACL 0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D`, `Coprocessor 0xe3a9105a3a932253A70F126eb1E3b589C643dD24`, `KMSVerifier 0x901F8942346f7AB3a01F6D7613119Bca447Bb030`
- anything else reverts `ZamaProtocolUnsupported()`.

**Important:** `SepoliaConfig` does not exist anywhere in `@fhevm/solidity@0.11.1` — if other docs say `contract X is SepoliaConfig`, that is the OLD (≤0.9.x-era) API. Use `ZamaEthereumConfig` with this version.

## 5. Test patterns (mock mode) — verified working

Verified: `npx hardhat test` after plain `npm ci` → `3 passing, 1 pending` with **no external services** (the plugin's built-in mock coprocessor runs in-process; Sepolia suite self-skips via `fhevm.isMock`).

### Full example test file — test/FHECounter.ts (verbatim)

```ts
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHECounter, FHECounter__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHECounter")) as FHECounter__factory;
  const fheCounterContract = (await factory.deploy()) as FHECounter;
  const fheCounterContractAddress = await fheCounterContract.getAddress();

  return { fheCounterContract, fheCounterContractAddress };
}

describe("FHECounter", function () {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheCounterContract, fheCounterContractAddress } = await deployFixture());
  });

  it("encrypted count should be uninitialized after deployment", async function () {
    const encryptedCount = await fheCounterContract.getCount();
    // uninitialized euint handle reads as bytes32(0)
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("increment the counter by 1", async function () {
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    const tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterInc = await fheCounterContract.getCount();
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(clearOne);
  });
});
```

### Key mechanics

- **`hre.fhevm`** — get it via `import { ethers, fhevm } from "hardhat"` (or `hre.fhevm` inside tasks). `fhevm.isMock: boolean` distinguishes local mock vs live network; the template uses it to skip the wrong suite.
- **Creating encrypted inputs** (encryption is bound to (contractAddress, userAddress) pair; the tx MUST then be sent from that same user):

  ```ts
  const enc = await fhevm
    .createEncryptedInput(contractAddress, signer.address)  // returns RelayerEncryptedInput
    .add64(1000n)     // addBool/add8/add16/add32/add64/add128/add256/addAddress; chainable, multiple values allowed
    .add64(2000n)
    .encrypt();       // Promise<{ handles: Uint8Array[]; inputProof: Uint8Array }>
  // pass enc.handles[i] as the externalEuintXX param, enc.inputProof as bytes
  await contract.connect(signer).someFn(enc.handles[0], enc.handles[1], enc.inputProof);
  ```

  Signer↔encryption mapping: the second arg to `createEncryptedInput` is the *user address*, and the contract calls `FHE.fromExternal(handle, proof)` which validates the proof against `msg.sender` — so always `.connect()` the same signer whose address was used for encryption.

- **Decrypting for assertions** (user decryption; requires `FHE.allow(handle, user)` AND `FHE.allowThis(handle)` on-chain first). Exact signatures from installed `@fhevm/hardhat-plugin@0.4.2` (`_types/types.d.ts`):

  ```ts
  userDecryptEuint(fhevmType: FhevmTypeEuint, handleBytes32: string, contractAddress: ethers.AddressLike,
                   user: ethers.Signer, options?: FhevmUserDecryptOptions): Promise<bigint>;
  userDecryptEbool(handleBytes32, contractAddress, user, options?): Promise<boolean>;
  userDecryptEaddress(handleBytes32, contractAddress, user, options?): Promise<string>;
  publicDecryptEuint(fhevmType, handleBytes32, options?): Promise<bigint>;
  publicDecryptEbool(handleBytes32, options?): Promise<boolean>;
  publicDecryptEaddress(handleBytes32, options?): Promise<string>;
  ```

  `FhevmType` enum (from `@fhevm/mock-utils`, re-exported by the plugin): `ebool=0, euint4=1, euint8=2, euint16=3, euint32=4, euint64=5, euint128=6, eaddress=7, euint256=8`.

  Example: `await fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddr, aliceSigner)` → `bigint`.

- **`awaitDecryptionOracle`**: NOT present in `@fhevm/hardhat-plugin@0.4.2` (grepped all `.d.ts` — zero hits). That helper belongs to older plugin versions/docs. In 0.4.2 the decryption-oracle-adjacent surface is `publicDecrypt(handles)`, `publicDecryptEuint/Ebool/Eaddress`, plus lower-level `userDecrypt(...)`/`generateKeypair()`/`createEIP712(...)`. If a doc tells you `await fhevm.awaitDecryptionOracle()`, treat it as stale for this version.
- Other useful `hre.fhevm` members (verified in types.d.ts): `initializeCLIApi()` (call at the top of custom hardhat tasks before using fhevm APIs — tests don't need it), `debugger.decryptEuint(type, handle)` (mock-only trapdoor decryption ignoring ACLs), `computeTransactionHCU(receipt)`, `tryParseFhevmError(e)`, `getRelayerMetadata()`, `assertCoprocessorInitialized(contract)`.
- Sepolia test pattern (`test/FHECounterSepolia.ts`): skips when `fhevm.isMock`, resolves the contract via `deployments.get("FHECounter")`, uses the exact same `createEncryptedInput`/`userDecryptEuint` calls (the plugin routes them through the real Zama relayer), with generous timeouts (`this.timeout(4 * 40000)`).

## 6. Running tests — out-of-the-box behavior (verified)

```
npm ci
npx hardhat test
# → Downloads solc 0.8.27, compiles 7 files, then:
#   FHECounter: 3 passing (59ms)
#   FHECounterSepolia: 1 pending (skipped: "can only run on Sepolia Testnet")
```

- No env vars needed for mock tests (MNEMONIC/INFURA_API_KEY have working defaults via `vars.get(..., default)`).
- No hardhat node needed (in-process hardhat network), no docker, no relayer, no Zama services.
- `npx hardhat test --network sepolia` flips it: mock suite skips, Sepolia suite runs against the live relayer (needs funded MNEMONIC + INFURA_API_KEY + prior `hardhat deploy --network sepolia`).
- Local node flow: `npx hardhat node` (FHEVM-ready) → `npx hardhat deploy --network localhost` → interact via tasks (`npx hardhat --network localhost task:increment --value 2`).

## 7. Extras relevant to DisperseKit

- For a euint64 token-amount widget: use `.add64(value)` and `FhevmType.euint64`, contract params typed `externalEuint64` + `bytes calldata inputProof`, `FHE.fromExternal`, and `FHE.allowThis`/`FHE.allow`/`FHE.allowTransient` for ACLs.
- `@openzeppelin/confidential-contracts@0.5.1` (npm, checked 2026-07-02) depends on exactly `@fhevm/solidity@0.11.1` and `@openzeppelin/contracts ^5.6.1` — version-compatible with this template if you add a ConfidentialFungibleToken. (Its internal API is UNVERIFIED here — not part of this template.)
- tsconfig: commonjs, target es2022, strict; includes `tasks/`, `test/`, `deploy/`, `types/` (typechain output dir is `types/`, e.g. `import { FHECounter, FHECounter__factory } from "../types"`).
- CI (`.github/workflows/main.yml`) just runs install + lint + compile + test on node 20, confirming mock tests are CI-safe.
