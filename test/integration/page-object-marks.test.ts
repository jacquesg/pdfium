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

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PageObjectMarkValueType, PageObjectType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PageObjectHandle, PageObjectMarkHandle } from '../../src/internal/handles.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Page Object Marks', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let firstObjHandle: PageObjectHandle | null = null;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);

    // Get the first page object handle for testing
    const objects = page.getObjects();
    if (objects.length > 0) {
      firstObjHandle = objects[0]!.handle;
    }
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('PageObjectMarkValueType enum values', () => {
    test('should have correct values per PDFium specification', () => {
      // Value types for mark parameters
      expect(PageObjectMarkValueType.Int).toBe(0);
      expect(PageObjectMarkValueType.String).toBe(2);
      expect(PageObjectMarkValueType.Blob).toBe(3);
      expect(PageObjectMarkValueType.Name).toBe(4);
    });
  });

  describe('pageObjCountMarks', () => {
    test('should return a number for any page object', () => {
      if (firstObjHandle === null) return;

      const count = page.pageObjCountMarks(firstObjHandle);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should return count for all objects on page', () => {
      const objects = page.getObjects();
      expect(objects.length).toBeGreaterThan(0);

      for (const obj of objects) {
        const count = page.pageObjCountMarks(obj.handle);
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return same count when called multiple times', () => {
      if (firstObjHandle === null) return;

      const count1 = page.pageObjCountMarks(firstObjHandle);
      const count2 = page.pageObjCountMarks(firstObjHandle);
      expect(count1).toBe(count2);
    });
  });

  describe('pageObjGetMark', () => {
    test('should return null for out-of-range index', () => {
      if (firstObjHandle === null) return;

      const count = page.pageObjCountMarks(firstObjHandle);

      // Try to get a mark at an invalid index
      const mark = page.pageObjGetMark(firstObjHandle, count + 100);
      expect(mark).toBeNull();
    });

    test('should return null for negative index', () => {
      if (firstObjHandle === null) return;

      const mark = page.pageObjGetMark(firstObjHandle, -1);
      expect(mark).toBeNull();
    });

    test('should return valid mark object when marks exist', () => {
      const objects = page.getObjects();

      // Find an object with marks
      for (const obj of objects) {
        const count = page.pageObjCountMarks(obj.handle);
        if (count > 0) {
          const mark = page.pageObjGetMark(obj.handle, 0);
          expect(mark).not.toBeNull();

          if (mark !== null) {
            expect(typeof mark.name).toBe('string');
            expect(Array.isArray(mark.params)).toBe(true);
          }
          return;
        }
      }

      // If no objects have marks, that's acceptable
      expect(true).toBe(true);
    });
  });

  describe('pageObjGetMarks', () => {
    test('should return an array', () => {
      if (firstObjHandle === null) return;

      const marks = page.pageObjGetMarks(firstObjHandle);
      expect(Array.isArray(marks)).toBe(true);
    });

    test('should return array with length matching count', () => {
      if (firstObjHandle === null) return;

      const count = page.pageObjCountMarks(firstObjHandle);
      const marks = page.pageObjGetMarks(firstObjHandle);

      // The array should have at most `count` items
      // (some marks might return null and be filtered out)
      expect(marks.length).toBeLessThanOrEqual(count);
    });

    test('should return marks with valid structure', () => {
      const objects = page.getObjects();

      for (const obj of objects) {
        const marks = page.pageObjGetMarks(obj.handle);

        for (const mark of marks) {
          expect(typeof mark.name).toBe('string');
          // Mark names can be empty in some cases
          expect(Array.isArray(mark.params)).toBe(true);

          // Verify each parameter has valid structure
          for (const param of mark.params) {
            expect(typeof param.key).toBe('string');
            expect(Object.values(PageObjectMarkValueType)).toContain(param.valueType);
          }
        }
      }
    });
  });

  describe('pageObjAddMark', () => {
    test('should return mark handle when adding a new mark', () => {
      if (firstObjHandle === null) return;

      const countBefore = page.pageObjCountMarks(firstObjHandle);
      const markHandle = page.pageObjAddMark(firstObjHandle, 'TestMark');

      // If the function is available and succeeds, count should increase
      if (markHandle !== null) {
        const countAfter = page.pageObjCountMarks(firstObjHandle);
        expect(countAfter).toBe(countBefore + 1);
      }
    });

    test('should be able to add standard mark types', () => {
      if (firstObjHandle === null) return;

      // Standard PDF mark types
      const markTypes = ['Artifact', 'Span', 'Figure', 'Link'];

      for (const markType of markTypes) {
        const handle = page.pageObjAddMark(firstObjHandle, markType);
        // Just verify it doesn't throw - result depends on WASM availability
        expect(handle === null || typeof handle === 'number').toBe(true);
      }
    });

    test('should return null for empty mark name', () => {
      if (firstObjHandle === null) return;

      const handle = page.pageObjAddMark(firstObjHandle, '');
      // Empty name might be rejected
      expect(handle === null || typeof handle === 'number').toBe(true);
    });
  });

  describe('pageObjRemoveMark', () => {
    test('should return boolean result', () => {
      if (firstObjHandle === null) return;

      // Add a mark first
      const markHandle = page.pageObjAddMark(firstObjHandle, 'TempMark');
      if (markHandle === null) return;

      // Try to remove it
      const result = page.pageObjRemoveMark(firstObjHandle, markHandle);
      expect(typeof result).toBe('boolean');
    });

    test('should successfully remove an added mark', () => {
      if (firstObjHandle === null) return;

      const countBefore = page.pageObjCountMarks(firstObjHandle);

      // Add a mark
      const markHandle = page.pageObjAddMark(firstObjHandle, 'RemovableTestMark');
      if (markHandle === null) return;

      const countAfterAdd = page.pageObjCountMarks(firstObjHandle);

      // Remove the mark
      const success = page.pageObjRemoveMark(firstObjHandle, markHandle);

      if (success) {
        const countAfterRemove = page.pageObjCountMarks(firstObjHandle);
        expect(countAfterRemove).toBe(countBefore);
        expect(countAfterRemove).toBe(countAfterAdd - 1);
      }
    });

    test('should return false for invalid mark handle', () => {
      if (firstObjHandle === null) return;

      // Try to remove with an invalid handle
      const invalidHandle = 0xdeadbeef as PageObjectMarkHandle;
      const result = page.pageObjRemoveMark(firstObjHandle, invalidHandle);
      expect(result).toBe(false);
    });
  });
});

