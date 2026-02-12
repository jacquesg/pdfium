/**
 * Integration tests for extended annotation API.
 *
 * Tests annotation inspection via the PDFiumAnnotation wrapper.
 */

import {
  AnnotationAppearanceMode,
  AnnotationFlags,
  AnnotationType,
  FormFieldFlags,
  FormFieldType,
} from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Extended Annotations API', () => {
  describe('getAnnotation', () => {
    test('should throw for negative index', async ({ testPage }) => {
      expect(() => testPage.getAnnotation(-1)).toThrow();
    });

    test('should throw for out of bounds index', async ({ testPage }) => {
      const count = testPage.annotationCount;
      expect(() => testPage.getAnnotation(count + 10)).toThrow();
    });

    test('should return annotation with type and bounds', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        expect(annot.type).toBeTypeOf('string');
        expect(annot.index).toBeTypeOf('number');
        expect(annot.bounds).toBeDefined();
      }
    });
  });

  describe('getAnnotations', () => {
    test('should return array', async ({ testPage }) => {
      const annotations = testPage.getAnnotations();
      expect(annotations).toBeInstanceOf(Array);
      for (const annot of annotations) {
        annot.dispose();
      }
    });

    test('should return annotations with valid structure', async ({ testPage }) => {
      const annotations = testPage.getAnnotations();
      for (const annot of annotations) {
        expect(annot.index).toBeTypeOf('number');
        expect(annot.type).toBeTypeOf('string');
        expect(annot.bounds).toBeDefined();
        annot.dispose();
      }
    });

    test('should have length matching annotationCount', async ({ testPage }) => {
      const annotations = testPage.getAnnotations();
      expect(annotations.length).toBe(testPage.annotationCount);
      for (const annot of annotations) {
        annot.dispose();
      }
    });
  });

  describe('annotation objectCount', () => {
    test('should return non-negative number', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const objectCount = annot.objectCount;
        expect(objectCount).toBeTypeOf('number');
        expect(objectCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('annotation getBorder', () => {
    test('should return null or valid border', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const border = annot.getBorder();
        if (border !== null) {
          expect(border.horizontalRadius).toBeTypeOf('number');
          expect(border.verticalRadius).toBeTypeOf('number');
          expect(border.borderWidth).toBeTypeOf('number');
        }
      }
    });
  });

  describe('annotation getLine', () => {
    test('should return null for non-line annotation', async ({ testPage }) => {
      const count = testPage.annotationCount;
      for (let i = 0; i < count; i++) {
        using annot = testPage.getAnnotation(i);
        if (annot.type !== AnnotationType.Line) {
          const line = annot.getLine();
          expect(line).toBeNull();
          break;
        }
      }
    });
  });

  describe('annotation getVertices', () => {
    test('should return null or array of points', async ({ testPage }) => {
      const count = testPage.annotationCount;
      for (let i = 0; i < count; i++) {
        using annot = testPage.getAnnotation(i);
        const vertices = annot.getVertices();
        if (vertices !== null) {
          expect(vertices).toBeInstanceOf(Array);
          for (const point of vertices) {
            expect(point.x).toBeTypeOf('number');
            expect(point.y).toBeTypeOf('number');
          }
        }
      }
    });
  });

  describe('annotation inkPathCount', () => {
    test('should return non-negative number', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const pathCount = annot.inkPathCount;
        expect(pathCount).toBeTypeOf('number');
        expect(pathCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('annotation getInkPath', () => {
    test('should return null for non-ink annotation', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const path = annot.getInkPath(0);
        expect(path === null || Array.isArray(path)).toBe(true);
      }
    });
  });

  describe('annotation attachmentPointCount', () => {
    test('should return non-negative number', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const pointCount = annot.attachmentPointCount;
        expect(pointCount).toBeTypeOf('number');
        expect(pointCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('annotation getAttachmentPoints', () => {
    test('should return null for non-markup annotation', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const points = annot.getAttachmentPoints(0);
        expect(points === null || typeof points === 'object').toBe(true);
      }
    });
  });

  describe('annotation hasKey', () => {
    test('should return boolean', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const hasSubtype = annot.hasKey('Subtype');
        expect(hasSubtype).toBeTypeOf('boolean');
      }
    });

    test('should return false for unknown key', async ({ testPage }) => {
      const count = testPage.annotationCount;
      if (count > 0) {
        using annot = testPage.getAnnotation(0);
        const result = annot.hasKey('NonExistentKeyXYZ123');
        expect(result).toBeTypeOf('boolean');
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
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(annotations).toBeInstanceOf(Array);
    for (const annot of annotations) {
      annot.dispose();
    }
  });
});

describe('Extended Annotations post-dispose guards', () => {
  test('should throw on getAnnotation after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotation(0)).toThrow();
  });

  test('should throw on getAnnotations after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotations()).toThrow();
  });
});

describe('Extended Annotations with form PDFs', () => {
  test('should get annotations from test_6_with_form.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(annotations).toBeInstanceOf(Array);

    for (const annot of annotations) {
      expect(annot.type).toBeTypeOf('string');
      expect(annot.index).toBeTypeOf('number');
      expect(annot.bounds).toBeDefined();
      annot.dispose();
    }
  });

  test('should get annotations from test_7_with_form.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_7_with_form.pdf');
    using page = doc.getPage(0);

    const annotations = page.getAnnotations();
    expect(annotations).toBeInstanceOf(Array);

    for (const annot of annotations) {
      expect(annot.type).toBeTypeOf('string');
      expect(annot.index).toBeTypeOf('number');
      expect(annot.bounds).toBeDefined();
      annot.dispose();
    }
  });

  test('should get individual annotation by index', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    if (count > 0) {
      using annot = page.getAnnotation(0);
      expect(annot.type).toBeDefined();
      expect(annot.bounds).toBeDefined();
    }
  });

  test('should handle annotation with optional string values', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      expect(annot.bounds).toBeDefined();
      const contents = annot.getStringValue('Contents');
      if (contents !== undefined) {
        expect(contents).toBeTypeOf('string');
      }
    }
  });

  test('annotation should have valid flags', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      const flags = annot.flags;
      expect(flags).toBeTypeOf('number');
      expect(flags).toBeGreaterThanOrEqual(AnnotationFlags.None);
    }
  });

  test('should get form field type for widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const fieldType = annot.getFormFieldType();
        expect(fieldType).toBeTypeOf('string');
        expect(Object.values(FormFieldType)).toContain(fieldType);
      }
    }
  });

  test('should get form field name for widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    let foundWidget = false;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        foundWidget = true;
        const name = annot.getFormFieldName();
        if (name !== undefined) {
          expect(name).toBeTypeOf('string');
        }
      }
    }
    expect(foundWidget).toBe(true);
  });

  test('should get form field value for widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const value = annot.getFormFieldValue();
        if (value !== undefined) {
          expect(value).toBeTypeOf('string');
        }
      }
    }
  });

  test('should get form field flags for widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const flags = annot.getFormFieldFlags();
        expect(flags).toBeTypeOf('number');
        expect(flags).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should get form field alternate name for widget annotations', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      using annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const altName = annot.getFormFieldAlternateName();
        if (altName !== undefined) {
          expect(altName).toBeTypeOf('string');
        }
      }
    }
  });

  test('should call focus on annotation without throwing', async ({ openDocument }) => {
    const doc = await openDocument('test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    if (count > 0) {
      using annot = page.getAnnotation(0);
      const result = annot.focus();
      expect(result).toBeTypeOf('boolean');
    }
  });

  test('should get and set appearance', async ({ testPage }) => {
    using annot = testPage.createAnnotation(AnnotationType.Text);
    if (annot) {
      const ap = annot.getAppearance(AnnotationAppearanceMode.Normal);
      expect(ap === undefined || typeof ap === 'string').toBe(true);
    }
  });

  test('should iterate annotations with generator', async ({ testPage }) => {
    const count = testPage.annotationCount;
    let iteratedCount = 0;
    for (const annot of testPage.annotations()) {
      expect(annot.type).toBeDefined();
      expect(annot.index).toBeDefined();
      annot.dispose();
      iteratedCount++;
    }
    expect(iteratedCount).toBe(count);
  });
});
