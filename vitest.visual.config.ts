import { defineConfig } from 'vitest/config';

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
    __PACKAGE_VERSION__: JSON.stringify('3.0.0-alpha.1'),
    __WASM_HASH__: JSON.stringify('test'),
    __DEV__: JSON.stringify(true),
  },
});
