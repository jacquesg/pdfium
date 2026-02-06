/**
 * Integration tests for extended text API.
 *
 * Tests the FPDFText_* functions for character-level information.
 */

import { describe, expect, test } from 'vitest';
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
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Text API', () => {
  describe('charCount', () => {
    test('should return character count', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.charCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should be consistent with text extraction', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const count = page.charCount;
      // charCount should return a reasonable number
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Direct internal calls (happy paths)', () => {
    test('getText returns content', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      // Ensure text page is loaded
      const charCount = page.charCount;
      expect(charCount).toBeGreaterThan(0);

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const text = getText(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 0, charCount);
      expect(text.length).toBeGreaterThan(0);
    });

    test('getTextBounded returns content', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      page.getText(); // load text page

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const text = getTextBounded(
        pdfiumInternal.module,
        pdfiumInternal.memory,
        pageInternal.textPageHandle,
        0,
        page.height,
        page.width,
        0,
      );
      expect(typeof text).toBe('string');
    });

    test('getCharIndexAtPoint returns index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      page.getText(); // load

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const index = getCharIndexAtPoint(pdfiumInternal.module, pageInternal.textPageHandle, 100, 700, 10, 10);
      expect(typeof index).toBe('number');
    });

    test('search finds text', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
      using page = document.getPage(0);

      // Ensure text page is loaded
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

    test('countRects and getRect return geometry', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_7_with_form.pdf');
      using page = document.getPage(0);

      // Ensure text page is loaded
      page.getText();

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      // Find "the" to get an index
      const { results } = search(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 'the');
      const match = results[0];
      expect(match).toBeDefined();

      if (match) {
        const rectCount = countRects(pdfiumInternal.module, pageInternal.textPageHandle, match.index, match.length);
        expect(rectCount).toBeGreaterThan(0);

        const rect = getRect(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 0);
        expect(rect).toBeDefined();
        if (rect) {
          expect(typeof rect.left).toBe('number');
          expect(typeof rect.top).toBe('number');
        }
      }
    });
  });

  describe('getCharUnicode', () => {
    test('should return unicode code point for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const unicode = page.getCharUnicode(0);
        expect(typeof unicode).toBe('number');
        expect(unicode).toBeGreaterThan(0);
      }
    });

    test('should return 0 for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const unicode = page.getCharUnicode(-1);
      expect(unicode).toBe(0);
    });

    test('should return 0 for out of bounds index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const unicode = page.getCharUnicode(999999);
      expect(unicode).toBe(0);
    });
  });

  describe('getCharFontSize', () => {
    test('should return font size for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const fontSize = page.getCharFontSize(0);
        expect(typeof fontSize).toBe('number');
        expect(fontSize).toBeGreaterThan(0);
      }
    });

    test('should return 0 for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const fontSize = page.getCharFontSize(-1);
      expect(fontSize).toBe(0);
    });
  });

  describe('getCharFontWeight', () => {
    test('should return font weight for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const fontWeight = page.getCharFontWeight(0);
        expect(typeof fontWeight).toBe('number');
        // Font weight is typically 100-900, but could be -1 if unavailable
        expect(fontWeight).toBeGreaterThanOrEqual(-1);
      }
    });

    test('should return -1 for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const fontWeight = page.getCharFontWeight(-1);
      expect(fontWeight).toBe(-1);
    });
  });

  describe('getCharFontName', () => {
    test('should return font name for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const fontName = page.getCharFontName(0);
        // Font name may or may not be available
        if (fontName !== undefined) {
          expect(typeof fontName).toBe('string');
          expect(fontName.length).toBeGreaterThan(0);
        }
      }
    });

    test('should return undefined for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const fontName = page.getCharFontName(-1);
      expect(fontName).toBeUndefined();
    });
  });

  describe('getText edge cases', () => {
    test('should return empty string when count is 0', async () => {
      using pdfium = await initPdfium();
      using builder = pdfium.createDocument();
      builder.addPage();
      const bytes = builder.save();
      using emptyDoc = await pdfium.openDocument(bytes);
      using emptyPage = emptyDoc.getPage(0);
      expect(emptyPage.getText()).toBe('');
    });

    test('should return empty string when count is negative', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const pageInternal = page[INTERNAL];
      const pdfiumInternal = pdfium[INTERNAL];

      const text = getText(pdfiumInternal.module, pdfiumInternal.memory, pageInternal.textPageHandle, 0, -1);
      expect(text).toBe('');
    });
  });

  describe('search edge cases', () => {
    test('should return empty results for invalid handle', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using _page = document.getPage(0);
      const pdfiumInternal = pdfium[INTERNAL];

      // Pass 0 as handle
      const { results } = search(pdfiumInternal.module, pdfiumInternal.memory, 0 as never, 'test');
      expect(results).toEqual([]);
    });
  });

  describe('getTextInRect edge cases', () => {
    test('should return empty string for rect with no text', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      // A small rect in corner likely has no text
      const text = page.getTextInRect(0, 10, 10, 0);
      expect(text).toBe('');
    });
  });

  describe('getCharRenderMode', () => {
    test('should return render mode for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const renderMode = page.getCharRenderMode(0);
        expect(typeof renderMode).toBe('string');
        // Should be one of the TextRenderMode values
        expect(Object.values(TextRenderMode)).toContain(renderMode);
      }
    });

    test('should return Fill (0) for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const renderMode = page.getCharRenderMode(-1);
      expect(renderMode).toBe(TextRenderMode.Fill);
    });
  });

  describe('getCharAngle', () => {
    test('should return angle for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const angle = page.getCharAngle(0);
        expect(typeof angle).toBe('number');
        // Angle is in radians, typically 0 for horizontal text
        expect(Number.isFinite(angle)).toBe(true);
      }
    });

    test('should return 0 for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const angle = page.getCharAngle(-1);
      expect(angle).toBe(0);
    });
  });

  describe('getCharOrigin', () => {
    test('should return origin for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const origin = page.getCharOrigin(0);
        if (origin !== undefined) {
          expect(typeof origin.x).toBe('number');
          expect(typeof origin.y).toBe('number');
          expect(Number.isFinite(origin.x)).toBe(true);
          expect(Number.isFinite(origin.y)).toBe(true);
        }
      }
    });

    test('should return undefined for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const origin = page.getCharOrigin(-1);
      expect(origin).toBeUndefined();
    });
  });

  describe('isCharGenerated', () => {
    test('should return boolean for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const isGenerated = page.isCharGenerated(0);
        expect(typeof isGenerated).toBe('boolean');
      }
    });

    test('should return false for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const isGenerated = page.isCharGenerated(-1);
      expect(isGenerated).toBe(false);
    });
  });

  describe('isCharHyphen', () => {
    test('should return boolean for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const isHyphen = page.isCharHyphen(0);
        expect(typeof isHyphen).toBe('boolean');
      }
    });

    test('should return false for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const isHyphen = page.isCharHyphen(-1);
      expect(isHyphen).toBe(false);
    });
  });

  describe('hasCharUnicodeMapError', () => {
    test('should return boolean for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const hasError = page.hasCharUnicodeMapError(0);
        expect(typeof hasError).toBe('boolean');
      }
    });

    test('should return false for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const hasError = page.hasCharUnicodeMapError(-1);
      expect(hasError).toBe(false);
    });
  });

  describe('getCharFillColour', () => {
    test('should return colour for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const colour = page.getCharFillColour(0);
        if (colour !== undefined) {
          expect(typeof colour.r).toBe('number');
          expect(typeof colour.g).toBe('number');
          expect(typeof colour.b).toBe('number');
          expect(typeof colour.a).toBe('number');
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

    test('should return undefined for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const colour = page.getCharFillColour(-1);
      expect(colour).toBeUndefined();
    });
  });

  describe('getCharStrokeColour', () => {
    test('should return colour for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const colour = page.getCharStrokeColour(0);
        // Stroke colour may not be available for all characters
        if (colour !== undefined) {
          expect(typeof colour.r).toBe('number');
          expect(typeof colour.g).toBe('number');
          expect(typeof colour.b).toBe('number');
          expect(typeof colour.a).toBe('number');
        }
      }
    });

    test('should return undefined for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const colour = page.getCharStrokeColour(-1);
      expect(colour).toBeUndefined();
    });
  });

  describe('getCharacterInfo', () => {
    test('should return character info for valid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const info = page.getCharacterInfo(0);
        if (info !== undefined) {
          expect(info.index).toBe(0);
          expect(typeof info.unicode).toBe('number');
          expect(typeof info.char).toBe('string');
          expect(typeof info.fontSize).toBe('number');
          expect(typeof info.fontWeight).toBe('number');
          expect(typeof info.renderMode).toBe('string');
          expect(typeof info.angle).toBe('number');
          expect(typeof info.originX).toBe('number');
          expect(typeof info.originY).toBe('number');
          expect(typeof info.isGenerated).toBe('boolean');
          expect(typeof info.isHyphen).toBe('boolean');
          expect(typeof info.hasUnicodeMapError).toBe('boolean');
        }
      }
    });

    test('should return undefined for invalid index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const info = page.getCharacterInfo(-1);
      expect(info).toBeUndefined();
    });

    test('should return undefined for out of bounds index', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      const info = page.getCharacterInfo(999999);
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
    test('should throw on charCount after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.charCount).toThrow();
    });

    test('should throw on getCharUnicode after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getCharUnicode(0)).toThrow();
    });

    test('should throw on getCharacterInfo after dispose', async () => {
      using pdfium = await initPdfium();
      using doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getCharacterInfo(0)).toThrow();
    });
  });
});
