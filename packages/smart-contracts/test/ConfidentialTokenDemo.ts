import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import { ConfidentialTokenDemo } from "../types";

describe("ConfidentialTokenDemo (faucet)", function () {
  let token: ConfidentialTokenDemo;

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    token = (await (await ethers.getContractFactory("ConfidentialTokenDemo")).deploy()) as ConfidentialTokenDemo;
  });

  it("mints up to the per-call cap; balance decrypts for the owner only", async function () {
    const [, alice] = await ethers.getSigners();
    const cap = await token.MAX_FAUCET_MINT();
    await (await token.mint(alice.address, cap)).wait();

    const handle = await token.confidentialBalanceOf(alice.address);
    const clear = await fhevm.userDecryptEuint(FhevmType.euint64, handle, await token.getAddress(), alice);
    expect(clear).to.equal(cap);
  });

  it("reverts over-cap mints — the plaintext cap is what keeps one caller from saturating the encrypted total supply and silently bricking the faucet", async function () {
    const [, alice] = await ethers.getSigners();
    const cap = await token.MAX_FAUCET_MINT();
    await expect(token.mint(alice.address, cap + 1n)).to.be.revertedWithCustomError(token, "FaucetAmountTooLarge");
  });
});
