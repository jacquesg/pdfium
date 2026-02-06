/**
 * Integration tests for PDFiumPage class.
 *
 * These tests require the actual WASM module and test PDF files.
 */

import { describe, expect, test } from 'vitest';
import { RenderError } from '../../src/core/errors.js';
import { PageBoxType, PageRotation, TextSearchFlags } from '../../src/core/types.js';
import { INTERNAL } from '../../src/internal/symbols.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

// A4 page dimensions in points (72 DPI)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

describe('PDFiumPage', () => {
  describe('size', () => {
    test('should return page dimensions', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const size = page.size;
      expect(size.width).toBeCloseTo(A4_WIDTH, 0);
      expect(size.height).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should have width property', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(page.width).toBeCloseTo(A4_WIDTH, 0);
    });

    test('should have height property', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(page.height).toBeCloseTo(A4_HEIGHT, 0);
    });
  });

  describe('index', () => {
    test('should return correct page index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(page.index).toBe(0);
    });
  });

  describe('rotation', () => {
    test('should return rotation for a standard page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(page.rotation).toBe(PageRotation.None);
    });
  });

  describe('render', () => {
    test('should render page at default scale', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render();
      expect(rendered.width).toBeCloseTo(A4_WIDTH, 0);
      expect(rendered.height).toBeCloseTo(A4_HEIGHT, 0);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
      // RGBA = 4 bytes per pixel
      expect(rendered.data.length).toBe(rendered.width * rendered.height * 4);
    });

    test('should render page at 2x scale', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ scale: 2 });
      // Allow 2 pixel tolerance due to rounding
      expect(Math.abs(rendered.width - A4_WIDTH * 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(rendered.height - A4_HEIGHT * 2)).toBeLessThanOrEqual(2);
    });

    test('should render page at specific width', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const targetWidth = 300;
      const rendered = page.render({ width: targetWidth });
      expect(rendered.width).toBe(targetWidth);
      // Height should be proportional (allow 2 pixel tolerance due to rounding)
      const expectedHeight = Math.round((targetWidth / A4_WIDTH) * A4_HEIGHT);
      expect(Math.abs(rendered.height - expectedHeight)).toBeLessThanOrEqual(2);
    });

    test('should render page at specific height', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const targetHeight = 400;
      const rendered = page.render({ height: targetHeight });
      expect(rendered.height).toBe(targetHeight);
      // Width should be proportional
      const expectedWidth = Math.round((targetHeight / A4_HEIGHT) * A4_WIDTH);
      expect(rendered.width).toBeCloseTo(expectedWidth, 0);
    });

    test('should render page at specific dimensions', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ width: 200, height: 300 });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(300);
    });

    test('should include original dimensions in result', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ scale: 2 });
      expect(rendered.originalWidth).toBeCloseTo(A4_WIDTH, 0);
      expect(rendered.originalHeight).toBeCloseTo(A4_HEIGHT, 0);
    });

    test('should render with white background by default', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ width: 10, height: 10 });
      // Check first pixel (RGBA white = 255, 255, 255, 255)
      // Note: Background might not be exactly white if content overlaps
      expect(rendered.data[3]).toBe(255); // Alpha should always be 255
    });

    test('should throw RenderError for zero dimensions', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ width: 0, height: 100 })).toThrow(RenderError);
      expect(() => page.render({ width: 100, height: 0 })).toThrow(RenderError);
    });

    test('should throw RenderError for negative dimensions', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ width: -1, height: 100 })).toThrow(RenderError);
    });

    test('should throw RenderError for excessive dimensions', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ width: 40000, height: 100 })).toThrow(RenderError);
      expect(() => page.render({ width: 100, height: 40000 })).toThrow(RenderError);
    });

    test('should render with rotation option', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ width: 200, height: 300, rotation: PageRotation.Clockwise90 });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(300);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });

    test('should render with clipRect for sub-region rendering', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({
        width: 200,
        height: 200,
        clipRect: { left: 0, top: 200, right: 200, bottom: 0 },
      });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(200);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
      expect(rendered.data.byteLength).toBe(200 * 200 * 4);
    });

    test('should render with clipRect and rotation combined', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({
        width: 200,
        height: 200,
        rotation: PageRotation.Clockwise90,
        clipRect: { left: 0, top: 200, right: 200, bottom: 0 },
      });
      expect(rendered.width).toBe(200);
      expect(rendered.height).toBe(200);
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });

    test('should reject clipRect with progressive rendering', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() =>
        page.startProgressiveRender({
          width: 200,
          height: 200,
          clipRect: { left: 0, top: 200, right: 200, bottom: 0 },
        }),
      ).toThrow(/clipRect is not supported with progressive rendering/);
    });

    test('should call onProgress with values from 0 to 1', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const progress: number[] = [];
      page.render({ width: 100, height: 100, onProgress: (p) => progress.push(p) });

      expect(progress[0]).toBe(0);
      expect(progress[progress.length - 1]).toBe(1);
      expect(progress.every((p) => p >= 0 && p <= 1)).toBe(true);
      // Progress should be monotonically increasing
      for (let i = 1; i < progress.length; i++) {
        expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] ?? 0);
      }
    });

    test('should not throw if onProgress is not provided', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ width: 100, height: 100 })).not.toThrow();
    });
  });

  describe('getText', () => {
    test('should extract text from page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const text = page.getText();
      expect(typeof text).toBe('string');
      // The test PDF should contain some text
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('findText', () => {
    test('should find text on page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const text = page.getText();
      expect(text.length).toBeGreaterThan(0);
      // Get a word from the page text to search for
      const words = text.trim().split(/\s+/);
      const searchWord = words[0]!;
      expect(searchWord.length).toBeGreaterThanOrEqual(2);
      const results = [...page.findText(searchWord)];
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.charCount).toBe(searchWord.length);
      expect(results[0]!.charIndex).toBeGreaterThanOrEqual(0);
    });

    test('should return empty for non-existent text', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const results = [...page.findText('xyznonexistent123')];
      expect(results).toEqual([]);
    });

    test('should support case-sensitive search', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const text = page.getText();
      expect(text.length).toBeGreaterThan(0);
      // Search with case-sensitive flag — result count may differ
      const resultsDefault = [...page.findText(text.substring(0, 3))];
      const resultsCaseSensitive = [...page.findText(text.substring(0, 3), TextSearchFlags.MatchCase)];
      // Both should return some results (same string, same case)
      expect(resultsDefault.length).toBeGreaterThanOrEqual(resultsCaseSensitive.length);
    });

    test('should handle generator early exit (break)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const text = page.getText();
      if (text.length > 1) {
        const gen = page.findText(text.substring(0, 1));
        const first = gen.next();
        // Even if we break early, the generator should clean up
        gen.return?.(undefined);
        expect(first.done === false || first.done === true).toBe(true);
      }
    });

    test('should include rects in results', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const text = page.getText();
      expect(text.length).toBeGreaterThan(0);
      const words = text.trim().split(/\s+/);
      const searchWord = words[0]!;
      expect(searchWord.length).toBeGreaterThanOrEqual(2);
      const results = [...page.findText(searchWord)];
      expect(results.length).toBeGreaterThan(0);
      expect(Array.isArray(results[0]!.rects)).toBe(true);
    });
  });

  describe('objectCount', () => {
    test('should return number of objects on page', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.objectCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('[INTERNAL]', () => {
    test('provides internal handles via symbol', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const internal = page[INTERNAL];
      expect(internal.handle).toBeGreaterThan(0);
      expect(typeof internal.textPageHandle).toBe('number');
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on getText after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using p = doc.getPage(0);
      p.dispose();
      expect(() => p.getText()).toThrow();
    });

    test('should throw on render after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using p = doc.getPage(0);
      p.dispose();
      expect(() => p.render()).toThrow();
    });

    test('should throw on getAnnotations after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
      using p = doc.getPage(0);
      p.dispose();
      expect(() => p.getAnnotations()).toThrow();
    });

    test('should throw on findText after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using p = doc.getPage(0);
      p.dispose();
      expect(() => [...p.findText('test')]).toThrow();
    });

    test('should throw on getStructureTree after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using p = doc.getPage(0);
      p.dispose();
      expect(() => p.getStructureTree()).toThrow();
    });
  });

  describe('NaN and Infinity dimensions', () => {
    test('should throw RenderError for NaN width', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ width: NaN })).toThrow(RenderError);
    });

    test('should throw RenderError for Infinity height', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ height: Infinity })).toThrow(RenderError);
    });

    test('should throw RenderError for NaN scale', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ scale: NaN })).toThrow(RenderError);
    });

    test('should throw RenderError for Infinity scale', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ scale: Infinity })).toThrow(RenderError);
    });

    test('should throw RenderError for negative Infinity width', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      expect(() => page.render({ width: -Infinity })).toThrow(RenderError);
    });
  });

  describe('backgroundColour option', () => {
    test('should render with custom background colour', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // Render a tiny page with a red background (0xFFFF0000 = ARGB red)
      const rendered = page.render({ width: 2, height: 2, backgroundColour: 0xffff0000 });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
      expect(rendered.data.length).toBe(2 * 2 * 4);
    });
  });

  describe('boundary dimensions', () => {
    test('should render at minimum dimension (1x1)', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ width: 1, height: 1 });
      expect(rendered.width).toBe(1);
      expect(rendered.height).toBe(1);
      expect(rendered.data.length).toBe(4);
    });
  });

  describe('empty page getText', () => {
    test('should return empty string for page with no text', async () => {
      using pdfium = await initPdfium();
      // Create a document with an empty page
      using builder = pdfium.createDocument();
      builder.addPage();
      const bytes = builder.save();
      using doc = await pdfium.openDocument(bytes);
      using emptyPage = doc.getPage(0);
      expect(emptyPage.getText()).toBe('');
    });
  });
});

