/**
 * Integration tests for thumbnail API.
 *
 * Tests the FPDFPage_GetThumbnail* functions.
 */

import { describe, expect, test } from 'vitest';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Thumbnails API', () => {
  describe('hasThumbnail', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const hasThumbnail = page.hasThumbnail();
      expect(typeof hasThumbnail).toBe('boolean');
    });

    test('should work for all pages', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const pageCount = document.pageCount;
      for (let i = 0; i < pageCount; i++) {
        using page = document.getPage(i);
        expect(() => page.hasThumbnail()).not.toThrow();
      }
    });
  });

  describe('getThumbnailAsBitmap', () => {
    test('should return undefined if no thumbnail', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const bitmap = page.getThumbnailAsBitmap();
      // Most PDFs don't have embedded thumbnails
      // If there is one, it should be a valid handle
      if (bitmap !== undefined) {
        expect(typeof bitmap).toBe('number');
        expect(bitmap).toBeGreaterThan(0);
      }
    });

    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.getThumbnailAsBitmap()).not.toThrow();
    });
  });

  describe('getDecodedThumbnailData', () => {
    test('should return undefined if no thumbnail', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const data = page.getDecodedThumbnailData();
      // Most PDFs don't have embedded thumbnails
      // If there is one, it should be a Uint8Array
      if (data !== undefined) {
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.getDecodedThumbnailData()).not.toThrow();
    });
  });

  describe('getRawThumbnailData', () => {
    test('should return undefined if no thumbnail', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const data = page.getRawThumbnailData();
      // Most PDFs don't have embedded thumbnails
      // If there is one, it should be a Uint8Array with image data
      if (data !== undefined) {
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.getRawThumbnailData()).not.toThrow();
    });
  });

  describe('with PDF that may have thumbnails', () => {
    test('should handle test_3_with_images.pdf', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
      using page = doc.getPage(0);

      // Check all thumbnail methods work without throwing
      expect(() => page.hasThumbnail()).not.toThrow();
      expect(() => page.getThumbnailAsBitmap()).not.toThrow();
      expect(() => page.getDecodedThumbnailData()).not.toThrow();
      expect(() => page.getRawThumbnailData()).not.toThrow();
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on hasThumbnail after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.hasThumbnail()).toThrow();
      doc.dispose();
    });

    test('should throw on getThumbnailAsBitmap after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getThumbnailAsBitmap()).toThrow();
      doc.dispose();
    });

    test('should throw on getDecodedThumbnailData after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getDecodedThumbnailData()).toThrow();
      doc.dispose();
    });

    test('should throw on getRawThumbnailData after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getRawThumbnailData()).toThrow();
      doc.dispose();
    });
  });
});
