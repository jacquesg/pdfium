import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["@scaryterry/pdfium"],
  },
  build: {
    rollupOptions: {
      external: ["module", "path", "url", "fs", "fs/promises", "node:worker_threads", "worker_threads"],
    },
  },
  plugins: [react()],
});
