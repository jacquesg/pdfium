import { expect, test } from '@playwright/test';
import { withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

export function registerRenderBrowserDisposalTests(): void {
  test.beforeEach(async ({ page }) => {
    await expectHarnessReady(page);
  });

  test('should handle document disposal correctly', async ({ page }) => {
    const { documentId } = await withLoadedFixtureDocument(page, async (document) => document);
    await page.evaluate((docId) => window.testHarness.closeDocument(docId), documentId);
    await expect(
      page.evaluate(
        async ({ docId }) => {
          return window.testHarness.renderPage(docId, 0);
        },
        { docId: documentId },
      ),
    ).rejects.toThrow();
  });
}
