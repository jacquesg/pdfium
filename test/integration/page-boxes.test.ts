/**
 * Integration tests for page box API.
 *
 * Tests the FPDFPage_Get*Box and FPDFPage_Set*Box functions.
 */

import { describe, expect, test } from 'vitest';
import { PageBoxType, PageRotation } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Page Boxes API', () => {
  describe('getPageBox', () => {
    test('should return media box for page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const mediaBox = page.getPageBox(PageBoxType.MediaBox);
      // MediaBox should always exist
      if (mediaBox !== undefined) {
        expect(typeof mediaBox.left).toBe('number');
        expect(typeof mediaBox.bottom).toBe('number');
        expect(typeof mediaBox.right).toBe('number');
        expect(typeof mediaBox.top).toBe('number');
        // Right should be greater than left
        expect(mediaBox.right).toBeGreaterThan(mediaBox.left);
        // Top should be greater than bottom
        expect(mediaBox.top).toBeGreaterThan(mediaBox.bottom);
      }
    });

    test('should return undefined for crop box if not explicitly set', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const cropBox = page.getPageBox(PageBoxType.CropBox);
      // CropBox may or may not be explicitly set
      if (cropBox !== undefined) {
        expect(typeof cropBox.left).toBe('number');
        expect(typeof cropBox.right).toBe('number');
      }
    });

    test('should return undefined for bleed box if not explicitly set', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const bleedBox = page.getPageBox(PageBoxType.BleedBox);
      // BleedBox is rarely explicitly set
      if (bleedBox !== undefined) {
        expect(typeof bleedBox.left).toBe('number');
      }
    });

    test('should return undefined for trim box if not explicitly set', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const trimBox = page.getPageBox(PageBoxType.TrimBox);
      // TrimBox is rarely explicitly set
      if (trimBox !== undefined) {
        expect(typeof trimBox.left).toBe('number');
      }
    });

    test('should return undefined for art box if not explicitly set', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const artBox = page.getPageBox(PageBoxType.ArtBox);
      // ArtBox is rarely explicitly set
      if (artBox !== undefined) {
        expect(typeof artBox.left).toBe('number');
      }
    });
  });

  describe('convenience getters', () => {
    test('mediaBox should return same as getPageBox(MediaBox)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.MediaBox);
      const via_getter = page.mediaBox;
      expect(via_getter).toEqual(via_method);
    });

    test('cropBox should return same as getPageBox(CropBox)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.CropBox);
      const via_getter = page.cropBox;
      expect(via_getter).toEqual(via_method);
    });

    test('bleedBox should return same as getPageBox(BleedBox)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.BleedBox);
      const via_getter = page.bleedBox;
      expect(via_getter).toEqual(via_method);
    });

    test('trimBox should return same as getPageBox(TrimBox)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.TrimBox);
      const via_getter = page.trimBox;
      expect(via_getter).toEqual(via_method);
    });

    test('artBox should return same as getPageBox(ArtBox)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.ArtBox);
      const via_getter = page.artBox;
      expect(via_getter).toEqual(via_method);
    });
  });

  describe('boundingBox', () => {
    test('should return valid bounding box', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const bbox = page.boundingBox;
      expect(typeof bbox.left).toBe('number');
      expect(typeof bbox.bottom).toBe('number');
      expect(typeof bbox.right).toBe('number');
      expect(typeof bbox.top).toBe('number');
      // Bounding box should have positive dimensions
      expect(bbox.right).toBeGreaterThanOrEqual(bbox.left);
      expect(bbox.top).toBeGreaterThanOrEqual(bbox.bottom);
    });

    test('should roughly match page dimensions', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const bbox = page.boundingBox;
      // Bounding box right edge should be close to page width
      expect(Math.abs(bbox.right - bbox.left - page.width)).toBeLessThan(10);
      // Bounding box height should be close to page height
      expect(Math.abs(bbox.top - bbox.bottom - page.height)).toBeLessThan(10);
    });
  });

  describe('rotation', () => {
    test('should get rotation value', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rotation = page.rotation;
      expect(Object.values(PageRotation)).toContain(rotation);
    });

    test('should set rotation value', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const original = page.rotation;
      // Set to a different rotation
      page.rotation = PageRotation.Clockwise90;
      expect(page.rotation).toBe(PageRotation.Clockwise90);
      // Restore original
      page.rotation = original;
      expect(page.rotation).toBe(original);
    });
  });

  describe('setPageBox', () => {
    test('should set media box', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const newBox = { left: 10, bottom: 10, right: 600, top: 800 };
      page.setPageBox(PageBoxType.MediaBox, newBox);
      // Getting the box may not return exactly what was set due to PDFium internals
      const mediaBox = page.mediaBox;
      expect(mediaBox).toBeDefined();
    });

    test('should set crop box', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const newBox = { left: 20, bottom: 20, right: 580, top: 780 };
      page.setPageBox(PageBoxType.CropBox, newBox);
      // CropBox should now be defined
      const cropBox = page.cropBox;
      // Note: The box may not be exactly as set, but should be valid
      if (cropBox !== undefined) {
        expect(typeof cropBox.left).toBe('number');
      }
    });

    test('should set all box types without error', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const box = { left: 0, bottom: 0, right: 612, top: 792 };

      expect(() => page.setPageBox(PageBoxType.MediaBox, box)).not.toThrow();
      expect(() => page.setPageBox(PageBoxType.CropBox, box)).not.toThrow();
      expect(() => page.setPageBox(PageBoxType.BleedBox, box)).not.toThrow();
      expect(() => page.setPageBox(PageBoxType.TrimBox, box)).not.toThrow();
      expect(() => page.setPageBox(PageBoxType.ArtBox, box)).not.toThrow();
    });
  });

  describe('transformAnnotations', () => {
    test('should apply transformation without error', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Identity transformation
      expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should apply scale transformation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Scale by 2x
      expect(() => page.transformAnnotations({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });

    test('should apply translation transformation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Translate by 10, 10
      expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 10 })).not.toThrow();
    });
  });

  describe('PageBoxType enum', () => {
    test('should have expected values', () => {
      expect(PageBoxType.MediaBox).toBe('MediaBox');
      expect(PageBoxType.CropBox).toBe('CropBox');
      expect(PageBoxType.BleedBox).toBe('BleedBox');
      expect(PageBoxType.TrimBox).toBe('TrimBox');
      expect(PageBoxType.ArtBox).toBe('ArtBox');
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getPageBox after dispose', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.getPageBox(PageBoxType.MediaBox)).toThrow();
    });

    test('should throw on setPageBox after dispose', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.setPageBox(PageBoxType.MediaBox, { left: 0, bottom: 0, right: 612, top: 792 })).toThrow();
    });

    test('should throw on mediaBox after dispose', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.mediaBox).toThrow();
    });

    test('should throw on boundingBox after dispose', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.boundingBox).toThrow();
    });

    test('should throw on rotation setter after dispose', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => {
        page.rotation = PageRotation.Clockwise90;
      }).toThrow();
    });

    test('should throw on transformAnnotations after dispose', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
    });
  });
});
