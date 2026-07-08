import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { EventLog } from "ethers";
import { ethers, fhevm } from "hardhat";

import { ConfidentialTokenDemo, DisperseConfidential } from "../types";

/**
 * End-to-end proof of the confidential disperse flow, in the FHEVM mock:
 *
 *   mint (faucet) → setOperator → one disperse tx → each recipient decrypts
 *   ONLY their own amount.
 *
 * The DisperseConfidential under test is the vendored TokenOps verified source
 * (contracts/tokenops/), deployed with the same fee/batch config as the live
 * Sepolia singleton, so what passes here is what the widget meets on Sepolia.
 */

// Mirrors the live Sepolia singleton configuration (see deploy/01_deploy_disperse.ts).
const GAS_FEE = 1_000_000_000_000_000n; // 0.001 ETH per recipient
const MAX_BATCH_DIRECT = 20;

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner; // sender
  bob: HardhatEthersSigner; // recipient
  carol: HardhatEthersSigner; // recipient
  dave: HardhatEthersSigner; // recipient
  mallory: HardhatEthersSigner; // unfunded sender / nosy outsider
};

describe("DisperseConfidential (vendored TokenOps source)", function () {
  let signers: Signers;
  let token: ConfidentialTokenDemo;
  let tokenAddress: string;
  let disperse: DisperseConfidential;
  let disperseAddress: string;

  before(async function () {
    const s = await ethers.getSigners();
    signers = { deployer: s[0], alice: s[1], bob: s[2], carol: s[3], dave: s[4], mallory: s[5] };
  });

  beforeEach(async function () {
    // The FHE assertions below only make sense against the local mock; on a live
    // network use the Sepolia scripts instead.
    if (!fhevm.isMock) {
      this.skip();
    }

    const tokenFactory = await ethers.getContractFactory("ConfidentialTokenDemo");
    token = (await tokenFactory.deploy()) as ConfidentialTokenDemo;
    tokenAddress = await token.getAddress();

    const disperseFactory = await ethers.getContractFactory("DisperseConfidential");
    disperse = (await disperseFactory.deploy(
      signers.deployer.address,
      signers.deployer.address,
      { gasFeeEnabled: true, tokenFeeEnabled: true, defaultGasFee: GAS_FEE, defaultTokenFee: 500 },
      30,
      MAX_BATCH_DIRECT,
      5,
    )) as DisperseConfidential;
    disperseAddress = await disperse.getAddress();
  });

  /** Faucet-mint plaintext `amount` to `to`. */
  async function mint(to: HardhatEthersSigner, amount: bigint) {
    await (await token.mint(to.address, amount)).wait();
  }

  /** Time-boxed operator grant, the ERC-7984 equivalent of a token approval. */
  async function authorizeDisperse(from: HardhatEthersSigner, seconds = 3600) {
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    await (await token.connect(from).setOperator(disperseAddress, now + seconds)).wait();
  }

  /** Decrypt an encrypted balance as its owner. */
  async function balanceOf(owner: HardhatEthersSigner): Promise<bigint> {
    const handle = await token.confidentialBalanceOf(owner.address);
    if (handle === ethers.ZeroHash) return 0n; // uninitialized: never held tokens
    return await fhevm.userDecryptEuint(FhevmType.euint64, handle, tokenAddress, owner);
  }

  /**
   * Encrypt values into one shared input bundle bound to (disperse contract, sender) —
   * exactly what the widget does client-side with the relayer SDK.
   */
  async function encryptFor(sender: HardhatEthersSigner, values: bigint[]) {
    const input = fhevm.createEncryptedInput(disperseAddress, sender.address);
    for (const v of values) input.add64(v);
    return await input.encrypt();
  }

  function directDistributionEvent(receipt: { logs: (EventLog | import("ethers").Log)[] }) {
    for (const log of receipt.logs) {
      try {
        const parsed = disperse.interface.parseLog(log);
        if (parsed?.name === "DirectDistribution") return parsed;
      } catch {
        /* not ours */
      }
    }
    throw new Error("DirectDistribution event not found");
  }

  function walletDistributionEvents(receipt: { logs: (EventLog | import("ethers").Log)[] }) {
    const out = [];
    for (const log of receipt.logs) {
      try {
        const parsed = disperse.interface.parseLog(log);
        if (parsed?.name === "WalletDistribution") out.push(parsed);
      } catch {
        /* not ours */
      }
    }
    return out;
  }

  it("direct mode: one tx delivers encrypted amounts each recipient can decrypt", async function () {
    const amounts = [100_000_000n, 250_500_000n, 5n]; // 100 / 250.5 / 0.000005 cUSDd
    const recipients = [signers.bob, signers.carol, signers.dave];

    await mint(signers.alice, 1_000_000_000n);
    await authorizeDisperse(signers.alice);

    const enc = await encryptFor(signers.alice, amounts);
    const tx = await disperse.connect(signers.alice).disperseConfidentialTokenDirect(
      tokenAddress,
      recipients.map((r) => r.address),
      enc.handles,
      enc.inputProof,
      { value: GAS_FEE * BigInt(recipients.length) },
    );
    const receipt = (await tx.wait())!;

    // Delivery is confirmed from the event's `transferred` handles — never assumed.
    const event = directDistributionEvent(receipt);
    expect(event.args.sender).to.equal(signers.alice.address);
    expect(event.args.recipients).to.deep.equal(recipients.map((r) => r.address));

    // Each recipient decrypts THEIR OWN transferred amount (ACL scope: the token,
    // which produced the transferred handle in _update).
    for (let i = 0; i < recipients.length; i++) {
      const clear = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        event.args.transferred[i],
        tokenAddress,
        recipients[i],
      );
      expect(clear).to.equal(amounts[i]);
    }

    // The sender can audit what was requested (ACL scope: the disperse contract,
    // which created the requested handles from the encrypted input).
    for (let i = 0; i < recipients.length; i++) {
      const clear = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        event.args.requested[i],
        disperseAddress,
        signers.alice,
      );
      expect(clear).to.equal(amounts[i]);
    }

    // Balances moved: encrypted end-to-end, decrypted here only by their owners.
    expect(await balanceOf(signers.alice)).to.equal(1_000_000_000n - 100_000_000n - 250_500_000n - 5n);
    expect(await balanceOf(signers.bob)).to.equal(100_000_000n);
    expect(await balanceOf(signers.carol)).to.equal(250_500_000n);
    expect(await balanceOf(signers.dave)).to.equal(5n);
  });

  it("privacy: a recipient cannot decrypt another recipient's amount", async function () {
    const amounts = [7_000_000n, 9_000_000n];
    await mint(signers.alice, 100_000_000n);
    await authorizeDisperse(signers.alice);

    const enc = await encryptFor(signers.alice, amounts);
    const tx = await disperse
      .connect(signers.alice)
      .disperseConfidentialTokenDirect(tokenAddress, [signers.bob.address, signers.carol.address], enc.handles, enc.inputProof, {
        value: GAS_FEE * 2n,
      });
    const event = directDistributionEvent((await tx.wait())!);

    // Bob CAN read his own...
    expect(await fhevm.userDecryptEuint(FhevmType.euint64, event.args.transferred[0], tokenAddress, signers.bob)).to.equal(
      amounts[0],
    );
    // ...but bob CANNOT read carol's, and an outsider can read neither.
    await expect(fhevm.userDecryptEuint(FhevmType.euint64, event.args.transferred[1], tokenAddress, signers.bob)).to.be
      .rejected;
    await expect(fhevm.userDecryptEuint(FhevmType.euint64, event.args.transferred[1], tokenAddress, signers.mallory)).to.be
      .rejected;
  });

  it("footgun: insufficient sender balance transfers encrypted ZERO — no revert", async function () {
    // Mallory holds nothing but disperses anyway. ERC-7984 cannot branch on the
    // encrypted comparison, so the tx SUCCEEDS and the transfer is a silent zero.
    // This is exactly why the widget decrypts `transferred` handles after the tx.
    await authorizeDisperse(signers.mallory);

    const enc = await encryptFor(signers.mallory, [50_000_000n]);
    const tx = await disperse
      .connect(signers.mallory)
      .disperseConfidentialTokenDirect(tokenAddress, [signers.bob.address], enc.handles, enc.inputProof, {
        value: GAS_FEE,
      });
    const event = directDistributionEvent((await tx.wait())!);

    const requested = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      event.args.requested[0],
      disperseAddress,
      signers.mallory,
    );
    const transferred = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      event.args.transferred[0],
      tokenAddress,
      signers.bob,
    );
    expect(requested).to.equal(50_000_000n);
    expect(transferred).to.equal(0n); // delivery must be confirmed from events, never assumed
  });

  it("wallet mode: subtotal-split disperse to 5 recipients", async function () {
    // Wallet mode partitions recipients into 2 groups; the CALLER supplies each
    // group's encrypted subtotal (no on-chain summing — HCU depth limits).
    // Split rule from the verified source: group0 gets ceil(n/2) recipients.
    const amounts = [10_000_000n, 20_000_000n, 30_000_000n, 40_000_000n, 50_000_000n];
    const recipients = [signers.bob, signers.carol, signers.dave, signers.mallory, signers.deployer];
    const group0Size = Math.floor(amounts.length / 2) + (amounts.length % 2); // = 3
    const subtotal0 = amounts.slice(0, group0Size).reduce((a, b) => a + b, 0n); // 60
    const subtotal1 = amounts.slice(group0Size).reduce((a, b) => a + b, 0n); // 90

    await mint(signers.alice, 1_000_000_000n);
    await authorizeDisperse(signers.alice);
    await (await disperse.connect(signers.alice).register(tokenAddress)).wait();

    // One shared bundle: N amounts then the 2 subtotals (N + 2 encrypted inputs).
    const enc = await encryptFor(signers.alice, [...amounts, subtotal0, subtotal1]);
    const tx = await disperse.connect(signers.alice).disperseConfidentialTokens(
      tokenAddress,
      recipients.map((r) => r.address),
      enc.handles.slice(0, amounts.length),
      [enc.handles[amounts.length], enc.handles[amounts.length + 1]],
      enc.inputProof,
      { value: GAS_FEE * BigInt(recipients.length) },
    );
    const receipt = (await tx.wait())!;

    // One WalletDistribution event per wallet group.
    const events = walletDistributionEvents(receipt);
    expect(events.length).to.equal(2);
    expect(events[0].args.recipients.length).to.equal(group0Size);
    expect(events[1].args.recipients.length).to.equal(amounts.length - group0Size);

    // Every recipient across both groups received their exact encrypted amount.
    let i = 0;
    for (const event of events) {
      for (let j = 0; j < event.args.recipients.length; j++, i++) {
        expect(event.args.recipients[j]).to.equal(recipients[i].address);
        const clear = await fhevm.userDecryptEuint(
          FhevmType.euint64,
          event.args.transferred[j],
          tokenAddress,
          recipients[i],
        );
        expect(clear).to.equal(amounts[i]);
      }
    }
    expect(await balanceOf(signers.alice)).to.equal(1_000_000_000n - subtotal0 - subtotal1);
  });

  it("guards: batch size cap, gas fee, zero-address recipient", async function () {
    await mint(signers.alice, 1_000_000_000n);
    await authorizeDisperse(signers.alice);

    // Wrong msg.value (fee is 0.001 ETH per recipient on the live config).
    const enc1 = await encryptFor(signers.alice, [1n]);
    await expect(
      disperse
        .connect(signers.alice)
        .disperseConfidentialTokenDirect(tokenAddress, [signers.bob.address], enc1.handles, enc1.inputProof, {
          value: 0n,
        }),
    ).to.be.reverted;

    // Zero-address recipient.
    const enc2 = await encryptFor(signers.alice, [1n]);
    await expect(
      disperse
        .connect(signers.alice)
        .disperseConfidentialTokenDirect(tokenAddress, [ethers.ZeroAddress], enc2.handles, enc2.inputProof, {
          value: GAS_FEE,
        }),
    ).to.be.reverted;

    // Over the direct-mode batch cap (20 on the live Sepolia singleton).
    const n = MAX_BATCH_DIRECT + 1;
    const encN = await encryptFor(
      signers.alice,
      Array.from({ length: n }, () => 1n),
    );
    const filler = Array.from({ length: n }, (_, k) => ethers.getAddress("0x" + (k + 1).toString(16).padStart(40, "0")));
    await expect(
      disperse
        .connect(signers.alice)
        .disperseConfidentialTokenDirect(tokenAddress, filler, encN.handles, encN.inputProof, {
          value: GAS_FEE * BigInt(n),
        }),
    ).to.be.reverted;
  });
});
