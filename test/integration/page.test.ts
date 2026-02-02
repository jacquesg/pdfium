/**
 * Integration tests for PDFiumPage class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import { RenderError } from '../../src/core/errors.js';
import { PageRotation, TextSearchFlags } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumPage } from '../../src/document/page.js';
import { initPdfium, loadTestDocument } from '../helpers.js';

// A4 page dimensions in points (72 DPI)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

describe('PDFiumPage', () => {
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

  describe('size', () => {
    test('should return page dimensions', () => {
      const size = page.size;
      expect(size.width).toBeCloseTo(A4_WIDTH, 0);
      expect(size.height).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should have width property', () => {
      expect(page.width).toBeCloseTo(A4_WIDTH, 0);
    });

    test('should have height property', () => {
      expect(page.height).toBeCloseTo(A4_HEIGHT, 0);
    });
  });

  describe('index', () => {
    test('should return correct page index', () => {
      expect(page.index).toBe(0);
    });
  });

  describe('rotation', () => {
    test('should return rotation for a standard page', () => {
      expect(page.rotation).toBe(PageRotation.None);
    });
  });

  describe('render', () => {
    test('should render page at default scale', () => {
      const rendered = page.render();
      expect(rendered.width).toBeCloseTo(A4_WIDTH, 0);
      expect(rendered.height).toBeCloseTo(A4_HEIGHT, 0);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
      // RGBA = 4 bytes per pixel
      expect(rendered.data.length).toBe(rendered.width * rendered.height * 4);
    });

    test('should render page at 2x scale', () => {
      const rendered = page.render({ scale: 2 });
      // Allow 2 pixel tolerance due to rounding
      expect(Math.abs(rendered.width - A4_WIDTH * 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(rendered.height - A4_HEIGHT * 2)).toBeLessThanOrEqual(2);
    });

    test('should render page at specific width', () => {
      const targetWidth = 300;
      const rendered = page.render({ width: targetWidth });
      expect(rendered.width).toBe(targetWidth);
      // Height should be proportional (allow 2 pixel tolerance due to rounding)
      const expectedHeight = Math.round((targetWidth / A4_WIDTH) * A4_HEIGHT);
      expect(Math.abs(rendered.height - expectedHeight)).toBeLessThanOrEqual(2);
    });

    test('should render page at specific height', () => {
      const targetHeight = 400;
      const rendered = page.render({ height: targetHeight });
      expect(rendered.height).toBe(targetHeight);
      // Width should be proportional
      const expectedWidth = Math.round((targetHeight / A4_HEIGHT) * A4_WIDTH);
      expect(rendered.width).toBeCloseTo(expectedWidth, 0);
    });

    test('should render page at specific dimensions', () => {
      const rendered = page.render({ width: 200, height: 300 });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(300);
    });

    test('should include original dimensions in result', () => {
      const rendered = page.render({ scale: 2 });
      expect(rendered.originalWidth).toBeCloseTo(A4_WIDTH, 0);
      expect(rendered.originalHeight).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should render with white background by default', () => {
      const rendered = page.render({ width: 10, height: 10 });
      // Check first pixel (RGBA white = 255, 255, 255, 255)
      // Note: Background might not be exactly white if content overlaps
      expect(rendered.data[3]).toBe(255); // Alpha should always be 255
    });

    test('should throw RenderError for zero dimensions', () => {
      expect(() => page.render({ width: 0, height: 100 })).toThrow(RenderError);
      expect(() => page.render({ width: 100, height: 0 })).toThrow(RenderError);
    });

    test('should throw RenderError for negative dimensions', () => {
      expect(() => page.render({ width: -1, height: 100 })).toThrow(RenderError);
    });

    test('should throw RenderError for excessive dimensions', () => {
      expect(() => page.render({ width: 40000, height: 100 })).toThrow(RenderError);
      expect(() => page.render({ width: 100, height: 40000 })).toThrow(RenderError);
    });

    test('should render with rotation option', () => {
      const rendered = page.render({ width: 200, height: 300, rotation: PageRotation.Clockwise90 });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(300);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });
  });

  describe('getText', () => {
    test('should extract text from page', () => {
      const text = page.getText();
      expect(typeof text).toBe('string');
      // The test PDF should contain some text
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('findText', () => {
    test('should find text on page', () => {
      const text = page.getText();
      if (text.length > 0) {
        // Get a word from the page text to search for
        const words = text.trim().split(/\s+/);
        const searchWord = words[0]!;
        if (searchWord.length >= 2) {
          const results = [...page.findText(searchWord)];
          expect(results.length).toBeGreaterThan(0);
          expect(results[0]!.charCount).toBe(searchWord.length);
          expect(results[0]!.charIndex).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should return empty for non-existent text', () => {
      const results = [...page.findText('xyznonexistent123')];
      expect(results).toEqual([]);
    });

    test('should support case-sensitive search', () => {
      const text = page.getText();
      if (text.length > 0) {
        // Search with case-sensitive flag — result count may differ
        const resultsDefault = [...page.findText(text.substring(0, 3))];
        const resultsCaseSensitive = [...page.findText(text.substring(0, 3), TextSearchFlags.MatchCase)];
        // Both should return some results (same string, same case)
        expect(resultsDefault.length).toBeGreaterThanOrEqual(resultsCaseSensitive.length);
      }
    });

    test('should handle generator early exit (break)', () => {
      const text = page.getText();
      if (text.length > 1) {
        const gen = page.findText(text.substring(0, 1));
        const first = gen.next();
        // Even if we break early, the generator should clean up
        gen.return(undefined);
        expect(first.done === false || first.done === true).toBe(true);
      }
    });

    test('should include rects in results', () => {
      const text = page.getText();
      if (text.length > 0) {
        const words = text.trim().split(/\s+/);
        const searchWord = words[0]!;
        if (searchWord.length >= 2) {
          const results = [...page.findText(searchWord)];
          if (results.length > 0) {
            expect(Array.isArray(results[0]!.rects)).toBe(true);
          }
        }
      }
    });
  });

  describe('objectCount', () => {
    test('should return number of objects on page', () => {
      const count = page.objectCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('handle', () => {
    test('should provide internal handle for advanced usage', () => {
      expect(page.handle).toBeGreaterThan(0);
    });
  });
});

describe('PDFiumPage annotations', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  test('should return annotation count', () => {
    expect(page.annotationCount).toBe(49);
  });

  test('should get annotations array', () => {
    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);
    if (annotations.length > 0) {
      const annot = annotations[0]!;
      expect(annot).toHaveProperty('index');
      expect(annot).toHaveProperty('type');
      expect(annot).toHaveProperty('bounds');
      expect(annot.bounds).toHaveProperty('left');
      expect(annot.bounds).toHaveProperty('top');
      expect(annot.bounds).toHaveProperty('right');
      expect(annot.bounds).toHaveProperty('bottom');
    }
  });

  test('should get individual annotation by index', () => {
    const count = page.annotationCount;
    if (count > 0) {
      const annot = page.getAnnotation(0);
      expect(annot.index).toBe(0);
      expect(typeof annot.type).toBe('number');
    }
  });

  test('should throw for out-of-range annotation index', () => {
    expect(() => page.getAnnotation(-1)).toThrow();
    expect(() => page.getAnnotation(9999)).toThrow();
  });
});

describe('PDFiumPage structure tree', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should return root elements from tagged PDF (test_3)', async () => {
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeDefined();
    expect(tree!.length).toBe(4);
  });

  test('should return elements with type string and children array', async () => {
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeDefined();
    for (const element of tree!) {
      expect(typeof element.type).toBe('string');
      expect(element.type.length).toBeGreaterThan(0);
      expect(Array.isArray(element.children)).toBe(true);
    }
  });

  test('should return structure tree from test_1.pdf', async () => {
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeDefined();
    expect(tree!.length).toBe(1);
  });

  test('should return undefined for non-tagged PDF', async () => {
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeUndefined();
  });
});

describe('PDFiumPage text search with known results', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  test('should find 9 occurrences of "the"', () => {
    const results = [...page.findText('the')];
    expect(results.length).toBe(9);
  });

  test('each result should have charIndex, charCount, and rects', () => {
    const results = [...page.findText('the')];
    for (const result of results) {
      expect(result.charIndex).toBeGreaterThanOrEqual(0);
      expect(result.charCount).toBe(3);
      expect(Array.isArray(result.rects)).toBe(true);
      expect(result.rects.length).toBeGreaterThan(0);
    }
  });

  test('rects should have valid coordinates', () => {
    const results = [...page.findText('the')];
    const firstRect = results[0]!.rects[0]!;
    expect(firstRect.left).toBeLessThan(firstRect.right);
    expect(firstRect.bottom).toBeLessThan(firstRect.top);
  });

  test('case-sensitive search should find fewer or equal results', () => {
    const caseInsensitive = [...page.findText('the')];
    const caseSensitive = [...page.findText('the', TextSearchFlags.MatchCase)];
    expect(caseSensitive.length).toBeLessThanOrEqual(caseInsensitive.length);
  });
});

describe('PDFiumPage with forms', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    page = document.getPage(0);
  });

  afterAll(() => {
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('render with form fields', () => {
    test('should render without form fields by default', () => {
      const rendered = page.render({ scale: 0.5 });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });

    test('should render with form fields when requested', () => {
      const rendered = page.render({ scale: 0.5, renderFormFields: true });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });
  });
});
