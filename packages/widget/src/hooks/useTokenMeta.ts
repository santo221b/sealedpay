import { useReadContracts } from "wagmi";

import { erc7984Abi } from "../lib/contracts/abis";

/** Token display metadata — fetched once, cached forever (it can't change). */
export function useTokenMeta(token: `0x${string}` | undefined) {
  const { data, isError } = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: token, abi: erc7984Abi, functionName: "name" },
      { address: token, abi: erc7984Abi, functionName: "symbol" },
      { address: token, abi: erc7984Abi, functionName: "decimals" },
    ],
    query: { enabled: Boolean(token), staleTime: Infinity },
  });
  return {
    name: data?.[0],
    symbol: data?.[1] ?? "tokens",
    decimals: data?.[2] ?? 6,
    metaError: isError,
  };
}
