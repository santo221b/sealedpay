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
        const match = url.match(/^\/api\/([a-z]+)$/);
        const route = match?.[1] as (typeof ROUTES)[number] | undefined;
        if (!route || !ROUTES.includes(route)) return next();
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
