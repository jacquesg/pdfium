/**
 * Vitest test context fixtures for PDFium integration tests.
 *
 * Provides `pdfium`, `testDocument`, `testPage`, and `openDocument` fixtures
 * that handle the init-document-page lifecycle automatically. All resources
 * are disposed after each test.
 *
 * @example
 * ```ts
 * import { describe, expect, test } from '../utils/fixtures.js';
 *
 * test('should get page text', async ({ testPage }) => {
 *   const text = testPage.getText();
 *   expect(text).toBeDefined();
 * });
 * ```
 *
 * @module test/utils/fixtures
 */

import { test as base } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from './helpers.js';

interface PdfiumFixtures {
  /** Initialised PDFium WASM instance. Auto-disposed after the test. */
  pdfium: PDFium;
  /** test_1.pdf opened as PDFiumDocument. Auto-disposed after the test. */
  testDocument: PDFiumDocument;
  /** Page 0 of testDocument. Auto-disposed after the test. */
  testPage: PDFiumPage;
  /** Factory to open additional test documents. All auto-disposed after the test. */
  openDocument: (filename: string, password?: string) => Promise<PDFiumDocument>;
}

export const test = base.extend<PdfiumFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Vitest fixture API requires destructuring even when no deps
  pdfium: async ({}, use) => {
    const instance = await initPdfium();
    await use(instance);
    instance.dispose();
  },

  testDocument: async ({ pdfium }, use) => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    await use(doc);
    if (!doc.disposed) doc.dispose();
  },

  testPage: async ({ testDocument }, use) => {
    const page = testDocument.getPage(0);
    await use(page);
    if (!page.disposed) page.dispose();
  },

  openDocument: async ({ pdfium }, use) => {
    const opened: PDFiumDocument[] = [];
    await use(async (filename: string, password?: string) => {
      const doc = await loadTestDocument(pdfium, filename, password);
      opened.push(doc);
      return doc;
    });
    for (const doc of opened.reverse()) {
      if (!doc.disposed) doc.dispose();
    }
  },
});

export { afterAll, afterEach, beforeAll, beforeEach, describe, expect } from 'vitest';
