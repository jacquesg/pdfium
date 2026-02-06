/**
 * Integration tests for image object API.
 *
 * Tests the FPDFImageObj_* functions.
 */

import { describe, expect, test } from 'vitest';
import { PageObjectType } from '../../src/core/types.js';
import { PDFiumImageObject } from '../../src/document/page-object.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Image Objects with PDF containing images', () => {
  test('should get metadata for real image objects', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    // Get page objects and find image objects
    const objects = page.getObjects();
    const imageObjects = objects.filter((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);

    expect(imageObjects.length).toBeGreaterThan(0);

    for (const imgObj of imageObjects) {
      const metadata = imgObj.getMetadata();
      expect(metadata).not.toBeNull();
      if (metadata) {
        expect(typeof metadata.width).toBe('number');
        expect(typeof metadata.height).toBe('number');
        expect(typeof metadata.horizontalDpi).toBe('number');
        expect(typeof metadata.verticalDpi).toBe('number');
        expect(typeof metadata.bitsPerPixel).toBe('number');
        expect(typeof metadata.colourSpace).toBe('string');
        expect(typeof metadata.markedContent).toBe('string');
      }

      // Also try to get decoded data (might be null if not decodable or empty, but shouldn't throw)
      const data = imgObj.getDecodedData();
      if (data !== null) {
        expect(data).toBeInstanceOf(Uint8Array);
      }

      // Try get raw data
      const rawData = imgObj.getRawData();
      if (rawData !== null) {
        expect(rawData).toBeInstanceOf(Uint8Array);
      }
    }
  });

  test('should iterate page objects with generator', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = [...page.objects()];
    expect(Array.isArray(objects)).toBe(true);
  });

  test('should get object count', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const count = page.objectCount;
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle PDF with many images', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_4_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(Array.isArray(objects)).toBe(true);
    for (const obj of objects) {
      expect(typeof obj.type).toBe('string');
      expect(obj.bounds).toBeDefined();
    }
  });

  test('page object has valid structure', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    for (const obj of objects) {
      expect(typeof obj.type).toBe('string');
      expect(Object.values(PageObjectType)).toContain(obj.type);
      if (obj.bounds !== undefined) {
        expect(typeof obj.bounds.left).toBe('number');
        expect(typeof obj.bounds.right).toBe('number');
        expect(typeof obj.bounds.top).toBe('number');
        expect(typeof obj.bounds.bottom).toBe('number');
      }
    }
  });
});

describe('Image Objects post-dispose guards', () => {
  test('should throw on getMetadata after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const imageObj = objects.find((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);
    expect(imageObj).toBeDefined();
    page.dispose();
    expect(() => imageObj!.getMetadata()).toThrow();
  });

  test('should throw on getDecodedData after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const imageObj = objects.find((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);
    expect(imageObj).toBeDefined();
    page.dispose();
    expect(() => imageObj!.getDecodedData()).toThrow();
  });

  test('should throw on getRawData after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const imageObj = objects.find((o): o is PDFiumImageObject => o instanceof PDFiumImageObject);
    expect(imageObj).toBeDefined();
    page.dispose();
    expect(() => imageObj!.getRawData()).toThrow();
  });
});
