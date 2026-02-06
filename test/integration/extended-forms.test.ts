/**
 * Integration tests for extended forms API.
 *
 * Tests the FORM_* and FPDF_GetFormType functions.
 */

import { describe, expect, test } from 'vitest';
import { FormFieldType, FormType } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Forms API - Document Level', () => {
  describe('formType', () => {
    test('should return valid form type', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const type = document.formType;
      expect(typeof type).toBe('string');
      expect(Object.values(FormType)).toContain(type);
    });
  });

  describe('hasForm', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasForm = document.hasForm();
      expect(typeof hasForm).toBe('boolean');
    });

    test('should be consistent with formType', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasForm = document.hasForm();
      const type = document.formType;
      expect(hasForm).toBe(type !== FormType.None);
    });
  });

  describe('hasAcroForm', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasAcro = document.hasAcroForm();
      expect(typeof hasAcro).toBe('boolean');
    });

    test('should be consistent with formType', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasAcro = document.hasAcroForm();
      expect(hasAcro).toBe(document.formType === FormType.AcroForm);
    });
  });

  describe('hasXFAForm', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const hasXFA = document.hasXFAForm();
      expect(typeof hasXFA).toBe('boolean');
    });
  });

  describe('killFormFocus', () => {
    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.killFormFocus()).not.toThrow();
    });

    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      const result = document.killFormFocus();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('setFormFieldHighlightColour', () => {
    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() =>
        document.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 255, g: 0, b: 0, a: 255 }),
      ).not.toThrow();
    });
  });

  describe('setFormFieldHighlightAlpha', () => {
    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      expect(() => document.setFormFieldHighlightAlpha(128)).not.toThrow();
    });
  });

  describe('FormType enum', () => {
    test('should have expected values', () => {
      expect(FormType.None).toBe('None');
      expect(FormType.AcroForm).toBe('AcroForm');
      expect(FormType.XFAFull).toBe('XFAFull');
      expect(FormType.XFAForeground).toBe('XFAForeground');
    });
  });
});

describe('Extended Forms API - Page Level', () => {
  describe('getFormFieldTypeAtPoint', () => {
    test('should return FormFieldType or null', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const result = page.getFormFieldTypeAtPoint(100, 100);
      if (result !== null) {
        expect(Object.values(FormFieldType)).toContain(result);
      }
    });

    test('should return null when no form field', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Most PDFs won't have form fields at arbitrary points
      const result = page.getFormFieldTypeAtPoint(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('getFormFieldZOrderAtPoint', () => {
    test('should return number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const result = page.getFormFieldZOrderAtPoint(100, 100);
      expect(typeof result).toBe('number');
    });

    test('should return -1 when no form field', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const result = page.getFormFieldZOrderAtPoint(0, 0);
      expect(result).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('getFormSelectedText', () => {
    test('should return undefined when no selection', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const text = page.getFormSelectedText();
      expect(text).toBeUndefined();
    });
  });

  describe('replaceFormSelection', () => {
    test('should not throw', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.replaceFormSelection('test')).not.toThrow();
    });
  });

  describe('canFormUndo', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const canUndo = page.canFormUndo();
      expect(typeof canUndo).toBe('boolean');
    });
  });

  describe('canFormRedo', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const canRedo = page.canFormRedo();
      expect(typeof canRedo).toBe('boolean');
    });
  });

  describe('formUndo', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const result = page.formUndo();
      expect(typeof result).toBe('boolean');
    });

    test('should return false when nothing to undo', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Without any edits, undo should return false
      const result = page.formUndo();
      expect(result).toBe(false);
    });
  });

  describe('formRedo', () => {
    test('should return boolean', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const result = page.formRedo();
      expect(typeof result).toBe('boolean');
    });

    test('should return false when nothing to redo', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Without any undone edits, redo should return false
      const result = page.formRedo();
      expect(result).toBe(false);
    });
  });
});

describe('Extended Forms with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => doc.formType).not.toThrow();
    expect(() => doc.hasForm()).not.toThrow();
    expect(() => page.getFormFieldTypeAtPoint(100, 100)).not.toThrow();
  });
});

describe('Extended Forms post-dispose guards - Document', () => {
  test('should throw on formType after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.formType).toThrow();
  });

  test('should throw on hasForm after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasForm()).toThrow();
  });

  test('should throw on hasAcroForm after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasAcroForm()).toThrow();
  });

  test('should throw on hasXFAForm after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.hasXFAForm()).toThrow();
  });

  test('should throw on killFormFocus after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.killFormFocus()).toThrow();
  });

  test('should throw on setFormFieldHighlightColour after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 0, g: 0, b: 0, a: 0 })).toThrow();
  });

  test('should throw on setFormFieldHighlightAlpha after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    doc.dispose();
    expect(() => doc.setFormFieldHighlightAlpha(128)).toThrow();
  });
});

describe('Extended Forms post-dispose guards - Page', () => {
  test('should throw on getFormFieldTypeAtPoint after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFieldTypeAtPoint(100, 100)).toThrow();
  });

  test('should throw on getFormFieldZOrderAtPoint after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFieldZOrderAtPoint(100, 100)).toThrow();
  });

  test('should throw on getFormSelectedText after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormSelectedText()).toThrow();
  });

  test('should throw on replaceFormSelection after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.replaceFormSelection('test')).toThrow();
  });

  test('should throw on canFormUndo after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.canFormUndo()).toThrow();
  });

  test('should throw on canFormRedo after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.canFormRedo()).toThrow();
  });

  test('should throw on formUndo after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formUndo()).toThrow();
  });

  test('should throw on formRedo after dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formRedo()).toThrow();
  });
});
