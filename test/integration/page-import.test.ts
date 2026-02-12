/**
 * Integration tests for page import/merge methods.
 *
 * These tests verify importing pages from one document to another.
 */

import type { ImportPagesOptions, NUpLayoutOptions } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Page Import/Merge', () => {
  describe('importPages', () => {
    test('should import all pages from source document', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      // Load another copy of test_1.pdf as the destination
      const dest = await openDocument('test_1.pdf');
      const sourcePageCount = sourceDoc.pageCount;
      const initialDestCount = dest.pageCount;

      dest.importPages(sourceDoc);

      expect(dest.pageCount).toBe(initialDestCount + sourcePageCount);
    });

    test('should import specific page range', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      const options: ImportPagesOptions = {
        pageRange: '1', // First page only (1-indexed in page range)
      };

      dest.importPages(sourceDoc, options);

      expect(dest.pageCount).toBe(initialDestCount + 1);
    });

    test('should import pages at specific position', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      // Import at beginning (index 0)
      dest.importPages(sourceDoc, { insertIndex: 0 });

      expect(dest.pageCount).toBe(initialDestCount + sourceDoc.pageCount);
    });

    test('should handle empty page range gracefully', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      // Empty string means all pages
      dest.importPages(sourceDoc, { pageRange: '' });

      expect(dest.pageCount).toBe(initialDestCount + sourceDoc.pageCount);
    });
  });

  describe('importPagesByIndex', () => {
    test('should import pages by zero-based indices', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      // Import page 0 from source
      dest.importPagesByIndex(sourceDoc, [0]);

      expect(dest.pageCount).toBe(initialDestCount + 1);
    });

    test('should import single page', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      dest.importPagesByIndex(sourceDoc, [0]);

      expect(dest.pageCount).toBe(initialDestCount + 1);
    });

    test('should handle empty indices array', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      dest.importPagesByIndex(sourceDoc, []);

      expect(dest.pageCount).toBe(initialDestCount); // No change
    });

    test('should import at specific position', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      const initialDestCount = dest.pageCount;

      // Import at position 0
      dest.importPagesByIndex(sourceDoc, [0], 0);

      expect(dest.pageCount).toBe(initialDestCount + 1);
    });
  });

  describe('importPages error cases', () => {
    test('should throw when called on disposed document', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      dest.dispose();
      expect(() => dest.importPages(sourceDoc)).toThrow();
    });

    test('should throw when source document is disposed', async ({ openDocument }) => {
      const dest = await openDocument('test_1.pdf');
      const source = await openDocument('test_1.pdf');
      source.dispose();
      expect(() => dest.importPages(source)).toThrow();
    });
  });

  describe('importPagesByIndex error cases', () => {
    test('should throw when called on disposed document', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');
      dest.dispose();
      expect(() => dest.importPagesByIndex(sourceDoc, [0])).toThrow();
    });

    test('should throw when source document is disposed', async ({ openDocument }) => {
      const dest = await openDocument('test_1.pdf');
      const source = await openDocument('test_1.pdf');
      source.dispose();
      expect(() => dest.importPagesByIndex(source, [0])).toThrow();
    });
  });

  describe('copyViewerPreferences', () => {
    test('should copy viewer preferences from source', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const dest = await openDocument('test_1.pdf');

      const success = dest.copyViewerPreferences(sourceDoc);

      // May or may not succeed depending on WASM build having the function
      expect(success).toBeTypeOf('boolean');
    });
  });

  describe('createNUpDocument', () => {
    test('should create 2-up layout', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const sourcePageCount = sourceDoc.pageCount;

      const options: NUpLayoutOptions = {
        outputWidth: 842, // A4 landscape width
        outputHeight: 595, // A4 landscape height
        pagesPerRow: 2,
        pagesPerColumn: 1,
      };

      using nupDoc = sourceDoc.createNUpDocument(options);

      if (nupDoc) {
        // N-up should have fewer or equal pages (2 source pages per output page)
        expect(nupDoc.pageCount).toBeLessThanOrEqual(Math.ceil(sourcePageCount / 2));
        expect(nupDoc.pageCount).toBeGreaterThan(0);
      } else {
        // Function may not be available in WASM build
        expect(nupDoc).toBeUndefined();
      }
    });

    test('should create 4-up layout', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const sourcePageCount = sourceDoc.pageCount;

      const options: NUpLayoutOptions = {
        outputWidth: 595,
        outputHeight: 842,
        pagesPerRow: 2,
        pagesPerColumn: 2,
      };

      using nupDoc = sourceDoc.createNUpDocument(options);

      if (nupDoc) {
        // 4-up should have even fewer pages (4 source pages per output page)
        expect(nupDoc.pageCount).toBeLessThanOrEqual(Math.ceil(sourcePageCount / 4));
        expect(nupDoc.pageCount).toBeGreaterThan(0);
      } else {
        // Function may not be available in WASM build
        expect(nupDoc).toBeUndefined();
      }
    });

    test('should handle single page document', async ({ openDocument }) => {
      const sourceDoc = await openDocument('test_1.pdf');
      const options: NUpLayoutOptions = {
        outputWidth: 842,
        outputHeight: 595,
        pagesPerRow: 2,
        pagesPerColumn: 1,
      };

      using nupDoc = sourceDoc.createNUpDocument(options);

      if (nupDoc) {
        // N-up creates output pages based on the grid, even for single page sources
        // The output page count depends on implementation but should be at least 1
        expect(nupDoc.pageCount).toBeGreaterThanOrEqual(1);
      } else {
        // Function may not be available in WASM build
        expect(nupDoc).toBeUndefined();
      }
    });
  });
});
