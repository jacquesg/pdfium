/**
 * Tests for concurrent operations.
 *
 * Verifies that the library handles concurrent calls safely, even if
 * the underlying WASM is single-threaded.
 */

import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { initPdfium } from '../utils/helpers.js';

describe('Concurrency', () => {
  test('should handle concurrent page rendering from same document', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);

    const pages = [0, 1, 2].map((i) => doc.getPage(i));

    // Render all pages concurrently
    // Note: Since WASM is synchronous, these will actually run sequentially on the main thread,
    // but this test ensures that the JS state management (like allocating bitmaps/buffers)
    // doesn't conflict when initiated "simultaneously" in the event loop.
    const promises = pages.map((page) => {
      // Use a small delay to allow event loop mixing if any async parts existed
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = page.render({ scale: 0.5 });
          expect(result.data.length).toBeGreaterThan(0);
          resolve();
        }, Math.random() * 10);
      });
    });

    await Promise.all(promises);

    // Cleanup
    for (const page of pages) {
      page.dispose();
    }
  });

  test('should handle concurrent text extraction', async () => {
    using pdfium = await initPdfium();
    const pdfData = await readFile('test/fixtures/test_1.pdf');
    using doc = await pdfium.openDocument(pdfData);

    const pages = [0, 1, 2].map((i) => doc.getPage(i));

    const promises = pages.map((page) => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(page.getText());
        }, Math.random() * 10);
      });
    });

    const results = await Promise.all(promises);

    expect(results.length).toBe(3);
    for (const text of results) {
      expect(typeof text).toBe('string');
    }

    for (const page of pages) {
      page.dispose();
    }
  });
});
