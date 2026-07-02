/**
 * Private reads: decrypt ciphertext handles the connected user is ACL-allowed
 * to see. The user signs one EIP-712 request; the relayer verifies the
 * on-chain ACL and re-encrypts the plaintext to an ephemeral keypair that
 * never leaves this module.
 */
import type { TypedDataDomain } from "viem";

import type { FhevmInstance } from "./instance";

export interface DecryptRequest {
  /** bytes32 ciphertext handle — from an event or a contract view. */
  handle: `0x${string}`;
  /**
   * ACL scope: a contract that holds `FHE.allowThis` on the handle. For
   * disperse results that's the TOKEN for `transferred` handles and the
   * DISPERSE contract for `requested` handles (per the TokenOps source).
   */
  contractAddress: `0x${string}`;
}

/** Adapter so both wagmi's signTypedDataAsync and an ethers signer fit. */
export type SignTypedDataFn = (args: {
  domain: TypedDataDomain;
  types: Record<string, readonly { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}) => Promise<`0x${string}`>;

const MAX_CONTRACTS_PER_REQUEST = 10; // SDK/relayer limit

export async function userDecryptHandles(options: {
  instance: FhevmInstance;
  requests: DecryptRequest[];
  userAddress: `0x${string}`;
  signTypedData: SignTypedDataFn;
  /** How long the signed decryption permission stays valid. Default 1 day. */
  durationDays?: number;
}): Promise<Record<`0x${string}`, bigint>> {
  const { instance, requests, userAddress, signTypedData } = options;
  if (requests.length === 0) return {};

  const contractAddresses = [...new Set(requests.map((r) => r.contractAddress))];
  if (contractAddresses.length > MAX_CONTRACTS_PER_REQUEST) {
    throw new Error(`userDecrypt allows at most ${MAX_CONTRACTS_PER_REQUEST} contracts per request`);
  }

  // Ephemeral ML-KEM keypair: the relayer encrypts plaintexts to it, so not
  // even transport middleboxes see the values. No persistence needed.
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000); // SDK 0.4.4 requires numbers
  const durationDays = options.durationDays ?? 1;

  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

  const signature = await signTypedData({
    domain: eip712.domain as TypedDataDomain,
    // EIP712Domain must not be included when the wallet lib computes the domain itself.
    types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message as unknown as Record<string, unknown>,
  });

  const results = await instance.userDecrypt(
    requests.map((r) => ({ handle: r.handle, contractAddress: r.contractAddress })),
    keypair.privateKey,
    keypair.publicKey,
    signature,
    contractAddresses,
    userAddress,
    startTimestamp,
    durationDays,
  );

  // Results are keyed by 0x-handle; euint64 values arrive as bigint.
  const out: Record<`0x${string}`, bigint> = {};
  for (const r of requests) {
    const value = results[r.handle.toLowerCase() as `0x${string}`] ?? results[r.handle];
    if (typeof value !== "bigint") {
      throw new Error(`No decryption returned for handle ${r.handle}`);
    }
    out[r.handle] = value;
  }
  return out;
}
