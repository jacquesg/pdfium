/**
 * Integration tests for path operations API.
 *
 * Tests the FPDFPath_* and FPDFPathSegment_* functions via the PDFiumPathObject wrapper.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PathFillMode, PathSegmentType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import { PDFiumPathObject } from '../../src/document/page-object.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

/**
 * Helper: create a document with a rectangle path, reopen it, and return
 * the document, page, and the first PDFiumPathObject found.
 */
async function createDocWithPath(pdfium: PDFium) {
  using builder = pdfium.createDocument();
  const builderPage = builder.addPage();
  builderPage.addRectangle(10, 10, 100, 100, {
    stroke: { r: 0, g: 0, b: 0, a: 255 },
    strokeWidth: 1,
  });
  const bytes = builder.save();

  const doc = await pdfium.openDocument(bytes);
  const page = doc.getPage(0);
  const objects = page.getObjects();
  const pathObj = objects.find((o): o is PDFiumPathObject => o instanceof PDFiumPathObject);

  return { doc, page, pathObj };
}

describe('Path Operations API - Basic Operations', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let pathObj: PDFiumPathObject | undefined;

  beforeAll(async () => {
    pdfium = await initPdfium();
    const result = await createDocWithPath(pdfium);
    document = result.doc;
    page = result.page;
    pathObj = result.pathObj;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('moveTo', () => {
    test('should return boolean', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.moveTo(100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('lineTo', () => {
    test('should return boolean', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.lineTo(200, 200);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('bezierTo', () => {
    test('should return boolean', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.bezierTo(100, 100, 150, 150, 200, 200);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('closePath', () => {
    test('should return boolean', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.closePath();
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Path Operations API - Draw Mode', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let pathObj: PDFiumPathObject | undefined;

  beforeAll(async () => {
    pdfium = await initPdfium();
    const result = await createDocWithPath(pdfium);
    document = result.doc;
    page = result.page;
    pathObj = result.pathObj;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('setDrawMode', () => {
    test('should return boolean', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.setDrawMode(PathFillMode.None, false);
      expect(typeof result).toBe('boolean');
    });

    test('should handle different fill modes', () => {
      expect(pathObj).toBeDefined();
      expect(() => pathObj!.setDrawMode(PathFillMode.None, false)).not.toThrow();
      expect(() => pathObj!.setDrawMode(PathFillMode.Alternate, false)).not.toThrow();
      expect(() => pathObj!.setDrawMode(PathFillMode.Winding, true)).not.toThrow();
    });
  });

  describe('getDrawMode', () => {
    test('should return draw mode object', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.getDrawMode();
      expect(result).not.toBeNull();
    });
  });
});

describe('Path Operations API - Segments', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let pathObj: PDFiumPathObject | undefined;

  beforeAll(async () => {
    pdfium = await initPdfium();
    const result = await createDocWithPath(pdfium);
    document = result.doc;
    page = result.page;
    pathObj = result.pathObj;
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('segmentCount', () => {
    test('should return a number', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.segmentCount;
      expect(typeof result).toBe('number');
    });
  });

  describe('getSegment', () => {
    test('should return a segment for valid index', () => {
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
      }
    });

    test('should return null for out-of-bounds index', () => {
      expect(pathObj).toBeDefined();
      const result = pathObj!.getSegment(999);
      expect(result).toBeNull();
    });
  });

  describe('segment properties', () => {
    test('segment.point should return a point', () => {
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
        if (segment) {
          const point = segment.point;
          expect(point).not.toBeNull();
          if (point) {
            expect(typeof point.x).toBe('number');
            expect(typeof point.y).toBe('number');
          }
        }
      }
    });

    test('segment.type should return a PathSegmentType', () => {
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
        if (segment) {
          expect([
            PathSegmentType.Unknown,
            PathSegmentType.LineTo,
            PathSegmentType.BezierTo,
            PathSegmentType.MoveTo,
          ]).toContain(segment.type);
        }
      }
    });

    test('segment.isClosing should return a boolean', () => {
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
        if (segment) {
          expect(typeof segment.isClosing).toBe('boolean');
        }
      }
    });
  });
});

describe('Path Operations with page objects', () => {
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

  test('should count page objects', () => {
    const objects = page.getObjects();
    expect(Array.isArray(objects)).toBe(true);
  });

  test('objects() returns a generator', () => {
    const gen = page.objects();
    expect(gen[Symbol.iterator]).toBeDefined();
    expect(typeof gen.next).toBe('function');
  });

  test('objects() yields same objects as getObjects()', () => {
    const fromGenerator = [...page.objects()];
    const fromArray = page.getObjects();
    expect(fromGenerator).toEqual(fromArray);
  });

  test('objects() is lazy - can break early', () => {
    const gen = page.objects();
    const first = gen.next();
    // Test that we can iterate without exhausting
    if (!first.done) {
      expect(first.value).toHaveProperty('type');
    }
  });
});

describe('Path Operations with different PDFs', () => {
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
    expect(Array.isArray(objects)).toBe(true);

    const pathObj = objects.find((o): o is PDFiumPathObject => o instanceof PDFiumPathObject);
    if (pathObj) {
      expect(typeof pathObj.segmentCount).toBe('number');
      expect(pathObj.moveTo(100, 100)).toBe(true);
    }
  });
});

describe('Path Operations with Created Document', () => {
  test('should handle path operations on created rectangle', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    const builderPage = builder.addPage();
    builderPage.addRectangle(10, 10, 100, 100, {
      stroke: { r: 0, g: 0, b: 0, a: 255 },
      strokeWidth: 1,
    });
    const bytes = builder.save();

    using doc = await pdfium.openDocument(bytes);
    using page = doc.getPage(0);
    const objects = page.getObjects();
    const pathObj = objects.find((o): o is PDFiumPathObject => o instanceof PDFiumPathObject);

    expect(pathObj).toBeDefined();

    if (pathObj) {
      const segmentCount = pathObj.segmentCount;
      expect(segmentCount).toBeGreaterThan(0);

      const segment = pathObj.getSegment(0);
      expect(segment).not.toBeNull();

      if (segment) {
        const point = segment.point;
        expect(point).not.toBeNull();
        if (point) {
          expect(typeof point.x).toBe('number');
          expect(typeof point.y).toBe('number');
        }

        const type = segment.type;
        expect(typeof type).toBe('string');

        const close = segment.isClosing;
        expect(typeof close).toBe('boolean');
      }

      // Modify existing path
      expect(pathObj.moveTo(0, 0)).toBe(true);
      expect(pathObj.lineTo(10, 10)).toBe(true);
      expect(pathObj.bezierTo(10, 10, 20, 20, 30, 30)).toBe(true);
      expect(pathObj.closePath()).toBe(true);

      // Check draw mode
      const drawMode = pathObj.getDrawMode();
      expect(drawMode).not.toBeNull();
    }
  });
});

describe('Path Operations post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on moveTo after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.moveTo(100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on lineTo after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.lineTo(200, 200)).toThrow();
    doc.dispose();
  });

  test('should throw on bezierTo after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.bezierTo(100, 100, 150, 150, 200, 200)).toThrow();
    doc.dispose();
  });

  test('should throw on closePath after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.closePath()).toThrow();
    doc.dispose();
  });

  test('should throw on setDrawMode after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.setDrawMode(PathFillMode.None, false)).toThrow();
    doc.dispose();
  });

  test('should throw on getDrawMode after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.getDrawMode()).toThrow();
    doc.dispose();
  });

  test('should throw on segmentCount after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.segmentCount).toThrow();
    doc.dispose();
  });

  test('should throw on getSegment after page dispose', async () => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.getSegment(0)).toThrow();
    doc.dispose();
  });
});