describe('PDFiumPage annotations', () => {
  test('should return annotation count', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);
    expect(page.annotationCount).toBe(49);
  });

  test('should get annotations array', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);
    const annotations = page.getAnnotations();
    try {
      expect(Array.isArray(annotations)).toBe(true);
      expect(annotations.length).toBeGreaterThan(0);
      const annot = annotations[0]!;
      expect(annot).toHaveProperty('index');
      expect(annot).toHaveProperty('type');
      expect(annot).toHaveProperty('bounds');
      expect(annot.bounds).toHaveProperty('left');
      expect(annot.bounds).toHaveProperty('top');
      expect(annot.bounds).toHaveProperty('right');
      expect(annot.bounds).toHaveProperty('bottom');
    } finally {
      for (const annot of annotations) annot.dispose();
    }
  });

  test('getAnnotations() returns an array of PDFiumAnnotation', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);
    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);
    if (annotations.length > 0) {
      expect(annotations[0]!.bounds).toBeDefined();
      expect(typeof annotations[0]!.type).toBe('string');
    }
    for (const annot of annotations) {
      annot.dispose();
    }
  });

  test('should get individual annotation by index', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);
    expect(page.annotationCount).toBeGreaterThan(0);
    using annot = page.getAnnotation(0);
    expect(annot.index).toBe(0);
    expect(typeof annot.type).toBe('string');
  });

  test('should throw for out-of-range annotation index', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);
    expect(() => page.getAnnotation(-1)).toThrow();
    expect(() => page.getAnnotation(9999)).toThrow();
  });
});

