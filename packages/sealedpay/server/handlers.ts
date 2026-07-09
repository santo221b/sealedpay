/**
 * Route handlers — pure(ish) functions over (userId, method, body), shared
 * verbatim by the Vercel functions in api/ and the vite dev bridge. Every
 * failure is an ApiFail with a human-readable, service-named message.
 *
 * Privacy note (deliberate product decision): the roster — including salary
 * figures — lives in SealedPay's own database like any payroll SaaS. The
 * differentiated privacy claim is ON-CHAIN: amounts on the public ledger are
 * FHE ciphertexts only the employer and each recipient can decrypt.
 */
import { ApiFail } from "./errors";
import { embeddedAddressOf, getUserById, pregenerateWallet, requireUser } from "./privy";
import { getStore, keys } from "./store";

/* ── Shapes (kept in sync with src/lib/api.ts by hand) ───────────────────── */

export interface RosterEmployee {
  id: string;
  name: string;
  role?: string;
  dept?: string;
  email?: string;
  address: `0x${string}`;
  salary: string;
  sample?: boolean;
}

export interface RunRecord {
  id: string;
  txHash: `0x${string}`;
  dateISO: string;
  employeeCount: number;
  totalText: string;
  verified?: boolean;
  entries: { name: string; address: `0x${string}`; requested: `0x${string}`; transferred: `0x${string}` }[];
}

