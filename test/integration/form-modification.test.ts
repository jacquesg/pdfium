/**
 * Integration tests for form modification API.
 *
 * Tests the FORM_On*, FORM_Set*, and FORM_*Selection functions.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Form Modification API - Mouse Events', () => {
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

  describe('formOnMouseMove', () => {
    test('should return boolean', () => {
      const result = page.formOnMouseMove(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });

    test('should handle different coordinates', () => {
      expect(() => page.formOnMouseMove(0, 0, 0)).not.toThrow();
      expect(() => page.formOnMouseMove(0, 500, 500)).not.toThrow();
    });

    test('should accept modifier flags', () => {
      expect(() => page.formOnMouseMove(1, 100, 100)).not.toThrow(); // Shift
      expect(() => page.formOnMouseMove(2, 100, 100)).not.toThrow(); // Ctrl
    });
  });

  describe('formOnMouseWheel', () => {
    test('should return boolean', () => {
      const result = page.formOnMouseWheel(0, 100, 100, 0, 10);
      expect(typeof result).toBe('boolean');
    });

    test('should handle scroll delta values', () => {
      expect(() => page.formOnMouseWheel(0, 100, 100, -10, 0)).not.toThrow();
      expect(() => page.formOnMouseWheel(0, 100, 100, 0, -10)).not.toThrow();
    });
  });

  describe('formOnFocus', () => {
    test('should return boolean', () => {
      const result = page.formOnFocus(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formOnLButtonDown', () => {
    test('should return boolean', () => {
      const result = page.formOnLButtonDown(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formOnRButtonDown', () => {
    test('should return boolean', () => {
      const result = page.formOnRButtonDown(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formOnLButtonUp', () => {
    test('should return boolean', () => {
      const result = page.formOnLButtonUp(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formOnRButtonUp', () => {
    test('should return boolean', () => {
      const result = page.formOnRButtonUp(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formOnLButtonDoubleClick', () => {
    test('should return boolean', () => {
      const result = page.formOnLButtonDoubleClick(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Form Modification API - Keyboard Events', () => {
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

  describe('formOnKeyDown', () => {
    test('should return boolean', () => {
      const result = page.formOnKeyDown(65, 0); // 'A' key
      expect(typeof result).toBe('boolean');
    });

    test('should handle different key codes', () => {
      expect(() => page.formOnKeyDown(13, 0)).not.toThrow(); // Enter
      expect(() => page.formOnKeyDown(27, 0)).not.toThrow(); // Escape
      expect(() => page.formOnKeyDown(9, 0)).not.toThrow(); // Tab
    });

    test('should accept modifier flags', () => {
      expect(() => page.formOnKeyDown(65, 1)).not.toThrow(); // Shift+A
      expect(() => page.formOnKeyDown(65, 2)).not.toThrow(); // Ctrl+A
    });
  });

  describe('formOnKeyUp', () => {
    test('should return boolean', () => {
      const result = page.formOnKeyUp(65, 0); // 'A' key
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formOnChar', () => {
    test('should return boolean', () => {
      const result = page.formOnChar(65, 0); // 'A' character
      expect(typeof result).toBe('boolean');
    });

    test('should handle different characters', () => {
      expect(() => page.formOnChar(32, 0)).not.toThrow(); // Space
      expect(() => page.formOnChar(48, 0)).not.toThrow(); // '0'
    });
  });
});

describe('Form Modification API - Text Operations', () => {
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

  describe('getFormFocusedText', () => {
    test('should return undefined when no focused field', () => {
      const text = page.getFormFocusedText();
      expect(text).toBeUndefined();
    });
  });

  describe('replaceFormSelectionAndKeep', () => {
    test('should not throw', () => {
      expect(() => page.replaceFormSelectionAndKeep('test')).not.toThrow();
    });

    test('should handle empty string', () => {
      expect(() => page.replaceFormSelectionAndKeep('')).not.toThrow();
    });
  });

  describe('formSelectAllText', () => {
    test('should return boolean', () => {
      const result = page.formSelectAllText();
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Form Modification API - Focus and Selection', () => {
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

  describe('setFormFocusedAnnotation', () => {
    test('should return boolean for invalid handle', () => {
      const result = page.setFormFocusedAnnotation(0 as never);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('setFormIndexSelected', () => {
    test('should return boolean', () => {
      const result = page.setFormIndexSelected(0, true);
      expect(typeof result).toBe('boolean');
    });

    test('should handle deselect', () => {
      const result = page.setFormIndexSelected(0, false);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isFormIndexSelected', () => {
    test('should return boolean', () => {
      const result = page.isFormIndexSelected(0);
      expect(typeof result).toBe('boolean');
    });

    test('should return false for invalid index', () => {
      const result = page.isFormIndexSelected(-1);
      expect(result).toBe(false);
    });
  });
});

describe('Form Modification with different PDFs', () => {
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

    expect(() => page.formOnMouseMove(0, 100, 100)).not.toThrow();
    expect(() => page.formOnKeyDown(65, 0)).not.toThrow();
    expect(() => page.formSelectAllText()).not.toThrow();
  });
});

describe('Form Modification post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on formOnMouseMove after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnMouseMove(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnMouseWheel after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnMouseWheel(0, 100, 100, 0, 10)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnFocus after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnFocus(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnLButtonDown after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnLButtonDown(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnRButtonDown after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnRButtonDown(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnLButtonUp after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnLButtonUp(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnRButtonUp after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnRButtonUp(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnLButtonDoubleClick after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnLButtonDoubleClick(0, 100, 100)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnKeyDown after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnKeyDown(65, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnKeyUp after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnKeyUp(65, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on formOnChar after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formOnChar(65, 0)).toThrow();
    doc.dispose();
  });

  test('should throw on getFormFocusedText after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFocusedText()).toThrow();
    doc.dispose();
  });

  test('should throw on replaceFormSelectionAndKeep after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.replaceFormSelectionAndKeep('test')).toThrow();
    doc.dispose();
  });

  test('should throw on formSelectAllText after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formSelectAllText()).toThrow();
    doc.dispose();
  });

  test('should throw on setFormFocusedAnnotation after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setFormFocusedAnnotation(0 as never)).toThrow();
    doc.dispose();
  });

  test('should throw on setFormIndexSelected after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setFormIndexSelected(0, true)).toThrow();
    doc.dispose();
  });

  test('should throw on isFormIndexSelected after dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.isFormIndexSelected(0)).toThrow();
    doc.dispose();
  });
});
