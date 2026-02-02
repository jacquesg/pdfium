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

describe('Page Manipulation API - Rotation', () => {
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

  describe('setRotation', () => {
    test('should not throw', () => {
      expect(() => page.setRotation(PageRotation.None)).not.toThrow();
    });

    test('should accept all rotation values', () => {
      expect(() => page.setRotation(PageRotation.None)).not.toThrow();
      expect(() => page.setRotation(PageRotation.Clockwise90)).not.toThrow();
      expect(() => page.setRotation(PageRotation.Rotate180)).not.toThrow();
      expect(() => page.setRotation(PageRotation.CounterClockwise90)).not.toThrow();
    });
  });
});

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

  describe('removePageObject', () => {
    test('should return boolean for invalid object', () => {
      const result = page.removePageObject(0 as never);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateContent', () => {
    test('should return boolean', () => {
      const result = page.generateContent();
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Page Manipulation API - Page Boxes', () => {
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

  describe('setMediaBox', () => {
    test('should not throw', () => {
      expect(() => page.setMediaBox(0, 0, 612, 792)).not.toThrow();
    });
  });

  describe('setCropBox', () => {
    test('should not throw', () => {
      expect(() => page.setCropBox(0, 0, 612, 792)).not.toThrow();
    });
  });

  describe('setBleedBox', () => {
    test('should not throw', () => {
      expect(() => page.setBleedBox(0, 0, 612, 792)).not.toThrow();
    });
  });

  describe('setTrimBox', () => {
    test('should not throw', () => {
      expect(() => page.setTrimBox(0, 0, 612, 792)).not.toThrow();
    });
  });

  describe('setArtBox', () => {
    test('should not throw', () => {
      expect(() => page.setArtBox(0, 0, 612, 792)).not.toThrow();
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
      expect(() => page.transformAnnotations(1, 0, 0, 1, 0, 0)).not.toThrow();
    });

    test('should handle translation', () => {
      expect(() => page.transformAnnotations(1, 0, 0, 1, 100, 100)).not.toThrow();
    });

    test('should handle scaling', () => {
      expect(() => page.transformAnnotations(2, 0, 0, 2, 0, 0)).not.toThrow();
    });
  });

  describe('transformWithClip', () => {
    test('should return boolean', () => {
      const result = page.transformWithClip([1, 0, 0, 1, 0, 0]);
      expect(typeof result).toBe('boolean');
    });

    test('should accept clip rectangle', () => {
      const result = page.transformWithClip([1, 0, 0, 1, 0, 0], [0, 0, 612, 792]);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Page Manipulation API - Clip Paths', () => {
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

  describe('createClipPath', () => {
    test('should return handle or null', () => {
      const handle = page.createClipPath(0, 0, 612, 792);
      if (handle !== null) {
        expect(typeof handle).toBe('number');
        page.destroyClipPath(handle);
      }
    });
  });

  describe('insertClipPath', () => {
    test('should not throw', () => {
      const handle = page.createClipPath(0, 0, 612, 792);
      if (handle !== null) {
        expect(() => page.insertClipPath(handle)).not.toThrow();
        page.destroyClipPath(handle);
      }
    });
  });

  describe('destroyClipPath', () => {
    test('should not throw for null handle', () => {
      expect(() => page.destroyClipPath(0 as never)).not.toThrow();
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

    expect(() => page.setRotation(PageRotation.None)).not.toThrow();
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

  test('should throw on setRotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setRotation(PageRotation.None)).toThrow();
    doc.dispose();
  });

  test('should throw on flatten after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.flatten()).toThrow();
    doc.dispose();
  });

  test('should throw on hasTransparency after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.hasTransparency()).toThrow();
    doc.dispose();
  });

  test('should throw on removePageObject after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.removePageObject(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on generateContent after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.generateContent()).toThrow();
    doc.dispose();
  });

  test('should throw on setMediaBox after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setMediaBox(0, 0, 612, 792)).toThrow();
    doc.dispose();
  });

  test('should throw on setCropBox after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setCropBox(0, 0, 612, 792)).toThrow();
    doc.dispose();
  });

  test('should throw on setBleedBox after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setBleedBox(0, 0, 612, 792)).toThrow();
    doc.dispose();
  });

  test('should throw on setTrimBox after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setTrimBox(0, 0, 612, 792)).toThrow();
    doc.dispose();
  });

  test('should throw on setArtBox after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setArtBox(0, 0, 612, 792)).toThrow();
    doc.dispose();
  });

  test('should throw on transformAnnotations after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.transformAnnotations(1, 0, 0, 1, 0, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on transformWithClip after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.transformWithClip([1, 0, 0, 1, 0, 0])).toThrow();
    doc.dispose();
  });

  test('should throw on createClipPath after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.createClipPath(0, 0, 612, 792)).toThrow();
    doc.dispose();
  });

  test('should throw on insertClipPath after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.insertClipPath(0 as never)).toThrow();
    doc.dispose();
  });
});
