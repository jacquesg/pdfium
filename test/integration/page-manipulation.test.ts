/**
 * Integration tests for page manipulation API.
 *
 * Tests the FPDFPage_Set*, FPDFPage_Flatten, and page transformation functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { FlattenFlags, FlattenResult, PageRotation } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Page Manipulation API - Flatten', () => {
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

  describe('flatten', () => {
    test('should return FlattenResult', () => {
      const result = page.flatten();
      expect([FlattenResult.Fail, FlattenResult.Success, FlattenResult.NothingToDo]).toContain(result);
    });

    test('should accept flatten flags', () => {
      expect(() => page.flatten(FlattenFlags.NormalDisplay)).not.toThrow();
      expect(() => page.flatten(FlattenFlags.Print)).not.toThrow();
    });
  });
});

describe('Page Manipulation API - Transparency', () => {
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

  describe('hasTransparency', () => {
    test('should return boolean', () => {
      const result = page.hasTransparency();
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Page Manipulation API - Page Objects', () => {
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

  describe('generateContent', () => {
    test('should return boolean', () => {
      const result = page.generateContent();
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Page Manipulation API - Transformations', () => {
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

  describe('transformAnnotations', () => {
    test('should not throw', () => {
      // Identity matrix
      expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle translation', () => {
      expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 100, f: 100 })).not.toThrow();
    });

    test('should handle scaling', () => {
      expect(() => page.transformAnnotations({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });
  });

  describe('transformWithClip', () => {
    test('should return boolean', () => {
      const result = page.transformWithClip({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      expect(typeof result).toBe('boolean');
    });

    test('should accept clip rectangle', () => {
      const result = page.transformWithClip(
        { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        { left: 0, bottom: 0, right: 612, top: 792 },
      );
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Page Manipulation with different PDFs', () => {
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

    expect(() => {
      page.rotation = PageRotation.None;
    }).not.toThrow();
    expect(() => page.hasTransparency()).not.toThrow();
    expect(() => page.flatten()).not.toThrow();
  });
});

describe('Page Manipulation post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on flatten after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.flatten()).toThrow();
  });

  test('should throw on hasTransparency after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.hasTransparency()).toThrow();
  });

  test('should throw on generateContent after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.generateContent()).toThrow();
  });

  test('should throw on transformAnnotations after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });

  test('should throw on transformWithClip after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.transformWithClip({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });
});
