import { expect, test } from '@playwright/test';
import { renderHarnessPage, withLoadedFixtureDocument } from './browser-test-support.js';
import { expectHarnessReady } from './harness-test-utils.js';

test.describe('WebKit Main-Thread Smoke', () => {
  test.skip(({ browserName }) => browserName !== 'webkit');

  test('main-thread harness initialises in WebKit', async ({ page }) => {
    const snapshot = await expectHarnessReady(page, { runtimeKind: 'main-thread', timeout: 35_000 });
    expect(snapshot.runtimeKind).toBe('main-thread');
  });

  test('main-thread harness renders a page in WebKit', async ({ page }) => {
    await expectHarnessReady(page, { runtimeKind: 'main-thread', timeout: 35_000 });

    await withLoadedFixtureDocument(page, async ({ documentId }) => {
      const renderResult = await renderHarnessPage(page, documentId, 0);
      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
    });
  });
});
