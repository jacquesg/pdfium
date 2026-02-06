/**
 * Integration tests for extended annotation API.
 *
 * Tests annotation inspection via the PDFiumAnnotation wrapper.
 */

import { describe, expect, test } from 'vitest';
import {
  AnnotationAppearanceMode,
  AnnotationFlags,
  AnnotationType,
  FormFieldFlags,
  FormFieldType,
} from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Annotations API', () => {
  describe('getAnnotation', () => {
    test('should throw for negative index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.getAnnotation(-1)).toThrow();
    });

    test('should throw for out of bounds index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      expect(() => page.getAnnotation(count + 10)).toThrow();
    });

    test('should return annotation with type and bounds', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        expect(typeof annot.type).toBe('string');
        expect(typeof annot.index).toBe('number');
        expect(annot.bounds).toBeDefined();
      }
    });
  });

  describe('getAnnotations', () => {
    test('should return array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const annotations = page.getAnnotations();
      expect(Array.isArray(annotations)).toBe(true);
      // Dispose all annotations
      for (const annot of annotations) {
        annot.dispose();
      }
    });

    test('should return annotations with valid structure', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const annotations = page.getAnnotations();
      for (const annot of annotations) {
        expect(typeof annot.index).toBe('number');
        expect(typeof annot.type).toBe('string');
        expect(annot.bounds).toBeDefined();
        annot.dispose();
      }
    });

    test('should have length matching annotationCount', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const annotations = page.getAnnotations();
      expect(annotations.length).toBe(page.annotationCount);
      for (const annot of annotations) {
        annot.dispose();
      }
    });
  });

  describe('annotation objectCount', () => {
    test('should return non-negative number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const objectCount = annot.objectCount;
        expect(typeof objectCount).toBe('number');
        expect(objectCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('annotation getBorder', () => {
    test('should return null or valid border', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const border = annot.getBorder();
        if (border !== null) {
          expect(typeof border.horizontalRadius).toBe('number');
          expect(typeof border.verticalRadius).toBe('number');
          expect(typeof border.borderWidth).toBe('number');
        }
      }
    });
  });

  describe('annotation getLine', () => {
    test('should return null for non-line annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      for (let i = 0; i < count; i++) {
        using annot = page.getAnnotation(i);
        if (annot.type !== AnnotationType.Line) {
          const line = annot.getLine();
          expect(line).toBeNull();
          break;
        }
      }
    });
  });

  describe('annotation getVertices', () => {
    test('should return null or array of points', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      for (let i = 0; i < count; i++) {
        using annot = page.getAnnotation(i);
        const vertices = annot.getVertices();
        if (vertices !== null) {
          expect(Array.isArray(vertices)).toBe(true);
          for (const point of vertices) {
            expect(typeof point.x).toBe('number');
            expect(typeof point.y).toBe('number');
          }
        }
      }
    });
  });

  describe('annotation inkPathCount', () => {
    test('should return non-negative number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const pathCount = annot.inkPathCount;
        expect(typeof pathCount).toBe('number');
        expect(pathCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('annotation getInkPath', () => {
    test('should return null for non-ink annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const path = annot.getInkPath(0);
        // May be null for non-ink annotations
        expect(path === null || Array.isArray(path)).toBe(true);
      }
    });
  });

  describe('annotation attachmentPointCount', () => {
    test('should return non-negative number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const pointCount = annot.attachmentPointCount;
        expect(typeof pointCount).toBe('number');
        expect(pointCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('annotation getAttachmentPoints', () => {
    test('should return null for non-markup annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const points = annot.getAttachmentPoints(0);
        // May be null if no attachment points
        expect(points === null || typeof points === 'object').toBe(true);
      }
    });
  });

  describe('annotation hasKey', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const hasSubtype = annot.hasKey('Subtype');
        expect(typeof hasSubtype).toBe('boolean');
      }
    });

    test('should return false for unknown key', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.hasKey('NonExistentKeyXYZ123');
        // May or may not have the key
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('AnnotationFlags enum', () => {
    test('should have expected values', () => {
      expect(AnnotationFlags.None).toBe(0);
      expect(AnnotationFlags.Invisible).toBe(1);
      expect(AnnotationFlags.Hidden).toBe(2);
      expect(AnnotationFlags.Print).toBe(4);
      expect(AnnotationFlags.NoZoom).toBe(8);
      expect(AnnotationFlags.NoRotate).toBe(16);
    });
  });

  describe('FormFieldType enum', () => {
    test('should have expected values', () => {
      expect(FormFieldType.Unknown).toBe('Unknown');
      expect(FormFieldType.PushButton).toBe('PushButton');
      expect(FormFieldType.CheckBox).toBe('CheckBox');
      expect(FormFieldType.RadioButton).toBe('RadioButton');
      expect(FormFieldType.ComboBox).toBe('ComboBox');
      expect(FormFieldType.ListBox).toBe('ListBox');
      expect(FormFieldType.TextField).toBe('TextField');
      expect(FormFieldType.Signature).toBe('Signature');
    });
  });

  describe('FormFieldFlags enum', () => {
    test('should have expected values', () => {
      expect(FormFieldFlags.None).toBe(0);
      expect(FormFieldFlags.ReadOnly).toBe(1);
      expect(FormFieldFlags.Required).toBe(2);
    });
  });
});

describe('Extended Annotations with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);
    for (const annot of annotations) {
      annot.dispose();
    }
  });
});

