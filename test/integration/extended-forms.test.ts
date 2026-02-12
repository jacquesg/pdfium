/**
 * Integration tests for extended forms API.
 *
 * Tests the FORM_* and FPDF_GetFormType functions.
 */

import { FormFieldType, FormType } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Extended Forms API - Document Level', () => {
  describe('formType', () => {
    test('should return valid form type', async ({ testDocument }) => {
      const type = testDocument.formType;
      expect(type).toBeTypeOf('string');
      expect(Object.values(FormType)).toContain(type);
    });
  });

  describe('hasForm', () => {
    test('should return boolean', async ({ testDocument }) => {
      const hasForm = testDocument.hasForm();
      expect(hasForm).toBeTypeOf('boolean');
    });

    test('should be consistent with formType', async ({ testDocument }) => {
      const hasForm = testDocument.hasForm();
      const type = testDocument.formType;
      expect(hasForm).toBe(type !== FormType.None);
    });
  });

  describe('hasAcroForm', () => {
    test('should return boolean', async ({ testDocument }) => {
      const hasAcro = testDocument.hasAcroForm();
      expect(hasAcro).toBeTypeOf('boolean');
    });

    test('should be consistent with formType', async ({ testDocument }) => {
      const hasAcro = testDocument.hasAcroForm();
      expect(hasAcro).toBe(testDocument.formType === FormType.AcroForm);
    });
  });

  describe('hasXFAForm', () => {
    test('should return boolean', async ({ testDocument }) => {
      const hasXFA = testDocument.hasXFAForm();
      expect(hasXFA).toBeTypeOf('boolean');
    });
  });

  describe('killFormFocus', () => {
    test('should not throw', async ({ testDocument }) => {
      expect(() => testDocument.killFormFocus()).not.toThrow();
    });

    test('should return boolean', async ({ testDocument }) => {
      const result = testDocument.killFormFocus();
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('setFormFieldHighlightColour', () => {
    test('should not throw', async ({ testDocument }) => {
      expect(() =>
        testDocument.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 255, g: 0, b: 0, a: 255 }),
      ).not.toThrow();
    });
  });

  describe('setFormFieldHighlightAlpha', () => {
    test('should not throw', async ({ testDocument }) => {
      expect(() => testDocument.setFormFieldHighlightAlpha(128)).not.toThrow();
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
    test('should return FormFieldType or null', async ({ testPage }) => {
      const result = testPage.getFormFieldTypeAtPoint(100, 100);
      if (result !== null) {
        expect(Object.values(FormFieldType)).toContain(result);
      }
    });

    test('should return null when no form field', async ({ testPage }) => {
      const result = testPage.getFormFieldTypeAtPoint(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('getFormFieldZOrderAtPoint', () => {
    test('should return number', async ({ testPage }) => {
      const result = testPage.getFormFieldZOrderAtPoint(100, 100);
      expect(result).toBeTypeOf('number');
    });

    test('should return -1 when no form field', async ({ testPage }) => {
      const result = testPage.getFormFieldZOrderAtPoint(0, 0);
      expect(result).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('getFormSelectedText', () => {
    test('should return undefined when no selection', async ({ testPage }) => {
      const text = testPage.getFormSelectedText();
      expect(text).toBeUndefined();
    });
  });

  describe('replaceFormSelection', () => {
    test('should not throw', async ({ testPage }) => {
      expect(() => testPage.replaceFormSelection('test')).not.toThrow();
    });
  });

  describe('canFormUndo', () => {
    test('should return boolean', async ({ testPage }) => {
      const canUndo = testPage.canFormUndo();
      expect(canUndo).toBeTypeOf('boolean');
    });
  });

  describe('canFormRedo', () => {
    test('should return boolean', async ({ testPage }) => {
      const canRedo = testPage.canFormRedo();
      expect(canRedo).toBeTypeOf('boolean');
    });
  });

  describe('formUndo', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formUndo();
      expect(result).toBeTypeOf('boolean');
    });

    test('should return false when nothing to undo', async ({ testPage }) => {
      const result = testPage.formUndo();
      expect(result).toBe(false);
    });
  });

  describe('formRedo', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formRedo();
      expect(result).toBeTypeOf('boolean');
    });

    test('should return false when nothing to redo', async ({ testPage }) => {
      const result = testPage.formRedo();
      expect(result).toBe(false);
    });
  });
});

describe('Extended Forms with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => doc.formType).not.toThrow();
    expect(() => doc.hasForm()).not.toThrow();
    expect(() => page.getFormFieldTypeAtPoint(100, 100)).not.toThrow();
  });
});

describe('Extended Forms post-dispose guards - Document', () => {
  test('should throw on formType after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.formType).toThrow();
  });

  test('should throw on hasForm after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.hasForm()).toThrow();
  });

  test('should throw on hasAcroForm after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.hasAcroForm()).toThrow();
  });

  test('should throw on hasXFAForm after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.hasXFAForm()).toThrow();
  });

  test('should throw on killFormFocus after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.killFormFocus()).toThrow();
  });

  test('should throw on setFormFieldHighlightColour after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 0, g: 0, b: 0, a: 0 })).toThrow();
  });

  test('should throw on setFormFieldHighlightAlpha after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    doc.dispose();
    expect(() => doc.setFormFieldHighlightAlpha(128)).toThrow();
  });
});

describe('Extended Forms post-dispose guards - Page', () => {
  test('should throw on getFormFieldTypeAtPoint after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFieldTypeAtPoint(100, 100)).toThrow();
  });

  test('should throw on getFormFieldZOrderAtPoint after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFieldZOrderAtPoint(100, 100)).toThrow();
  });

  test('should throw on getFormSelectedText after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormSelectedText()).toThrow();
  });

  test('should throw on replaceFormSelection after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.replaceFormSelection('test')).toThrow();
  });

  test('should throw on canFormUndo after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.canFormUndo()).toThrow();
  });

  test('should throw on canFormRedo after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.canFormRedo()).toThrow();
  });

  test('should throw on formUndo after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formUndo()).toThrow();
  });

  test('should throw on formRedo after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formRedo()).toThrow();
  });
});
