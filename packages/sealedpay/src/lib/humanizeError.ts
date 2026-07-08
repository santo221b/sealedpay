/**
 * humanizeError — turn a raw viem/wallet/RPC error into one calm sentence.
 *
 * The engine surfaces full provider dumps (revert reason + Contract Call +
 * Request Arguments + Docs + Version). Those are great for a console and awful
 * in a modal, so the payroll UI runs every displayed error through this first.
 */
export function humanizeError(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();

  if (/nonce too low|nonce has already been used|next nonce/.test(s)) {
    return "Your wallet's transaction count is out of sync. In MetaMask, clear the account's activity (Settings, Advanced) and try again.";
  }
  if (/user rejected|user denied|rejected the request|action_rejected/.test(s)) {
    return "Request cancelled in your wallet.";
  }
  if (/insufficient funds|insufficient balance for gas/.test(s)) {
    return "Not enough Sepolia ETH to cover gas. Top up the wallet and try again.";
  }
  if (/replacement transaction underpriced|already known|transaction underpriced/.test(s)) {
    return "A similar transaction is already pending. Wait for it to confirm, then retry.";
  }
  if (/wrong network|chain mismatch|does not match the target chain|chain id/.test(s)) {
    return "Wrong network. Switch your wallet to Sepolia and try again.";
  }
  if (/batch too large|too many recipients|batch.*(size|limit)|exceeds.*batch/.test(s)) {
    return "This batch has too many recipients for a single transaction. Split the list and run them separately.";
  }
  // Zama's FHE relayer (encryption key / CRS fetch + every user-decryption).
  // Name it so an outage there never reads as an app or wallet fault.
  if (/relayer|bad json|fhevm|zama|public key|\bcrs\b|kms|encryption failed|decryption failed/.test(s)) {
    return "Zama's FHE relayer didn't respond correctly. Give it a moment and try again.";
  }
  // The Sepolia RPC node (all reads/writes go through it).
  if (/http request failed|failed to fetch|fetch failed|json-rpc|rpc error|networkerror|network request failed|load failed/.test(s)) {
    return "The Sepolia RPC node didn't respond. Give it a moment and try again.";
  }
  if (/timeout|timed out|took too long/.test(s)) {
    return "The network took too long to respond. Check the connection and try again.";
  }

  // Unknown error: keep the human part (revert reason / first clause) and drop
  // the provider stack dump that follows it.
  const reason = raw.match(/reverted with the following reason:\s*(.+?)(?:\s*Contract Call:|\s*Request Arguments:|$)/i);
  const head = (reason?.[1] ?? raw.split(/\s*(?:Contract Call:|Request Arguments:|Docs:|Version:)/)[0]).trim();
  return head.length > 160 ? `${head.slice(0, 157).trimEnd()}…` : head;
}
