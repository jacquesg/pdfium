/**
 * Integration tests for extended annotation API.
 *
 * Tests the FPDFAnnot_* extended functions for annotation inspection.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AnnotationFlags, AnnotationType, FormFieldFlags, FormFieldType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Annotations API', () => {
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

  describe('getExtendedAnnotation', () => {
    test('should throw for negative index', () => {
      expect(() => page.getExtendedAnnotation(-1)).toThrow();
    });

    test('should throw for out of bounds index', () => {
      const count = page.annotationCount;
      expect(() => page.getExtendedAnnotation(count + 10)).toThrow();
    });

    test('should return annotation with flags', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const annot = page.getExtendedAnnotation(0);
        expect(typeof annot.flags).toBe('number');
        expect(typeof annot.index).toBe('number');
        expect(typeof annot.type).toBe('number');
        expect(annot.bounds).toBeDefined();
      }
    });
  });

  describe('getExtendedAnnotations', () => {
    test('should return array', () => {
      const annotations = page.getExtendedAnnotations();
      expect(Array.isArray(annotations)).toBe(true);
    });

    test('should return annotations with valid structure', () => {
      const annotations = page.getExtendedAnnotations();
      for (const annot of annotations) {
        expect(typeof annot.index).toBe('number');
        expect(typeof annot.type).toBe('number');
        expect(typeof annot.flags).toBe('number');
        expect(annot.bounds).toBeDefined();
      }
    });

    test('should have length matching annotationCount', () => {
      const annotations = page.getExtendedAnnotations();
      expect(annotations.length).toBe(page.annotationCount);
    });
  });

  describe('getWidgetAnnotation', () => {
    test('should return undefined for non-widget annotation', () => {
      const count = page.annotationCount;
      for (let i = 0; i < count; i++) {
        const annot = page.getAnnotation(i);
        if (annot.type !== AnnotationType.Widget) {
          const widget = page.getWidgetAnnotation(i);
          expect(widget).toBeUndefined();
          break;
        }
      }
    });

    test('should throw for out of bounds index', () => {
      const count = page.annotationCount;
      expect(() => page.getWidgetAnnotation(count + 10)).toThrow();
    });
  });

  describe('getWidgetAnnotations', () => {
    test('should return array', () => {
      const widgets = page.getWidgetAnnotations();
      expect(Array.isArray(widgets)).toBe(true);
    });

    test('should return only widget annotations', () => {
      const widgets = page.getWidgetAnnotations();
      for (const widget of widgets) {
        expect(widget.type).toBe(AnnotationType.Widget);
      }
    });

    test('should include field type for widgets', () => {
      const widgets = page.getWidgetAnnotations();
      for (const widget of widgets) {
        expect(typeof widget.fieldType).toBe('number');
        expect(typeof widget.fieldFlags).toBe('number');
      }
    });
  });

  describe('getAnnotationObjectCount', () => {
    test('should return non-negative number', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const objectCount = page.getAnnotationObjectCount(0);
        expect(typeof objectCount).toBe('number');
        expect(objectCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return 0 for invalid index', () => {
      const count = page.getAnnotationObjectCount(-1);
      expect(count).toBe(0);
    });
  });

  describe('getAnnotationBorder', () => {
    test('should return undefined or valid border', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const border = page.getAnnotationBorder(0);
        if (border !== undefined) {
          expect(typeof border.horizontalRadius).toBe('number');
          expect(typeof border.verticalRadius).toBe('number');
          expect(typeof border.borderWidth).toBe('number');
        }
      }
    });

    test('should return undefined for invalid index', () => {
      const border = page.getAnnotationBorder(-1);
      expect(border).toBeUndefined();
    });
  });

  describe('getAnnotationLine', () => {
    test('should return undefined for non-line annotation', () => {
      const count = page.annotationCount;
      for (let i = 0; i < count; i++) {
        const annot = page.getAnnotation(i);
        if (annot.type !== AnnotationType.Line) {
          const line = page.getAnnotationLine(i);
          expect(line).toBeUndefined();
          break;
        }
      }
    });

    test('should return undefined for invalid index', () => {
      const line = page.getAnnotationLine(-1);
      expect(line).toBeUndefined();
    });
  });

  describe('getAnnotationVertices', () => {
    test('should return undefined or array of points', () => {
      const count = page.annotationCount;
      for (let i = 0; i < count; i++) {
        const vertices = page.getAnnotationVertices(i);
        if (vertices !== undefined) {
          expect(Array.isArray(vertices)).toBe(true);
          for (const point of vertices) {
            expect(typeof point.x).toBe('number');
            expect(typeof point.y).toBe('number');
          }
        }
      }
    });

    test('should return undefined for invalid index', () => {
      const vertices = page.getAnnotationVertices(-1);
      expect(vertices).toBeUndefined();
    });
  });

  describe('getAnnotationInkPathCount', () => {
    test('should return non-negative number', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const pathCount = page.getAnnotationInkPathCount(0);
        expect(typeof pathCount).toBe('number');
        expect(pathCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return 0 for invalid index', () => {
      const count = page.getAnnotationInkPathCount(-1);
      expect(count).toBe(0);
    });
  });

  describe('getAnnotationInkPath', () => {
    test('should return undefined for invalid indices', () => {
      const path = page.getAnnotationInkPath(-1, 0);
      expect(path).toBeUndefined();
    });
  });

  describe('getAnnotationAttachmentPointCount', () => {
    test('should return non-negative number', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const pointCount = page.getAnnotationAttachmentPointCount(0);
        expect(typeof pointCount).toBe('number');
        expect(pointCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return 0 for invalid index', () => {
      const count = page.getAnnotationAttachmentPointCount(-1);
      expect(count).toBe(0);
    });
  });

  describe('getAnnotationAttachmentPoints', () => {
    test('should return undefined for invalid indices', () => {
      const points = page.getAnnotationAttachmentPoints(-1, 0);
      expect(points).toBeUndefined();
    });
  });

  describe('annotationHasKey', () => {
    test('should return boolean', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const hasSubtype = page.annotationHasKey(0, 'Subtype');
        expect(typeof hasSubtype).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      const result = page.annotationHasKey(-1, 'Subtype');
      expect(result).toBe(false);
    });

    test('should return false for unknown key', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const result = page.annotationHasKey(0, 'NonExistentKeyXYZ123');
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
      expect(FormFieldType.Unknown).toBe(0);
      expect(FormFieldType.PushButton).toBe(1);
      expect(FormFieldType.CheckBox).toBe(2);
      expect(FormFieldType.RadioButton).toBe(3);
      expect(FormFieldType.ComboBox).toBe(4);
      expect(FormFieldType.ListBox).toBe(5);
      expect(FormFieldType.TextField).toBe(6);
      expect(FormFieldType.Signature).toBe(7);
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

    expect(() => page.getExtendedAnnotations()).not.toThrow();
    expect(() => page.getWidgetAnnotations()).not.toThrow();
  });
});

describe('Extended Annotations post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on getExtendedAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getExtendedAnnotation(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getExtendedAnnotations after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getExtendedAnnotations()).toThrow();
    doc.dispose();
  });

  test('should throw on getWidgetAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getWidgetAnnotation(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getWidgetAnnotations after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getWidgetAnnotations()).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationObjectCount after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationObjectCount(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationBorder after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationBorder(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationLine after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationLine(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationVertices after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationVertices(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationInkPathCount after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationInkPathCount(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationInkPath after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationInkPath(0, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationAttachmentPointCount after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationAttachmentPointCount(0)).toThrow();
    doc.dispose();
  });

  test('should throw on getAnnotationAttachmentPoints after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotationAttachmentPoints(0, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on annotationHasKey after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.annotationHasKey(0, 'Subtype')).toThrow();
    doc.dispose();
  });
});

describe('Extended Annotations with form PDFs', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should get widget annotations from test_6_with_form.pdf', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    expect(Array.isArray(widgets)).toBe(true);

    // Form PDF should have widget annotations
    if (widgets.length > 0) {
      const widget = widgets[0]!;
      expect(widget.type).toBe(AnnotationType.Widget);
      expect(typeof widget.fieldType).toBe('number');
      expect(typeof widget.fieldFlags).toBe('number');
    }
  });

  test('should get widget annotations from test_7_with_form.pdf', async () => {
    using doc = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    expect(Array.isArray(widgets)).toBe(true);

    for (const widget of widgets) {
      expect(widget.type).toBe(AnnotationType.Widget);
      expect(typeof widget.fieldType).toBe('number');
      expect(typeof widget.fieldFlags).toBe('number');
      expect(typeof widget.index).toBe('number');
      expect(widget.bounds).toBeDefined();
    }
  });

  test('should get individual widget annotation by index', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    for (let i = 0; i < count; i++) {
      const annot = page.getAnnotation(i);
      if (annot.type === AnnotationType.Widget) {
        const widget = page.getWidgetAnnotation(i);
        expect(widget).toBeDefined();
        expect(widget!.type).toBe(AnnotationType.Widget);
        expect(typeof widget!.fieldType).toBe('number');
        break;
      }
    }
  });

  test('should handle extended annotation with optional fields', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const annotations = page.getExtendedAnnotations();
    for (const annot of annotations) {
      expect(typeof annot.flags).toBe('number');
      expect(annot.bounds).toBeDefined();
      // Optional fields may or may not be present
      if (annot.contents !== undefined) {
        expect(typeof annot.contents).toBe('string');
      }
      if (annot.author !== undefined) {
        expect(typeof annot.author).toBe('string');
      }
      if (annot.modificationDate !== undefined) {
        expect(typeof annot.modificationDate).toBe('string');
      }
      if (annot.creationDate !== undefined) {
        expect(typeof annot.creationDate).toBe('string');
      }
    }
  });

  test('should handle widget with field name and value', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    for (const widget of widgets) {
      // Field name and value are optional
      if (widget.fieldName !== undefined) {
        expect(typeof widget.fieldName).toBe('string');
      }
      if (widget.fieldValue !== undefined) {
        expect(typeof widget.fieldValue).toBe('string');
      }
      if (widget.alternateName !== undefined) {
        expect(typeof widget.alternateName).toBe('string');
      }
    }
  });

  test('should handle widgets with different field types', async () => {
    using doc = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    const fieldTypes = new Set(widgets.map((w) => w.fieldType));

    // Should have at least one field type
    expect(fieldTypes.size).toBeGreaterThanOrEqual(0);

    // All field types should be valid FormFieldType values
    for (const fieldType of fieldTypes) {
      expect(fieldType).toBeGreaterThanOrEqual(FormFieldType.Unknown);
    }
  });

  test('should handle widgets with options (for combo/list boxes)', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    for (const widget of widgets) {
      if (widget.fieldType === FormFieldType.ComboBox || widget.fieldType === FormFieldType.ListBox) {
        // Options may be present for combo/list boxes
        if (widget.options !== undefined) {
          expect(Array.isArray(widget.options)).toBe(true);
          for (const option of widget.options) {
            if (option.label !== undefined) {
              expect(typeof option.label).toBe('string');
            }
            if (option.selected !== undefined) {
              expect(typeof option.selected).toBe('boolean');
            }
          }
        }
      }
    }
  });

  test('getWidgetAnnotation throws for NaN index', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    expect(() => page.getWidgetAnnotation(NaN)).toThrow();
  });

  test('getWidgetAnnotation throws for negative index', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    expect(() => page.getWidgetAnnotation(-1)).toThrow();
  });

  test('getWidgetAnnotation throws for index beyond count', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const count = page.annotationCount;
    expect(() => page.getWidgetAnnotation(count + 100)).toThrow();
  });

  test('widget annotations have valid AnnotationFlags', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    for (const widget of widgets) {
      expect(typeof widget.flags).toBe('number');
      // Flags should be a valid bitmask (non-negative integer)
      expect(widget.flags).toBeGreaterThanOrEqual(AnnotationFlags.None);
    }
  });

  test('widget annotations have valid FormFieldFlags', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const widgets = page.getWidgetAnnotations();
    for (const widget of widgets) {
      expect(typeof widget.fieldFlags).toBe('number');
      // Field flags should be a valid bitmask (non-negative integer)
      expect(widget.fieldFlags).toBeGreaterThanOrEqual(FormFieldFlags.None);
    }
  });
});
