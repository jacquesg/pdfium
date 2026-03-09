import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageVersion = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version as string;
const browserTestHost = process.env.PLAYWRIGHT_TEST_HOST ?? '127.0.0.1';
const browserTestPort = Number.parseInt(process.env.PLAYWRIGHT_TEST_PORT ?? '3000', 10);

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
    host: browserTestHost,
    port: browserTestPort,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['../src/vendor/pdfium.cjs'],
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify(packageVersion),
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
