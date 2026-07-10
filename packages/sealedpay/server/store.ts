/**
 * The SealedPay datastore. Upstash Redis (REST) in real deployments; an
 * in-memory + JSON-file fallback for local dev without credentials, behind the
 * SAME interface, so Postgres can replace either later without touching
 * handlers.
 *
 * Key schema (all values JSON):
 *   sp:roster:{userId}   → RosterEmployee[]        (employer's team)
 *   sp:runs:{userId}     → RunRecord[]             (employer's payroll runs)
 *   sp:profile:{userId}  → Profile                 (either side's display data)
 *   sp:empidx:{email}    → string[] employer ids   (reverse index for /me)
 */
import { Redis } from "@upstash/redis";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { env } from "./env.js";
import { ApiFail, withTimeout } from "./errors.js";

const STORE_TIMEOUT_MS = 8_000;
const STORE_DOWN = "The SealedPay database didn't respond. Try again in a moment.";

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  /** Atomic set-membership (the email→employers reverse index) — no lost
   * updates under concurrent writers, unlike a get/modify/set on a JSON array. */
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  /** Atomic counter with TTL — the rate-limit primitive. Returns the new count. */
  incrWithTtl(key: string, ttlSeconds: number): Promise<number>;
}

class UpstashStore implements Store {
  private redis: Redis;
  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }
  private async guard<T>(p: Promise<T>): Promise<T> {
    try {
      return await withTimeout(p, STORE_TIMEOUT_MS, STORE_DOWN);
    } catch (e) {
      if (e instanceof ApiFail) throw e;
      throw new ApiFail(502, STORE_DOWN);
    }
  }
  get<T>(key: string): Promise<T | null> {
    return this.guard(this.redis.get<T>(key));
  }
  async set(key: string, value: unknown): Promise<void> {
    await this.guard(this.redis.set(key, value));
  }
  async sadd(key: string, member: string): Promise<void> {
    await this.guard(this.redis.sadd(key, member));
  }
  async srem(key: string, member: string): Promise<void> {
    await this.guard(this.redis.srem(key, member));
  }
  smembers(key: string): Promise<string[]> {
    return this.guard(this.redis.smembers(key));
  }
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const n = await this.guard(this.redis.incr(key));
    if (n === 1) await this.guard(this.redis.expire(key, ttlSeconds));
    return n;
  }
}

/** Dev fallback: in-memory, persisted best-effort to .data/store.json so a
 * vite restart keeps state. NEVER used when Upstash env vars exist. */
class FileStore implements Store {
  private file: string;
  private data: Record<string, unknown>;
  constructor(file: string) {
    this.file = file;
    try {
      this.data = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : {};
    } catch {
      this.data = {};
    }
  }
  private flush() {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(this.file, JSON.stringify(this.data));
    } catch {
      /* memory-only if the disk write fails */
    }
  }
  async get<T>(key: string): Promise<T | null> {
    return (this.data[key] as T | undefined) ?? null;
  }
  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
    this.flush();
  }
  async sadd(key: string, member: string): Promise<void> {
    const arr = Array.isArray(this.data[key]) ? (this.data[key] as string[]) : [];
    if (!arr.includes(member)) {
      this.data[key] = [...arr, member];
      this.flush();
    }
  }
  async srem(key: string, member: string): Promise<void> {
    const arr = Array.isArray(this.data[key]) ? (this.data[key] as string[]) : [];
    this.data[key] = arr.filter((m) => m !== member);
    this.flush();
  }
  async smembers(key: string): Promise<string[]> {
    return Array.isArray(this.data[key]) ? (this.data[key] as string[]) : [];
  }
  async incrWithTtl(key: string): Promise<number> {
    // Dev: no TTL bookkeeping needed; counts reset on restart.
    const n = ((this.data[key] as number | undefined) ?? 0) + 1;
    this.data[key] = n;
    this.flush();
    return n;
  }
}

let store: Store | undefined;

export function getStore(): Store {
  if (store) return store;
  const url = env("UPSTASH_REDIS_REST_URL");
  const token = env("UPSTASH_REDIS_REST_TOKEN");
  if (url && token) {
    store = new UpstashStore(url, token);
  } else {
    // Local dev only. On Vercel the env vars must exist — fail loudly there.
    if (env("VERCEL")) {
      throw new ApiFail(503, "The server is missing its database configuration. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
    // Keep the dev store OUTSIDE the vite-served project root (never web-reachable)
    // and stable across HMR module reloads via a globalThis singleton.
    const g = globalThis as typeof globalThis & { __spDevStore?: Store };
    store = g.__spDevStore ?? (g.__spDevStore = new FileStore(resolve(tmpdir(), "sealedpay-dev-store.json")));
  }
  return store;
}

/* ── Keys ────────────────────────────────────────────────────────────────── */

export const keys = {
  roster: (userId: string) => `sp:roster:${userId}`,
  runs: (userId: string) => `sp:runs:${userId}`,
  profile: (userId: string) => `sp:profile:${userId}`,
  /** A Redis SET of employer userIds (atomic membership; see Store.sadd). */
  empIndex: (email: string) => `sp:empidx2:${email.toLowerCase()}`,
  /** Per-user pregen rate-limit counter (fixed window). */
  pregenRate: (userId: string) => `sp:pregenrate:${userId}`,
};
