/**
 * Integration tests for extended page object API.
 *
 * Tests the FPDFPageObj_Get*, FPDFPageObj_Set* functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { BlendMode, LineCapStyle, LineJoinStyle } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Page Objects API - Colour Operations', () => {
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

  describe('pageObjGetFillColour', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetFillColour(0 as never);
      expect(result).toBeNull();
    });
  });

  describe('pageObjGetStrokeColour', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetStrokeColour(0 as never);
      expect(result).toBeNull();
    });
  });

  describe('pageObjGetStrokeWidth', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetStrokeWidth(0 as never);
      expect(result).toBeNull();
    });
  });
});

describe('Extended Page Objects API - Matrix Operations', () => {
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

  describe('pageObjGetMatrix', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetMatrix(0 as never);
      expect(result).toBeNull();
    });
  });

  describe('pageObjSetMatrix', () => {
    test('should return boolean for invalid object', () => {
      const result = page.pageObjSetMatrix(0 as never, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      expect(typeof result).toBe('boolean');
    });

    test('should handle identity matrix', () => {
      expect(() => page.pageObjSetMatrix(0 as never, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle scale matrix', () => {
      expect(() => page.pageObjSetMatrix(0 as never, { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle translation matrix', () => {
      expect(() => page.pageObjSetMatrix(0 as never, { a: 1, b: 0, c: 0, d: 1, e: 100, f: 100 })).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Line Styles', () => {
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

  describe('pageObjGetLineCap', () => {
    test('should return LineCapStyle for invalid object', () => {
      const result = page.pageObjGetLineCap(0 as never);
      expect([LineCapStyle.Butt, LineCapStyle.Round, LineCapStyle.Square]).toContain(result);
    });
  });

  describe('pageObjSetLineCap', () => {
    test('should return boolean', () => {
      const result = page.pageObjSetLineCap(0 as never, LineCapStyle.Butt);
      expect(typeof result).toBe('boolean');
    });

    test('should handle all cap styles', () => {
      expect(() => page.pageObjSetLineCap(0 as never, LineCapStyle.Butt)).not.toThrow();
      expect(() => page.pageObjSetLineCap(0 as never, LineCapStyle.Round)).not.toThrow();
      expect(() => page.pageObjSetLineCap(0 as never, LineCapStyle.Square)).not.toThrow();
    });
  });

  describe('pageObjGetLineJoin', () => {
    test('should return LineJoinStyle for invalid object', () => {
      const result = page.pageObjGetLineJoin(0 as never);
      expect([LineJoinStyle.Miter, LineJoinStyle.Round, LineJoinStyle.Bevel]).toContain(result);
    });
  });

  describe('pageObjSetLineJoin', () => {
    test('should return boolean', () => {
      const result = page.pageObjSetLineJoin(0 as never, LineJoinStyle.Miter);
      expect(typeof result).toBe('boolean');
    });

    test('should handle all join styles', () => {
      expect(() => page.pageObjSetLineJoin(0 as never, LineJoinStyle.Miter)).not.toThrow();
      expect(() => page.pageObjSetLineJoin(0 as never, LineJoinStyle.Round)).not.toThrow();
      expect(() => page.pageObjSetLineJoin(0 as never, LineJoinStyle.Bevel)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Dash Pattern', () => {
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

  describe('pageObjGetDashPattern', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetDashPattern(0 as never);
      expect(result).toBeNull();
    });
  });

  describe('pageObjSetDashPattern', () => {
    test('should return boolean', () => {
      const result = page.pageObjSetDashPattern(0 as never, { dashArray: [5, 3], phase: 0 });
      expect(typeof result).toBe('boolean');
    });

    test('should handle empty dash array', () => {
      expect(() => page.pageObjSetDashPattern(0 as never, { dashArray: [], phase: 0 })).not.toThrow();
    });

    test('should handle various dash patterns', () => {
      expect(() => page.pageObjSetDashPattern(0 as never, { dashArray: [5], phase: 0 })).not.toThrow();
      expect(() => page.pageObjSetDashPattern(0 as never, { dashArray: [5, 3], phase: 2 })).not.toThrow();
      expect(() => page.pageObjSetDashPattern(0 as never, { dashArray: [1, 2, 3, 4], phase: 1 })).not.toThrow();
    });
  });

  describe('pageObjSetDashPhase', () => {
    test('should return boolean', () => {
      const result = page.pageObjSetDashPhase(0 as never, 0);
      expect(typeof result).toBe('boolean');
    });

    test('should handle different phase values', () => {
      expect(() => page.pageObjSetDashPhase(0 as never, 0)).not.toThrow();
      expect(() => page.pageObjSetDashPhase(0 as never, 5)).not.toThrow();
      expect(() => page.pageObjSetDashPhase(0 as never, 10.5)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Object Management', () => {
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

  describe('pageObjDestroy', () => {
    test('should not throw for invalid object', () => {
      expect(() => page.pageObjDestroy(0 as never)).not.toThrow();
    });
  });

  describe('pageObjHasTransparency', () => {
    test('should return boolean for invalid object', () => {
      const result = page.pageObjHasTransparency(0 as never);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('pageObjSetBlendMode', () => {
    test('should not throw for invalid object', () => {
      expect(() => page.pageObjSetBlendMode(0 as never, BlendMode.Normal)).not.toThrow();
    });

    test('should handle different blend modes', () => {
      expect(() => page.pageObjSetBlendMode(0 as never, BlendMode.Normal)).not.toThrow();
      expect(() => page.pageObjSetBlendMode(0 as never, BlendMode.Multiply)).not.toThrow();
      expect(() => page.pageObjSetBlendMode(0 as never, BlendMode.Screen)).not.toThrow();
      expect(() => page.pageObjSetBlendMode(0 as never, BlendMode.Overlay)).not.toThrow();
    });
  });

  describe('pageObjNewImage', () => {
    test('should return handle or null', () => {
      const handle = page.pageObjNewImage();
      if (handle !== null) {
        expect(typeof handle).toBe('number');
        page.pageObjDestroy(handle);
      }
    });
  });
});

describe('Extended Page Objects API - Clip Path', () => {
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

  describe('pageObjGetClipPath', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetClipPath(0 as never);
      expect(result).toBeNull();
    });
  });

  describe('pageObjTransformClipPath', () => {
    test('should not throw for invalid object', () => {
      expect(() => page.pageObjTransformClipPath(0 as never, 1, 0, 0, 1, 0, 0)).not.toThrow();
    });

    test('should handle identity transform', () => {
      expect(() => page.pageObjTransformClipPath(0 as never, 1, 0, 0, 1, 0, 0)).not.toThrow();
    });

    test('should handle scale transform', () => {
      expect(() => page.pageObjTransformClipPath(0 as never, 2, 0, 0, 2, 0, 0)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Rotated Bounds', () => {
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

  describe('pageObjGetRotatedBounds', () => {
    test('should return null for invalid object', () => {
      const result = page.pageObjGetRotatedBounds(0 as never);
      expect(result).toBeNull();
    });
  });
});

describe('Extended Page Objects with different PDFs', () => {
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

    expect(() => page.pageObjGetFillColour(0 as never)).not.toThrow();
    expect(() => page.pageObjGetLineCap(0 as never)).not.toThrow();
    expect(() => page.pageObjGetDashPattern(0 as never)).not.toThrow();
  });
});

describe('Extended Page Objects post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on pageObjGetFillColour after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetFillColour(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetStrokeColour after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetStrokeColour(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetStrokeWidth after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetStrokeWidth(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetMatrix after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetMatrix(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjSetMatrix after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjSetMatrix(0 as never, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetLineCap after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetLineCap(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjSetLineCap after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjSetLineCap(0 as never, LineCapStyle.Butt)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetLineJoin after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetLineJoin(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjSetLineJoin after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjSetLineJoin(0 as never, LineJoinStyle.Miter)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetDashPattern after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetDashPattern(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjSetDashPattern after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjSetDashPattern(0 as never, { dashArray: [], phase: 0 })).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjSetDashPhase after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjSetDashPhase(0 as never, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjDestroy after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjDestroy(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjHasTransparency after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjHasTransparency(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjSetBlendMode after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjSetBlendMode(0 as never, BlendMode.Normal)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjNewImage after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjNewImage()).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetClipPath after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetClipPath(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjTransformClipPath after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjTransformClipPath(0 as never, 1, 0, 0, 1, 0, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on pageObjGetRotatedBounds after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.pageObjGetRotatedBounds(0 as never)).toThrow();
    doc.dispose();
  });
});
