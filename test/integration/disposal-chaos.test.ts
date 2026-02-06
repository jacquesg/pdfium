/**
 * Chaos testing for resource disposal.
 *
 * Verifies that resources can be disposed in random orders without crashing
 * or leaking.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { initPdfium } from '../utils/helpers.js';

describe('Disposal Chaos', () => {
  test('should handle random disposal order of pages and document', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const doc = await pdfium.openDocument(pdfData);

    const pages = [];
    for (let i = 0; i < doc.pageCount; i++) {
      pages.push(doc.getPage(i));
    }

    // Shuffle disposal order
    const disposables = [doc, ...pages];
    for (let i = disposables.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [disposables[i], disposables[j]] = [disposables[j]!, disposables[i]!];
    }

    // Dispose all
    for (const d of disposables) {
      d.dispose();
    }

    // Verify all are disposed
    expect(doc.disposed).toBe(true);
    for (const page of pages) {
      expect(page.disposed).toBe(true);
    }
  });

  test('should handle repeated disposal', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const doc = await pdfium.openDocument(pdfData);
    const page = doc.getPage(0);

    page.dispose();
    page.dispose(); // Should be no-op
    doc.dispose();
    doc.dispose(); // Should be no-op

    expect(page.disposed).toBe(true);
    expect(doc.disposed).toBe(true);
  });

  test('should handle parent disposed before child', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    const doc = await pdfium.openDocument(pdfData);
    const page = doc.getPage(0);

    doc.dispose(); // Should close page internally
    expect(page.disposed).toBe(true); // Verified by implementation

    page.dispose(); // Should be no-op
  });
});
