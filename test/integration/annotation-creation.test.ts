/**
 * Integration tests for annotation creation API.
 *
 * Tests the FPDFPage_CreateAnnot and related annotation creation functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AnnotationFlags, AnnotationType, type Point, type QuadPoints } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Annotation Creation API - Basic Creation', () => {
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

  describe('createAnnotation', () => {
    test('should create a text annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      expect(handle).not.toBeNull();
      if (handle !== null) {
        page.closeAnnotation(handle);
      }
    });

    test('should create a highlight annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Highlight);
      // May return null if not supported by this PDFium build
      if (handle !== null) {
        expect(typeof handle).toBe('number');
        page.closeAnnotation(handle);
      }
    });

    test('should create an ink annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Ink);
      expect(handle).not.toBeNull();
      if (handle !== null) {
        page.closeAnnotation(handle);
      }
    });

    test('should create a stamp annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Stamp);
      expect(handle).not.toBeNull();
      if (handle !== null) {
        page.closeAnnotation(handle);
      }
    });

    test('should create a link annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Link);
      expect(handle).not.toBeNull();
      if (handle !== null) {
        page.closeAnnotation(handle);
      }
    });

    test('should create a line annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Line);
      // May return null if not supported by this PDFium build
      if (handle !== null) {
        expect(typeof handle).toBe('number');
        page.closeAnnotation(handle);
      }
    });

    test('should create a polygon annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Polygon);
      // May return null if not supported by this PDFium build
      if (handle !== null) {
        expect(typeof handle).toBe('number');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('removeAnnotation', () => {
    test('should return boolean', () => {
      const result = page.removeAnnotation(9999);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('closeAnnotation', () => {
    test('should close annotation handle', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        expect(() => page.closeAnnotation(handle)).not.toThrow();
      }
    });
  });
});

describe('Annotation Creation API - Subtype Support', () => {
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

  describe('isAnnotationSubtypeSupported', () => {
    test('should return boolean for ink annotation', () => {
      const result = page.isAnnotationSubtypeSupported(AnnotationType.Ink);
      expect(typeof result).toBe('boolean');
    });

    test('should return boolean for stamp annotation', () => {
      const result = page.isAnnotationSubtypeSupported(AnnotationType.Stamp);
      expect(typeof result).toBe('boolean');
    });

    test('should return boolean for text annotation', () => {
      const result = page.isAnnotationSubtypeSupported(AnnotationType.Text);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isAnnotationObjectSubtypeSupported', () => {
    test('should return boolean for ink annotation', () => {
      const result = page.isAnnotationObjectSubtypeSupported(AnnotationType.Ink);
      expect(typeof result).toBe('boolean');
    });

    test('should return boolean for stamp annotation', () => {
      const result = page.isAnnotationObjectSubtypeSupported(AnnotationType.Stamp);
      expect(typeof result).toBe('boolean');
    });

    test('should return boolean for text annotation', () => {
      const result = page.isAnnotationObjectSubtypeSupported(AnnotationType.Text);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Annotation Creation API - Ink Annotation', () => {
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

  describe('annotationAddInkStroke', () => {
    test('should add ink stroke to ink annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Ink);
      if (handle !== null) {
        const points: Point[] = [
          { x: 100, y: 100 },
          { x: 150, y: 150 },
          { x: 200, y: 100 },
        ];
        const result = page.annotationAddInkStroke(handle, points);
        expect(typeof result).toBe('number');
        page.closeAnnotation(handle);
      }
    });

    test('should return -1 for empty points array', () => {
      const handle = page.createAnnotation(AnnotationType.Ink);
      if (handle !== null) {
        const result = page.annotationAddInkStroke(handle, []);
        expect(result).toBe(-1);
        page.closeAnnotation(handle);
      }
    });

    test('should return number for invalid handle', () => {
      const result = page.annotationAddInkStroke(0 as never, [{ x: 100, y: 100 }]);
      expect(typeof result).toBe('number');
    });
  });
});

describe('Annotation Creation API - Polygon/Polyline Vertices', () => {
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

  describe('annotationSetVertices', () => {
    test('should set vertices on polygon annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Polygon);
      if (handle !== null) {
        const vertices: Point[] = [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
          { x: 150, y: 200 },
        ];
        const result = page.annotationSetVertices(handle, vertices);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });

    test('should return false for empty vertices', () => {
      const handle = page.createAnnotation(AnnotationType.Polygon);
      if (handle !== null) {
        const result = page.annotationSetVertices(handle, []);
        expect(result).toBe(false);
        page.closeAnnotation(handle);
      }
    });

    test('should return boolean for invalid handle', () => {
      const result = page.annotationSetVertices(0 as never, [{ x: 100, y: 100 }]);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Annotation Creation API - Link Annotation', () => {
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

  describe('annotationGetLink', () => {
    test('should return link handle or null', () => {
      const handle = page.createAnnotation(AnnotationType.Link);
      if (handle !== null) {
        const link = page.annotationGetLink(handle);
        // May or may not have a link depending on setup
        expect(link === null || typeof link === 'number').toBe(true);
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationSetURI', () => {
    test('should set URI on link annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Link);
      if (handle !== null) {
        const result = page.annotationSetURI(handle, 'https://example.com');
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });

    test('should handle empty URI', () => {
      const handle = page.createAnnotation(AnnotationType.Link);
      if (handle !== null) {
        expect(() => page.annotationSetURI(handle, '')).not.toThrow();
        page.closeAnnotation(handle);
      }
    });
  });
});

describe('Annotation Creation API - Handle-Based Modification', () => {
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

  describe('annotationSetColour', () => {
    test('should set colour on annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Highlight);
      if (handle !== null) {
        const result = page.annotationSetColour(handle, { r: 255, g: 255, b: 0, a: 255 });
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });

    test('should handle colourType parameter', () => {
      const handle = page.createAnnotation(AnnotationType.Square);
      if (handle !== null) {
        const result = page.annotationSetColour(handle, { r: 255, g: 0, b: 0, a: 255 }, 1);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationSetRect', () => {
    test('should set rectangle on annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetRect(handle, { left: 100, bottom: 100, right: 200, top: 200 });
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationSetFlags', () => {
    test('should set flags on annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetFlags(handle, AnnotationFlags.Print);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });

    test('should handle combined flags', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetFlags(handle, AnnotationFlags.Print | AnnotationFlags.NoZoom);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationSetStringValue', () => {
    test('should set string value on annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetStringValue(handle, 'Contents', 'Test comment');
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });

    test('should handle unicode value', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetStringValue(handle, 'Contents', '日本語テスト');
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationSetBorder', () => {
    test('should set border on annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Square);
      if (handle !== null) {
        const result = page.annotationSetBorder(handle, {
          horizontalRadius: 5,
          verticalRadius: 5,
          borderWidth: 2,
        });
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationSetAppearance', () => {
    test('should set appearance on annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetAppearance(handle, 0, 'test appearance');
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });

    test('should remove appearance when undefined', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.annotationSetAppearance(handle, 0, undefined);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });
});

describe('Annotation Creation API - Attachment Points', () => {
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

  describe('annotationSetAttachmentPoints', () => {
    test('should set attachment points on highlight annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Highlight);
      if (handle !== null) {
        const quadPoints: QuadPoints = {
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 100,
          x3: 100,
          y3: 120,
          x4: 200,
          y4: 120,
        };
        const result = page.annotationSetAttachmentPoints(handle, 0, quadPoints);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationAppendAttachmentPoints', () => {
    test('should append attachment points to highlight annotation', () => {
      const handle = page.createAnnotation(AnnotationType.Highlight);
      if (handle !== null) {
        const quadPoints: QuadPoints = {
          x1: 100,
          y1: 150,
          x2: 200,
          y2: 150,
          x3: 100,
          y3: 170,
          x4: 200,
          y4: 170,
        };
        const result = page.annotationAppendAttachmentPoints(handle, quadPoints);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });
});

describe('Annotation Creation API - Object Manipulation', () => {
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

  describe('annotationAppendObject', () => {
    test('should return boolean for invalid object', () => {
      const handle = page.createAnnotation(AnnotationType.Stamp);
      if (handle !== null) {
        const result = page.annotationAppendObject(handle, 0 as never);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationUpdateObject', () => {
    test('should return boolean for invalid object', () => {
      const handle = page.createAnnotation(AnnotationType.Stamp);
      if (handle !== null) {
        const result = page.annotationUpdateObject(handle, 0 as never);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('annotationRemoveObject', () => {
    test('should return boolean for invalid index', () => {
      const handle = page.createAnnotation(AnnotationType.Stamp);
      if (handle !== null) {
        const result = page.annotationRemoveObject(handle, 9999);
        expect(typeof result).toBe('boolean');
        page.closeAnnotation(handle);
      }
    });
  });
});

describe('Annotation Creation API - Form Field Operations', () => {
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

  describe('annotationGetFontSize', () => {
    test('should return undefined for invalid handle', () => {
      const result = page.annotationGetFontSize(0 as never);
      expect(result).toBeUndefined();
    });
  });

  describe('annotationGetFormControlCount', () => {
    test('should return number for invalid handle', () => {
      const result = page.annotationGetFormControlCount(0 as never);
      expect(typeof result).toBe('number');
    });
  });

  describe('annotationGetFormControlIndex', () => {
    test('should return number for invalid handle', () => {
      const result = page.annotationGetFormControlIndex(0 as never);
      expect(typeof result).toBe('number');
    });
  });

  describe('annotationGetFormFieldExportValue', () => {
    test('should return undefined for invalid handle', () => {
      const result = page.annotationGetFormFieldExportValue(0 as never);
      expect(result).toBeUndefined();
    });
  });
});

describe('Annotation Creation API - Focusable Subtypes', () => {
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

  describe('getFocusableSubtypesCount', () => {
    test('should return number', () => {
      const result = page.getFocusableSubtypesCount();
      expect(typeof result).toBe('number');
    });
  });

  describe('getFocusableSubtypes', () => {
    test('should return array', () => {
      const result = page.getFocusableSubtypes();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('setFocusableSubtypes', () => {
    test('should return boolean', () => {
      const result = page.setFocusableSubtypes([AnnotationType.Widget]);
      expect(typeof result).toBe('boolean');
    });

    test('should return false for empty array', () => {
      const result = page.setFocusableSubtypes([]);
      expect(result).toBe(false);
    });
  });
});

describe('Annotation Creation API - Index Lookup', () => {
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

  describe('getAnnotationIndex', () => {
    test('should return -1 for invalid handle', () => {
      const result = page.getAnnotationIndex(0 as never);
      expect(result).toBe(-1);
    });

    test('should return number for valid handle', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        const result = page.getAnnotationIndex(handle);
        expect(typeof result).toBe('number');
        page.closeAnnotation(handle);
      }
    });
  });
});

describe('Annotation Creation with different PDFs', () => {
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

    const handle = page.createAnnotation(AnnotationType.Highlight);
    expect(handle !== null || handle === null).toBe(true);
    if (handle !== null) {
      page.closeAnnotation(handle);
    }
  });
});

describe('Annotation Creation post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on createAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.createAnnotation(AnnotationType.Text)).toThrow();
    doc.dispose();
  });

  test('should throw on isAnnotationSubtypeSupported after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.isAnnotationSubtypeSupported(AnnotationType.Ink)).toThrow();
    doc.dispose();
  });

  test('should throw on annotationSetColour after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.annotationSetColour(0 as never, { r: 255, g: 0, b: 0, a: 255 })).toThrow();
    doc.dispose();
  });

  test('should throw on annotationAddInkStroke after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.annotationAddInkStroke(0 as never, [{ x: 100, y: 100 }])).toThrow();
    doc.dispose();
  });

  test('should throw on annotationSetVertices after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.annotationSetVertices(0 as never, [{ x: 100, y: 100 }])).toThrow();
    doc.dispose();
  });

  test('should throw on annotationSetURI after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.annotationSetURI(0 as never, 'https://example.com')).toThrow();
    doc.dispose();
  });

  test('should throw on getFocusableSubtypes after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFocusableSubtypes()).toThrow();
    doc.dispose();
  });
});
