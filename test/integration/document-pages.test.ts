/**
 * Integration tests for PDFiumDocument page management methods.
 *
 * Tests deletePage() and insertBlankPage() on PDFiumDocument.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('PDFiumDocument page management', () => {
  describe('deletePage', () => {
    test('should reduce page count by one', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;
      expect(initialCount).toBeGreaterThan(0);

      doc.deletePage(0);
      expect(doc.pageCount).toBe(initialCount - 1);
    });

    test('should delete middle page after inserting extras', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      // Add extra pages so we can delete from the middle
      doc.insertBlankPage(doc.pageCount, 612, 792);
      doc.insertBlankPage(doc.pageCount, 612, 792);
      const count = doc.pageCount;

      doc.deletePage(1);
      expect(doc.pageCount).toBe(count - 1);
    });

    test('should throw for out-of-bounds index', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      expect(() => doc.deletePage(-1)).toThrow();
      expect(() => doc.deletePage(doc.pageCount)).toThrow();
    });
  });

  describe('insertBlankPage', () => {
    test('should increase page count by one', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(0, 612, 792);
      expect(doc.pageCount).toBe(initialCount + 1);
    });

    test('should insert page with specified dimensions', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(initialCount, 400, 600);
      expect(doc.pageCount).toBe(initialCount + 1);

      using page = doc.getPage(initialCount);
      expect(page.width).toBeCloseTo(400, 0);
      expect(page.height).toBeCloseTo(600, 0);
    });

    test('should insert page at beginning', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(0, 612, 792);
      expect(doc.pageCount).toBe(initialCount + 1);
    });

    test('should use default US Letter dimensions', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(initialCount);
      expect(doc.pageCount).toBe(initialCount + 1);

      using page = doc.getPage(initialCount);
      expect(page.width).toBeCloseTo(612, 0);
      expect(page.height).toBeCloseTo(792, 0);
    });
  });

  describe('deletePage + insertBlankPage round-trip', () => {
    test('should maintain valid document after delete then insert', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.deletePage(0);
      expect(doc.pageCount).toBe(initialCount - 1);

      doc.insertBlankPage(0, 400, 600);
      expect(doc.pageCount).toBe(initialCount);

      using page = doc.getPage(0);
      expect(page.width).toBeCloseTo(400, 0);
    });
  });
});
