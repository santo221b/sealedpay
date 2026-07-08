import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // VITE_* vars live in the repo-root .env, shared by the whole monorepo.
  envDir: "../../",
  optimizeDeps: {
    // The relayer SDK resolves its WASM + worker files relative to
    // import.meta.url; esbuild pre-bundling would relocate the JS away from
    // those assets and break the URLs. Keep it out of the dep optimizer.
    exclude: ["@zama-fhe/relayer-sdk"],
  },
  server: {
    port: 5173,
  },
});
