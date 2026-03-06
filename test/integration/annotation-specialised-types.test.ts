/**
 * Integration tests for specialised annotation types.
 *
 * Tests Line, Ink, Polygon/Polyline, and text-markup annotations using
 * external test fixtures from the chromium/pdfium test corpus.
 */

import { AnnotationType } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

const QUAD_POINT_MARKUP_TYPES = new Set<AnnotationType>([
  AnnotationType.Highlight,
  AnnotationType.Underline,
  AnnotationType.Strikeout,
  AnnotationType.Squiggly,
]);

function isQuadPointMarkup(type: AnnotationType): boolean {
  return QUAD_POINT_MARKUP_TYPES.has(type);
}

describe('Line Annotations', () => {
  test('should load line_annot.pdf and find Line annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/line_annot.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const annotCount = page.annotationCount;
    expect(annotCount).toBe(2);

    const annotations = page.getAnnotations();
    expect(annotations.length).toBe(2);

    for (const annot of annotations) {
      expect(annot.type).toBe(AnnotationType.Line);
      annot.dispose();
    }
  });

  test('should read line endpoints from Line annotation', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/line_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Line);

    const line = annot.getLine();
    expect(line).not.toBeNull();
    expect(line).toBeDefined();

    if (line) {
      expect(typeof line.startX).toBe('number');
      expect(typeof line.startY).toBe('number');
      expect(typeof line.endX).toBe('number');
      expect(typeof line.endY).toBe('number');

      // Values should be finite (not NaN or Infinity)
      expect(Number.isFinite(line.startX)).toBe(true);
      expect(Number.isFinite(line.startY)).toBe(true);
      expect(Number.isFinite(line.endX)).toBe(true);
      expect(Number.isFinite(line.endY)).toBe(true);
    }
  });

  test('should return null for non-Line annotation getLine', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    for (const annot of annotations) {
      if (annot.type !== AnnotationType.Line) {
        const line = annot.getLine();
        expect(line).toBeNull();
      }
      annot.dispose();
    }
  });

  test('should read border from Line annotation', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/line_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    const border = annot.getBorder();
    expect(border).not.toBeNull();

    if (border) {
      expect(typeof border.horizontalRadius).toBe('number');
      expect(typeof border.verticalRadius).toBe('number');
      expect(typeof border.borderWidth).toBe('number');

      expect(Number.isFinite(border.horizontalRadius)).toBe(true);
      expect(Number.isFinite(border.verticalRadius)).toBe(true);
      expect(Number.isFinite(border.borderWidth)).toBe(true);
    }
  });
});

describe('Ink Annotations', () => {
  test('should load ink_annot.pdf and find Ink annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/ink_annot.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const annotCount = page.annotationCount;
    expect(annotCount).toBe(2);

    const annotations = page.getAnnotations();
    expect(annotations.length).toBe(2);

    for (const annot of annotations) {
      expect(annot.type).toBe(AnnotationType.Ink);
      annot.dispose();
    }
  });

  test('should read ink path count', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/ink_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Ink);

    const pathCount = annot.inkPathCount;
    expect(typeof pathCount).toBe('number');
    expect(pathCount).toBeGreaterThanOrEqual(1);
  });

  test('should read ink path points', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/ink_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Ink);
    expect(annot.inkPathCount).toBeGreaterThan(0);

    const path = annot.getInkPath(0);
    expect(path).not.toBeNull();
    expect(path).toBeInstanceOf(Array);

    if (path) {
      expect(path.length).toBeGreaterThan(0);

      for (const point of path) {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  });

  test('should return null for out-of-range ink path index', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/ink_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    const path = annot.getInkPath(999);
    expect(path).toBeNull();
  });

  test('should handle multiple ink annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annotation_ink_multiple.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    let inkCount = 0;

    for (const annot of annotations) {
      if (annot.type === AnnotationType.Ink) {
        inkCount++;
        const pathCount = annot.inkPathCount;
        expect(pathCount).toBeGreaterThanOrEqual(1);

        // Test each path
        for (let i = 0; i < pathCount; i++) {
          const path = annot.getInkPath(i);
          expect(path).not.toBeNull();
          if (path) {
            expect(path.length).toBeGreaterThan(0);
          }
        }

        // Test out of range
        const invalidPath = annot.getInkPath(pathCount);
        expect(invalidPath).toBeNull();
      }
      annot.dispose();
    }

    // The PDF should contain multiple ink annotations
    expect(inkCount).toBeGreaterThan(1);
  });
});

