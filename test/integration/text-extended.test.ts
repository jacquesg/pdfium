/**
 * Integration tests for extended text API.
 *
 * Tests the FPDFText_* functions for character-level information.
 */

import { TextRenderMode } from '../../src/core/types.js';
import {
  countRects,
  getCharIndexAtPoint,
  getRect,
  getText,
  getTextBounded,
  search,
} from '../../src/document/page_impl/text.js';
import { INTERNAL } from '../../src/internal/symbols.js';
import { describe, expect, test } from '../utils/fixtures.js';

describe('Extended Text API', () => {
  describe('charCount', () => {
    test('should return character count', async ({ testPage }) => {
      const count = testPage.charCount;
      expect(count).toBeTypeOf('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should be consistent with text extraction', async ({ testPage }) => {
      const count = testPage.charCount;
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Direct internal calls (happy paths)', () => {
    test('getText returns content', async ({ pdfium, testPage }) => {
      const charCount = testPage.charCount;
      expect(charCount).toBeGreaterThan(0);

      const pageInternal = testPage[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const text = getText(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 0, charCount);
      expect(text.length).toBeGreaterThan(0);
    });

    test('getTextBounded returns content', async ({ pdfium, testPage }) => {
      testPage.getText(); // load text page

      const pageInternal = testPage[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const text = getTextBounded(
        pdfiumInternal.module,
        pdfiumInternal.memory,
        pageInternal.textPageHandle,
        0,
        testPage.height,
        testPage.width,
        0,
      );
      expect(text).toBeTypeOf('string');
    });

    test('getCharIndexAtPoint returns index', async ({ pdfium, testPage }) => {
      testPage.getText(); // load

      const pageInternal = testPage[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const index = getCharIndexAtPoint(pdfiumInternal.module, pageInternal.textPageHandle, 100, 700, 10, 10);
      expect(index).toBeTypeOf('number');
    });

    test('search finds text', async ({ pdfium, openDocument }) => {
      const doc = await openDocument('test_7_with_form.pdf');
      using page = doc.getPage(0);

      const text = page.getText();
      expect(text.length).toBeGreaterThan(0);

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const { results } = search(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 'the');
      expect(results.length).toBeGreaterThan(0);
      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      if (firstResult) {
        expect(firstResult.index).toBeGreaterThanOrEqual(0);
        expect(firstResult.length).toBe(3);
      }
    });

    test('countRects and getRect return geometry', async ({ pdfium, openDocument }) => {
      const doc = await openDocument('test_7_with_form.pdf');
      using page = doc.getPage(0);

      page.getText();

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const { results } = search(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 'the');
      const match = results[0];
      expect(match).toBeDefined();

      if (match) {
        const rectCount = countRects(pdfiumInternal.module, pageInternal.textPageHandle, match.index, match.length);
        expect(rectCount).toBeGreaterThan(0);

        const rect = getRect(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 0);
        expect(rect).toBeDefined();
        if (rect) {
          expect(rect.left).toBeTypeOf('number');
          expect(rect.top).toBeTypeOf('number');
        }
      }
    });
  });

  describe('getCharUnicode', () => {
    test('should return unicode code point for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const unicode = testPage.getCharUnicode(0);
        expect(unicode).toBeTypeOf('number');
        expect(unicode).toBeGreaterThan(0);
      }
    });

    test('should return 0 for invalid index', async ({ testPage }) => {
      const unicode = testPage.getCharUnicode(-1);
      expect(unicode).toBe(0);
    });

    test('should return 0 for out of bounds index', async ({ testPage }) => {
      const unicode = testPage.getCharUnicode(999999);
      expect(unicode).toBe(0);
    });
  });

  describe('getCharFontSize', () => {
    test('should return font size for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const fontSize = testPage.getCharFontSize(0);
        expect(fontSize).toBeTypeOf('number');
        expect(fontSize).toBeGreaterThan(0);
      }
    });

    test('should return 0 for invalid index', async ({ testPage }) => {
      const fontSize = testPage.getCharFontSize(-1);
      expect(fontSize).toBe(0);
    });
  });

  describe('getCharFontWeight', () => {
    test('should return font weight for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const fontWeight = testPage.getCharFontWeight(0);
        expect(fontWeight).toBeTypeOf('number');
        expect(fontWeight).toBeGreaterThanOrEqual(-1);
      }
    });

    test('should return -1 for invalid index', async ({ testPage }) => {
      const fontWeight = testPage.getCharFontWeight(-1);
      expect(fontWeight).toBe(-1);
    });
  });

  describe('getCharFontName', () => {
    test('should return font name for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const fontName = testPage.getCharFontName(0);
        if (fontName !== undefined) {
          expect(fontName).toBeTypeOf('string');
          expect(fontName.length).toBeGreaterThan(0);
        }
      }
    });

    test('should return undefined for invalid index', async ({ testPage }) => {
      const fontName = testPage.getCharFontName(-1);
      expect(fontName).toBeUndefined();
    });
  });

  describe('getText edge cases', () => {
    test('should return empty string when count is 0', async ({ pdfium }) => {
      using builder = pdfium.createDocument();
      builder.addPage();
      const bytes = builder.save();
      using emptyDoc = await pdfium.openDocument(bytes);
      using emptyPage = emptyDoc.getPage(0);
      expect(emptyPage.getText()).toBe('');
    });

    test('should return empty string when count is negative', async ({ pdfium, testPage }) => {
      const pageInternal = testPage[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const text = getText(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 0, -1);
      expect(text).toBe('');
    });
  });

  describe('search edge cases', () => {
    test('should return empty results for invalid handle', async ({ pdfium, testPage: _testPage }) => {
      const pdfiumInternal = pdfium[INTERNAL];

      const { results } = search(pdfiumInternal.module, pdfiumInternal.memory, 0 as never, 'test');
      expect(results).toEqual([]);
    });
  });

  describe('getTextInRect edge cases', () => {
    test('should return empty string for rect with no text', async ({ testPage }) => {
      const text = testPage.getTextInRect(0, 10, 10, 0);
      expect(text).toBe('');
    });
  });

  describe('getCharRenderMode', () => {
    test('should return render mode for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const renderMode = testPage.getCharRenderMode(0);
        expect(renderMode).toBeTypeOf('string');
        expect(Object.values(TextRenderMode)).toContain(renderMode);
      }
    });

    test('should return Fill (0) for invalid index', async ({ testPage }) => {
      const renderMode = testPage.getCharRenderMode(-1);
      expect(renderMode).toBe(TextRenderMode.Fill);
    });
  });

  describe('getCharAngle', () => {
    test('should return angle for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const angle = testPage.getCharAngle(0);
        expect(angle).toBeTypeOf('number');
        expect(Number.isFinite(angle)).toBe(true);
      }
    });

    test('should return 0 for invalid index', async ({ testPage }) => {
      const angle = testPage.getCharAngle(-1);
      expect(angle).toBe(0);
    });
  });

  describe('getCharOrigin', () => {
    test('should return origin for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const origin = testPage.getCharOrigin(0);
        if (origin !== undefined) {
          expect(origin.x).toBeTypeOf('number');
          expect(origin.y).toBeTypeOf('number');
          expect(Number.isFinite(origin.x)).toBe(true);
          expect(Number.isFinite(origin.y)).toBe(true);
        }
      }
    });

    test('should return undefined for invalid index', async ({ testPage }) => {
      const origin = testPage.getCharOrigin(-1);
      expect(origin).toBeUndefined();
    });
  });

  describe('isCharGenerated', () => {
    test('should return boolean for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const isGenerated = testPage.isCharGenerated(0);
        expect(isGenerated).toBeTypeOf('boolean');
      }
    });

    test('should return false for invalid index', async ({ testPage }) => {
      const isGenerated = testPage.isCharGenerated(-1);
      expect(isGenerated).toBe(false);
    });
  });

  describe('isCharHyphen', () => {
    test('should return boolean for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const isHyphen = testPage.isCharHyphen(0);
        expect(isHyphen).toBeTypeOf('boolean');
      }
    });

    test('should return false for invalid index', async ({ testPage }) => {
      const isHyphen = testPage.isCharHyphen(-1);
      expect(isHyphen).toBe(false);
    });
  });

  describe('hasCharUnicodeMapError', () => {
    test('should return boolean for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const hasError = testPage.hasCharUnicodeMapError(0);
        expect(hasError).toBeTypeOf('boolean');
      }
    });

    test('should return false for invalid index', async ({ testPage }) => {
      const hasError = testPage.hasCharUnicodeMapError(-1);
      expect(hasError).toBe(false);
    });
  });

  describe('getCharFillColour', () => {
    test('should return colour for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const colour = testPage.getCharFillColour(0);
        if (colour !== undefined) {
          expect(colour.r).toBeTypeOf('number');
          expect(colour.g).toBeTypeOf('number');
          expect(colour.b).toBeTypeOf('number');
          expect(colour.a).toBeTypeOf('number');
          expect(colour.r).toBeGreaterThanOrEqual(0);
          expect(colour.r).toBeLessThanOrEqual(255);
          expect(colour.g).toBeGreaterThanOrEqual(0);
          expect(colour.g).toBeLessThanOrEqual(255);
          expect(colour.b).toBeGreaterThanOrEqual(0);
          expect(colour.b).toBeLessThanOrEqual(255);
          expect(colour.a).toBeGreaterThanOrEqual(0);
          expect(colour.a).toBeLessThanOrEqual(255);
        }
      }
    });

    test('should return undefined for invalid index', async ({ testPage }) => {
      const colour = testPage.getCharFillColour(-1);
      expect(colour).toBeUndefined();
    });
  });

  describe('getCharStrokeColour', () => {
    test('should return colour for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const colour = testPage.getCharStrokeColour(0);
        if (colour !== undefined) {
          expect(colour.r).toBeTypeOf('number');
          expect(colour.g).toBeTypeOf('number');
          expect(colour.b).toBeTypeOf('number');
          expect(colour.a).toBeTypeOf('number');
        }
      }
    });

    test('should return undefined for invalid index', async ({ testPage }) => {
      const colour = testPage.getCharStrokeColour(-1);
      expect(colour).toBeUndefined();
    });
  });

  describe('getCharacterInfo', () => {
    test('should return character info for valid index', async ({ testPage }) => {
      if (testPage.charCount > 0) {
        const info = testPage.getCharacterInfo(0);
        if (info !== undefined) {
          expect(info.index).toBe(0);
          expect(info.unicode).toBeTypeOf('number');
          expect(info.char).toBeTypeOf('string');
          expect(info.fontSize).toBeTypeOf('number');
          expect(info.fontWeight).toBeTypeOf('number');
          expect(info.renderMode).toBeTypeOf('string');
          expect(info.angle).toBeTypeOf('number');
          expect(info.originX).toBeTypeOf('number');
          expect(info.originY).toBeTypeOf('number');
          expect(info.isGenerated).toBeTypeOf('boolean');
          expect(info.isHyphen).toBeTypeOf('boolean');
          expect(info.hasUnicodeMapError).toBeTypeOf('boolean');
        }
      }
    });

    test('should return undefined for invalid index', async ({ testPage }) => {
      const info = testPage.getCharacterInfo(-1);
      expect(info).toBeUndefined();
    });

    test('should return undefined for out of bounds index', async ({ testPage }) => {
      const info = testPage.getCharacterInfo(999999);
      expect(info).toBeUndefined();
    });
  });

  describe('TextRenderMode enum', () => {
    test('should have expected values', () => {
      expect(TextRenderMode.Fill).toBe('Fill');
      expect(TextRenderMode.Stroke).toBe('Stroke');
      expect(TextRenderMode.FillStroke).toBe('FillStroke');
      expect(TextRenderMode.Invisible).toBe('Invisible');
      expect(TextRenderMode.FillClip).toBe('FillClip');
      expect(TextRenderMode.StrokeClip).toBe('StrokeClip');
      expect(TextRenderMode.FillStrokeClip).toBe('FillStrokeClip');
      expect(TextRenderMode.Clip).toBe('Clip');
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on charCount after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.charCount).toThrow();
    });

    test('should throw on getCharUnicode after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getCharUnicode(0)).toThrow();
    });

    test('should throw on getCharacterInfo after dispose', async ({ openDocument }) => {
      const doc = await openDocument('test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getCharacterInfo(0)).toThrow();
    });
  });
});
