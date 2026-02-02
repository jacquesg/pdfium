import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration for benchmark tests.
 *
 * Run with: pnpm test:bench
 */
export default defineConfig({
  test: {
    include: ['test/benchmark/**/*.bench.ts'],
    benchmark: {
      reporters: ['default'],
      outputFile: './benchmark-results.json',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
