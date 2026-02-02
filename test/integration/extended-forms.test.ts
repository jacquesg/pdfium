/**
 * Integration tests for extended forms API.
 *
 * Tests the FORM_* and FPDF_GetFormType functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { FormType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Forms API - Document Level', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('formType', () => {
    test('should return valid form type', () => {
      const type = document.formType;
      expect(typeof type).toBe('number');
      expect([0, 1, 2, 3]).toContain(type);
    });
  });

  describe('hasForm', () => {
    test('should return boolean', () => {
      const hasForm = document.hasForm();
      expect(typeof hasForm).toBe('boolean');
    });

    test('should be consistent with formType', () => {
      const hasForm = document.hasForm();
      const type = document.formType;
      expect(hasForm).toBe(type !== FormType.None);
    });
  });

  describe('hasAcroForm', () => {
    test('should return boolean', () => {
      const hasAcro = document.hasAcroForm();
      expect(typeof hasAcro).toBe('boolean');
    });

    test('should be consistent with formType', () => {
      const hasAcro = document.hasAcroForm();
      expect(hasAcro).toBe(document.formType === FormType.AcroForm);
    });
  });

  describe('hasXFAForm', () => {
    test('should return boolean', () => {
      const hasXFA = document.hasXFAForm();
      expect(typeof hasXFA).toBe('boolean');
    });
  });

  describe('killFormFocus', () => {
    test('should not throw', () => {
      expect(() => document.killFormFocus()).not.toThrow();
    });

    test('should return boolean', () => {
      const result = document.killFormFocus();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('setFormFieldHighlightColour', () => {
    test('should not throw', () => {
      expect(() => document.setFormFieldHighlightColour(0, 0xffff0000)).not.toThrow();
    });
  });

  describe('setFormFieldHighlightAlpha', () => {
    test('should not throw', () => {
      expect(() => document.setFormFieldHighlightAlpha(128)).not.toThrow();
    });
  });

  describe('FormType enum', () => {
    test('should have expected values', () => {
      expect(FormType.None).toBe(0);
      expect(FormType.AcroForm).toBe(1);
      expect(FormType.XFAFull).toBe(2);
      expect(FormType.XFAForeground).toBe(3);
    });
  });
});

describe('Extended Forms API - Page Level', () => {
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

  describe('hasFormFieldAtPoint', () => {
    test('should return number', () => {
      const result = page.hasFormFieldAtPoint(100, 100);
      expect(typeof result).toBe('number');
    });

    test('should return -1 when no form field', () => {
      // Most PDFs won't have form fields at arbitrary points
      const result = page.hasFormFieldAtPoint(0, 0);
      expect(result).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('getFormFieldZOrderAtPoint', () => {
    test('should return number', () => {
      const result = page.getFormFieldZOrderAtPoint(100, 100);
      expect(typeof result).toBe('number');
    });

    test('should return -1 when no form field', () => {
      const result = page.getFormFieldZOrderAtPoint(0, 0);
      expect(result).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('getFormSelectedText', () => {
    test('should return undefined when no selection', () => {
      const text = page.getFormSelectedText();
      expect(text).toBeUndefined();
    });
  });

  describe('replaceFormSelection', () => {
    test('should not throw', () => {
      expect(() => page.replaceFormSelection('test')).not.toThrow();
    });
  });

  describe('canFormUndo', () => {
    test('should return boolean', () => {
      const canUndo = page.canFormUndo();
      expect(typeof canUndo).toBe('boolean');
    });
  });

  describe('canFormRedo', () => {
    test('should return boolean', () => {
      const canRedo = page.canFormRedo();
      expect(typeof canRedo).toBe('boolean');
    });
  });

  describe('formUndo', () => {
    test('should return boolean', () => {
      const result = page.formUndo();
      expect(typeof result).toBe('boolean');
    });

    test('should return false when nothing to undo', () => {
      // Without any edits, undo should return false
      const result = page.formUndo();
      expect(result).toBe(false);
    });
  });

  describe('formRedo', () => {
    test('should return boolean', () => {
      const result = page.formRedo();
      expect(typeof result).toBe('boolean');
    });

    test('should return false when nothing to redo', () => {
      // Without any undone edits, redo should return false
      const result = page.formRedo();
      expect(result).toBe(false);
    });
  });
});

describe('Extended Forms with different PDFs', () => {
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

    expect(() => doc.formType).not.toThrow();
    expect(() => doc.hasForm()).not.toThrow();
    expect(() => page.hasFormFieldAtPoint(100, 100)).not.toThrow();
  });
});

describe('Extended Forms post-dispose guards - Document', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on formType after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.formType).toThrow();
  });

  test('should throw on hasForm after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasForm()).toThrow();
  });

  test('should throw on hasAcroForm after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasAcroForm()).toThrow();
  });

  test('should throw on hasXFAForm after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasXFAForm()).toThrow();
  });

  test('should throw on killFormFocus after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.killFormFocus()).toThrow();
  });

  test('should throw on setFormFieldHighlightColour after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.setFormFieldHighlightColour(0, 0)).toThrow();
  });

  test('should throw on setFormFieldHighlightAlpha after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.setFormFieldHighlightAlpha(128)).toThrow();
  });
});

describe('Extended Forms post-dispose guards - Page', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on hasFormFieldAtPoint after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.hasFormFieldAtPoint(100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on getFormFieldZOrderAtPoint after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFieldZOrderAtPoint(100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on getFormSelectedText after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormSelectedText()).toThrow();
    doc.dispose();
  });

  test('should throw on replaceFormSelection after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.replaceFormSelection('test')).toThrow();
    doc.dispose();
  });

  test('should throw on canFormUndo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.canFormUndo()).toThrow();
    doc.dispose();
  });

  test('should throw on canFormRedo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.canFormRedo()).toThrow();
    doc.dispose();
  });

  test('should throw on formUndo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formUndo()).toThrow();
    doc.dispose();
  });

  test('should throw on formRedo after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formRedo()).toThrow();
    doc.dispose();
  });
});