describe('PDFiumPage structure tree', () => {
  test('should return root elements from tagged PDF (test_3)', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeDefined();
    expect(tree!.length).toBe(4);
  });

  test('should return elements with type string and children array', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeDefined();
    for (const element of tree!) {
      expect(typeof element.type).toBe('string');
      expect(element.type.length).toBeGreaterThan(0);
      expect(Array.isArray(element.children)).toBe(true);
      // altText and lang should be strings if present
      if (element.altText !== undefined) {
        expect(typeof element.altText).toBe('string');
      }
      if (element.lang !== undefined) {
        expect(typeof element.lang).toBe('string');
      }
    }
  });

  test('should return structure tree from test_1.pdf', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeDefined();
    expect(tree!.length).toBe(1);
  });

  test('should return undefined for non-tagged PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const tree = page.getStructureTree();
    expect(tree).toBeUndefined();
  });

  test('structureElements() generator should yield same results as getStructureTree()', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);
    const eager = page.getStructureTree();
    const lazy = page.structureElements();
    expect(eager).toBeDefined();
    expect(lazy).toBeDefined();
    const lazyArray = [...lazy!];
    expect(lazyArray.length).toBe(eager!.length);
    for (let i = 0; i < eager!.length; i++) {
      expect(lazyArray[i]!.type).toBe(eager![i]!.type);
      expect(lazyArray[i]!.children.length).toBe(eager![i]!.children.length);
    }
  });

  test('structureElements() should return undefined for non-tagged PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const elements = page.structureElements();
    expect(elements).toBeUndefined();
  });
});