describe('Polygon Annotations', () => {
  test('should load polygon_annot.pdf and find Polygon annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/polygon_annot.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const annotCount = page.annotationCount;
    expect(annotCount).toBe(2);

    const annotations = page.getAnnotations();
    expect(annotations.length).toBe(2);

    for (const annot of annotations) {
      expect(annot.type).toBe(AnnotationType.Polygon);
      annot.dispose();
    }
  });

  test('should read vertices from Polygon annotation', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/polygon_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Polygon);

    const vertices = annot.getVertices();
    expect(vertices).not.toBeNull();
    expect(vertices).toBeInstanceOf(Array);

    if (vertices) {
      expect(vertices.length).toBeGreaterThanOrEqual(3); // Polygon needs at least 3 vertices

      for (const point of vertices) {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  });

  test('should return null for non-Polygon/Polyline annotation vertices', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/line_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Line);

    const vertices = annot.getVertices();
    expect(vertices).toBeNull();
  });
});

describe('Mixed Annotations (annots.pdf)', () => {
  test('should load annots.pdf with multiple annotation types', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const annotCount = page.annotationCount;
    expect(annotCount).toBeGreaterThan(0);
  });

  test('should find and read Link annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    let foundLink = false;

    for (const annot of annotations) {
      if (annot.type === AnnotationType.Link) {
        foundLink = true;

        const link = annot.getLink();
        expect(link).not.toBeNull();

        if (link) {
          expect(typeof link.index).toBe('number');
          expect(link.bounds).toBeDefined();
        }
      }
      annot.dispose();
    }

    expect(foundLink).toBe(true);
  });

  test('should find text-markup annotations with attachment points', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    let foundMarkup = false;

    for (const annot of annotations) {
      if (isQuadPointMarkup(annot.type)) {
        foundMarkup = true;

        const attachmentCount = annot.attachmentPointCount;
        expect(attachmentCount).toBeGreaterThan(0);

        if (attachmentCount > 0) {
          const quad = annot.getAttachmentPoints(0);
          expect(quad).not.toBeNull();

          if (quad) {
            // Quad points have 8 floats (4 points, each with x and y)
            expect(typeof quad.x1).toBe('number');
            expect(typeof quad.y1).toBe('number');
            expect(typeof quad.x2).toBe('number');
            expect(typeof quad.y2).toBe('number');
            expect(typeof quad.x3).toBe('number');
            expect(typeof quad.y3).toBe('number');
            expect(typeof quad.x4).toBe('number');
            expect(typeof quad.y4).toBe('number');

            expect(Number.isFinite(quad.x1)).toBe(true);
            expect(Number.isFinite(quad.y1)).toBe(true);
            expect(Number.isFinite(quad.x2)).toBe(true);
            expect(Number.isFinite(quad.y2)).toBe(true);
            expect(Number.isFinite(quad.x3)).toBe(true);
            expect(Number.isFinite(quad.y3)).toBe(true);
            expect(Number.isFinite(quad.x4)).toBe(true);
            expect(Number.isFinite(quad.y4)).toBe(true);
          }
        }
      }
      annot.dispose();
    }

    expect(foundMarkup).toBe(true);
  });

  test('should return null for out-of-range attachment points', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    let foundMarkup = false;

    for (const annot of annotations) {
      if (isQuadPointMarkup(annot.type)) {
        foundMarkup = true;
        const count = annot.attachmentPointCount;
        const outOfRange = annot.getAttachmentPoints(count + 999);
        expect(outOfRange).toBeNull();
      }
      annot.dispose();
    }

    expect(foundMarkup).toBe(true);
  });
});

