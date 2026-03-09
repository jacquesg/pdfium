import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 30000,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      api: {
        host: '127.0.0.1',
        port: 63315,
        strictPort: true,
      },
      viewport: {
        width: 1280,
        height: 900,
      },
      instances: [
        { browser: 'chromium' },
      ],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
