/**
 * Vite dev bridge: serves the SAME api/ handlers at /api during `npm run dev`,
 * so local development needs no `vercel dev`. Modules load through vite's SSR
 * pipeline (TS + HMR for server code), and the repo-root .env fills
 * process.env for the Privy/Upstash secrets.
 */
import type { Plugin, ViteDevServer } from "vite";

import { loadDevEnv } from "./env";

const ROUTES = ["roster", "runs", "profile", "pregen", "me"] as const;

export function sealedpayApi(rootEnvDir: string): Plugin {
  return {
    name: "sealedpay-api-dev",
    configureServer(server: ViteDevServer) {
      loadDevEnv(rootEnvDir);
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        // Claim the whole /api/ namespace: a known route runs; anything else
        // under /api/ is a JSON 404, never the SPA's index.html (which would
        // mask a typo'd endpoint as a silent 200).
        if (!url.startsWith("/api/")) return next();
        const match = url.match(/^\/api\/([a-z]+)$/);
        const route = match?.[1] as (typeof ROUTES)[number] | undefined;
        if (!route || !ROUTES.includes(route)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "No such endpoint." }));
          return;
        }
        try {
          const mod = (await server.ssrLoadModule(`/api/${route}.ts`)) as {
            default: (rq: unknown, rs: unknown) => Promise<void>;
          };
          await mod.default(req, res);
        } catch (e) {
          console.error("[sealedpay api dev]", e);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "The SealedPay dev server hit a problem. Check the terminal." }));
        }
      });
    },
  };
}
