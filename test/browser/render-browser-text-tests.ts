import { expect, test } from '@playwright/test';
import { readHarnessPageText, withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

export function registerRenderBrowserTextTests(): void {
  test.beforeEach(async ({ page }) => {
    await expectHarnessReady(page);
  });

  test('should extract text from a page', async ({ page }) => {
    await withLoadedFixtureDocument(page, async ({ documentId }) => {
      const text = await readHarnessPageText(page, documentId, 0);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });
  });
}
