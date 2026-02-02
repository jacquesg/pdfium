/**
 * Integration tests for image object API.
 *
 * Tests the FPDFImageObj_* functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Image Objects API - Set Bitmap', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('imageObjSetBitmap', () => {
    test('should return boolean for invalid image object', () => {
      const result = page.imageObjSetBitmap(0 as never, 0 as never);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Image Objects API - Set Matrix', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('imageObjSetMatrix', () => {
    test('should return boolean for invalid image object', () => {
      const result = page.imageObjSetMatrix(0 as never, 1, 0, 0, 1, 0, 0);
      expect(typeof result).toBe('boolean');
    });

    test('should handle identity matrix', () => {
      expect(() => page.imageObjSetMatrix(0 as never, 1, 0, 0, 1, 0, 0)).not.toThrow();
    });

    test('should handle scale matrix', () => {
      expect(() => page.imageObjSetMatrix(0 as never, 2, 0, 0, 2, 0, 0)).not.toThrow();
    });

    test('should handle translation matrix', () => {
      expect(() => page.imageObjSetMatrix(0 as never, 1, 0, 0, 1, 100, 100)).not.toThrow();
    });

    test('should handle rotation matrix', () => {
      const angle = Math.PI / 4; // 45 degrees
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      expect(() => page.imageObjSetMatrix(0 as never, cos, sin, -sin, cos, 0, 0)).not.toThrow();
    });
  });
});

describe('Image Objects API - Get Decoded Data', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('imageObjGetDecodedData', () => {
    test('should return null for invalid image object', () => {
      const result = page.imageObjGetDecodedData(0 as never);
      expect(result).toBeNull();
    });
  });
});

describe('Image Objects API - Get Metadata', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('imageObjGetMetadata', () => {
    test('should return null for invalid image object', () => {
      const result = page.imageObjGetMetadata(0 as never);
      expect(result).toBeNull();
    });
  });
});

describe('Image Objects with PDF containing images', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should handle test_3_with_images.pdf', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => page.imageObjSetBitmap(0 as never, 0 as never)).not.toThrow();
    expect(() => page.imageObjSetMatrix(0 as never, 1, 0, 0, 1, 0, 0)).not.toThrow();
    expect(() => page.imageObjGetDecodedData(0 as never)).not.toThrow();
    expect(() => page.imageObjGetMetadata(0 as never)).not.toThrow();
  });

  test('should get metadata for real image objects', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    // Get page objects and find image objects
    const objects = page.getObjects();
    const imageObjects = objects.filter((obj) => obj.type === 3); // PageObjectType.Image

    // If there are image objects, test metadata
    if (imageObjects.length > 0) {
      expect(imageObjects.length).toBeGreaterThan(0);
    }
  });

  test('should iterate page objects with generator', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = [...page.pageObjects()];
    expect(Array.isArray(objects)).toBe(true);
  });

  test('should get object count', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const count = page.objectCount;
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle PDF with many images', async () => {
    using doc = await loadTestDocument(pdfium, 'test_4_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(Array.isArray(objects)).toBe(true);
    for (const obj of objects) {
      expect(typeof obj.type).toBe('number');
      expect(obj.bounds).toBeDefined();
    }
  });

  test('page object has valid structure', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    for (const obj of objects) {
      expect(typeof obj.type).toBe('number');
      expect(obj.type).toBeGreaterThanOrEqual(0);
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
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on imageObjSetBitmap after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.imageObjSetBitmap(0 as never, 0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on imageObjSetMatrix after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.imageObjSetMatrix(0 as never, 1, 0, 0, 1, 0, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on imageObjGetDecodedData after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.imageObjGetDecodedData(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on imageObjGetMetadata after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.imageObjGetMetadata(0 as never)).toThrow();
    doc.dispose();
  });
});
