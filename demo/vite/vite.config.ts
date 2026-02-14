import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['module', 'path', 'url', 'fs', 'fs/promises', 'node:worker_threads', 'worker_threads'],
    },
  },
  optimizeDeps: {
    // Exclude the local library from dep pre-bundling so Vite always
    // picks up fresh builds via the link:../.. symlink.
    exclude: ['@scaryterry/pdfium'],
  },
  server: {
    // Allow serving files from the parent library root (symlink target).
    fs: { allow: ['../..'] },
    watch: {
      // Watch the library's dist for rebuilds (pnpm link: symlink).
      ignored: ['!**/node_modules/@scaryterry/pdfium/dist/**'],
    },
  },
  plugins: [tailwindcss(), react()],
});
