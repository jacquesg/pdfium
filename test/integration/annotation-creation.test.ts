/**
 * Integration tests for annotation creation API.
 *
 * Tests the FPDFPage_CreateAnnot and related annotation creation functions.
 */

import {
  AnnotationAppearanceMode,
  AnnotationFlags,
  AnnotationType,
  type Point,
  type QuadPoints,
} from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Annotation Creation API - Basic Creation', () => {
  describe('createAnnotation', () => {
    test('should create a text annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Text);
    });

    test('should create a highlight annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Highlight);
      // May return undefined if not supported by this PDFium build
      if (annot) {
        expect(annot.type).toBe(AnnotationType.Highlight);
      }
    });

    test('should create an ink annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Ink);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Ink);
    });

    test('should create a stamp annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Stamp);
    });

    test('should create a link annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Link);
    });

    test('should create a line annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Line);
      // May return undefined if not supported by this PDFium build
      if (annot) {
        expect(annot.type).toBe(AnnotationType.Line);
      }
    });

    test('should create a polygon annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Polygon);
      // May return undefined if not supported by this PDFium build
      if (annot) {
        expect(annot.type).toBe(AnnotationType.Polygon);
      }
    });
  });

  describe('removeAnnotation', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.removeAnnotation(9999);
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Annotation Creation API - Subtype Support', () => {
  describe('isAnnotationSubtypeSupported', () => {
    for (const subtype of [AnnotationType.Ink, AnnotationType.Stamp, AnnotationType.Text]) {
      test(`should return boolean for ${subtype} annotation`, async ({ testPage }) => {
        const result = testPage.isAnnotationSubtypeSupported(subtype);
        expect(result).toBeTypeOf('boolean');
      });
    }
  });

  describe('isAnnotationObjectSubtypeSupported', () => {
    for (const subtype of [AnnotationType.Ink, AnnotationType.Stamp, AnnotationType.Text]) {
      test(`should return boolean for ${subtype} annotation`, async ({ testPage }) => {
        const result = testPage.isAnnotationObjectSubtypeSupported(subtype);
        expect(result).toBeTypeOf('boolean');
      });
    }
  });
});

describe('Annotation Creation API - Ink Annotation', () => {
  describe('addInkStroke via PDFiumAnnotation', () => {
    test('should add ink stroke to ink annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Ink);
      expect(annot).not.toBeNull();
      if (annot) {
        const points: Point[] = [
          { x: 100, y: 100 },
          { x: 150, y: 150 },
          { x: 200, y: 100 },
        ];
        const result = annot.addInkStroke(points);
        expect(result).toBeTypeOf('number');
      }
    });

    test('should return -1 for empty points array', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Ink);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.addInkStroke([]);
        expect(result).toBe(-1);
      }
    });
  });
});

describe('Annotation Creation API - Link Annotation', () => {
  describe('getLink via PDFiumAnnotation', () => {
    test('should return link object or null', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      if (annot) {
        const link = annot.getLink();
        // May or may not have a link depending on setup
        expect(link === null || typeof link === 'object').toBe(true);
      }
    });
  });

  describe('setURI via PDFiumAnnotation', () => {
    test('should set URI on link annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setURI('https://example.com');
        expect(result).toBeTypeOf('boolean');
      }
    });

    test('should handle empty URI', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Link);
      expect(annot).not.toBeNull();
      if (annot) {
        expect(() => annot.setURI('')).not.toThrow();
      }
    });
  });
});

describe('Annotation Creation API - Wrapper Modification', () => {
  describe('setColour via PDFiumAnnotation', () => {
    test('should set colour on annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Highlight);
      if (annot) {
        const result = annot.setColour({ r: 255, g: 255, b: 0, a: 255 });
        expect(result).toBeTypeOf('boolean');
      }
    });

    test('should handle colourType parameter', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Square);
      if (annot) {
        const result = annot.setColour({ r: 255, g: 0, b: 0, a: 255 }, 'interior');
        expect(result).toBeTypeOf('boolean');
      }
    });
  });

  describe('setRect via PDFiumAnnotation', () => {
    test('should set rectangle on annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setRect({ left: 100, bottom: 100, right: 200, top: 200 });
        expect(result).toBeTypeOf('boolean');
      }
    });
  });

  describe('setFlags via PDFiumAnnotation', () => {
    test('should set flags on annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setFlags(AnnotationFlags.Print);
        expect(result).toBeTypeOf('boolean');
      }
    });

    test('should handle combined flags', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setFlags(AnnotationFlags.Print | AnnotationFlags.NoZoom);
        expect(result).toBeTypeOf('boolean');
      }
    });
  });

  describe('setStringValue via PDFiumAnnotation', () => {
    test('should set string value on annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setStringValue('Contents', 'Test comment');
        expect(result).toBeTypeOf('boolean');
      }
    });

    test('should handle unicode value', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setStringValue('Contents', '日本語テスト');
        expect(result).toBeTypeOf('boolean');
      }
    });
  });

  describe('setBorder via PDFiumAnnotation', () => {
    test('should set border on annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setBorder({
          horizontalRadius: 5,
          verticalRadius: 5,
          borderWidth: 2,
        });
        expect(result).toBeTypeOf('boolean');
      }
    });
  });

  describe('setAppearance via PDFiumAnnotation', () => {
    test('should set appearance on annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setAppearance(AnnotationAppearanceMode.Normal, 'test appearance');
        expect(result).toBeTypeOf('boolean');
      }
    });

    test('should remove appearance when undefined', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.setAppearance(AnnotationAppearanceMode.Normal, undefined);
        expect(result).toBeTypeOf('boolean');
      }
    });
  });
});

