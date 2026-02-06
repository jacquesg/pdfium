/**
 * Cross-browser tests for Playwright.
 */

import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

let testPdfData: ArrayBuffer;

test.beforeAll(async () => {
  const buffer = await readFile('test/fixtures/test_1.pdf');
  testPdfData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
});

test.describe('Cross-Browser Compatibility', () => {
  test('should load PDFium in browser', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.testHarness?.isReady === true, { timeout: 30_000 });

    const isReady = await page.evaluate(() => window.testHarness.isReady);
    expect(isReady).toBe(true);

    const error = await page.evaluate(() => window.testHarness.error);
    expect(error).toBeNull();
  });

  test('should render a page', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.testHarness?.isReady === true, { timeout: 30_000 });

    const { documentId } = await page.evaluate(
      async (data) => {
        const arrayBuffer = new Uint8Array(data).buffer;
        return window.testHarness.loadDocument(arrayBuffer);
      },
      Array.from(new Uint8Array(testPdfData)),
    );

    const renderResult = await page.evaluate(
      async ({ docId, pageIndex }) => {
        return window.testHarness.renderPage(docId, pageIndex);
      },
      { docId: documentId, pageIndex: 0 },
    );

    expect(renderResult.width).toBeGreaterThan(0);
    expect(renderResult.height).toBeGreaterThan(0);

    await page.evaluate((docId) => window.testHarness.closeDocument(docId), documentId);
  });
});
