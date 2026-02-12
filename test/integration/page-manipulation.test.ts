/**
 * Integration tests for page manipulation API.
 *
 * Tests the FPDFPage_Set*, FPDFPage_Flatten, and page transformation functions.
 */

import { FlattenFlags, FlattenResult, PageRotation } from '../../src/core/types.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Page Manipulation API - Flatten', () => {
  describe('flatten', () => {
    test('should return FlattenResult', async ({ testPage }) => {
      const result = testPage.flatten();
      expect([FlattenResult.Fail, FlattenResult.Success, FlattenResult.NothingToDo]).toContain(result);
    });

    test('should accept flatten flags', async ({ testPage }) => {
      expect(() => testPage.flatten(FlattenFlags.NormalDisplay)).not.toThrow();
      expect(() => testPage.flatten(FlattenFlags.Print)).not.toThrow();
    });
  });
});

describe('Page Manipulation API - Transparency', () => {
  describe('hasTransparency', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.hasTransparency();
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Page Manipulation API - Page Objects', () => {
  describe('generateContent', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.generateContent();
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Page Manipulation API - Transformations', () => {
  describe('transformAnnotations', () => {
    test('should not throw', async ({ testPage }) => {
      // Identity matrix
      expect(() => testPage.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).not.toThrow();
    });

    test('should handle translation', async ({ testPage }) => {
      expect(() => testPage.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 100, f: 100 })).not.toThrow();
    });

    test('should handle scaling', async ({ testPage }) => {
      expect(() => testPage.transformAnnotations({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })).not.toThrow();
    });
  });

  describe('transformWithClip', () => {
    test('should return boolean', async ({ testPage }) => {
      const result = testPage.transformWithClip({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      expect(result).toBeTypeOf('boolean');
    });

    test('should accept clip rectangle', async ({ testPage }) => {
      const result = testPage.transformWithClip(
        { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        { left: 0, bottom: 0, right: 612, top: 792 },
      );
      expect(result).toBeTypeOf('boolean');
    });
  });
});

describe('Page Manipulation with different PDFs', () => {
  test('should handle test_3_with_images.pdf', async ({ openDocument }) => {
    const doc = await openDocument('test_3_with_images.pdf');
    using page = doc.getPage(0);

    expect(() => {
      page.rotation = PageRotation.None;
    }).not.toThrow();
    expect(() => page.hasTransparency()).not.toThrow();
    expect(() => page.flatten()).not.toThrow();
  });
});

describe('Page Manipulation post-dispose guards', () => {
  test('should throw on flatten after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.flatten()).toThrow();
  });

  test('should throw on hasTransparency after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.hasTransparency()).toThrow();
  });

  test('should throw on generateContent after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.generateContent()).toThrow();
  });

  test('should throw on transformAnnotations after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.transformAnnotations({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });

  test('should throw on transformWithClip after dispose', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    using page = doc.getPage(0);
    page.dispose();
    expect(() => page.transformWithClip({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toThrow();
  });
});