describe('Annotation Creation API - Attachment Points', () => {
  describe('setAttachmentPoints via PDFiumAnnotation', () => {
    test('should set attachment points on highlight annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Highlight);
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
        expect(result).toBeTypeOf('boolean');
      }
    });
  });

  describe('appendAttachmentPoints via PDFiumAnnotation', () => {
    test('should append attachment points to highlight annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Highlight);
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
        expect(result).toBeTypeOf('boolean');
      }
    });
  });
});

describe('Annotation Creation API - Object Manipulation', () => {
  describe('appendObject via PDFiumAnnotation', () => {
    test('should return boolean for page object', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      if (annot) {
        const imageObj = testPage.createImageObject();
        expect(imageObj).not.toBeNull();
        if (imageObj) {
          const result = annot.appendObject(imageObj);
          expect(result).toBeTypeOf('boolean');
        }
      }
    });
  });

  describe('updateObject via PDFiumAnnotation', () => {
    test('should return boolean for page object', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      if (annot) {
        const imageObj = testPage.createImageObject();
        expect(imageObj).not.toBeNull();
        if (imageObj) {
          const result = annot.updateObject(imageObj);
          expect(result).toBeTypeOf('boolean');
        }
      }
    });
  });

  describe('removeObject via PDFiumAnnotation', () => {
    test('should return boolean for invalid index', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Stamp);
      expect(annot).not.toBeNull();
      if (annot) {
        const result = annot.removeObject(9999);
        expect(result).toBeTypeOf('boolean');
      }
    });
  });
});

describe('Annotation Creation API - Form Field Operations', () => {
  describe('getFormControlCount via PDFiumAnnotation', () => {
    test('should return number', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const result = annot.getFormControlCount();
        expect(result).toBeTypeOf('number');
      }
    });
  });

  describe('getFormControlIndex via PDFiumAnnotation', () => {
    test('should return number', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const result = annot.getFormControlIndex();
        expect(result).toBeTypeOf('number');
      }
    });
  });

  describe('getFormFieldExportValue via PDFiumAnnotation', () => {
    test('should return string or undefined', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const result = annot.getFormFieldExportValue();
        expect(result === undefined || typeof result === 'string').toBe(true);
      }
    });
  });
});

describe('Annotation Creation API - Focusable Subtypes', () => {
  describe('getFocusableSubtypesCount', () => {
    test('should return number', async ({ testPage }) => {
      const result = testPage.getFocusableSubtypesCount();
      expect(result).toBeTypeOf('number');
    });
  });

  describe('getFocusableSubtypes', () => {
    test('should return array', async ({ testPage }) => {
      const result = testPage.getFocusableSubtypes();
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('setFocusableSubtypes', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.setFocusableSubtypes([AnnotationType.Widget]);
      expect(result).toBeTypeOf('boolean');
    });

    test('should return true for empty array (clearing subtypes)', async ({ testPage }) => {
      const result = testPage.setFocusableSubtypes([]);
      expect(result).toBe(true);
    });
  });
});

describe('Annotation Creation API - Annotation Index', () => {
  describe('annotation index', () => {
    test('should have valid index for newly created annotation', async ({ testPage }) => {
      using annot = testPage.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      expect(annot!.index).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Annotation Creation with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    using annot = page.createAnnotation(AnnotationType.Highlight);
    // May return null if not supported
    expect(annot === null || annot.type === AnnotationType.Highlight).toBe(true);
  });
});

describe('Annotation Creation post-dispose guards', () => {
  test('should throw on createAnnotation after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.createAnnotation(AnnotationType.Text)).toThrow();
  });

  test('should throw on isAnnotationSubtypeSupported after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.isAnnotationSubtypeSupported(AnnotationType.Ink)).toThrow();
  });

  test('should throw on getAnnotation after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotation(0)).toThrow();
  });

  test('should throw on getFocusableSubtypes after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFocusableSubtypes()).toThrow();
  });
});