export interface Profile {
  name: string;
  avatar: string;
  /** The employer's last-connected payroll wallet (labels the employee's payments). */
  walletAddress?: `0x${string}`;
  notifyPayments?: boolean;
  notifyVerifications?: boolean;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

const ok = (body: unknown): HandlerResult => ({ status: 200, body });

/* ── Validation (defensive: the client is ours, but the API is public) ───── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const MAX_ROSTER = 200;
const MAX_RUNS = 500;
const str = (v: unknown, max = 200): v is string => typeof v === "string" && v.length <= max;

function validateRoster(v: unknown): RosterEmployee[] {
  if (!Array.isArray(v)) throw new ApiFail(400, "That roster update looks malformed. Reload and try again.");
  if (v.length > MAX_ROSTER) throw new ApiFail(400, `A roster is capped at ${MAX_ROSTER} employees for now.`);
  return v.map((e) => {
    const r = e as Record<string, unknown>;
    if (!str(r.id, 64) || !str(r.name, 120) || !str(r.salary, 40) || !str(r.address, 42) || !ADDR_RE.test(r.address as string)) {
      throw new ApiFail(400, "An employee row in that update looks malformed. Reload and try again.");
    }
    if (r.email !== undefined && (!str(r.email, 254) || !EMAIL_RE.test(r.email as string))) {
      throw new ApiFail(400, `"${String(r.email).slice(0, 40)}" doesn't look like a valid email address.`);
    }
    return {
      id: r.id as string,
      name: r.name as string,
      role: str(r.role, 120) ? (r.role as string) : undefined,
      dept: str(r.dept, 120) ? (r.dept as string) : undefined,
      email: r.email ? (r.email as string).toLowerCase() : undefined,
      address: r.address as `0x${string}`,
      salary: r.salary as string,
      sample: r.sample === true ? true : undefined,
    };
  });
}

function validateRuns(v: unknown): RunRecord[] {
  if (!Array.isArray(v)) throw new ApiFail(400, "That history update looks malformed. Reload and try again.");
  if (v.length > MAX_RUNS) throw new ApiFail(400, "Run history is capped at 500 entries for now.");
  return v.map((e) => {
    const r = e as Record<string, unknown>;
    if (!str(r.id, 80) || !str(r.txHash, 66) || !HASH_RE.test(r.txHash as string) || !str(r.dateISO, 40) || !str(r.totalText, 60)) {
      throw new ApiFail(400, "A run record in that update looks malformed. Reload and try again.");
    }
    const entries = Array.isArray(r.entries) ? (r.entries as Record<string, unknown>[]) : [];
    return {
      id: r.id as string,
      txHash: r.txHash as `0x${string}`,
      dateISO: r.dateISO as string,
      employeeCount: typeof r.employeeCount === "number" ? r.employeeCount : entries.length,
      totalText: r.totalText as string,
      verified: typeof r.verified === "boolean" ? r.verified : undefined,
      entries: entries.map((en) => ({
        name: str(en.name, 120) ? (en.name as string) : "",
        address: (str(en.address, 42) && ADDR_RE.test(en.address as string) ? en.address : "0x0000000000000000000000000000000000000000") as `0x${string}`,
        requested: (en.requested ?? "0x") as `0x${string}`,
        transferred: (en.transferred ?? "0x") as `0x${string}`,
      })),
    };
  });
}

/* ── Handlers ────────────────────────────────────────────────────────────── */

export async function handleRoster(authorization: string | undefined, method: string, body: unknown): Promise<HandlerResult> {
  const userId = await requireUser(authorization);
  const store = getStore();
  if (method === "GET") {
    const employees = await store.get<RosterEmployee[]>(keys.roster(userId));
    return ok({ employees });
  }
  if (method === "PUT") {
    const employees = validateRoster((body as { employees?: unknown })?.employees);
    // Maintain the email → employers reverse index (drives the employee's /me).
    const prev = (await store.get<RosterEmployee[]>(keys.roster(userId))) ?? [];
    const prevEmails = new Set(prev.filter((e) => e.email && !e.sample).map((e) => e.email as string));
    const nextEmails = new Set(employees.filter((e) => e.email && !e.sample).map((e) => e.email as string));
    await store.set(keys.roster(userId), employees);
    const touched = [...new Set([...prevEmails, ...nextEmails])];
    for (const email of touched) {
      const had = prevEmails.has(email);
      const has = nextEmails.has(email);
      if (had === has) continue;
      const idx = (await store.get<string[]>(keys.empIndex(email))) ?? [];
      const next = has ? [...new Set([...idx, userId])] : idx.filter((id) => id !== userId);
      await store.set(keys.empIndex(email), next);
    }
    return ok({ ok: true });
  }
  throw new ApiFail(405, "That method isn't supported here.");
}

export async function handleRuns(authorization: string | undefined, method: string, body: unknown): Promise<HandlerResult> {
  const userId = await requireUser(authorization);
  const store = getStore();
  if (method === "GET") {
    const runs = await store.get<RunRecord[]>(keys.runs(userId));
    return ok({ runs });
  }
  if (method === "PUT") {
    const runs = validateRuns((body as { runs?: unknown })?.runs);
    await store.set(keys.runs(userId), runs);
    return ok({ ok: true });
  }
  throw new ApiFail(405, "That method isn't supported here.");
}

export async function handleProfile(authorization: string | undefined, method: string, body: unknown): Promise<HandlerResult> {
  const userId = await requireUser(authorization);
  const store = getStore();
  if (method === "GET") {
    const profile = await store.get<Profile>(keys.profile(userId));
    return ok({ profile });
  }
  if (method === "PUT") {
    const p = (body as { profile?: Record<string, unknown> })?.profile;
    if (!p || !str(p.name, 120) || !str(p.avatar, 300)) {
      throw new ApiFail(400, "That profile update looks malformed. Reload and try again.");
    }
    const profile: Profile = {
      name: p.name as string,
      avatar: p.avatar as string,
      walletAddress: str(p.walletAddress, 42) && ADDR_RE.test(p.walletAddress as string) ? (p.walletAddress as `0x${string}`) : undefined,
      notifyPayments: typeof p.notifyPayments === "boolean" ? p.notifyPayments : undefined,
      notifyVerifications: typeof p.notifyVerifications === "boolean" ? p.notifyVerifications : undefined,
    };
    await store.set(keys.profile(userId), profile);
    return ok({ ok: true });
  }
  throw new ApiFail(405, "That method isn't supported here.");
}

export async function handlePregen(authorization: string | undefined, method: string, body: unknown): Promise<HandlerResult> {
  await requireUser(authorization); // any signed-in user may resolve an email to a wallet
  if (method !== "POST") throw new ApiFail(405, "That method isn't supported here.");
  const raw = (body as { email?: unknown })?.email;
  if (!str(raw, 254) || !EMAIL_RE.test(raw as string)) {
    throw new ApiFail(400, `"${String(raw ?? "").slice(0, 40)}" doesn't look like a valid email address.`);
  }
  const email = (raw as string).toLowerCase();
  const { address, existed } = await pregenerateWallet(email);
  return ok({ address, existed });
}

export async function handleMe(authorization: string | undefined, method: string): Promise<HandlerResult> {
  const userId = await requireUser(authorization);
  if (method !== "GET") throw new ApiFail(405, "That method isn't supported here.");
  const store = getStore();
  const user = await getUserById(userId);
  const email = user.email?.address?.toLowerCase();
  const address = embeddedAddressOf(user);
  if (!email) return ok({ email: undefined, address, employments: [] });

  const employerIds = (await store.get<string[]>(keys.empIndex(email))) ?? [];
  const employments = [];
  for (const employerId of employerIds.slice(0, 20)) {
    const roster = (await store.get<RosterEmployee[]>(keys.roster(employerId))) ?? [];
    const me = roster.find((e) => e.email === email && !e.sample);
    if (!me) continue; // index is eventually consistent — skip stale entries
    const employerProfile = await store.get<Profile>(keys.profile(employerId));
    employments.push({
      employerId,
      employerName: employerProfile?.name ?? "Your employer",
      employerAddress: employerProfile?.walletAddress,
      me: { name: me.name, role: me.role, dept: me.dept, salary: me.salary, address: me.address },
    });
  }
  return ok({ email, address, employments });
}
