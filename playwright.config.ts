import { defineConfig, devices } from '@playwright/test';

const includeWebkitProject = process.env.PLAYWRIGHT_INCLUDE_WEBKIT === '1';
const browserTestHost = process.env.PLAYWRIGHT_TEST_HOST ?? '127.0.0.1';
const browserTestPort = Number.parseInt(process.env.PLAYWRIGHT_TEST_PORT ?? '3000', 10);
const browserTestBaseUrl = `http://${browserTestHost}:${String(browserTestPort)}`;

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
    baseURL: browserTestBaseUrl,
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
    // Keep WebKit opt-in for local targeted reruns; CI enables it via
    // `pnpm test:browser:cross-browser`.
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
    command: 'env -u NO_COLOR pnpm run serve:test',
    url: browserTestBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