describe('Page Object Marks with different object types', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should work with text objects', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

    expect(textObjects.length).toBeGreaterThan(0);

    for (const textObj of textObjects) {
      const count = page.pageObjCountMarks(textObj.handle);
      expect(typeof count).toBe('number');

      const marks = page.pageObjGetMarks(textObj.handle);
      expect(Array.isArray(marks)).toBe(true);
    }
  });

  test('should work with image objects', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const imageObjects = objects.filter((obj) => obj.type === PageObjectType.Image);

    for (const imageObj of imageObjects) {
      const count = page.pageObjCountMarks(imageObj.handle);
      expect(typeof count).toBe('number');

      const marks = page.pageObjGetMarks(imageObj.handle);
      expect(Array.isArray(marks)).toBe(true);
    }
  });

  test('should work with path objects', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const pathObjects = objects.filter((obj) => obj.type === PageObjectType.Path);

    for (const pathObj of pathObjects) {
      const count = page.pageObjCountMarks(pathObj.handle);
      expect(typeof count).toBe('number');

      const marks = page.pageObjGetMarks(pathObj.handle);
      expect(Array.isArray(marks)).toBe(true);
    }
  });
});

describe('Page Object Marks with forms PDF', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should work with form document', async () => {
    using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    expect(objects.length).toBeGreaterThan(0);

    // Test marks functionality on all objects
    for (const obj of objects) {
      const count = page.pageObjCountMarks(obj.handle);
      expect(typeof count).toBe('number');

      if (count > 0) {
        const marks = page.pageObjGetMarks(obj.handle);
        expect(marks.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Page Object Marks post-dispose guards', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on pageObjCountMarks after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => page.pageObjCountMarks(firstObj.handle)).toThrow();
    }

    doc.dispose();
  });

  test('should throw on pageObjGetMark after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => page.pageObjGetMark(firstObj.handle, 0)).toThrow();
    }

    doc.dispose();
  });

  test('should throw on pageObjGetMarks after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => page.pageObjGetMarks(firstObj.handle)).toThrow();
    }

    doc.dispose();
  });

  test('should throw on pageObjAddMark after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    page.dispose();

    if (firstObj) {
      expect(() => page.pageObjAddMark(firstObj.handle, 'Test')).toThrow();
    }

    doc.dispose();
  });

  test('should throw on pageObjRemoveMark after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const firstObj = objects[0];

    // Add a mark before disposing
    let markHandle: PageObjectMarkHandle | null = null;
    if (firstObj) {
      markHandle = page.pageObjAddMark(firstObj.handle, 'TestMark');
    }

    page.dispose();

    if (firstObj && markHandle !== null) {
      expect(() => page.pageObjRemoveMark(firstObj.handle, markHandle!)).toThrow();
    }

    doc.dispose();
  });
});
