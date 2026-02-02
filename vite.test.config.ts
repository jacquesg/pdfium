import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vite configuration for the test server used by Playwright browser tests.
 */
export default defineConfig({
  root: 'test/browser',
  publicDir: resolve(__dirname, 'test/browser/public'),
  build: {
    outDir: resolve(__dirname, 'test-dist'),
    commonjsOptions: {
      include: [], // Don't transform vendor CJS
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['../src/vendor/pdfium.cjs'],
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify('3.0.0-alpha.1'),
    __WASM_HASH__: JSON.stringify('test'),
    __DEV__: JSON.stringify(true),
  },
  resolve: {
    alias: [
      // More specific paths first
      { find: '@scaryterry/pdfium/browser', replacement: resolve(__dirname, 'src/browser.ts') },
      { find: '@scaryterry/pdfium/node', replacement: resolve(__dirname, 'src/node.ts') },
      { find: '@scaryterry/pdfium/worker', replacement: resolve(__dirname, 'src/worker.ts') },
      { find: '@scaryterry/pdfium', replacement: resolve(__dirname, 'src/index.ts') },
    ],
  },
});
