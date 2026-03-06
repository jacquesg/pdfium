/**
 * Integration tests for page management operations.
 *
 * Tests page deletion, insertion, and reordering using the real WASM module.
 */

import { PageRotation } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Page management operations', () => {
  describe('page lifecycle', () => {
    test('insert blank page then access it', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(initialCount, 500, 700);
      expect(doc.pageCount).toBe(initialCount + 1);

      using page = doc.getPage(initialCount);
      expect(page.width).toBeCloseTo(500, 0);
      expect(page.height).toBeCloseTo(700, 0);
    });

    test('delete page reduces count', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.deletePage(0);
      expect(doc.pageCount).toBe(initialCount - 1);
    });

    test('move pages reorders document', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      // Insert some extra pages with different dimensions to identify them
      doc.insertBlankPage(doc.pageCount, 400, 600);
      doc.insertBlankPage(doc.pageCount, 500, 700);
      const count = doc.pageCount;

      // Move the last page to position 0
      doc.movePages([count - 1], 0);
      expect(doc.pageCount).toBe(count);

      // First page should now have the dimensions of the previously last page
      using page = doc.getPage(0);
      expect(page.width).toBeCloseTo(500, 0);
      expect(page.height).toBeCloseTo(700, 0);
    });
  });

  describe('page rotation', () => {
    test('set and read page rotation', async ({ testPage }) => {
      expect(testPage.rotation).toBe(PageRotation.None);

      testPage.rotation = PageRotation.Clockwise90;
      expect(testPage.rotation).toBe(PageRotation.Clockwise90);

      testPage.rotation = PageRotation.None;
      expect(testPage.rotation).toBe(PageRotation.None);
    });

    test('set rotation to all valid values', async ({ testPage }) => {
      for (const rotation of [
        PageRotation.None,
        PageRotation.Clockwise90,
        PageRotation.Rotate180,
        PageRotation.CounterClockwise90,
      ]) {
        testPage.rotation = rotation;
        expect(testPage.rotation).toBe(rotation);
      }
    });
  });

  describe('insert + delete round-trip', () => {
    test('insert then immediately delete restores original count', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(0, 612, 792);
      expect(doc.pageCount).toBe(initialCount + 1);

      doc.deletePage(0);
      expect(doc.pageCount).toBe(initialCount);
    });
  });

  describe('multiple insertions', () => {
    test('insert multiple blank pages', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      const initialCount = doc.pageCount;

      doc.insertBlankPage(0, 200, 300);
      doc.insertBlankPage(1, 300, 400);
      doc.insertBlankPage(2, 400, 500);

      expect(doc.pageCount).toBe(initialCount + 3);

      using page0 = doc.getPage(0);
      expect(page0.width).toBeCloseTo(200, 0);

      using page1 = doc.getPage(1);
      expect(page1.width).toBeCloseTo(300, 0);

      using page2 = doc.getPage(2);
      expect(page2.width).toBeCloseTo(400, 0);
    });
  });
});