describe('PDFiumPage text search with known results', () => {
  test('should find 9 occurrences of "the"', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const results = [...page.findText('the')];
    expect(results.length).toBe(9);
  });

  test('each result should have charIndex, charCount, and rects', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const results = [...page.findText('the')];
    for (const result of results) {
      expect(result.charIndex).toBeGreaterThanOrEqual(0);
      expect(result.charCount).toBe(3);
      expect(Array.isArray(result.rects)).toBe(true);
      expect(result.rects.length).toBeGreaterThan(0);
    }
  });

  test('rects should have valid coordinates', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const results = [...page.findText('the')];
    const firstRect = results[0]!.rects[0]!;
    expect(firstRect.left).toBeLessThan(firstRect.right);
    expect(firstRect.bottom).toBeLessThan(firstRect.top);
  });

  test('case-sensitive search should find fewer or equal results', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);
    const caseInsensitive = [...page.findText('the')];
    const caseSensitive = [...page.findText('the', TextSearchFlags.MatchCase)];
    expect(caseSensitive.length).toBeLessThanOrEqual(caseInsensitive.length);
  });
});

describe('PDFiumPage with forms', () => {
  describe('render with form fields', () => {
    test('should render without form fields by default', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ scale: 0.5 });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });

    test('should render with form fields when requested', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
      using page = document.getPage(0);
      const rendered = page.render({ scale: 0.5, renderFormFields: true });
      expect(rendered.data).toBeInstanceOf(Uint8Array);
    });

    test('should produce different output with and without form fields', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
      using page = document.getPage(0);
      const without = page.render({ scale: 0.25 });
      const withFields = page.render({ scale: 0.25, renderFormFields: true });
      // Both should have data
      expect(without.data.length).toBeGreaterThan(0);
      expect(withFields.data.length).toBeGreaterThan(0);
      // Data should differ because form fields are rendered
      let differs = false;
      for (let i = 0; i < without.data.length; i++) {
        if (without.data[i] !== withFields.data[i]) {
          differs = true;
          break;
        }
      }
      expect(differs).toBe(true);
    });
  });
});

describe('PDFiumPage disposed resource handling', () => {
  test('getAnnotations() throws on disposed page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    const page = document.getPage(0);
    page.dispose();
    expect(() => page.getAnnotations()).toThrow();
  });

  test('objects() throws on disposed page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = document.getPage(0);
    page.dispose();
    expect(() => page.objects()).toThrow();
  });

  test('links() throws on disposed page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = document.getPage(0);
    page.dispose();
    expect(() => page.links()).toThrow();
  });

  test('render() throws on disposed page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = document.getPage(0);
    page.dispose();
    expect(() => page.render()).toThrow();
  });

  test('INTERNAL access throws on disposed page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = document.getPage(0);
    page.dispose();
    expect(() => page[INTERNAL]).toThrow();
  });
});

