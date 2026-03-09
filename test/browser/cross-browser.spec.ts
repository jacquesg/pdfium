import { expect, test } from '@playwright/test';
import { renderHarnessPage, withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

test.describe('Cross-Browser Compatibility', () => {
  test('should load PDFium in browser', async ({ page }) => {
    const snapshot = await expectHarnessReady(page);
    expect(snapshot.runtimeKind).toBe('worker');
  });

  test('should render a page', async ({ page }) => {
    await expectHarnessReady(page);

    await withLoadedFixtureDocument(page, async ({ documentId }) => {
      const renderResult = await renderHarnessPage(page, documentId, 0);
      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
    });
  });
});
