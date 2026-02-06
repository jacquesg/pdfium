import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageVersion = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version as string;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/visual/**/*.test.ts'],
    exclude: ['node_modules/**'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 30000,
    pool: 'forks', // Isolated processes for visual tests
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify(packageVersion),
    __WASM_HASH__: JSON.stringify('test'),
    __DEV__: JSON.stringify(true),
  },
});
