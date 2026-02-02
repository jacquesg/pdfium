import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for browser tests.
 *
 * Tests verify that the PDFium WASM library works correctly in real browser environments.
 */
export default defineConfig({
  testDir: './test/browser',
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
    // Kept for local testing but excluded from CI via --project flag.
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'pnpm run serve:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
