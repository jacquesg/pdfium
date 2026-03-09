import { expect, test } from '@playwright/test';
import { withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

export function registerRenderBrowserRuntimeTests(): void {
  test.beforeEach(async ({ page }) => {
    await expectHarnessReady(page);
  });

  test('should initialise PDFium', async ({ page }) => {
    const snapshot = await page.evaluate(() => ({
      error: window.testHarness.error,
      isReady: window.testHarness.isReady,
      runtimeKind: window.testHarness.runtimeKind,
      statusMessage: window.testHarness.statusMessage,
    }));
    expect(snapshot.runtimeKind).toBe('worker');
    expect(snapshot.isReady).toBe(true);
    expect(snapshot.error).toBeNull();
    expect(snapshot.statusMessage).toContain('initialised successfully');
  });

  test('should load a PDF document', async ({ page }) => {
    await withLoadedFixtureDocument(page, async (document) => {
      expect(document.pageCount).toBeGreaterThan(0);
      expect(document.documentId).toBeGreaterThan(0);
    });
  });
}