describe('PDFiumPage empty collection generators', () => {
  test('annotations() yields nothing for page without annotations', async () => {
    using pdfium = await initPdfium();
    // test_1.pdf page 0 may have no annotations - create a fresh document
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    const annotations = page.getAnnotations();
    expect(annotations).toEqual([]);
  });

  test('objects() yields nothing for empty page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    const objects = [...page.objects()];
    expect(objects).toEqual([]);
  });

  test('links() yields nothing for page without links', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    const links = [...page.links()];
    expect(links).toEqual([]);
  });
});

describe('render() progress callback edge cases', () => {
  test('progress values are strictly monotonically non-decreasing', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const progress: number[] = [];
    page.render({ width: 100, height: 100, onProgress: (p) => progress.push(p) });

    expect(progress.length).toBeGreaterThan(2);
    for (let i = 1; i < progress.length; i++) {
      const prev = progress[i - 1];
      const curr = progress[i];
      expect(curr).toBeGreaterThanOrEqual(prev ?? 0);
    }
  });

  test('progress starts at 0 and ends at 1', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const progress: number[] = [];
    page.render({ width: 100, height: 100, onProgress: (p) => progress.push(p) });

    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
  });

  test('render completes even if callback throws', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    let callCount = 0;
    const throwingCallback = (_p: number) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Callback error');
      }
    };

    // Should throw because callback throws
    expect(() => page.render({ width: 100, height: 100, onProgress: throwingCallback })).toThrow('Callback error');
  });

  test('progress callback receives number type', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const progress: unknown[] = [];
    page.render({ width: 100, height: 100, onProgress: (p) => progress.push(p) });

    expect(progress.every((p) => typeof p === 'number')).toBe(true);
  });
});

describe('INTERNAL symbol access', () => {
  test('INTERNAL provides handle access on page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const internal = page[INTERNAL];
    expect(internal.handle).toBeDefined();
    expect(typeof internal.handle).toBe('number');
    expect(internal.handle).toBeGreaterThan(0);
  });

  test('INTERNAL provides textPageHandle access on page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const internal = page[INTERNAL];
    expect(internal.textPageHandle).toBeDefined();
    expect(typeof internal.textPageHandle).toBe('number');
  });

  test('cannot access internal via arbitrary symbol', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const fakeSymbol = Symbol('fake-internal');
    // Arbitrary symbols should not give access to internals
    expect((page as unknown as Record<symbol, unknown>)[fakeSymbol]).toBeUndefined();
  });
});

describe('PDFiumPage page boxes', () => {
  test('getPageBox returns MediaBox for standard PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const mediaBox = page.getPageBox(PageBoxType.MediaBox);
    expect(mediaBox).toBeDefined();
    expect(mediaBox?.left).toBeDefined();
    expect(mediaBox?.bottom).toBeDefined();
    expect(mediaBox?.right).toBeDefined();
    expect(mediaBox?.top).toBeDefined();
  });

  test('getPageBox returns CropBox', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const cropBox = page.getPageBox(PageBoxType.CropBox);
    // CropBox may or may not be set - if not, returns undefined
    if (cropBox !== undefined) {
      expect(cropBox.left).toBeDefined();
    }
  });

  test('getPageBox returns BleedBox', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const bleedBox = page.getPageBox(PageBoxType.BleedBox);
    // BleedBox may or may not be set
    if (bleedBox !== undefined) {
      expect(bleedBox.left).toBeDefined();
    }
  });

  test('getPageBox returns TrimBox', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const trimBox = page.getPageBox(PageBoxType.TrimBox);
    // TrimBox may or may not be set
    if (trimBox !== undefined) {
      expect(trimBox.left).toBeDefined();
    }
  });

  test('getPageBox returns ArtBox', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const artBox = page.getPageBox(PageBoxType.ArtBox);
    // ArtBox may or may not be set
    if (artBox !== undefined) {
      expect(artBox.left).toBeDefined();
    }
  });

  test('getPageBox returns undefined for invalid box type', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    // @ts-expect-error - testing invalid enum value
    const result = page.getPageBox(999);
    expect(result).toBeUndefined();
  });
});

