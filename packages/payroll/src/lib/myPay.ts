/**
 * useMyPay — the RECIPIENT side of a confidential payout.
 *
 * A recipient connects their OWN wallet and, with a single EIP-712 signature,
 * decrypts only what they received — no employer, no server involved. This
 * mirrors the engine's proven ReceiptWidget flow: scan the token's
 * ConfidentialTransfer events indexed to `me`, then userDecrypt the amount
 * handles (token ACL scope). Nobody else can perform this read.
 */
import { DEMO_TOKEN_ADDRESS, SEPOLIA_CHAIN_ID, erc7984Abi, getFhevmInstance, userDecryptHandles, useTokenMeta } from "@dispersekit/widget";
import { useCallback, useEffect, useState } from "react";
import { parseAbiItem, zeroHash } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

const TOKEN = DEMO_TOKEN_ADDRESS;
const FHE_NETWORK = "https://ethereum-sepolia-rpc.publicnode.com";
const TRANSFER_EVENT = parseAbiItem(
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
);

export interface MyPayment {
  txHash: `0x${string}`;
  from: `0x${string}`;
  handle: `0x${string}`;
  url: string;
  /** Set only after the recipient decrypts with their own signature. */
  amount?: bigint;
}

export type MyPayPhase = "idle" | "scanning" | "revealing" | "revealed";

export function useMyPay() {
  const { address: me, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { symbol, decimals } = useTokenMeta(TOKEN);

  const [payments, setPayments] = useState<MyPayment[]>();
  const [balanceHandle, setBalanceHandle] = useState<`0x${string}`>();
  const [balance, setBalance] = useState<bigint>();
  const [phase, setPhase] = useState<MyPayPhase>("idle");
  const [error, setError] = useState<string>();

  const onSepolia = chain?.id === SEPOLIA_CHAIN_ID;

  // A wallet-account switch must never keep showing the previous account's pay.
  useEffect(() => {
    setPayments(undefined);
    setBalanceHandle(undefined);
    setBalance(undefined);
    setPhase("idle");
    setError(undefined);
  }, [me]);

  const scan = useCallback(async () => {
    if (!publicClient || !me) return;
    setPhase("scanning");
    setError(undefined);
    try {
      const latest = await publicClient.getBlockNumber();
      const getLogs = (span: bigint) =>
        publicClient.getLogs({
          address: TOKEN,
          event: TRANSFER_EVENT,
          args: { to: me },
          fromBlock: latest > span ? latest - span : 0n,
          toBlock: latest,
        });
      // Public RPCs cap getLogs ranges inconsistently; fall back to a narrow scan.
      const logs = await getLogs(100_000n).catch(() => getLogs(9_000n));
      const incoming: MyPayment[] = logs
        .map((log) => ({
          txHash: log.transactionHash,
          from: log.args.from as `0x${string}`,
          handle: log.args.amount as `0x${string}`,
          url: `https://sepolia.etherscan.io/tx/${log.transactionHash}`,
        }))
        .reverse();
      setPayments(incoming);

      const handle = (await publicClient.readContract({
        address: TOKEN,
        abi: erc7984Abi,
        functionName: "confidentialBalanceOf",
        args: [me],
      })) as `0x${string}`;
      setBalanceHandle(handle === zeroHash ? undefined : handle);
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }, [publicClient, me]);

  const reveal = useCallback(async () => {
    if (!walletClient || !me || !payments) return;
    setPhase("revealing");
    setError(undefined);
    try {
      const instance = await getFhevmInstance(FHE_NETWORK);
      // Every handle came from the token contract → one ACL scope, one signature.
      const requests = [
        ...payments.map((p) => ({ handle: p.handle, contractAddress: TOKEN })),
        ...(balanceHandle ? [{ handle: balanceHandle, contractAddress: TOKEN }] : []),
      ];
      if (requests.length === 0) {
        setBalance(0n);
        setPhase("revealed");
        return;
      }
      const results = await userDecryptHandles({
        instance,
        requests,
        userAddress: me,
        signTypedData: (args) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          walletClient.signTypedData({ ...args, account: me } as any),
      });
      setPayments((ps) => ps?.map((p) => ({ ...p, amount: results[p.handle] })));
      setBalance(balanceHandle ? results[balanceHandle] : 0n);
      setPhase("revealed");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(/user rejected|denied/i.test(message) ? "Request cancelled in the wallet." : message);
      setPhase("idle");
    }
  }, [walletClient, me, payments, balanceHandle]);

  return {
    me,
    symbol,
    decimals,
    connected: isConnected,
    onSepolia,
    ready: isConnected && onSepolia,
    payments,
    balance,
    phase,
    error,
    scan,
    reveal,
  };
}
