import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("TEMP faucet brick check", function () {
  it("mintConfidential(2^64-1) bricks all subsequent faucet mints", async function () {
    if (!fhevm.isMock) this.skip();
    const [attacker, victim] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("ConfidentialTokenDemo")).deploy();
    const tokenAddress = await token.getAddress();

    // Attacker saturates total supply in one tx via the uncapped encrypted mint.
    const max = (1n << 64n) - 1n;
    const input = fhevm.createEncryptedInput(tokenAddress, attacker.address);
    input.add64(max);
    const enc = await input.encrypt();
    await (await token.connect(attacker).mintConfidential(attacker.address, enc.handles[0], enc.inputProof)).wait();

    // Victim uses the normal faucet: tx succeeds, but they receive encrypted ZERO.
    await (await token.mint(victim.address, 1