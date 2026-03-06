import { defineConfig, devices } from '@playwright/test';

const includeWebkitProject = process.env.PLAYWRIGHT_INCLUDE_WEBKIT === '1';

/**
 * Playwright configuration for browser tests.
 *
 * Tests verify that the PDFium WASM library works correctly in real browser environments.
 */
export default defineConfig({
  testDir: './test/browser',
  testIgnore: 'editor.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI !== undefined ? 2 : 0,
  workers: process.env.CI !== undefined ? 1 : undefined,
  reporter: process.env.CI !== undefined ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // WebKit has known issues with PDFium WASM initialization.
    // Keep it opt-in so the default browser suite remains stable.
    ...(includeWebkitProject
      ? [
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],

  webServer: {
    command: 'pnpm run serve:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
