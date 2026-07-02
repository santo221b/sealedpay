/**
 * Client-side encryption of disperse amounts.
 *
 * One relayer input bundle carries every value under a single ZK proof. The
 * bundle is cryptographically bound to (consuming contract, sender), so the
 * ciphertexts are useless anywhere else.
 */
import { getAddress } from "viem";

import type { FhevmInstance } from "./instance";

/** One input packs at most 2048 bits ⇒ 32 × euint64 (SDK enforces this too). */
export const MAX_VALUES_PER_INPUT = 32;

export interface EncryptedDisperse {
  /** 32-byte handle per amount, in recipient order. */
  amountHandles: Uint8Array[];
  /** Present only when `withSubtotals` — the two wallet-group subtotals. */
  subtotalHandles?: [Uint8Array, Uint8Array];
  /** Single proof covering every handle above. */
  inputProof: Uint8Array;
}

/**
 * Wallet-mode group split, exactly as the verified TokenOps source partitions
 * recipients: group 0 takes the first ceil(n/2), group 1 the rest. Getting
 * this wrong doesn't revert — it silently zeroes late recipients — so the
 * rule lives in one exported, tested place.
 */
export function computeSubtotals(amounts: bigint[]): [bigint, bigint] {
  const group0Size = Math.floor(amounts.length / 2) + (amounts.length % 2);
  const sum = (list: bigint[]) => list.reduce((acc, v) => acc + v, 0n);
  return [sum(amounts.slice(0, group0Size)), sum(amounts.slice(group0Size))];
}

export async function encryptAmounts(options: {
  instance: FhevmInstance;
  /** The contract that will consume the ciphertexts (the disperse contract). */
  disperseAddress: string;
  /** The account that will send the disperse transaction. */
  senderAddress: string;
  /** Per-recipient amounts in token base units (euint64 range). */
  amounts: bigint[];
  /** Wallet mode: also pack the two group subtotals into the same proof. */
  withSubtotals?: boolean;
}): Promise<EncryptedDisperse> {
  const { instance, amounts, withSubtotals } = options;

  const valueCount = amounts.length + (withSubtotals ? 2 : 0);
  if (amounts.length === 0) throw new Error("Nothing to encrypt: empty amount list");
  if (valueCount > MAX_VALUES_PER_INPUT) {
    throw new Error(
      `A single encrypted input fits ${MAX_VALUES_PER_INPUT} values; got ${valueCount}. Split the batch.`,
    );
  }

  // The SDK rejects non-checksummed addresses.
  const input = instance.createEncryptedInput(
    getAddress(options.disperseAddress),
    getAddress(options.senderAddress),
  );
  for (const amount of amounts) input.add64(amount);
  if (withSubtotals) {
    const [subtotal0, subtotal1] = computeSubtotals(amounts);
    input.add64(subtotal0).add64(subtotal1);
  }

  // Generates the ZK proof locally (CPU-bound, a few seconds) and registers
  // the ciphertext with the relayer, which returns coprocessor signatures.
  const { handles, inputProof } = await input.encrypt();

  return {
    amountHandles: handles.slice(0, amounts.length),
    subtotalHandles: withSubtotals
      ? [handles[amounts.length], handles[amounts.length + 1]]
      : undefined,
    inputProof,
  };
}
