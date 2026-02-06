/**
 * Integration tests for annotation modification API.
 *
 * Tests annotation modification via the PDFiumAnnotation wrapper.
 */

import { describe, expect, test } from 'vitest';
import { AnnotationFlags, AnnotationType, type QuadPoints } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Annotation Modification on Created Annotation', () => {
  test('should create, modify and remove annotation', async () => {
    using pdfium = await initPdfium();
    // Create a new document to ensure we can create annotations freely
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();

    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    const initialCount = page.annotationCount;

    // 1. Create Annotation
    using annot = page.createAnnotation(AnnotationType.Text);
    expect(annot).not.toBeNull();

    const newCount = page.annotationCount;
    expect(newCount).toBe(initialCount + 1);

    // 2. Modify Annotation
    expect(annot!.setColour({ r: 255, g: 255, b: 0, a: 255 })).toBe(true);

    expect(annot!.setFlags(AnnotationFlags.Print)).toBe(true);

    expect(annot!.setStringValue('Contents', 'Highlighted Text')).toBe(true);

    expect(
      annot!.setBorder({
        horizontalRadius: 0,
        verticalRadius: 0,
        borderWidth: 1,
      }),
    ).toBe(true);

    expect(
      annot!.setRect({
        left: 100,
        bottom: 100,
        right: 200,
        top: 200,
      }),
    ).toBe(true);

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

    // Attachment points are not valid for Text annotations, so this should return false
    expect(annot!.setAttachmentPoints(0, quadPoints)).toBe(false);
    expect(annot!.appendAttachmentPoints(quadPoints)).toBe(false);

    // 3. Remove Annotation (by index)
    expect(page.removeAnnotation(annot!.index)).toBe(true);

    expect(page.annotationCount).toBe(initialCount);
  });
});

describe('Annotation Modification API', () => {
  describe('setColour via PDFiumAnnotation', () => {
    test('should succeed on existing annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.setColour({ r: 255, g: 0, b: 0, a: 255 });
        expect(result).toBe(true);
      }
    });
  });

  describe('setFlags via PDFiumAnnotation', () => {
    test('should succeed on existing annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.setFlags(AnnotationFlags.Print);
        expect(result).toBe(true);
      }
    });
  });

  describe('setStringValue via PDFiumAnnotation', () => {
    test('should succeed on existing annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.setStringValue('Contents', 'Test content');
        expect(result).toBe(true);
      }
    });
  });

  describe('setBorder via PDFiumAnnotation', () => {
    test('should succeed on existing annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.setBorder({
          horizontalRadius: 0,
          verticalRadius: 0,
          borderWidth: 1,
        });
        expect(result).toBe(true);
      }
    });
  });

  describe('setRect via PDFiumAnnotation', () => {
    test('should succeed on existing annotation', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.annotationCount;
      if (count > 0) {
        using annot = page.getAnnotation(0);
        const result = annot.setRect({
          left: 100,
          bottom: 100,
          right: 200,
          top: 200,
        });
        expect(result).toBe(true);
      }
    });
  });

  describe('removeAnnotation', () => {
    test('should return false for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const result = page.removeAnnotation(-1);
      expect(result).toBe(false);
    });
  });

  describe('createAnnotation', () => {
    test('should return PDFiumAnnotation or undefined', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
      expect(annot!.type).toBe(AnnotationType.Text);
    });
  });

  describe('setAttachmentPoints via PDFiumAnnotation', () => {
    test('should return false for Text annotations (unsupported)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
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
      // Text annotations don't support attachment points
      expect(annot!.setAttachmentPoints(0, quadPoints)).toBe(false);
    });
  });

  describe('appendAttachmentPoints via PDFiumAnnotation', () => {
    test('should return false for Text annotations (unsupported)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).not.toBeNull();
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
      // Text annotations don't support attachment points
      expect(annot!.appendAttachmentPoints(quadPoints)).toBe(false);
    });
  });
});

describe('Annotation Modification with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => page.removeAnnotation(-1)).not.toThrow();
  });
});

describe('Annotation Modification post-dispose guards', () => {
  test('should throw on getAnnotation after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getAnnotation(0)).toThrow();
  });

  test('should throw on removeAnnotation after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.removeAnnotation(0)).toThrow();
  });

  test('should throw on createAnnotation after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.createAnnotation(AnnotationType.Text)).toThrow();
  });
});
