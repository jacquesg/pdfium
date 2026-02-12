/**
 * Integration tests for path operations API.
 *
 * Tests the FPDFPath_* and FPDFPathSegment_* functions via the PDFiumPathObject wrapper.
 */

import { PathFillMode, PathSegmentType } from '../../src/core/types.js';
import { PDFiumPathObject } from '../../src/document/page-object.js';
import type { PDFium } from '../../src/pdfium.js';
import { describe, expect, test } from '../utils/fixtures.js';

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
  describe('moveTo', () => {
    test('should return boolean', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.moveTo(100, 100);
      expect(result).toBeTypeOf('boolean');
      page.dispose();
      doc.dispose();
    });
  });

  describe('lineTo', () => {
    test('should return boolean', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.lineTo(200, 200);
      expect(result).toBeTypeOf('boolean');
      page.dispose();
      doc.dispose();
    });
  });

  describe('bezierTo', () => {
    test('should return boolean', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.bezierTo(100, 100, 150, 150, 200, 200);
      expect(result).toBeTypeOf('boolean');
      page.dispose();
      doc.dispose();
    });
  });

  describe('closePath', () => {
    test('should return boolean', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.closePath();
      expect(result).toBeTypeOf('boolean');
      page.dispose();
      doc.dispose();
    });
  });
});

describe('Path Operations API - Draw Mode', () => {
  describe('setDrawMode', () => {
    test('should return boolean', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.setDrawMode(PathFillMode.None, false);
      expect(result).toBeTypeOf('boolean');
      page.dispose();
      doc.dispose();
    });

    test('should handle different fill modes', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      expect(() => pathObj!.setDrawMode(PathFillMode.None, false)).not.toThrow();
      expect(() => pathObj!.setDrawMode(PathFillMode.Alternate, false)).not.toThrow();
      expect(() => pathObj!.setDrawMode(PathFillMode.Winding, true)).not.toThrow();
      page.dispose();
      doc.dispose();
    });
  });

  describe('getDrawMode', () => {
    test('should return draw mode object', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.getDrawMode();
      expect(result).not.toBeNull();
      page.dispose();
      doc.dispose();
    });
  });
});

describe('Path Operations API - Segments', () => {
  describe('segmentCount', () => {
    test('should return a number', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.segmentCount;
      expect(result).toBeTypeOf('number');
      page.dispose();
      doc.dispose();
    });
  });

  describe('getSegment', () => {
    test('should return a segment for valid index', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
      }
      page.dispose();
      doc.dispose();
    });

    test('should return null for out-of-bounds index', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const result = pathObj!.getSegment(999);
      expect(result).toBeNull();
      page.dispose();
      doc.dispose();
    });
  });

  describe('segment properties', () => {
    test('segment.point should return a point', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
        if (segment) {
          const point = segment.point;
          expect(point).not.toBeNull();
          if (point) {
            expect(point.x).toBeTypeOf('number');
            expect(point.y).toBeTypeOf('number');
          }
        }
      }
      page.dispose();
      doc.dispose();
    });

    test('segment.type should return a PathSegmentType', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
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
      page.dispose();
      doc.dispose();
    });

    test('segment.isClosing should return a boolean', async ({ pdfium }) => {
      const { doc, page, pathObj } = await createDocWithPath(pdfium);
      expect(pathObj).toBeDefined();
      const count = pathObj!.segmentCount;
      if (count > 0) {
        const segment = pathObj!.getSegment(0);
        expect(segment).not.toBeNull();
        if (segment) {
          expect(segment.isClosing).toBeTypeOf('boolean');
        }
      }
      page.dispose();
      doc.dispose();
    });
  });
});

describe('Path Operations with page objects', () => {
  test('should count page objects', async ({ testPage }) => {
    const objects = testPage.getObjects();
    expect(objects).toBeInstanceOf(Array);
  });

  test('objects() returns a generator', async ({ testPage }) => {
    const gen = testPage.objects();
    expect(gen[Symbol.iterator]).toBeDefined();
    expect(gen.next).toBeTypeOf('function');
  });

  test('objects() yields same objects as getObjects()', async ({ testPage }) => {
    const fromGenerator = [...testPage.objects()];
    const fromArray = testPage.getObjects();
    expect(fromGenerator).toEqual(fromArray);
  });

  test('objects() is lazy - can break early', async ({ testPage }) => {
    const gen = testPage.objects();
    const first = gen.next();
    // Test that we can iterate without exhausting
    if (!first.done) {
      expect(first.value).toHaveProperty('type');
    }
  });
});

describe('Path Operations with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(objects).toBeInstanceOf(Array);

    const pathObj = objects.find((o): o is PDFiumPathObject => o instanceof PDFiumPathObject);
    if (pathObj) {
      expect(pathObj.segmentCount).toBeTypeOf('number');
      expect(pathObj.moveTo(100, 100)).toBe(true);
    }
  });
});

describe('Path Operations with Created Document', () => {
  test('should handle path operations on created rectangle', async ({ pdfium }) => {
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
          expect(point.x).toBeTypeOf('number');
          expect(point.y).toBeTypeOf('number');
        }

        const type = segment.type;
        expect(type).toBeTypeOf('string');

        const close = segment.isClosing;
        expect(close).toBeTypeOf('boolean');
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
  test('should throw on moveTo after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.moveTo(100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on lineTo after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.lineTo(200, 200)).toThrow();
    doc.dispose();
  });

  test('should throw on bezierTo after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.bezierTo(100, 100, 150, 150, 200, 200)).toThrow();
    doc.dispose();
  });

  test('should throw on closePath after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.closePath()).toThrow();
    doc.dispose();
  });

  test('should throw on setDrawMode after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.setDrawMode(PathFillMode.None, false)).toThrow();
    doc.dispose();
  });

  test('should throw on getDrawMode after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.getDrawMode()).toThrow();
    doc.dispose();
  });

  test('should throw on segmentCount after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.segmentCount).toThrow();
    doc.dispose();
  });

  test('should throw on getSegment after page dispose', async ({ pdfium }) => {
    const { doc, page, pathObj } = await createDocWithPath(pdfium);
    expect(pathObj).toBeDefined();
    page.dispose();
    expect(() => pathObj!.getSegment(0)).toThrow();
    doc.dispose();
  });
});
