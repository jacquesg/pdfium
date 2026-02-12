/**
 * Integration tests for form modification API.
 *
 * Tests the FORM_On*, FORM_Set*, and FORM_*Selection functions.
 */

import { describe, expect, test } from '../utils/fixtures.js';

describe('Form Modification API - Mouse Events', () => {
  describe('formMouseMove', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formMouseMove(0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle different coordinates', async ({ testPage }) => {
      expect(() => testPage.formMouseMove(0, 0, 0)).not.toThrow();
      expect(() => testPage.formMouseMove(0, 500, 500)).not.toThrow();
    });

    test('should accept modifier flags', async ({ testPage }) => {
      expect(() => testPage.formMouseMove(1, 100, 100)).not.toThrow(); // Shift
      expect(() => testPage.formMouseMove(2, 100, 100)).not.toThrow(); // Ctrl
    });
  });

  describe('formMouseWheel', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formMouseWheel(0, 100, 100, 0, 10);
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle scroll delta values', async ({ testPage }) => {
      expect(() => testPage.formMouseWheel(0, 100, 100, -10, 0)).not.toThrow();
      expect(() => testPage.formMouseWheel(0, 100, 100, 0, -10)).not.toThrow();
    });
  });

  describe('formFocus', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formFocus(0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('formMouseDown', () => {
    test('should return boolean for left button', async ({ testPage }) => {
      const result = testPage.formMouseDown('left', 0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });

    test('should return boolean for right button', async ({ testPage }) => {
      const result = testPage.formMouseDown('right', 0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('formMouseUp', () => {
    test('should return boolean for left button', async ({ testPage }) => {
      const result = testPage.formMouseUp('left', 0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });

    test('should return boolean for right button', async ({ testPage }) => {
      const result = testPage.formMouseUp('right', 0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('formDoubleClick', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formDoubleClick(0, 100, 100);
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Form Modification API - Keyboard Events', () => {
  describe('formKeyDown', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formKeyDown(65, 0); // 'A' key
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle different key codes', async ({ testPage }) => {
      expect(() => testPage.formKeyDown(13, 0)).not.toThrow(); // Enter
      expect(() => testPage.formKeyDown(27, 0)).not.toThrow(); // Escape
      expect(() => testPage.formKeyDown(9, 0)).not.toThrow(); // Tab
    });

    test('should accept modifier flags', async ({ testPage }) => {
      expect(() => testPage.formKeyDown(65, 1)).not.toThrow(); // Shift+A
      expect(() => testPage.formKeyDown(65, 2)).not.toThrow(); // Ctrl+A
    });
  });

  describe('formKeyUp', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formKeyUp(65, 0); // 'A' key
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('formChar', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formChar(65, 0); // 'A' character
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle different characters', async ({ testPage }) => {
      expect(() => testPage.formChar(32, 0)).not.toThrow(); // Space
      expect(() => testPage.formChar(48, 0)).not.toThrow(); // '0'
    });
  });
});

describe('Form Modification API - Text Operations', () => {
  describe('getFormFocusedText', () => {
    test('should return undefined when no focused field', async ({ testPage }) => {
      const text = testPage.getFormFocusedText();
      expect(text).toBeUndefined();
    });
  });

  describe('replaceFormSelectionAndKeep', () => {
    test('should not throw', async ({ testPage }) => {
      expect(() => testPage.replaceFormSelectionAndKeep('test')).not.toThrow();
    });

    test('should handle empty string', async ({ testPage }) => {
      expect(() => testPage.replaceFormSelectionAndKeep('')).not.toThrow();
    });
  });

  describe('formSelectAllText', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.formSelectAllText();
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Form Modification API - Focus and Selection', () => {
  describe('setFormIndexSelected', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.setFormIndexSelected(0, true);
      expect(result).toBeTypeOf('boolean');
    });

    test('should handle deselect', async ({ testPage }) => {
      const result = testPage.setFormIndexSelected(0, false);
      expect(result).toBeTypeOf('boolean');
    });
  });

  describe('isFormIndexSelected', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.isFormIndexSelected(0);
      expect(result).toBeTypeOf('boolean');
    });

    test('should return false for invalid index', async ({ testPage }) => {
      const result = testPage.isFormIndexSelected(-1);
      expect(result).toBe(false);
    });
  });
});

describe('Form Modification with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => page.formMouseMove(0, 100, 100)).not.toThrow();
    expect(() => page.formKeyDown(65, 0)).not.toThrow();
    expect(() => page.formSelectAllText()).not.toThrow();
  });
});

describe('Form Modification post-dispose guards', () => {
  test('should throw on formMouseMove after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseMove(0, 100, 100)).toThrow();
  });

  test('should throw on formMouseWheel after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseWheel(0, 100, 100, 0, 10)).toThrow();
  });

  test('should throw on formFocus after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formFocus(0, 100, 100)).toThrow();
  });

  test('should throw on formMouseDown (left) after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseDown('left', 0, 100, 100)).toThrow();
  });

  test('should throw on formMouseDown (right) after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseDown('right', 0, 100, 100)).toThrow();
  });

  test('should throw on formMouseUp (left) after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseUp('left', 0, 100, 100)).toThrow();
  });

  test('should throw on formMouseUp (right) after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formMouseUp('right', 0, 100, 100)).toThrow();
  });

  test('should throw on formDoubleClick after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formDoubleClick(0, 100, 100)).toThrow();
  });

  test('should throw on formKeyDown after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formKeyDown(65, 0)).toThrow();
  });

  test('should throw on formKeyUp after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formKeyUp(65, 0)).toThrow();
  });

  test('should throw on formChar after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formChar(65, 0)).toThrow();
  });

  test('should throw on getFormFocusedText after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.getFormFocusedText()).toThrow();
  });

  test('should throw on replaceFormSelectionAndKeep after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.replaceFormSelectionAndKeep('test')).toThrow();
  });

  test('should throw on formSelectAllText after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.formSelectAllText()).toThrow();
  });

  test('should throw on setFormIndexSelected after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.setFormIndexSelected(0, true)).toThrow();
  });

  test('should throw on isFormIndexSelected after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.isFormIndexSelected(0)).toThrow();
  });
});
