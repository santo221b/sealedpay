/**
 * Server-side env access. On Vercel, process.env is populated by the project's
 * environment variables. In local dev (the vite /api bridge), the repo-root
 * .env is loaded once — a minimal parser, no dotenv dependency.
 *
 * Secrets (PRIVY_APP_SECRET, UPSTASH_*) live ONLY here, server-side; nothing
 * in this directory is ever bundled into the browser.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let loaded = false;

/** Load repo-root .env into process.env (dev only; missing keys only). */
export function loadDevEnv(rootDir: string) {
  if (loaded) return;
  loaded = true;
  try {
    const file = resolve(rootDir, ".env");
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* dev convenience only — Vercel provides real env */
  }
}

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}
