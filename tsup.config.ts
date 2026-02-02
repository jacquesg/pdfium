import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const wasmPath = 'src/vendor/pdfium.wasm';
const wasmExists = existsSync(wasmPath);
const wasmHash = wasmExists
  ? createHash('sha256').update(readFileSync(wasmPath)).digest('hex').slice(0, 8)
  : 'development';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
    node: 'src/node.ts',
    worker: 'src/worker.ts',
  },
  format: ['esm'],
  target: 'es2024',
  platform: 'neutral',
  dts: true,
  sourcemap: !options.watch,
  clean: true,
  splitting: true,
  treeshake: {
    preset: 'recommended',
  },
  minify: !options.watch && process.env.NODE_ENV === 'production',
  external: ['node:fs', 'node:fs/promises', 'node:path', 'node:url', 'node:crypto', 'module'],
  define: {
    __PACKAGE_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __WASM_HASH__: JSON.stringify(wasmHash),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  esbuildOptions(opts) {
    opts.legalComments = 'none';
    opts.charset = 'utf8';
  },
  async onSuccess() {
    if (wasmExists) {
      mkdirSync('dist/wasm/vendor', { recursive: true });
      copyFileSync(wasmPath, 'dist/wasm/vendor/pdfium.wasm');
      console.log('Copied WASM binary to dist/wasm/vendor/');
    }
  },
}));
