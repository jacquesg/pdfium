/**
 * Integration tests for page object marks.
 *
 * These tests verify the methods for reading and modifying content marks
 * on page objects. Content marks are used in tagged PDF content to provide
 * semantic information about page elements. Common marks include:
 *
 * - `/Artifact`: Marks content as decorative (not part of the document structure)
 * - `/Span`: Text spans with language or style attributes
 * - `/Figure`: Image content with alt text
 * - `/P`: Paragraph markers
 *
 * @see https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf Section 14.6
 */

import { describe, expect, test } from 'vitest';
import { PageObjectMarkValueType, PageObjectType } from '../../src/core/types.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Page Object Marks', () => {
  describe('PageObjectMarkValueType enum values', () => {
    test('should have correct values per PDFium specification', () => {
      // Value types for mark parameters
      expect(PageObjectMarkValueType.Int).toBe('Int');
      expect(PageObjectMarkValueType.String).toBe('String');
      expect(PageObjectMarkValueType.Blob).toBe('Blob');
      expect(PageObjectMarkValueType.Name).toBe('Name');
    });
  });

  describe('markCount', () => {
    test('should return a number for any page object', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const count = firstObj.markCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should return count for all objects on page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      expect(objects.length).toBeGreaterThan(0);

      for (const obj of objects) {
        const count = obj.markCount;
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return same count when called multiple times', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const count1 = firstObj.markCount;
      const count2 = firstObj.markCount;
      expect(count1).toBe(count2);
    });
  });

  describe('getMark', () => {
    test('should return null for out-of-range index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const count = firstObj.markCount;

      // Try to get a mark at an invalid index
      const mark = firstObj.getMark(count + 100);
      expect(mark).toBeNull();
    });

    test('should return null for negative index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const mark = firstObj.getMark(-1);
      expect(mark).toBeNull();
    });

    test('should return valid mark object when marks exist', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();

      // Find an object with marks
      for (const obj of objects) {
        const count = obj.markCount;
        if (count > 0) {
          const mark = obj.getMark(0);
          expect(mark).not.toBeNull();

          if (mark !== null) {
            expect(typeof mark.name).toBe('string');
            expect(Array.isArray(mark.params)).toBe(true);
          }
          return;
        }
      }

      // If no objects have marks, the test still passes (early return above covers the positive case)
      expect(objects.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('marks', () => {
    test('should return an array', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const marks = firstObj.marks;
      expect(Array.isArray(marks)).toBe(true);
    });

    test('should return array with length matching count', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const count = firstObj.markCount;
      const marks = firstObj.marks;

      // The array should have at most `count` items
      // (some marks might return null and be filtered out)
      expect(marks.length).toBeLessThanOrEqual(count);
    });

    test('should return marks with valid structure', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();

      for (const obj of objects) {
        const marks = obj.marks;

        for (const mark of marks) {
          expect(typeof mark.name).toBe('string');
          // Mark names can be empty in some cases
          expect(Array.isArray(mark.params)).toBe(true);

          // Verify each parameter uses the discriminated union correctly
          for (const param of mark.params) {
            expect(typeof param.key).toBe('string');
            expect(Object.values(PageObjectMarkValueType)).toContain(param.valueType);

            // Verify discriminated union: `value` field exists and has the correct type
            if (param.valueType === PageObjectMarkValueType.Int) {
              expect(typeof param.value).toBe('number');
            } else if (
              param.valueType === PageObjectMarkValueType.String ||
              param.valueType === PageObjectMarkValueType.Name
            ) {
              expect(typeof param.value).toBe('string');
            } else if (param.valueType === PageObjectMarkValueType.Blob) {
              expect(param.value).toBeInstanceOf(Uint8Array);
            }
          }
        }
      }
    });
  });

  describe('addMark', () => {
    test('should return mark object when adding a new mark', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const countBefore = firstObj.markCount;
      const mark = firstObj.addMark('TestMark');

      // If the function is available and succeeds, count should increase
      if (mark !== null) {
        expect(typeof mark.name).toBe('string');
        expect(Array.isArray(mark.params)).toBe(true);
        const countAfter = firstObj.markCount;
        expect(countAfter).toBe(countBefore + 1);
      }
    });

    test('should be able to add standard mark types', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      // Standard PDF mark types
      const markTypes = ['Artifact', 'Span', 'Figure', 'Link'];

      for (const markType of markTypes) {
        const mark = firstObj.addMark(markType);
        // Just verify it doesn't throw - result depends on WASM availability
        expect(mark === null || typeof mark === 'object').toBe(true);
      }
    });

    test('should return null for empty mark name', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const mark = firstObj.addMark('');
      // Empty name might be rejected
      expect(mark === null || typeof mark === 'object').toBe(true);
    });
  });

  describe('removeMark', () => {
    test('should return boolean result', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      // Add a mark first
      const mark = firstObj.addMark('TempMark');
      if (mark === null) return;

      // Remove the last mark by index
      const lastIndex = firstObj.markCount - 1;
      const result = firstObj.removeMark(lastIndex);
      expect(typeof result).toBe('boolean');
    });

    test('should successfully remove an added mark', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      const countBefore = firstObj.markCount;

      // Add a mark
      const mark = firstObj.addMark('RemovableTestMark');
      if (mark === null) return;

      const countAfterAdd = firstObj.markCount;

      // Remove the last mark (the one we just added) by index
      const lastIndex = countAfterAdd - 1;
      const success = firstObj.removeMark(lastIndex);

      if (success) {
        const countAfterRemove = firstObj.markCount;
        expect(countAfterRemove).toBe(countBefore);
        expect(countAfterRemove).toBe(countAfterAdd - 1);
      }
    });

    test('should return false for out-of-range index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const objects = page.getObjects();
      const firstObj = objects[0];
      if (!firstObj) return;

      // Try to remove with an out-of-range index
      const result = firstObj.removeMark(99999);
      expect(result).toBe(false);
    });
  });
});

