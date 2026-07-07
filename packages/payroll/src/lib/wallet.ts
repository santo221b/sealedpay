/**
 * Real wiring for the design's Payroll Wallet panel.
 *
 * The design simulates the balance ("22,350.50" seed) and the Fund action.
 * Here both are live: the balance is the employer's actual encrypted cUSDd
 * balance handle (revealed via a real one-signature user-decryption through
 * the frozen engine helpers), and Fund Wallet is a real faucet mint
 * transaction on the demo token. Composes exported engine APIs only.
 */
import {
  DEMO_TOKEN_ADDRESS,
  demoTokenAbi,
  erc7984Abi,
  formatAmount,
  getFhevmInstance,
  userDecryptHandles,
} from "@dispersekit/widget";
import { useCallback, useEffect, useState } from "react";
import { parseUnits, zeroHash } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";
const TOKEN = DEMO_TOKEN_ADDRESS;
/** Per-call faucet cap enforced by the demo token contract (6 decimals). */
export const MAX_FAUCET_MINT = 1_000_000n * 10n ** 6n;

export function useWalletBalance(decimals: number | undefined) {
  const { address: employer } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [handle, setHandle] = useState<`0x${string}`>();
  const [clear, setClear] = useState<bigint>();
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!publicClient || !employer || !TOKEN) return;
    try {
      const h = await publicClient.readContract({
        address: TOKEN,
        abi: erc7984Abi,
        functionName: "confidentialBalanceOf",
        args: [employer],
      });
      setHandle((prev) => {
        if (prev !== h) setClear(h === zeroHash ? 0n : undefined); // balance changed: old plaintext is stale
        return h;
      });
    } catch {
      /* transient RPC issue; next refresh wins */
    }
  }, [publicClient, employer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Real decryption (one wallet signature). Cached in memory until the handle changes. */
  const reveal = useCallback(async () => {
    setError(undefined);
    if (clear !== undefined) {
      setRevealed(true);
      return;
    }
    if (!handle || handle === zeroHash) {
      setClear(0n);
      setRevealed(true);
      return;
    }
    if (!employer || !walletClient || !TOKEN) {
      setError("Connect your wallet first");
      return;
    }
    setPending(true);
    try {
      const instance = await getFhevmInstance(FHE_NETWORK);
      const result = await userDecryptHandles({
        instance,
        requests: [{ handle, contractAddress: TOKEN }],
        userAddress: employer,
        signTypedData: (args) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          walletClient.signTypedData({ ...args, account: employer } as any),
      });
      setClear(result[handle]);
      setRevealed(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(/user rejected|denied/i.test(message) ? "Request cancelled in the wallet." : message);
    } finally {
      setPending(false);
    }
  }, [clear, handle, employer, walletClient]);

  const hide = useCallback(() => setRevealed(false), []);

  return {
    /** Formatted plaintext once decrypted; undefined until then. */
    value: clear !== undefined && decimals !== undefined ? formatAmount(clear, decimals) : undefined,
    raw: clear,
    revealed,
    pending,
    error,
    reveal,
    hide,
    refresh,
    connected: Boolean(employer),
  };
}

export function useFundWallet(decimals: number | undefined, onFunded: () => void) {
  const { address: employer } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const fund = useCallback(
    async (amountText: string): Promise<boolean> => {
      setError(undefined);
      if (!employer || !walletClient || !publicClient || !TOKEN || decimals === undefined) {
        setError("Connect your wallet first");
        return false;
      }
      if (!/^\d+(\.\d+)?$/.test(amountText.trim())) {
        setError("Enter a plain amount, e.g. 5000");
        return false;
      }
      const amount = parseUnits(amountText.trim() as `${number}`, decimals);
      if (amount === 0n) {
        setError("Amount must be more than zero");
        return false;
      }
      if (amount > MAX_FAUCET_MINT) {
        setError("The demo faucet mints at most 1,000,000 cUSDd per call");
        return false;
      }
      setBusy(true);
      try {
        const hash = await walletClient.writeContract({
          address: TOKEN,
          abi: demoTokenAbi,
          functionName: "mint",
          args: [employer, amount],
          account: employer,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        onFunded();
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(/user rejected|denied/i.test(message) ? "Request cancelled in the wallet." : message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [employer, walletClient, publicClient, decimals, onFunded],
  );

  return { fund, busy, error, employer };
}
