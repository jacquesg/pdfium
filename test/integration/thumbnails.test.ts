/**
 * Integration tests for thumbnail API.
 *
 * Tests the FPDFPage_GetThumbnail* functions.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('Thumbnails API', () => {
  describe('hasThumbnail', () => {
    test('should return boolean', async ({ testPage }) => {
      const hasThumbnail = testPage.hasThumbnail();
      expect(hasThumbnail).toBeTypeOf('boolean');
    });

    test('should work for all pages', async ({ testDocument }) => {
      const pageCount = testDocument.pageCount;
      for (let i = 0; i < pageCount; i++) {
        using page = testDocument.getPage(i);
        expect(() => page.hasThumbnail()).not.toThrow();
      }
    });
  });

  describe('getThumbnailAsBitmap', () => {
    test('should return undefined if no thumbnail', async ({ testPage }) => {
      const bitmap = testPage.getThumbnailAsBitmap();
      // Most PDFs don't have embedded thumbnails
      // If there is one, it should be a valid handle
      if (bitmap !== undefined) {
        expect(bitmap).toBeTypeOf('number');
        expect(bitmap).toBeGreaterThan(0);
      }
    });

    test('should not throw', async ({ testPage }) => {
      expect(() => testPage.getThumbnailAsBitmap()).not.toThrow();
    });
  });

  describe('getDecodedThumbnailData', () => {
    test('should return undefined if no thumbnail', async ({ testPage }) => {
      const data = testPage.getDecodedThumbnailData();
      // Most PDFs don't have embedded thumbnails
      // If there is one, it should be a Uint8Array
      if (data !== undefined) {
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    test('should not throw', async ({ testPage }) => {
      expect(() => testPage.getDecodedThumbnailData()).not.toThrow();
    });
  });

  describe('getRawThumbnailData', () => {
    test('should return undefined if no thumbnail', async ({ testPage }) => {
      const data = testPage.getRawThumbnailData();
      // Most PDFs don't have embedded thumbnails
      // If there is one, it should be a Uint8Array with image data
      if (data !== undefined) {
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    test('should not throw', async ({ testPage }) => {
      expect(() => testPage.getRawThumbnailData()).not.toThrow();
    });
  });

  describe('with PDF that may have thumbnails', () => {
    test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
      const doc = await openDocument('test_3_with_images.pdf');
      using page = doc.getPage(0);

      // Check all thumbnail methods work without throwing
      expect(() => page.hasThumbnail()).not.toThrow();
      expect(() => page.getThumbnailAsBitmap()).not.toThrow();
      expect(() => page.getDecodedThumbnailData()).not.toThrow();
      expect(() => page.getRawThumbnailData()).not.toThrow();
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on hasThumbnail after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.hasThumbnail()).toThrow();
    });

    test('should throw on getThumbnailAsBitmap after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getThumbnailAsBitmap()).toThrow();
    });

    test('should throw on getDecodedThumbnailData after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getDecodedThumbnailData()).toThrow();
    });

    test('should throw on getRawThumbnailData after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getRawThumbnailData()).toThrow();
    });
  });
});
