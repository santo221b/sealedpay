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
import { dirname, resolve } from "node:path";

import { env } from "./env";
import { ApiFail, withTimeout } from "./errors";

const STORE_TIMEOUT_MS = 8_000;
const STORE_DOWN = "The SealedPay database didn't respond. Try again in a moment.";

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

class UpstashStore implements Store {
  private redis: Redis;
  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }
  async get<T>(key: string): Promise<T | null> {
    try {
      return await withTimeout(this.redis.get<T>(key), STORE_TIMEOUT_MS, STORE_DOWN);
    } catch (e) {
      if (e instanceof ApiFail) throw e;
      throw new ApiFail(502, STORE_DOWN);
    }
  }
  async set(key: string, value: unknown): Promise<void> {
    try {
      await withTimeout(this.redis.set(key, value), STORE_TIMEOUT_MS, STORE_DOWN);
    } catch (e) {
      if (e instanceof ApiFail) throw e;
      throw new ApiFail(502, STORE_DOWN);
    }
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
    store = new FileStore(resolve(process.cwd(), ".data/sealedpay-store.json"));
  }
  return store;
}

/* ── Keys ────────────────────────────────────────────────────────────────── */

export const keys = {
  roster: (userId: string) => `sp:roster:${userId}`,
  runs: (userId: string) => `sp:runs:${userId}`,
  profile: (userId: string) => `sp:profile:${userId}`,
  empIndex: (email: string) => `sp:empidx:${email.toLowerCase()}`,
};