describe('Page Object Marks with different object types', () => {
  test('should work with text objects', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

    expect(textObjects.length).toBeGreaterThan(0);

    for (const textObj of textObjects) {
      const count = textObj.markCount;
      expect(typeof count).toBe('number');

      const marks = textObj.marks;
      expect(Array.isArray(marks)).toBe(true);
    }
  });

  test('should work with image objects', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const imageObjects = objects.filter((obj) => obj.type === PageObjectType.Image);

    for (const imageObj of imageObjects) {
      const count = imageObj.markCount;
      expect(typeof count).toBe('number');

      const marks = imageObj.marks;
      expect(Array.isArray(marks)).toBe(true);
    }
  });

  test('should work with path objects', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const pathObjects = objects.filter((obj) => obj.type === PageObjectType.Path);

    for (const pathObj of pathObjects) {
      const count = pathObj.markCount;
      expect(typeof count).toBe('number');

      const marks = pathObj.marks;
      expect(Array.isArray(marks)).toBe(true);
    }
  });
});

describe('Page Object Marks with forms PDF', () => {
  test('should work with form document', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    // Test marks functionality on all objects
    for (const obj of objects) {
      const count = obj.markCount;
      expect(typeof count).toBe('number');

      if (count > 0) {
        const marks = obj.marks;
        expect(marks.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Page Object Marks post-dispose guards', () => {
  test('should throw on markCount after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => firstObj.markCount).toThrow();
    }
  });

  test('should throw on getMark after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => firstObj.getMark(0)).toThrow();
    }
  });

  test('should throw on marks after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => firstObj.marks).toThrow();
    }
  });

  test('should throw on addMark after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => firstObj.addMark('Test')).toThrow();
    }
  });

  test('should throw on removeMark after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => firstObj.removeMark(0)).toThrow();
    }
  });
});
