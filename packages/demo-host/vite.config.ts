import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Same reason as in the widget package: the relayer SDK's WASM/worker
    // files are resolved relative to import.meta.url.
    exclude: ["@zama-fhe/relayer-sdk"],
  },
  server: {
    port: 5174,
  },
});
