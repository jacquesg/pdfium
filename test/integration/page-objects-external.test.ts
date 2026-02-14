/**
 * Integration tests for page object properties against external test fixtures.
 *
 * Tests clip paths, dash patterns, graphics states, and transparency
 * using PDFs from the chromium/pdfium test corpus.
 */

import { PageObjectType } from '../../src/core/types.js';
import { PDFiumPathObject } from '../../src/document/page-object.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Clip Paths (clip_path.pdf)', () => {
  test('should open clip_path.pdf and find page objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/clip_path.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
  });

  test('should detect clip paths on page objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/clip_path.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    // At least one object should have a clip path
    const hasAnyClipPath = objects.some((obj) => obj.hasClipPath);
    expect(hasAnyClipPath).toBe(true);
  });

  test('should transform clip path without throwing', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/clip_path.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    const clippedObj = objects.find((obj) => obj.hasClipPath);
    expect(clippedObj).toBeDefined();
    if (clippedObj) {
      // Identity transform — should not throw
      expect(() => {
        clippedObj.transformClipPath({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      }).not.toThrow();
    }
  });
});

describe('Dashed Lines (dashed_lines.pdf)', () => {
  test('should open dashed_lines.pdf and find path objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/dashed_lines.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    const pathObjects = objects.filter((obj) => obj.type === PageObjectType.Path);
    expect(pathObjects.length).toBeGreaterThan(0);
  });

  test('should read dash patterns from path objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/dashed_lines.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    const pathObjects = objects.filter((obj) => obj.type === PageObjectType.Path);

    // At least one path object should have a dash pattern
    const dashedPath = pathObjects.find((obj) => obj.dashPattern !== null);
    expect(dashedPath).toBeDefined();
    if (dashedPath) {
      const dash = dashedPath.dashPattern;
      expect(dash).not.toBeNull();
      if (dash) {
        expect(dash.dashArray).toBeInstanceOf(Array);
        expect(dash.phase).toBeTypeOf('number');
      }
    }
  });

  test('should read stroke properties from dashed paths', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/dashed_lines.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    const pathObjects = objects.filter((obj) => obj.type === PageObjectType.Path);

    for (const obj of pathObjects) {
      const strokeWidth = obj.strokeWidth;
      if (strokeWidth !== null) {
        expect(strokeWidth).toBeGreaterThan(0);
      }

      const strokeColour = obj.strokeColour;
      if (strokeColour) {
        expect(strokeColour.r).toBeTypeOf('number');
        expect(strokeColour.g).toBeTypeOf('number');
        expect(strokeColour.b).toBeTypeOf('number');
        expect(strokeColour.a).toBeTypeOf('number');
      }
    }
  });
});

describe('Multiple Graphics States (multiple_graphics_states.pdf)', () => {
  test('should open and find page objects with various properties', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/multiple_graphics_states.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);
  });

  test('should read transparency from page objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/multiple_graphics_states.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    // Check transparency on each object
    for (const obj of objects) {
      // hasTransparency should return a boolean without throwing
      expect(typeof obj.hasTransparency).toBe('boolean');
    }
  });

  test('should read fill and stroke colours from page objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/multiple_graphics_states.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    // At least one object should have a fill colour
    const filledObj = objects.find((obj) => obj.fillColour !== null);
    expect(filledObj).toBeDefined();
    if (filledObj?.fillColour) {
      expect(filledObj.fillColour.r).toBeGreaterThanOrEqual(0);
      expect(filledObj.fillColour.r).toBeLessThanOrEqual(255);
    }
  });

  test('should read matrix from page objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/multiple_graphics_states.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    for (const obj of objects) {
      const matrix = obj.matrix;
      if (matrix) {
        expect(matrix.a).toBeTypeOf('number');
        expect(matrix.b).toBeTypeOf('number');
        expect(matrix.c).toBeTypeOf('number');
        expect(matrix.d).toBeTypeOf('number');
        expect(matrix.e).toBeTypeOf('number');
        expect(matrix.f).toBeTypeOf('number');
      }
    }
  });

  test('should read rotated bounds from page objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/multiple_graphics_states.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    for (const obj of objects) {
      const rotated = obj.rotatedBounds;
      if (rotated) {
        // QuadPoints has 4 points (x1,y1 through x4,y4)
        expect(rotated.x1).toBeTypeOf('number');
        expect(rotated.y1).toBeTypeOf('number');
        expect(rotated.x2).toBeTypeOf('number');
        expect(rotated.y2).toBeTypeOf('number');
        expect(rotated.x3).toBeTypeOf('number');
        expect(rotated.y3).toBeTypeOf('number');
        expect(rotated.x4).toBeTypeOf('number');
        expect(rotated.y4).toBeTypeOf('number');
      }
    }
  });
});

describe('Path Object Properties (dashed_lines.pdf)', () => {
  test('should read draw mode from path objects', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/dashed_lines.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    const pathObj = objects.find((obj): obj is PDFiumPathObject => obj instanceof PDFiumPathObject);
    expect(pathObj).toBeDefined();
    if (pathObj) {
      const drawMode = pathObj.getDrawMode();
      if (drawMode) {
        expect(drawMode.fillMode).toBeDefined();
        expect(drawMode.stroke).toBeTypeOf('boolean');
      }
    }
  });

  test('should enumerate path segments', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/dashed_lines.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    const pathObj = objects.find((obj): obj is PDFiumPathObject => obj instanceof PDFiumPathObject);
    expect(pathObj).toBeDefined();
    if (pathObj) {
      const segmentCount = pathObj.segmentCount;
      expect(segmentCount).toBeGreaterThan(0);

      for (let i = 0; i < segmentCount; i++) {
        const segment = pathObj.getSegment(i);
        expect(segment).toBeDefined();
        if (segment) {
          expect(segment.type).toBeDefined();
          if (segment.point) {
            expect(segment.point.x).toBeTypeOf('number');
            expect(segment.point.y).toBeTypeOf('number');
          }
          expect(segment.isClosing).toBeTypeOf('boolean');
        }
      }
    }
  });
});
