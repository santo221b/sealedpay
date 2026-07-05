/**
 * Retro-verification of any recorded payroll run.
 *
 * History stores only ciphertext handles (see PayoutEntry). Because the
 * disperse contract granted the employer PERMANENT decrypt rights on both the
 * `requested` and `transferred` handles, the employer can re-open any past
 * run and prove — cryptographically, not from local notes — what each
 * employee was actually paid. Uses only the frozen engine helpers.
 */
import {
  DEMO_TOKEN_ADDRESS,
  disperseAddressFor,
  getFhevmInstance,
  SEPOLIA_CHAIN_ID,
  userDecryptHandles,
  type DecryptRequest,
} from "@dispersekit/widget";
import { useCallback, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";

import type { PayoutEntry, PayoutRun } from "./history";

const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";

export interface VerifiedEntry extends PayoutEntry {
  requestedAmount: bigint;
  transferredAmount: bigint;
  ok: boolean;
}

export function useVerifyRun(token: `0x${string}` | undefined) {
  const { address: employer } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [busyRunId, setBusyRunId] = useState<string>();
  // Error is keyed to the run that failed — showing it under whichever row
  // happens to be open would misattribute it.
  const [error, setError] = useState<{ runId: string; message: string }>();
  // Decrypted views per run id — session-only, never persisted.
  const [results, setResults] = useState<Record<string, VerifiedEntry[]>>({});

  const verifyRun = useCallback(
    async (run: PayoutRun): Promise<boolean | undefined> => {
      if (!run.entries?.length || !employer || !token) return undefined;
      if (!walletClient) {
        // Right after connecting, the wallet client hydrates async — a silent
        // no-op here reads as a broken button.
        setError({ runId: run.id, message: "Wallet is still connecting — try again in a second." });
        return undefined;
      }
      setBusyRunId(run.id);
      setError(undefined);
      try {
        const disperse = disperseAddressFor(SEPOLIA_CHAIN_ID);
        const instance = await getFhevmInstance(FHE_NETWORK);
        const requests: DecryptRequest[] = [
          // ACL scopes differ by handle origin — same rule as the live flow.
          ...run.entries.map((e) => ({ handle: e.transferred, contractAddress: token })),
          ...run.entries.map((e) => ({ handle: e.requested, contractAddress: disperse })),
        ];
        const decrypted = await userDecryptHandles({
          instance,
          requests,
          userAddress: employer,
          signTypedData: (args) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            walletClient.signTypedData({ ...args, account: employer } as any),
        });
        const entries: VerifiedEntry[] = run.entries.map((e) => {
          const requestedAmount = decrypted[e.requested];
          const transferredAmount = decrypted[e.transferred];
          return { ...e, requestedAmount, transferredAmount, ok: requestedAmount === transferredAmount };
        });
        setResults((r) => ({ ...r, [run.id]: entries }));
        return entries.every((e) => e.ok);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError({
          runId: run.id,
          message: /user rejected|denied/i.test(message) ? "Request cancelled in the wallet." : message,
        });
        return undefined;
      } finally {
        setBusyRunId(undefined);
      }
    },
    [employer, walletClient, token],
  );

  return { verifyRun, busyRunId, error, results };
}

export const TOKEN = DEMO_TOKEN_ADDRESS;
