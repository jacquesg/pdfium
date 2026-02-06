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

  describe('formMouseMove', () => {
    test('should return boolean', () => {
      const result = page.formMouseMove(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });

    test('should handle different coordinates', () => {
      expect(() => page.formMouseMove(0, 0, 0)).not.toThrow();
      expect(() => page.formMouseMove(0, 500, 500)).not.toThrow();
    });

    test('should accept modifier flags', () => {
      expect(() => page.formMouseMove(1, 100, 100)).not.toThrow(); // Shift
      expect(() => page.formMouseMove(2, 100, 100)).not.toThrow(); // Ctrl
    });
  });

  describe('formMouseWheel', () => {
    test('should return boolean', () => {
      const result = page.formMouseWheel(0, 100, 100, 0, 10);
      expect(typeof result).toBe('boolean');
    });

    test('should handle scroll delta values', () => {
      expect(() => page.formMouseWheel(0, 100, 100, -10, 0)).not.toThrow();
      expect(() => page.formMouseWheel(0, 100, 100, 0, -10)).not.toThrow();
    });
  });

  describe('formFocus', () => {
    test('should return boolean', () => {
      const result = page.formFocus(0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formMouseDown', () => {
    test('should return boolean', () => {
      const result = page.formMouseDown('left', 0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formMouseDown', () => {
    test('should return boolean', () => {
      const result = page.formMouseDown('right', 0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formMouseUp', () => {
    test('should return boolean', () => {
      const result = page.formMouseUp('left', 0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formMouseUp', () => {
    test('should return boolean', () => {
      const result = page.formMouseUp('right', 0, 100, 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formDoubleClick', () => {
    test('should return boolean', () => {
      const result = page.formDoubleClick(0, 100, 100);
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

  describe('formKeyDown', () => {
    test('should return boolean', () => {
      const result = page.formKeyDown(65, 0); // 'A' key
      expect(typeof result).toBe('boolean');
    });

    test('should handle different key codes', () => {
      expect(() => page.formKeyDown(13, 0)).not.toThrow(); // Enter
      expect(() => page.formKeyDown(27, 0)).not.toThrow(); // Escape
      expect(() => page.formKeyDown(9, 0)).not.toThrow(); // Tab
    });

    test('should accept modifier flags', () => {
      expect(() => page.formKeyDown(65, 1)).not.toThrow(); // Shift+A
      expect(() => page.formKeyDown(65, 2)).not.toThrow(); // Ctrl+A
    });
  });

  describe('formKeyUp', () => {
    test('should return boolean', () => {
      const result = page.formKeyUp(65, 0); // 'A' key
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formChar', () => {
    test('should return boolean', () => {
      const result = page.formChar(65, 0); // 'A' character
      expect(typeof result).toBe('boolean');
    });

    test('should handle different characters', () => {
      expect(() => page.formChar(32, 0)).not.toThrow(); // Space
      expect(() => page.formChar(48, 0)).not.toThrow(); // '0'
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

    expect(() => page.formMouseMove(0, 100, 100)).not.toThrow();
    expect(() => page.formKeyDown(65, 0)).not.toThrow();
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

  test('should throw on formMouseMove after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseMove(0, 100, 100)).toThrow();
  });

  test('should throw on formMouseWheel after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseWheel(0, 100, 100, 0, 10)).toThrow();
  });

  test('should throw on formFocus after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formFocus(0, 100, 100)).toThrow();
  });

  test('should throw on formMouseDown after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseDown('left', 0, 100, 100)).toThrow();
  });

  test('should throw on formMouseDown after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseDown('right', 0, 100, 100)).toThrow();
  });

  test('should throw on formMouseUp after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseUp('left', 0, 100, 100)).toThrow();
  });

  test('should throw on formMouseUp after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseUp('right', 0, 100, 100)).toThrow();
  });

  test('should throw on formDoubleClick after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formDoubleClick(0, 100, 100)).toThrow();
  });

  test('should throw on formKeyDown after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formKeyDown(65, 0)).toThrow();
  });

  test('should throw on formKeyUp after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formKeyUp(65, 0)).toThrow();
  });

  test('should throw on formChar after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formChar(65, 0)).toThrow();
  });

  test('should throw on getFormFocusedText after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFocusedText()).toThrow();
  });

  test('should throw on replaceFormSelectionAndKeep after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.replaceFormSelectionAndKeep('test')).toThrow();
  });

  test('should throw on formSelectAllText after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formSelectAllText()).toThrow();
  });

  test('should throw on setFormIndexSelected after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setFormIndexSelected(0, true)).toThrow();
  });

  test('should throw on isFormIndexSelected after dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.isFormIndexSelected(0)).toThrow();
  });
});
