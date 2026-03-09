import { expect, test } from '@playwright/test';
import { renderHarnessPage, withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

export function registerRenderBrowserRenderPageTests(): void {
  test.beforeEach(async ({ page }) => {
    await expectHarnessReady(page);
  });

  test('should render a page', async ({ page }) => {
    await withLoadedFixtureDocument(page, async ({ documentId }) => {
      const renderResult = await renderHarnessPage(page, documentId, 0);

      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
      expect(renderResult.dataUrl).toMatch(/^data:image\/png;base64,/);

      const canvas = page.locator('#pdf-canvas');
      await expect(canvas).toBeVisible();
    });
  });
}
