import { expect, test } from '@playwright/test';
import { renderHarnessPage, withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

export function registerRenderBrowserMultiPageTests(): void {
  test.beforeEach(async ({ page }) => {
    await expectHarnessReady(page);
  });

  test('should render multiple pages sequentially', async ({ page }) => {
    await withLoadedFixtureDocument(page, async ({ documentId, pageCount }) => {
      const pagesToRender = Math.min(pageCount, 3);
      for (let i = 0; i < pagesToRender; i++) {
        const renderResult = await renderHarnessPage(page, documentId, i);
        expect(renderResult.width).toBeGreaterThan(0);
        expect(renderResult.height).toBeGreaterThan(0);
      }
    });
  });
}
