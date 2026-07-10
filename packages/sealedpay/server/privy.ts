/**
 * Privy server client — token verification (every route) and pregenerated
 * wallets (add-employee-by-email). All calls are timeout-bounded and fail with
 * service-named messages.
 */
import { PrivyClient, type User } from "@privy-io/server-auth";

import { env } from "./env.js";
import { ApiFail, withTimeout } from "./errors.js";

const PRIVY_TIMEOUT_MS = 12_000;
const PRIVY_DOWN = "Privy (the sign-in service) didn't respond. Try again in a moment.";

let client: PrivyClient | undefined;

export function privy(): PrivyClient {
  if (client) return client;
  const appId = env("VITE_PRIVY_APP_ID");
  const secret = env("PRIVY_APP_SECRET");
  if (!appId || !secret) {
    throw new ApiFail(503, "The server is missing its Privy configuration. Set VITE_PRIVY_APP_ID and PRIVY_APP_SECRET.");
  }
  client = new PrivyClient(appId, secret);
  return client;
}

/** Verify the Bearer token from the Authorization header → Privy userId. */
export async function requireUser(authorization: string | undefined): Promise<string> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiFail(401, "You're signed out. Sign in again to continue.");
  try {
    const claims = await withTimeout(privy().verifyAuthToken(token), PRIVY_TIMEOUT_MS, PRIVY_DOWN);
    return claims.userId;
  } catch (e) {
    if (e instanceof ApiFail) throw e;
    throw new ApiFail(401, "Your session expired. Sign in again to continue.");
  }
}

/** The embedded Ethereum wallet address for a Privy user (pregenerated or
 * created at login), preferring embedded over any linked external wallet. */
export function embeddedAddressOf(user: User): `0x${string}` | undefined {
  for (const acct of user.linkedAccounts ?? []) {
    const a = acct as { type?: string; walletClientType?: string; chainType?: string; address?: string };
    if (a.type === "wallet" && a.walletClientType === "privy" && a.chainType === "ethereum" && a.address) {
      return a.address as `0x${string}`;
    }
  }
  return user.wallet?.address as `0x${string}` | undefined;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return withTimeout(privy().getUserByEmail(email), PRIVY_TIMEOUT_MS, PRIVY_DOWN);
}

export async function getUserById(userId: string): Promise<User> {
  return withTimeout(privy().getUserById(userId), PRIVY_TIMEOUT_MS, PRIVY_DOWN);
}

/**
 * Email → wallet address, creating what's missing:
 *  - no Privy user yet → import the user with a pregenerated embedded wallet
 *  - user exists without an embedded wallet → create one for them
 *  - user exists with a wallet → return it
 * Idempotent per email; the address is stable across the employee's logins.
 */
export async function pregenerateWallet(email: string): Promise<{ address: `0x${string}`; existed: boolean }> {
  const existing = await getUserByEmail(email);
  if (existing) {
    const addr = embeddedAddressOf(existing);
    if (addr) return { address: addr, existed: true };
    const updated = await withTimeout(
      privy().createWallets({ userId: existing.id, createEthereumWallet: true }),
      PRIVY_TIMEOUT_MS,
      PRIVY_DOWN,
    );
    const created = embeddedAddressOf(updated);
    if (!created) throw new ApiFail(502, "Privy couldn't create a wallet for that email. Try again in a moment.");
    return { address: created, existed: true };
  }
  const user = await withTimeout(
    privy().importUser({
      linkedAccounts: [{ type: "email", address: email }] as never,
      createEthereumWallet: true,
    }),
    PRIVY_TIMEOUT_MS,
    PRIVY_DOWN,
  );
  const addr = embeddedAddressOf(user);
  if (!addr) throw new ApiFail(502, "Privy created the account but no wallet came back. Try again in a moment.");
  return { address: addr, existed: false };
}
