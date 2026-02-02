/**
 * Browser rendering tests using Playwright.
 *
 * These tests verify that PDFium works correctly in real browser environments.
 */

import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

// Test PDF data (loaded once)
let testPdfData: ArrayBuffer;

test.beforeAll(async () => {
  const buffer = await readFile('test/fixtures/test_1.pdf');
  testPdfData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
});

test.describe('PDFium Browser Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for PDFium to initialise
    await page.waitForFunction(() => window.testHarness?.isReady === true, {
      timeout: 30000,
    });
  });

  test('should initialise PDFium', async ({ page }) => {
    const isReady = await page.evaluate(() => window.testHarness.isReady);
    expect(isReady).toBe(true);

    const error = await page.evaluate(() => window.testHarness.error);
    expect(error).toBeNull();
  });

  test('should load a PDF document', async ({ page }) => {
    const result = await page.evaluate(
      async (data) => {
        const arrayBuffer = new Uint8Array(data).buffer;
        return window.testHarness.loadDocument(arrayBuffer);
      },
      Array.from(new Uint8Array(testPdfData)),
    );

    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.documentId).toBeGreaterThan(0);

    // Cleanup
    await page.evaluate((docId) => window.testHarness.closeDocument(docId), result.documentId);
  });

  test('should render a page', async ({ page }) => {
    // Load document
    const { documentId } = await page.evaluate(
      async (data) => {
        const arrayBuffer = new Uint8Array(data).buffer;
        return window.testHarness.loadDocument(arrayBuffer);
      },
      Array.from(new Uint8Array(testPdfData)),
    );

    // Render page
    const renderResult = await page.evaluate(
      async ({ docId, pageIndex }) => {
        return window.testHarness.renderPage(docId, pageIndex);
      },
      { docId: documentId, pageIndex: 0 },
    );

    expect(renderResult.width).toBeGreaterThan(0);
    expect(renderResult.height).toBeGreaterThan(0);
    expect(renderResult.dataUrl).toMatch(/^data:image\/png;base64,/);

    // Verify canvas is visible
    const canvas = page.locator('#pdf-canvas');
    await expect(canvas).toBeVisible();

    // Cleanup
    await page.evaluate((docId) => window.testHarness.closeDocument(docId), documentId);
  });

  test('should extract text from a page', async ({ page }) => {
    // Load document
    const { documentId } = await page.evaluate(
      async (data) => {
        const arrayBuffer = new Uint8Array(data).buffer;
        return window.testHarness.loadDocument(arrayBuffer);
      },
      Array.from(new Uint8Array(testPdfData)),
    );

    // Extract text
    const text = await page.evaluate(
      async ({ docId, pageIndex }) => {
        return window.testHarness.getPageText(docId, pageIndex);
      },
      { docId: documentId, pageIndex: 0 },
    );

    expect(typeof text).toBe('string');
    // Assuming test_1.pdf has some text content
    expect(text.length).toBeGreaterThan(0);

    // Cleanup
    await page.evaluate((docId) => window.testHarness.closeDocument(docId), documentId);
  });

  test('should handle document disposal correctly', async ({ page }) => {
    // Load document
    const { documentId } = await page.evaluate(
      async (data) => {
        const arrayBuffer = new Uint8Array(data).buffer;
        return window.testHarness.loadDocument(arrayBuffer);
      },
      Array.from(new Uint8Array(testPdfData)),
    );

    // Close document
    await page.evaluate((docId) => window.testHarness.closeDocument(docId), documentId);

    // Try to render - should throw
    await expect(
      page.evaluate(
        async ({ docId }) => {
          return window.testHarness.renderPage(docId, 0);
        },
        { docId: documentId },
      ),
    ).rejects.toThrow();
  });
});

test.describe('PDFium Browser - Multiple Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.testHarness?.isReady === true, {
      timeout: 30000,
    });
  });

  test('should render multiple pages sequentially', async ({ page }) => {
    // Load document
    const { documentId, pageCount } = await page.evaluate(
      async (data: number[]) => {
        const arrayBuffer = new Uint8Array(data).buffer;
        return window.testHarness.loadDocument(arrayBuffer);
      },
      Array.from(new Uint8Array(testPdfData)),
    );

    // Render each page
    const pagesToRender = Math.min(pageCount, 3);
    for (let i = 0; i < pagesToRender; i++) {
      const renderResult = await page.evaluate(
        async ({ docId, pageIndex }) => {
          return window.testHarness.renderPage(docId, pageIndex);
        },
        { docId: documentId, pageIndex: i },
      );

      expect(renderResult.width).toBeGreaterThan(0);
      expect(renderResult.height).toBeGreaterThan(0);
    }

    // Cleanup
    await page.evaluate((docId: number) => window.testHarness.closeDocument(docId), documentId);
  });
});

// Window interface is declared in test-harness.ts
