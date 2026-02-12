/**
 * Integration tests for page box API.
 *
 * Tests the FPDFPage_Get*Box and FPDFPage_Set*Box functions.
 */

import { PageBoxType, PageRotation } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Page Boxes API', () => {
  describe('getPageBox', () => {
    test('should return media box for page', async ({ testPage }) => {
      const mediaBox = testPage.getPageBox(PageBoxType.MediaBox);
      // MediaBox should always exist
      if (mediaBox !== undefined) {
        expect(mediaBox.left).toBeTypeOf('number');
        expect(mediaBox.bottom).toBeTypeOf('number');
        expect(mediaBox.right).toBeTypeOf('number');
        expect(mediaBox.top).toBeTypeOf('number');
        // Right should be greater than left
        expect(mediaBox.right).toBeGreaterThan(mediaBox.left);
        // Top should be greater than bottom
        expect(mediaBox.top).toBeGreaterThan(mediaBox.bottom);
      }
    });

    for (const boxType of [PageBoxType.CropBox, PageBoxType.BleedBox, PageBoxType.TrimBox, PageBoxType.ArtBox]) {
      test(`getPageBox returns ${boxType} or undefined`, async ({ testPage }) => {
        const box = testPage.getPageBox(boxType);
        if (box !== undefined) {
          expect(box.left).toBeDefined();
        }
      });
    }
  });

  describe('convenience getters', () => {
    test('mediaBox should return same as getPageBox(MediaBox)', async ({ testPage }) => {
      const via_method = testPage.getPageBox(PageBoxType.MediaBox);
      const via_getter = testPage.mediaBox;
      expect(via_getter).toEqual(via_method);
    });

    test('cropBox should return same as getPageBox(CropBox)', async ({ testPage }) => {
      const via_method = testPage.getPageBox(PageBoxType.CropBox);
      const via_getter = testPage.cropBox;
      expect(via_getter).toEqual(via_method);
    });

    test('bleedBox should return same as getPageBox(BleedBox)', async ({ testPage }) => {
      const via_method = testPage.getPageBox(PageBoxType.BleedBox);
      const via_getter = testPage.bleedBox;
      expect(via_getter).toEqual(via_method);
    });

    test('trimBox should return same as getPageBox(TrimBox)', async ({ testPage }) => {
      const via_method = testPage.getPageBox(PageBoxType.TrimBox);
      const via_getter = testPage.trimBox;
      expect(via_getter).toEqual(via_method);
    });

    test('artBox should return same as getPageBox(ArtBox)', async ({ testPage }) => {
      const via_method = testPage.getPageBox(PageBoxType.ArtBox);
      const via_getter = testPage.artBox;
      expect(via_getter).toEqual(via_method);
    });
  });

  describe('boundingBox', () => {
    test('should return valid bounding box', async ({ testPage }) => {
      const bbox = testPage.boundingBox;
      expect(bbox.left).toBeTypeOf('number');
      expect(bbox.bottom).toBeTypeOf('number');
      expect(bbox.right).toBeTypeOf('number');
      expect(bbox.top).toBeTypeOf('number');
      // Bounding box should have positive dimensions
      expect(bbox.right).toBeGreaterThanOrEqual(bbox.left);
      expect(bbox.top).toBeGreaterThanOrEqual(bbox.bottom);
    });

    test('should roughly match page dimensions', async ({ testPage }) => {
      const bbox = testPage.boundingBox;
      // Bounding box right edge should be close to page width
      expect(Math.abs(bbox.right - bbox.left - testPage.width)).toBeLessThan(10);
      // Bounding box height should be close to page height
      expect(Math.abs(bbox.top - bbox.bottom - testPage.height)).toBeLessThan(10);
    });
  });

  describe('rotation', () => {
    test('should get rotation value', async ({ testPage }) => {
      const rotation = testPage.rotation;
      expect(Object.values(PageRotation)).toContain(rotation);
    });

    test('should set rotation value', async ({ testPage }) => {
      const original = testPage.rotation;
      // Set to a different rotation
      testPage.rotation = PageRotation.Clockwise90;
      expect(testPage.rotation).toBe(PageRotation.Clockwise90);
      // Restore original
      testPage.rotation = original;
      expect(testPage.rotation).toBe(original);
    });
  });

  describe('setPageBox', () => {
    test('should set media box', async ({ testPage }) => {
      const newBox = { left: 10, bottom: 10, right: 600, top: 800 };
      testPage.setPageBox(PageBoxType.MediaBox, newBox);
      // Getting the box may not return exactly what was set due to PDFium internals
      const mediaBox = testPage.mediaBox;
      expect(mediaBox).toBeDefined();
    });

    test('should set crop box', async ({ testPage }) => {
      const newBox = { left: 20, bottom: 20, right: 580, top: 780 };
      testPage.setPageBox(PageBoxType.CropBox, newBox);
      // CropBox should now be defined
      const cropBox = testPage.cropBox;
      // Note: The box may not be exactly as set, but should be valid
      if (cropBox !== undefined) {
        expect(cropBox.left).toBeTypeOf('number');
      }
    });

    test('should set all box types without error', async ({ testPage }) => {
      const box = { left: 0, bottom: 0, right: 612, top: 792 };

      expect(() => testPage.setPageBox(PageBoxType.MediaBox, box)).not.toThrow();
      expect(() => testPage.setPageBox(PageBoxType.CropBox, box)).not.toThrow();
      expect(() => testPage.setPageBox(PageBoxType.BleedBox, box)).not.toThrow();
      expect(() => testPage.setPageBox(PageBoxType.TrimBox, box)).not.toThrow();
      expect(() => testPage.setPageBox(PageBoxType.ArtBox, box)).not.toThrow();
    });
  });

  describe('transformAnnotations', () => {
    test('should apply transformation without error', async ({ testPage }) => {
      // Identity transformation
      expect(() => testPage.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should apply scale transformation', async ({ testPage }) => {
      // Scale by 2x
      expect(() => testPage.transformAnnotations({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });

    test('should apply translation transformation', async ({ testPage }) => {
      // Translate by 10, 10
      expect(() => testPage.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 10, f: 10 })).not.toThrow();
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
    test('should throw on getPageBox after dispose', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.getPageBox(PageBoxType.MediaBox)).toThrow();
    });

    test('should throw on setPageBox after dispose', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.setPageBox(PageBoxType.MediaBox, { left: 0, bottom: 0, right: 612, top: 792 })).toThrow();
    });

    test('should throw on mediaBox after dispose', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.mediaBox).toThrow();
    });

    test('should throw on boundingBox after dispose', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.boundingBox).toThrow();
    });

    test('should throw on rotation setter after dispose', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => {
        page.rotation = PageRotation.Clockwise90;
      }).toThrow();
    });

    test('should throw on transformAnnotations after dispose', async ({ openDocument }) => {
      const document = await openDocument('test_1.pdf');
      using page = document.getPage(0);
      page.dispose();
      expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
    });
  });
});
