import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/browser/**', 'test/index.test.ts', 'node_modules/**'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/core/**/*.ts', 'src/wasm/**/*.ts', 'src/document/**/*.ts', 'src/pdfium.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/core/types.ts'],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 90,
        statements: 85,
      },
    },
  },
  define: {
    __PACKAGE_VERSION__: JSON.stringify('3.0.0-alpha.1'),
    __WASM_HASH__: JSON.stringify('test'),
    __DEV__: JSON.stringify(true),
  },
});
