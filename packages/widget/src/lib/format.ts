import { formatUnits } from "viem";

/** Human amount with thousands separators, trimming pointless trailing zeros. */
export function formatAmount(value: bigint, decimals: number): string {
  const raw = formatUnits(value, decimals);
  const [whole, fraction] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = fraction?.replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export function formatEth(wei: bigint): string {
  return formatUnits(wei, 18);
}
