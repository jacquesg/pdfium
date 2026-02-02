/**
 * Integration tests for annotation modification API.
 *
 * Tests the FPDFAnnot_Set* and FPDFPage_*Annot functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AnnotationFlags, AnnotationType, type QuadPoints } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Annotation Modification API', () => {
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

  describe('setAnnotationColour', () => {
    test('should return boolean', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const result = page.setAnnotationColour(0, { r: 255, g: 0, b: 0, a: 255 });
        expect(typeof result).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      const result = page.setAnnotationColour(-1, { r: 255, g: 0, b: 0, a: 255 });
      expect(result).toBe(false);
    });
  });

  describe('setAnnotationFlags', () => {
    test('should return boolean', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const result = page.setAnnotationFlags(0, AnnotationFlags.Print);
        expect(typeof result).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      const result = page.setAnnotationFlags(-1, AnnotationFlags.Print);
      expect(result).toBe(false);
    });
  });

  describe('setAnnotationStringValue', () => {
    test('should return boolean', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const result = page.setAnnotationStringValue(0, 'Contents', 'Test content');
        expect(typeof result).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      const result = page.setAnnotationStringValue(-1, 'Contents', 'Test');
      expect(result).toBe(false);
    });
  });

  describe('setAnnotationBorder', () => {
    test('should return boolean', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const result = page.setAnnotationBorder(0, {
          horizontalRadius: 0,
          verticalRadius: 0,
          borderWidth: 1,
        });
        expect(typeof result).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      const result = page.setAnnotationBorder(-1, {
        horizontalRadius: 0,
        verticalRadius: 0,
        borderWidth: 1,
      });
      expect(result).toBe(false);
    });
  });

  describe('setAnnotationRect', () => {
    test('should return boolean', () => {
      const count = page.annotationCount;
      if (count > 0) {
        const result = page.setAnnotationRect(0, {
          horizontalRadius: 100,
          verticalRadius: 100,
          borderWidth: 200,
        });
        expect(typeof result).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      const result = page.setAnnotationRect(-1, {
        horizontalRadius: 100,
        verticalRadius: 100,
        borderWidth: 200,
      });
      expect(result).toBe(false);
    });
  });

  describe('removeAnnotation', () => {
    test('should return boolean', () => {
      // We don't actually remove annotations from the shared test document
      // Just verify the method exists and returns the right type
      const result = page.removeAnnotation(-1);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });
  });

  describe('createAnnotation', () => {
    test('should return handle or null', () => {
      const handle = page.createAnnotation(AnnotationType.Text);
      if (handle !== null) {
        expect(typeof handle).toBe('number');
        page.closeAnnotation(handle);
      }
    });
  });

  describe('closeAnnotation', () => {
    test('should not throw for null handle', () => {
      expect(() => page.closeAnnotation(0 as never)).not.toThrow();
    });
  });

  describe('setAnnotationAttachmentPoints', () => {
    test('should return boolean', () => {
      const quadPoints: QuadPoints = {
        x1: 100,
        y1: 100,
        x2: 200,
        y2: 100,
        x3: 100,
        y3: 200,
        x4: 200,
        y4: 200,
      };
      const result = page.setAnnotationAttachmentPoints(-1, 0, quadPoints);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });
  });

  describe('appendAnnotationAttachmentPoints', () => {
    test('should return boolean', () => {
      const quadPoints: QuadPoints = {
        x1: 100,
        y1: 100,
        x2: 200,
        y2: 100,
        x3: 100,
        y3: 200,
        x4: 200,
        y4: 200,
      };
      const result = page.appendAnnotationAttachmentPoints(-1, quadPoints);
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });
  });
});

describe('Annotation Modification with different PDFs', () => {
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

    expect(() => page.removeAnnotation(-1)).not.toThrow();
    expect(() => page.setAnnotationFlags(-1, AnnotationFlags.Print)).not.toThrow();
  });
});

describe('Annotation Modification post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on setAnnotationColour after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setAnnotationColour(0, { r: 255, g: 0, b: 0, a: 255 })).toThrow();
    doc.dispose();
  });

  test('should throw on setAnnotationFlags after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setAnnotationFlags(0, AnnotationFlags.Print)).toThrow();
    doc.dispose();
  });

  test('should throw on setAnnotationStringValue after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setAnnotationStringValue(0, 'Contents', 'Test')).toThrow();
    doc.dispose();
  });

  test('should throw on setAnnotationBorder after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setAnnotationBorder(0, { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 })).toThrow();
    doc.dispose();
  });

  test('should throw on setAnnotationRect after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setAnnotationRect(0, { horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 })).toThrow();
    doc.dispose();
  });

  test('should throw on removeAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.removeAnnotation(0)).toThrow();
    doc.dispose();
  });

  test('should throw on createAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.createAnnotation(AnnotationType.Text)).toThrow();
    doc.dispose();
  });

  test('should throw on closeAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.closeAnnotation(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on setAnnotationAttachmentPoints after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    const quadPoints: QuadPoints = { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0 };
    expect(() => page.setAnnotationAttachmentPoints(0, 0, quadPoints)).toThrow();
    doc.dispose();
  });

  test('should throw on appendAnnotationAttachmentPoints after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    const quadPoints: QuadPoints = { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0 };
    expect(() => page.appendAnnotationAttachmentPoints(0, quadPoints)).toThrow();
    doc.dispose();
  });
});
