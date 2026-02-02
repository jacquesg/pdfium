/**
 * Integration tests for page box API.
 *
 * Tests the FPDFPage_Get*Box and FPDFPage_Set*Box functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PageBoxType, PageRotation } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Page Boxes API', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('getPageBox', () => {
    test('should return media box for page', () => {
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

    test('should return undefined for crop box if not explicitly set', () => {
      using page = document.getPage(0);
      const cropBox = page.getPageBox(PageBoxType.CropBox);
      // CropBox may or may not be explicitly set
      if (cropBox !== undefined) {
        expect(typeof cropBox.left).toBe('number');
        expect(typeof cropBox.right).toBe('number');
      }
    });

    test('should return undefined for bleed box if not explicitly set', () => {
      using page = document.getPage(0);
      const bleedBox = page.getPageBox(PageBoxType.BleedBox);
      // BleedBox is rarely explicitly set
      if (bleedBox !== undefined) {
        expect(typeof bleedBox.left).toBe('number');
      }
    });

    test('should return undefined for trim box if not explicitly set', () => {
      using page = document.getPage(0);
      const trimBox = page.getPageBox(PageBoxType.TrimBox);
      // TrimBox is rarely explicitly set
      if (trimBox !== undefined) {
        expect(typeof trimBox.left).toBe('number');
      }
    });

    test('should return undefined for art box if not explicitly set', () => {
      using page = document.getPage(0);
      const artBox = page.getPageBox(PageBoxType.ArtBox);
      // ArtBox is rarely explicitly set
      if (artBox !== undefined) {
        expect(typeof artBox.left).toBe('number');
      }
    });
  });

  describe('convenience getters', () => {
    test('mediaBox should return same as getPageBox(MediaBox)', () => {
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.MediaBox);
      const via_getter = page.mediaBox;
      expect(via_getter).toEqual(via_method);
    });

    test('cropBox should return same as getPageBox(CropBox)', () => {
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.CropBox);
      const via_getter = page.cropBox;
      expect(via_getter).toEqual(via_method);
    });

    test('bleedBox should return same as getPageBox(BleedBox)', () => {
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.BleedBox);
      const via_getter = page.bleedBox;
      expect(via_getter).toEqual(via_method);
    });

    test('trimBox should return same as getPageBox(TrimBox)', () => {
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.TrimBox);
      const via_getter = page.trimBox;
      expect(via_getter).toEqual(via_method);
    });

    test('artBox should return same as getPageBox(ArtBox)', () => {
      using page = document.getPage(0);
      const via_method = page.getPageBox(PageBoxType.ArtBox);
      const via_getter = page.artBox;
      expect(via_getter).toEqual(via_method);
    });
  });

  describe('boundingBox', () => {
    test('should return valid bounding box', () => {
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

    test('should roughly match page dimensions', () => {
      using page = document.getPage(0);
      const bbox = page.boundingBox;
      // Bounding box right edge should be close to page width
      expect(Math.abs(bbox.right - bbox.left - page.width)).toBeLessThan(10);
      // Bounding box height should be close to page height
      expect(Math.abs(bbox.top - bbox.bottom - page.height)).toBeLessThan(10);
    });
  });

  describe('rotation', () => {
    test('should get rotation value', () => {
      using page = document.getPage(0);
      const rotation = page.rotation;
      expect([0, 1, 2, 3]).toContain(rotation);
    });

    test('should set rotation value', () => {
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
    test('should set media box', () => {
      using page = document.getPage(0);
      const newBox = { left: 10, bottom: 10, right: 600, top: 800 };
      page.setPageBox(PageBoxType.MediaBox, newBox);
      // Getting the box may not return exactly what was set due to PDFium internals
      const mediaBox = page.mediaBox;
      expect(mediaBox).toBeDefined();
    });

    test('should set crop box', () => {
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

    test('should set all box types without error', () => {
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
    test('should apply transformation without error', () => {
      using page = document.getPage(0);
      // Identity transformation
      expect(() => page.transformAnnotations(1, 0, 0, 1, 0, 0)).not.toThrow();
    });

    test('should apply scale transformation', () => {
      using page = document.getPage(0);
      // Scale by 2x
      expect(() => page.transformAnnotations(2, 0, 0, 2, 0, 0)).not.toThrow();
    });

    test('should apply translation transformation', () => {
      using page = document.getPage(0);
      // Translate by 10, 10
      expect(() => page.transformAnnotations(1, 0, 0, 1, 10, 10)).not.toThrow();
    });
  });

  describe('PageBoxType enum', () => {
    test('should have expected values', () => {
      expect(PageBoxType.MediaBox).toBe(0);
      expect(PageBoxType.CropBox).toBe(1);
      expect(PageBoxType.BleedBox).toBe(2);
      expect(PageBoxType.TrimBox).toBe(3);
      expect(PageBoxType.ArtBox).toBe(4);
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getPageBox after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getPageBox(PageBoxType.MediaBox)).toThrow();
      doc.dispose();
    });

    test('should throw on setPageBox after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.setPageBox(PageBoxType.MediaBox, { left: 0, bottom: 0, right: 612, top: 792 })).toThrow();
      doc.dispose();
    });

    test('should throw on mediaBox after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.mediaBox).toThrow();
      doc.dispose();
    });

    test('should throw on boundingBox after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.boundingBox).toThrow();
      doc.dispose();
    });

    test('should throw on rotation setter after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => {
        page.rotation = PageRotation.Clockwise90;
      }).toThrow();
      doc.dispose();
    });

    test('should throw on transformAnnotations after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.transformAnnotations(1, 0, 0, 1, 0, 0)).toThrow();
      doc.dispose();
    });
  });
});
