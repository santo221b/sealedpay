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
  },
  server: {
    port: 5175,
  },
});