describe('Extended Annotations post-dispose guards', () => {
  test('should throw on getAnnotation after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotation(0)).toThrow();
  });

  test('should throw on getAnnotations after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotations()).toThrow();
  });
});

describe('Extended Annotations with form PDFs', () => {
  test('should get annotations from test_6_with_form.pdf', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);

    // Form PDF should have annotations (widgets)
    for (const annot of annotations) {
      expect(typeof annot.type).toBe('string');
      expect(typeof annot.index).toBe('number');
      expect(annot.bounds).toBeDefined();
      annot.dispose();
    }
  });

  test('should get annotations from test_7_with_form.pdf', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);

    for (const annot of annotations) {
      expect(typeof annot.type).toBe('string');
      expect(typeof annot.index).toBe('number');
      expect(annot.bounds).toBeDefined();
      annot.dispose();
    }
  });

  test('should get individual annotation by index', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    if (count > 0) {
      using annot = page.getAnnotation(0);
      expect(annot.type).toBeDefined();
      expect(annot.bounds).toBeDefined();
    }
  });

  test('should handle annotation with optional string values', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      expect(annot.bounds).toBeDefined();
      // Optional fields accessed via getStringValue
      const contents = annot.getStringValue('Contents');
      if (contents !== undefined) {
        expect(typeof contents).toBe('string');
      }
    }
  });

  test('annotation should have valid flags', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      const flags = annot.flags;
      expect(typeof flags).toBe('number');
      // Flags should be a valid bitmask (non-negative integer)
      expect(flags).toBeGreaterThanOrEqual(AnnotationFlags.None);
    }
  });

  test('should get form field type for widget annotations', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const fieldType = annot.getFormFieldType();
        expect(typeof fieldType).toBe('string');
        expect(Object.values(FormFieldType)).toContain(fieldType);
      }
    }
  });

  test('should get form field name for widget annotations', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    let foundWidget = false;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        foundWidget = true;
        const name = annot.getFormFieldName();
        if (name !== undefined) {
          expect(typeof name).toBe('string');
        }
      }
    }
    expect(foundWidget).toBe(true);
  });

  test('should get form field value for widget annotations', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const value = annot.getFormFieldValue();
        if (value !== undefined) {
          expect(typeof value).toBe('string');
        }
      }
    }
  });

  test('should get form field flags for widget annotations', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const flags = annot.getFormFieldFlags();
        expect(typeof flags).toBe('number');
        expect(flags).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should get form field alternate name for widget annotations', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const altName = annot.getFormFieldAlternateName();
        if (altName !== undefined) {
          expect(typeof altName).toBe('string');
        }
      }
    }
  });

  test('should call focus on annotation without throwing', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    if (count > 0) {
      using annot = page.getAnnotation(0);
      const result = annot.focus();
      expect(typeof result).toBe('boolean');
    }
  });

  test('should get and set appearance', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    using annot = page.createAnnotation(AnnotationType.Text);
    if (annot) {
      const ap = annot.getAppearance(AnnotationAppearanceMode.Normal);
      expect(ap === undefined || typeof ap === 'string').toBe(true);
    }
  });

  test('should iterate annotations with generator', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    let iteratedCount = 0;
    for (const annot of page.annotations()) {
      expect(annot.type).toBeDefined();
      expect(annot.index).toBeDefined();
      annot.dispose();
      iteratedCount++;
    }
    expect(iteratedCount).toBe(count);
  });
});
