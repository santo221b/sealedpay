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

/** Demo ERC-7984 token (open faucet), set after `npm run deploy:sepolia`. */
export const DEMO_TOKEN_ADDRESS = (import.meta.env?.VITE_CTOKEN_ADDRESS || undefined) as
  | `0x${string}`
  | undefined;

/** Env override for the disperse contract (e.g. a self-deployed instance). */
export const DISPERSE_ADDRESS_OVERRIDE = (import.meta.env?.VITE_DISPERSE_ADDRESS || undefined) as
  | `0x${string}`
  | undefined;

export function disperseAddressFor(chainId: number): `0x${string}` {
  const address = DISPERSE_ADDRESS_OVERRIDE ?? DISPERSE_SINGLETON[chainId];
  if (!address) throw new Error(`No DisperseConfidential deployment known for chain ${chainId}`);
  return address;
}
