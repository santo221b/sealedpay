import { useReadContracts } from "wagmi";

import { erc7984Abi } from "../lib/contracts/abis";

/**
 * Token display metadata — fetched once, cached forever (it can't change).
 *
 * `decimals` is deliberately undefined until the read completes: a silent
 * fallback here would let amounts be parsed — and then ENCRYPTED — at the
 * wrong scale for any non-6-decimals token. Callers gate on it.
 */
export function useTokenMeta(token: `0x${string}` | undefined) {
  const { data, isError, refetch } = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: token, abi: erc7984Abi, functionName: "name" },
      { address: token, abi: erc7984Abi, functionName: "symbol" },
      { address: token, abi: erc7984Abi, functionName: "decimals" },
    ],
    query: { enabled: Boolean(token), staleTime: Infinity },
  });
  return {
    name: data?.[0] as string | undefined,
    symbol: data?.[1] as string | undefined,
    decimals: data?.[2] as number | undefined,
    metaError: isError,
    /** RPC hiccups happen — skins surface a retry instead of skeleton-forever. */
    refetchMeta: refetch,
  };
}