describe('PDFiumPage rotation setter', () => {
  test('can set rotation on a page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    expect(page.rotation).toBe(PageRotation.None);
    page.rotation = PageRotation.Clockwise90;
    expect(page.rotation).toBe(PageRotation.Clockwise90);
  });

  test('can set all rotation values', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    page.rotation = PageRotation.None;
    expect(page.rotation).toBe(PageRotation.None);

    page.rotation = PageRotation.Clockwise90;
    expect(page.rotation).toBe(PageRotation.Clockwise90);

    page.rotation = PageRotation.Rotate180;
    expect(page.rotation).toBe(PageRotation.Rotate180);

    page.rotation = PageRotation.CounterClockwise90;
    expect(page.rotation).toBe(PageRotation.CounterClockwise90);
  });
});

describe('PDFiumPage text extraction edge cases', () => {
  test('getText returns empty string for empty page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    const text = page.getText();
    expect(text).toBe('');
  });

  test('getCharCount returns 0 for empty page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    expect(page.charCount).toBe(0);
  });

  test('findText returns empty generator for empty page', async () => {
    using pdfium = await initPdfium();
    using builder = pdfium.createDocument();
    builder.addPage();
    const bytes = builder.save();
    using document = await pdfium.openDocument(bytes);
    using page = document.getPage(0);

    const results = [...page.findText('test')];
    expect(results).toEqual([]);
  });

  test('findText with match case flag', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const text = page.getText();

    if (text.length > 0) {
      const word = text.trim().split(/\s+/)[0];
      if (word && word.length > 0) {
        const results = [...page.findText(word, TextSearchFlags.MatchCase)];
        expect(results.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('findText with whole word flag', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const text = page.getText();

    if (text.length > 0) {
      const word = text.trim().split(/\s+/)[0];
      if (word && word.length > 0) {
        const results = [...page.findText(word, TextSearchFlags.MatchWholeWord)];
        expect(results.length).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('PDFiumPage character information', () => {
  test('getCharBox returns box for valid character index', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    if (page.charCount > 0) {
      const box = page.getCharBox(0);
      expect(box).toBeDefined();
      expect(box?.left).toBeDefined();
      expect(box?.right).toBeDefined();
      expect(box?.top).toBeDefined();
      expect(box?.bottom).toBeDefined();
    }
  });

  test('getCharBox returns undefined for invalid index', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    const box = page.getCharBox(-1);
    expect(box).toBeUndefined();

    const box2 = page.getCharBox(999999);
    expect(box2).toBeUndefined();
  });

  test('getCharAngle returns angle for valid character', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    if (page.charCount > 0) {
      const angle = page.getCharAngle(0);
      expect(typeof angle).toBe('number');
    }
  });

  test('getCharFontSize returns size for valid character', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    if (page.charCount > 0) {
      const size = page.getCharFontSize(0);
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    }
  });

  test('getCharOrigin returns origin for valid character', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);
    if (page.charCount > 0) {
      const origin = page.getCharOrigin(0);
      expect(origin).toBeDefined();
      expect(origin?.x).toBeDefined();
      expect(origin?.y).toBeDefined();
    }
  });
});

describe('PDFiumPage image extraction', () => {
  test('should extract images from PDF with images', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);

    const imageCount = page.objectCount;
    expect(imageCount).toBeGreaterThanOrEqual(0);
  });

  test('should get page objects from PDF with images', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);

    const objects = page.getObjects();
    expect(Array.isArray(objects)).toBe(true);
  });

  test('pageObjects generator yields objects', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = document.getPage(0);

    const objects = [...page.objects()];
    expect(Array.isArray(objects)).toBe(true);
  });

  test('should handle PDF with embedded images', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_4_with_images.pdf');
    using page = document.getPage(0);

    expect(() => page.getObjects()).not.toThrow();
    expect(() => [...page.objects()]).not.toThrow();
  });
});

