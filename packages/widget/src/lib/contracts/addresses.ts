/**
 * Known deployments.
 *
 * The disperse contract is TokenOps' audited singleton — already live and
 * verified on both networks (source vendored in packages/contracts/contracts/
 * tokenops/, provenance in its README). The widget talks to the official
 * instance; nothing DisperseKit-specific is deployed besides the demo token.
 */
export const DISPERSE_SINGLETON: Record<number, `0x${string}`> = {
  11155111: "0x710dD9885Cc9986EfD234E7719483147a6d8DBb4", // Sepolia
  1: "0x4fC0d28cBe4B82D512Ad0B42F6787480Cc98cC70", // Ethereum mainnet
};

export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Demo ERC-7984 token (open faucet) on Sepolia. Falls back to the already
 * deployed instance so a build with no VITE_CTOKEN_ADDRESS (e.g. a fresh clone
 * or a preview deploy without env set) still works out of the box; override via
 * env to point at a self-deployed token.
 */
const DEMO_TOKEN_FALLBACK = "0xCE27C522e403FA3d14dC245c0509c2f61AeD17E1" as const;
export const DEMO_TOKEN_ADDRESS = ((import.meta.env?.VITE_CTOKEN_ADDRESS as string | undefined) ||
  DEMO_TOKEN_FALLBACK) as `0x${string}`;

/** Env override for the disperse contract (e.g. a self-deployed instance). */
export const DISPERSE_ADDRESS_OVERRIDE = (import.meta.env?.VITE_DISPERSE_ADDRESS || undefined) as
  | `0x${string}`
  | undefined;

export function disperseAddressFor(chainId: number): `0x${string}` {
  const address = DISPERSE_ADDRESS_OVERRIDE ?? DISPERSE_SINGLETON[chainId];
  if (!address) throw new Error(`No DisperseConfidential deployment known for chain ${chainId}`);
  return address;
}
