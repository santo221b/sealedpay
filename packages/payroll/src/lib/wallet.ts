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
import { useCallback, useEffect, useRef, useState } from "react";
import { parseUnits, zeroHash } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";
const TOKEN = DEMO_TOKEN_ADDRESS;
/** Per-call faucet cap enforced by the demo token contract (6 decimals). */
export const MAX_FAUCET_MINT = 1_000_000n * 10n ** 6n;

export function useWalletBalance(decimals: number | undefined, onError?: (msg: string) => void) {
  const { address: employer } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [handle, setHandle] = useState<`0x${string}`>();
  const [clear, setClear] = useState<bigint>();
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  // Compare-against without adding `handle` to refresh's deps (avoids setState
  // inside a setState updater, which trips React's "update while rendering").
  const handleRef = useRef<`0x${string}`>(undefined);
  // A synchronous latch: one decryption may be in flight at a time. Set before
  // the first await so a burst of impatient clicks can't each open a wallet
  // signature prompt (the popup can lag seconds behind the click).
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!publicClient || !employer || !TOKEN) return;
    try {
      const h = (await publicClient.readContract({
        address: TOKEN,
        abi: erc7984Abi,
        functionName: "confidentialBalanceOf",
        args: [employer],
      })) as `0x${string}`;
      if (handleRef.current !== h) {
        handleRef.current = h;
        setHandle(h);
        setClear(h === zeroHash ? 0n : undefined); // handle changed: old plaintext is stale
        setRevealed(false);
      }
    } catch {
      /* transient RPC issue; next refresh wins */
    }
  }, [publicClient, employer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A disconnect (or account switch) must clear every trace of the prior balance.
  useEffect(() => {
    if (!employer) {
      handleRef.current = undefined;
      setHandle(undefined);
      setClear(undefined);
      setRevealed(false);
      setError(undefined);
    }
  }, [employer]);

  /** Real decryption (one wallet signature). Cached in memory until the handle changes. */
  const reveal = useCallback(async () => {
    // Ignore repeat clicks while a decryption is already running — otherwise
    // each one queues another wallet signature prompt.
    if (inFlight.current) return;
    setError(undefined);
    // A wallet is required before anything is revealed — never fabricate a 0.
    if (!employer || !walletClient || !TOKEN) {
      onError?.("Connect your wallet first");
      return;
    }
    if (clear !== undefined) {
      setRevealed(true);
      return;
    }
    if (!handle || handle === zeroHash) {
      setClear(0n); // genuinely holds nothing yet
      setRevealed(true);
      return;
    }
    inFlight.current = true;
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
      const friendly = /user rejected|denied/i.test(message) ? "Request cancelled in the wallet." : message;
      setError(friendly);
      onError?.(friendly);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [clear, handle, employer, walletClient, onError]);

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