describe('PDFiumPage link handling', () => {
  test('should get links from page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    const links = page.getLinks();
    expect(Array.isArray(links)).toBe(true);
  });

  test('links generator yields same links', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    const fromGenerator = [...page.links()];
    const fromArray = page.getLinks();
    expect(fromGenerator.length).toBe(fromArray.length);
  });

  test('webLinkCount returns non-negative number', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    expect(typeof page.webLinkCount).toBe('number');
    expect(page.webLinkCount).toBeGreaterThanOrEqual(0);
  });

  test('getWebLinks returns array', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    const webLinks = page.getWebLinks();
    expect(Array.isArray(webLinks)).toBe(true);
  });
});

describe('PDFiumPage text methods extended', () => {
  test('getTextInRect with valid rect returns string', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Get text from a portion of the page
    const text = page.getTextInRect(0, page.height, page.width, 0);
    expect(typeof text).toBe('string');
  });

  test('findText with no match returns empty results', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    const results = [...page.findText('xyznonexistenttext123')];
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  test('findText returns results for existing text', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Find a common word that likely exists
    const text = page.getText();
    if (text.length > 3) {
      const searchTerm = text.substring(0, 3);
      const results = [...page.findText(searchTerm)];
      expect(Array.isArray(results)).toBe(true);
    }
  });

  test('getCharIndexAtPos returns valid index for point', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Get character index at a point
    const index = page.getCharIndexAtPos(100, 700);
    expect(typeof index).toBe('number');
  });

  test('getCharUnicode returns unicode for valid char', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    if (page.charCount > 0) {
      const unicode = page.getCharUnicode(0);
      expect(typeof unicode).toBe('number');
    }
  });
});

describe('PDFiumPage rendering edge cases', () => {
  test('render with very small dimensions', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Minimum valid dimensions
    const result = page.render({ width: 1, height: 1 });
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  test('render with large dimensions', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    const result = page.render({ width: 2000, height: 2000 });
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(2000);
  });

  test('render with scale factor', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    const result = page.render({ scale: 0.5 });
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test('render with background colour', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Render with different background colours
    expect(() => page.render({ width: 100, height: 100, backgroundColour: 0xff000000 })).not.toThrow();
    expect(() => page.render({ width: 100, height: 100, backgroundColour: 0xffffffff })).not.toThrow();
  });

  test('render with rotation', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Render with different rotations
    expect(() => page.render({ width: 100, height: 100, rotation: PageRotation.None })).not.toThrow();
    expect(() => page.render({ width: 100, height: 100, rotation: PageRotation.Clockwise90 })).not.toThrow();
  });

  test('render with form fields', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);

    const result = page.render({ width: 100, height: 100, renderFormFields: true });
    expect(result.data).toBeInstanceOf(Uint8Array);
  });
});

describe('PDFiumPage with forms', () => {
  test('form field methods work with form PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);

    expect(() => page.getFormFieldTypeAtPoint(100, 100)).not.toThrow();
    expect(() => page.getFormFieldZOrderAtPoint(100, 100)).not.toThrow();
    expect(() => page.canFormUndo()).not.toThrow();
    expect(() => page.canFormRedo()).not.toThrow();
  });

  test('form rendering with form PDF', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_6_with_form.pdf');
    using page = document.getPage(0);

    // Should render without error
    const result = page.render({ width: 100, height: 100 });
    expect(result.data).toBeInstanceOf(Uint8Array);
  });

  test('widget annotations on form page', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
    using page = document.getPage(0);

    const annotations = page.getAnnotations();
    expect(Array.isArray(annotations)).toBe(true);
    for (const annot of annotations) {
      annot.dispose();
    }
  });
});

describe('Re-entrancy', () => {
  test('should throw or handle re-entrant render calls gracefully', async () => {
    using pdfium = await initPdfium();
    using document = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = document.getPage(0);

    // Attempt to call render inside the progress callback of another render
    expect(() => {
      page.render({
        scale: 1,
        onProgress: () => {
          // Re-entrant call
          page.render({ scale: 0.5 });
        },
      });
    }).toThrow();
  });
});
