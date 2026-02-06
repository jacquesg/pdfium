/**
 * Integration tests for extended page object API.
 *
 * Tests the page object wrapper properties and methods (fillColour, strokeColour, etc.).
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { BlendMode, LineCapStyle, LineJoinStyle } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFiumPageObject } from '../../src/document/page-object.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Page Objects with Real Objects', () => {
  test('should handle object properties on test_1.pdf (Text objects)', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    for (const obj of objects) {
      // Test getters that should work on any object (or return default/null)
      const fill = obj.fillColour;
      if (fill) {
        expect(typeof fill.r).toBe('number');
        expect(typeof fill.g).toBe('number');
        expect(typeof fill.b).toBe('number');
        expect(typeof fill.a).toBe('number');
      }

      const stroke = obj.strokeColour;
      if (stroke) {
        expect(typeof stroke.r).toBe('number');
      }

      const strokeWidth = obj.strokeWidth;
      if (strokeWidth !== null) {
        expect(typeof strokeWidth).toBe('number');
      }

      const matrix = obj.matrix;
      if (matrix) {
        expect(typeof matrix.a).toBe('number');
      }

      // Line cap/join might return defaults
      const lineCap = obj.lineCap;
      expect(typeof lineCap).toBe('string');

      const lineJoin = obj.lineJoin;
      expect(typeof lineJoin).toBe('string');

      // Dash pattern
      const _dash = obj.dashPattern;
      // Might be null or empty

      // Set and read back dash pattern to cover buffer logic
      const newDash = { dashArray: [3, 3], phase: 0 };
      const setSuccess = obj.setDashPattern(newDash);
      expect(setSuccess).toBe(true);

      const checkDash = obj.dashPattern;
      expect(checkDash).not.toBeNull();
      if (checkDash) {
        expect(checkDash.dashArray.length).toBe(2);
        expect(checkDash.dashArray[0]).toBeCloseTo(3);
        expect(checkDash.dashArray[1]).toBeCloseTo(3);
      }

      // Rotated bounds
      const bounds = obj.rotatedBounds;
      if (bounds) {
        expect(typeof bounds.x1).toBe('number');
      }
    }
  });
});

describe('Extended Page Objects API - Colour Operations', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('fillColour', () => {
    test('should return null or a valid colour', () => {
      const result = obj.fillColour;
      if (result !== null) {
        expect(typeof result.r).toBe('number');
        expect(typeof result.g).toBe('number');
        expect(typeof result.b).toBe('number');
        expect(typeof result.a).toBe('number');
      }
    });
  });

  describe('strokeColour', () => {
    test('should return null or a valid colour', () => {
      const result = obj.strokeColour;
      if (result !== null) {
        expect(typeof result.r).toBe('number');
        expect(typeof result.g).toBe('number');
        expect(typeof result.b).toBe('number');
        expect(typeof result.a).toBe('number');
      }
    });
  });

  describe('strokeWidth', () => {
    test('should return null or a number', () => {
      const result = obj.strokeWidth;
      if (result !== null) {
        expect(typeof result).toBe('number');
      }
    });
  });
});

describe('Extended Page Objects API - Matrix Operations', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('matrix', () => {
    test('should return null or a valid matrix', () => {
      const result = obj.matrix;
      if (result !== null) {
        expect(typeof result.a).toBe('number');
      }
    });
  });

  describe('setMatrix', () => {
    test('should return boolean', () => {
      const result = obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      expect(typeof result).toBe('boolean');
    });

    test('should handle identity matrix', () => {
      expect(() => obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle scale matrix', () => {
      expect(() => obj.setMatrix({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle translation matrix', () => {
      expect(() => obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 100, f: 100 })).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Line Styles', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('lineCap', () => {
    test('should return a LineCapStyle value', () => {
      const result = obj.lineCap;
      expect([LineCapStyle.Butt, LineCapStyle.Round, LineCapStyle.Square]).toContain(result);
    });
  });

  describe('setLineCap', () => {
    test('should return boolean', () => {
      const result = obj.setLineCap(LineCapStyle.Butt);
      expect(typeof result).toBe('boolean');
    });

    test('should handle all cap styles', () => {
      expect(() => obj.setLineCap(LineCapStyle.Butt)).not.toThrow();
      expect(() => obj.setLineCap(LineCapStyle.Round)).not.toThrow();
      expect(() => obj.setLineCap(LineCapStyle.Square)).not.toThrow();
    });
  });

  describe('lineJoin', () => {
    test('should return a LineJoinStyle value', () => {
      const result = obj.lineJoin;
      expect([LineJoinStyle.Miter, LineJoinStyle.Round, LineJoinStyle.Bevel]).toContain(result);
    });
  });

  describe('setLineJoin', () => {
    test('should return boolean', () => {
      const result = obj.setLineJoin(LineJoinStyle.Miter);
      expect(typeof result).toBe('boolean');
    });

    test('should handle all join styles', () => {
      expect(() => obj.setLineJoin(LineJoinStyle.Miter)).not.toThrow();
      expect(() => obj.setLineJoin(LineJoinStyle.Round)).not.toThrow();
      expect(() => obj.setLineJoin(LineJoinStyle.Bevel)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Dash Pattern', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('dashPattern', () => {
    test('should return null or a valid dash pattern', () => {
      const result = obj.dashPattern;
      if (result !== null) {
        expect(Array.isArray(result.dashArray)).toBe(true);
        expect(typeof result.phase).toBe('number');
      }
    });
  });

  describe('setDashPattern', () => {
    test('should return boolean', () => {
      const result = obj.setDashPattern({ dashArray: [5, 3], phase: 0 });
      expect(typeof result).toBe('boolean');
    });

    test('should handle empty dash array', () => {
      expect(() => obj.setDashPattern({ dashArray: [], phase: 0 })).not.toThrow();
    });

    test('should handle various dash patterns', () => {
      expect(() => obj.setDashPattern({ dashArray: [5], phase: 0 })).not.toThrow();
      expect(() => obj.setDashPattern({ dashArray: [5, 3], phase: 2 })).not.toThrow();
      expect(() => obj.setDashPattern({ dashArray: [1, 2, 3, 4], phase: 1 })).not.toThrow();
    });
  });

  describe('setDashPhase', () => {
    test('should return boolean', () => {
      const result = obj.setDashPhase(0);
      expect(typeof result).toBe('boolean');
    });

    test('should handle different phase values', () => {
      expect(() => obj.setDashPhase(0)).not.toThrow();
      expect(() => obj.setDashPhase(5)).not.toThrow();
      expect(() => obj.setDashPhase(10.5)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Object Management', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('hasTransparency', () => {
    test('should return a boolean', () => {
      const result = obj.hasTransparency;
      expect(typeof result).toBe('boolean');
    });
  });

  describe('setBlendMode', () => {
    test('should not throw', () => {
      expect(() => obj.setBlendMode(BlendMode.Normal)).not.toThrow();
    });

    test('should handle different blend modes', () => {
      expect(() => obj.setBlendMode(BlendMode.Normal)).not.toThrow();
      expect(() => obj.setBlendMode(BlendMode.Multiply)).not.toThrow();
      expect(() => obj.setBlendMode(BlendMode.Screen)).not.toThrow();
      expect(() => obj.setBlendMode(BlendMode.Overlay)).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Clip Path', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('hasClipPath', () => {
    test('should return a boolean', () => {
      const result = obj.hasClipPath;
      expect(typeof result).toBe('boolean');
    });
  });

  describe('transformClipPath', () => {
    test('should not throw', () => {
      expect(() => obj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle identity transform', () => {
      expect(() => obj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle scale transform', () => {
      expect(() => obj.transformClipPath({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });
  });
});

describe('Extended Page Objects API - Rotated Bounds', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let obj: PDFiumPageObject;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
    obj = objects[0]!;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('rotatedBounds', () => {
    test('should return null or valid quad points', () => {
      const result = obj.rotatedBounds;
      if (result !== null) {
        expect(typeof result.x1).toBe('number');
      }
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

    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    const obj = objects[0]!;
    expect(() => obj.fillColour).not.toThrow();
    expect(() => obj.lineCap).not.toThrow();
    expect(() => obj.dashPattern).not.toThrow();
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

  test('should throw on fillColour after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.fillColour).toThrow();
  });

  test('should throw on strokeColour after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.strokeColour).toThrow();
  });

  test('should throw on strokeWidth after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.strokeWidth).toThrow();
  });

  test('should throw on matrix after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.matrix).toThrow();
  });

  test('should throw on setMatrix after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setMatrix({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });

  test('should throw on lineCap after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.lineCap).toThrow();
  });

  test('should throw on setLineCap after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setLineCap(LineCapStyle.Butt)).toThrow();
  });

  test('should throw on lineJoin after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.lineJoin).toThrow();
  });

  test('should throw on setLineJoin after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setLineJoin(LineJoinStyle.Miter)).toThrow();
  });

  test('should throw on dashPattern after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.dashPattern).toThrow();
  });

  test('should throw on setDashPattern after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setDashPattern({ dashArray: [], phase: 0 })).toThrow();
  });

  test('should throw on setDashPhase after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setDashPhase(0)).toThrow();
  });

  test('should throw on destroy after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.destroy()).toThrow();
  });

  test('should throw on hasTransparency after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.hasTransparency).toThrow();
  });

  test('should throw on setBlendMode after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.setBlendMode(BlendMode.Normal)).toThrow();
  });

  test('should throw on hasClipPath after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.hasClipPath).toThrow();
  });

  test('should throw on transformClipPath after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });

  test('should throw on rotatedBounds after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const obj = objects[0]!;
    page.dispose();
    expect(() => obj.rotatedBounds).toThrow();
  });
});
