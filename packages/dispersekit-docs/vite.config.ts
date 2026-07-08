import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // VITE_* vars live in the repo-root .env, shared by the whole monorepo.
  envDir: "../../",
  optimizeDeps: {
    // Same reason as in the widget package: the relayer SDK's WASM/worker
    // files are resolved relative to import.meta.url.
    exclude: ["@zama-fhe/relayer-sdk"],
  },
  server: {
    port: 5174,
  },
});
