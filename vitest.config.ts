import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageVersion = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version as string;

/**
 * Vitest configuration with workspace projects.
 *
 * Projects:
 * - unit: Fast, isolated unit tests (core, wasm, context)
 * - integration: Tests requiring WASM module
 * - visual: Visual regression tests
 *
 * Run with: pnpm test
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          exclude: ['test/unit/react/**'],
          setupFiles: ['test/setup.ts'],
        },
        define: {
          __PACKAGE_VERSION__: JSON.stringify(packageVersion),
          __WASM_HASH__: JSON.stringify('test'),
          __DEV__: JSON.stringify(true),
        },
      },
      {
        test: {
          name: 'react',
          include: ['test/unit/react/**/*.test.{ts,tsx}'],
          environment: 'happy-dom',
          setupFiles: ['test/setup.ts', 'test/react-setup.ts'],
        },
        define: {
          __PACKAGE_VERSION__: JSON.stringify(packageVersion),
          __WASM_HASH__: JSON.stringify('test'),
          __DEV__: JSON.stringify(true),
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.ts', 'test/integration/react/**/*.test.{ts,tsx}'],
          setupFiles: ['test/setup.ts'],
          testTimeout: 15000,
        },
        define: {
          __PACKAGE_VERSION__: JSON.stringify(packageVersion),
          __WASM_HASH__: JSON.stringify('test'),
          __DEV__: JSON.stringify(true),
        },
      },
      {
        test: {
          name: 'visual',
          environment: 'node',
          include: ['test/visual/**/*.test.ts'],
          setupFiles: ['test/setup.ts'],
          testTimeout: 30000,
          pool: 'forks',
        },
        define: {
          __PACKAGE_VERSION__: JSON.stringify(packageVersion),
          __WASM_HASH__: JSON.stringify('test'),
          __DEV__: JSON.stringify(true),
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/core/**/*.ts',
        'src/wasm/**/*.ts',
        'src/document/**/*.ts',
        'src/context/**/*.ts',
        'src/pdfium.ts',
        'src/react/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/core/types.ts',
        'src/wasm/bindings/**/*.ts', // Pure interfaces, no executable code
        'src/context/protocol.ts', // Pure type definitions
        'src/core/interfaces.ts', // Pure interfaces, no executable code
        'src/document/native-*.ts', // Requires native binding (tested in native CI jobs)
      ],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
});