describe('Text-Markup Annotations with Long Content', () => {
  test('should load annotation_highlight_long_content.pdf', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annotation_highlight_long_content.pdf');
    expect(doc.pageCount).toBeGreaterThan(0);

    using page = doc.getPage(0);
    const annotCount = page.annotationCount;
    expect(annotCount).toBeGreaterThan(0);
  });

  test('should find text-markup annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annotation_highlight_long_content.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    let foundMarkup = false;

    for (const annot of annotations) {
      if (isQuadPointMarkup(annot.type)) {
        foundMarkup = true;

        const attachmentCount = annot.attachmentPointCount;
        expect(attachmentCount).toBeGreaterThanOrEqual(0);
      }
      annot.dispose();
    }

    expect(foundMarkup).toBe(true);
  });

  test('should read attachment points from text-markup annotation', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annotation_highlight_long_content.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    let foundMarkup = false;

    for (const annot of annotations) {
      if (isQuadPointMarkup(annot.type)) {
        foundMarkup = true;
        const count = annot.attachmentPointCount;

        if (count > 0) {
          const quad = annot.getAttachmentPoints(0);
          expect(quad).not.toBeNull();

          if (quad) {
            // All coordinates should be valid numbers
            const coords = [quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4];
            for (const coord of coords) {
              expect(Number.isFinite(coord)).toBe(true);
            }
          }
        }
      }
      annot.dispose();
    }

    expect(foundMarkup).toBe(true);
  });
});

describe('Annotation Type Safety', () => {
  test('getLine should return null for non-Line annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/ink_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Ink);
    expect(annot.getLine()).toBeNull();
  });

  test('getVertices should return null for Ink annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/ink_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Ink);
    expect(annot.getVertices()).toBeNull();
  });

  test('inkPathCount should be 0 for non-Ink annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/line_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Line);
    expect(annot.inkPathCount).toBe(0);
  });

  test('getInkPath should return null for non-Ink annotations', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/line_annot.pdf');
    using page = doc.getPage(0);
    using annot = page.getAnnotation(0);

    expect(annot.type).toBe(AnnotationType.Line);
    expect(annot.getInkPath(0)).toBeNull();
  });
});

describe('Annotation Bounds and Colour', () => {
  test('all annotations should have valid bounds', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();

    for (const annot of annotations) {
      expect(annot.bounds).toBeDefined();
      expect(typeof annot.bounds.left).toBe('number');
      expect(typeof annot.bounds.top).toBe('number');
      expect(typeof annot.bounds.right).toBe('number');
      expect(typeof annot.bounds.bottom).toBe('number');

      expect(Number.isFinite(annot.bounds.left)).toBe(true);
      expect(Number.isFinite(annot.bounds.top)).toBe(true);
      expect(Number.isFinite(annot.bounds.right)).toBe(true);
      expect(Number.isFinite(annot.bounds.bottom)).toBe(true);

      annot.dispose();
    }
  });

  test('getRect should return valid rect or null', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();

    for (const annot of annotations) {
      const rect = annot.getRect();

      if (rect !== null) {
        expect(Number.isFinite(rect.left)).toBe(true);
        expect(Number.isFinite(rect.top)).toBe(true);
        expect(Number.isFinite(rect.right)).toBe(true);
        expect(Number.isFinite(rect.bottom)).toBe(true);
      }

      annot.dispose();
    }
  });

  test('getColour should return valid colour or null', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();

    for (const annot of annotations) {
      const colour = annot.getColour();

      if (colour !== null) {
        expect(typeof colour.r).toBe('number');
        expect(typeof colour.g).toBe('number');
        expect(typeof colour.b).toBe('number');
        expect(typeof colour.a).toBe('number');

        expect(colour.r).toBeGreaterThanOrEqual(0);
        expect(colour.r).toBeLessThanOrEqual(255);
        expect(colour.g).toBeGreaterThanOrEqual(0);
        expect(colour.g).toBeLessThanOrEqual(255);
        expect(colour.b).toBeGreaterThanOrEqual(0);
        expect(colour.b).toBeLessThanOrEqual(255);
        expect(colour.a).toBeGreaterThanOrEqual(0);
        expect(colour.a).toBeLessThanOrEqual(255);
      }

      annot.dispose();
    }
  });

  test('colour property should match getColour()', async ({ openDocument }) => {
    using doc = await openDocument('pdfium/annots.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();

    for (const annot of annotations) {
      const colourProp = annot.colour;
      const colourMethod = annot.getColour('stroke');

      if (colourProp === null) {
        expect(colourMethod).toBeNull();
      } else if (colourMethod !== null) {
        expect(colourProp.r).toBe(colourMethod.r);
        expect(colourProp.g).toBe(colourMethod.g);
        expect(colourProp.b).toBe(colourMethod.b);
        expect(colourProp.a).toBe(colourMethod.a);
      }

      annot.dispose();
    }
  });
});
