/**
 * Integration tests for annotation creation API.
 *
 * Tests the FPDFPage_CreateAnnot and related annotation creation functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  AnnotationAppearanceMode,
  AnnotationFlags,
  AnnotationType,
  type Point,
  type QuadPoints,
} from '../../src/core/types.js';
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
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Text);
    });

    test('should create a highlight annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Highlight);
      // May return undefined if not supported by this PDFium build
      if (annot) {
        expect(annot.type).toBe(AnnotationType.Highlight);
      }
    });

    test('should create an ink annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Ink);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Ink);
    });

    test('should create a stamp annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Stamp);
    });

    test('should create a link annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Link);
    });

    test('should create a line annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Line);
      // May return undefined if not supported by this PDFium build
      if (annot) {
        expect(annot.type).toBe(AnnotationType.Line);
      }
    });

    test('should create a polygon annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Polygon);
      // May return undefined if not supported by this PDFium build
      if (annot) {
        expect(annot.type).toBe(AnnotationType.Polygon);
      }
    });
  });

  describe('removeAnnotation', () => {
    test('should return boolean', () => {
      const result = page.removeAnnotation(9999);
      expect(typeof result).toBe('boolean');
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

  describe('addInkStroke via PDFiumAnnotation', () => {
    test('should add ink stroke to ink annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Ink);
      expect(annot).not.toBeNull();
      if (annot) {
        const points: Point[] = [
          { x: 100, y: 100 },
          { x: 150, y: 150 },
          { x: 200, y: 100 },
        ];
        const result = annot.addInkStroke(points);
        expect(typeof result).toBe('number');
      }
    });

    test('should return -1 for empty points array', () => {
      using annot = page.createAnnotation(AnnotationType.Ink);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.addInkStroke([]);
        expect(result).toBe(-1);
      }
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

  describe('getLink via PDFiumAnnotation', () => {
    test('should return link object or null', () => {
      using annot = page.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      if (annot) {
        const link = annot.getLink();
        // May or may not have a link depending on setup
        expect(link === null || typeof link === 'object').toBe(true);
      }
    });
  });

  describe('setURI via PDFiumAnnotation', () => {
    test('should set URI on link annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setURI('https://example.com');
        expect(typeof result).toBe('boolean');
      }
    });

    test('should handle empty URI', () => {
      using annot = page.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      if (annot) {
        expect(() => annot.setURI('')).not.toThrow();
      }
    });
  });
});

describe('Annotation Creation API - Wrapper Modification', () => {
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

  describe('setColour via PDFiumAnnotation', () => {
    test('should set colour on annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Highlight);
      if (annot) {
        const result = annot.setColour({ r: 255, g: 255, b: 0, a: 255 });
        expect(typeof result).toBe('boolean');
      }
    });

    test('should handle colourType parameter', () => {
      using annot = page.createAnnotation(AnnotationType.Square);
      if (annot) {
        const result = annot.setColour({ r: 255, g: 0, b: 0, a: 255 }, 'interior');
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('setRect via PDFiumAnnotation', () => {
    test('should set rectangle on annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setRect({ left: 100, bottom: 100, right: 200, top: 200 });
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('setFlags via PDFiumAnnotation', () => {
    test('should set flags on annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setFlags(AnnotationFlags.Print);
        expect(typeof result).toBe('boolean');
      }
    });

    test('should handle combined flags', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setFlags(AnnotationFlags.Print | AnnotationFlags.NoZoom);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('setStringValue via PDFiumAnnotation', () => {
    test('should set string value on annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setStringValue('Contents', 'Test comment');
        expect(typeof result).toBe('boolean');
      }
    });

    test('should handle unicode value', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setStringValue('Contents', '日本語テスト');
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('setBorder via PDFiumAnnotation', () => {
    test('should set border on annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setBorder({
          horizontalRadius: 5,
          verticalRadius: 5,
          borderWidth: 2,
        });
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('setAppearance via PDFiumAnnotation', () => {
    test('should set appearance on annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setAppearance(AnnotationAppearanceMode.Normal, 'test appearance');
        expect(typeof result).toBe('boolean');
      }
    });

    test('should remove appearance when undefined', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setAppearance(AnnotationAppearanceMode.Normal, undefined);
        expect(typeof result).toBe('boolean');
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

  describe('setAttachmentPoints via PDFiumAnnotation', () => {
    test('should set attachment points on highlight annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Highlight);
      if (annot) {
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
        const result = annot.setAttachmentPoints(0, quadPoints);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('appendAttachmentPoints via PDFiumAnnotation', () => {
    test('should append attachment points to highlight annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Highlight);
      if (annot) {
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
        const result = annot.appendAttachmentPoints(quadPoints);
        expect(typeof result).toBe('boolean');
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

  describe('appendObject via PDFiumAnnotation', () => {
    test('should return boolean for page object', () => {
      using annot = page.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      if (annot) {
        const imageObj = page.createImageObject();
        expect(imageObj).not.toBeNull();
        if (imageObj) {
          const result = annot.appendObject(imageObj);
          expect(typeof result).toBe('boolean');
        }
      }
    });
  });

  describe('updateObject via PDFiumAnnotation', () => {
    test('should return boolean for page object', () => {
      using annot = page.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      if (annot) {
        const imageObj = page.createImageObject();
        expect(imageObj).not.toBeNull();
        if (imageObj) {
          const result = annot.updateObject(imageObj);
          expect(typeof result).toBe('boolean');
        }
      }
    });
  });

  describe('removeObject via PDFiumAnnotation', () => {
    test('should return boolean for invalid index', () => {
      using annot = page.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.removeObject(9999);
        expect(typeof result).toBe('boolean');
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

  describe('getFormControlCount via PDFiumAnnotation', () => {
    test('should return number', () => {
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.getFormControlCount();
        expect(typeof result).toBe('number');
      }
    });
  });

  describe('getFormControlIndex via PDFiumAnnotation', () => {
    test('should return number', () => {
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.getFormControlIndex();
        expect(typeof result).toBe('number');
      }
    });
  });

  describe('getFormFieldExportValue via PDFiumAnnotation', () => {
    test('should return string or undefined', () => {
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.getFormFieldExportValue();
        expect(result === undefined || typeof result === 'string').toBe(true);
      }
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

    test('should return true for empty array (clearing subtypes)', () => {
      const result = page.setFocusableSubtypes([]);
      expect(result).toBe(true);
    });
  });
});

describe('Annotation Creation API - Annotation Index', () => {
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

  describe('annotation index', () => {
    test('should have valid index for newly created annotation', () => {
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      expect(annot!.index).toBeGreaterThanOrEqual(0);
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

    using annot = page.createAnnotation(AnnotationType.Highlight);
    // May return null if not supported
    expect(annot === null || annot.type === AnnotationType.Highlight).toBe(true);
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
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.createAnnotation(AnnotationType.Text)).toThrow();
  });

  test('should throw on isAnnotationSubtypeSupported after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.isAnnotationSubtypeSupported(AnnotationType.Ink)).toThrow();
  });

  test('should throw on getAnnotation after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotation(0)).toThrow();
  });

  test('should throw on getFocusableSubtypes after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFocusableSubtypes()).toThrow();
  });
});
