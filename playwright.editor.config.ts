import { defineConfig, devices } from '@playwright/test';

const DEFAULT_EDITOR_E2E_PORT = 5199;
const parsedEditorE2EPort = Number.parseInt(process.env.EDITOR_E2E_PORT ?? '', 10);
const editorE2EPort =
  Number.isFinite(parsedEditorE2EPort) && parsedEditorE2EPort > 0 ? parsedEditorE2EPort : DEFAULT_EDITOR_E2E_PORT;
const editorE2EBaseUrl = process.env.EDITOR_E2E_BASE_URL ?? `http://127.0.0.1:${String(editorE2EPort)}`;
const includeFirefoxProject = process.env.EDITOR_E2E_INCLUDE_FIREFOX === '1';
const includeWebkitProject = process.env.EDITOR_E2E_INCLUDE_WEBKIT === '1';

/**
 * Playwright configuration for editor end-to-end tests.
 *
 * Uses the Vite demo app because editor workflows are exercised there.
 */
export default defineConfig({
  testDir: './test/browser',
  testMatch: 'editor.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI !== undefined ? 2 : 0,
  workers: process.env.CI !== undefined ? 1 : undefined,
  reporter: process.env.CI !== undefined ? 'github' : 'list',

  use: {
    baseURL: editorE2EBaseUrl,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(includeFirefoxProject
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
        ]
      : []),
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
    command: `env -u NO_COLOR -u FORCE_COLOR node --import tsx demo/scripts/ensure-lib-build.ts && env -u NO_COLOR -u FORCE_COLOR node --import tsx demo/scripts/setup.ts && env -u NO_COLOR -u FORCE_COLOR pnpm --dir demo/vite dev --host 127.0.0.1 --port ${String(editorE2EPort)} --strictPort`,
    url: editorE2EBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
