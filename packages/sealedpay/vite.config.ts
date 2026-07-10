import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { sealedpayApi } from "./server/vite-api";

export default defineConfig({
  // The api bridge serves the SAME Vercel functions at /api in dev.
  plugins: [react(), tailwindcss(), sealedpayApi("../../")],
  // VITE_* vars live in the repo-root .env, shared by the whole monorepo.
  envDir: "../../",
  optimizeDeps: {
    // The relayer SDK's WASM/worker files resolve relative to import.meta.url;
    // dep pre-bundling would break those paths (same as the other apps).
    exclude: ["@zama-fhe/relayer-sdk"],
    // Privy lazy-loads its email-code and wallet screens as separate chunks.
    // Force the optimizer to pre-bundle the whole package up front (esbuild
    // follows the dynamic imports of an included dep), so the first navigation
    // to those screens doesn't trigger a mid-session re-optimize that 504s the
    // in-flight chunk ("Outdated Optimize Dep") and renders a blank modal.
    include: ["@privy-io/react-auth", "@privy-io/wagmi"],
  },
  server: {
    port: 5175,
  },
});
