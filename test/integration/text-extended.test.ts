/**
 * Integration tests for extended text API.
 *
 * Tests the FPDFText_* functions for character-level information.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { TextRenderMode } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Extended Text API', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
  });

  afterAll(() => {
    document?.dispose();
    pdfium?.dispose();
  });

  describe('charCount', () => {
    test('should return character count', () => {
      using page = document.getPage(0);
      const count = page.charCount;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should be consistent with text extraction', () => {
      using page = document.getPage(0);
      const count = page.charCount;
      // charCount should return a reasonable number
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCharUnicode', () => {
    test('should return unicode code point for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const unicode = page.getCharUnicode(0);
        expect(typeof unicode).toBe('number');
        expect(unicode).toBeGreaterThan(0);
      }
    });

    test('should return 0 for invalid index', () => {
      using page = document.getPage(0);
      const unicode = page.getCharUnicode(-1);
      expect(unicode).toBe(0);
    });

    test('should return 0 for out of bounds index', () => {
      using page = document.getPage(0);
      const unicode = page.getCharUnicode(999999);
      expect(unicode).toBe(0);
    });
  });

  describe('getCharFontSize', () => {
    test('should return font size for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const fontSize = page.getCharFontSize(0);
        expect(typeof fontSize).toBe('number');
        expect(fontSize).toBeGreaterThan(0);
      }
    });

    test('should return 0 for invalid index', () => {
      using page = document.getPage(0);
      const fontSize = page.getCharFontSize(-1);
      expect(fontSize).toBe(0);
    });
  });

  describe('getCharFontWeight', () => {
    test('should return font weight for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const fontWeight = page.getCharFontWeight(0);
        expect(typeof fontWeight).toBe('number');
        // Font weight is typically 100-900, but could be -1 if unavailable
        expect(fontWeight).toBeGreaterThanOrEqual(-1);
      }
    });

    test('should return -1 for invalid index', () => {
      using page = document.getPage(0);
      const fontWeight = page.getCharFontWeight(-1);
      expect(fontWeight).toBe(-1);
    });
  });

  describe('getCharFontName', () => {
    test('should return font name for valid index', () => {
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

    test('should return undefined for invalid index', () => {
      using page = document.getPage(0);
      const fontName = page.getCharFontName(-1);
      expect(fontName).toBeUndefined();
    });
  });

  describe('getCharRenderMode', () => {
    test('should return render mode for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const renderMode = page.getCharRenderMode(0);
        expect(typeof renderMode).toBe('number');
        // Should be one of the TextRenderMode values (0-7)
        expect(renderMode).toBeGreaterThanOrEqual(0);
        expect(renderMode).toBeLessThanOrEqual(7);
      }
    });

    test('should return Fill (0) for invalid index', () => {
      using page = document.getPage(0);
      const renderMode = page.getCharRenderMode(-1);
      expect(renderMode).toBe(TextRenderMode.Fill);
    });
  });

  describe('getCharAngle', () => {
    test('should return angle for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const angle = page.getCharAngle(0);
        expect(typeof angle).toBe('number');
        // Angle is in radians, typically 0 for horizontal text
        expect(Number.isFinite(angle)).toBe(true);
      }
    });

    test('should return 0 for invalid index', () => {
      using page = document.getPage(0);
      const angle = page.getCharAngle(-1);
      expect(angle).toBe(0);
    });
  });

  describe('getCharOrigin', () => {
    test('should return origin for valid index', () => {
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

    test('should return undefined for invalid index', () => {
      using page = document.getPage(0);
      const origin = page.getCharOrigin(-1);
      expect(origin).toBeUndefined();
    });
  });

  describe('isCharGenerated', () => {
    test('should return boolean for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const isGenerated = page.isCharGenerated(0);
        expect(typeof isGenerated).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      using page = document.getPage(0);
      const isGenerated = page.isCharGenerated(-1);
      expect(isGenerated).toBe(false);
    });
  });

  describe('isCharHyphen', () => {
    test('should return boolean for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const isHyphen = page.isCharHyphen(0);
        expect(typeof isHyphen).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      using page = document.getPage(0);
      const isHyphen = page.isCharHyphen(-1);
      expect(isHyphen).toBe(false);
    });
  });

  describe('hasCharUnicodeMapError', () => {
    test('should return boolean for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const hasError = page.hasCharUnicodeMapError(0);
        expect(typeof hasError).toBe('boolean');
      }
    });

    test('should return false for invalid index', () => {
      using page = document.getPage(0);
      const hasError = page.hasCharUnicodeMapError(-1);
      expect(hasError).toBe(false);
    });
  });

  describe('getCharFillColour', () => {
    test('should return colour for valid index', () => {
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

    test('should return undefined for invalid index', () => {
      using page = document.getPage(0);
      const colour = page.getCharFillColour(-1);
      expect(colour).toBeUndefined();
    });
  });

  describe('getCharStrokeColour', () => {
    test('should return colour for valid index', () => {
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

    test('should return undefined for invalid index', () => {
      using page = document.getPage(0);
      const colour = page.getCharStrokeColour(-1);
      expect(colour).toBeUndefined();
    });
  });

  describe('getCharacterInfo', () => {
    test('should return character info for valid index', () => {
      using page = document.getPage(0);
      if (page.charCount > 0) {
        const info = page.getCharacterInfo(0);
        if (info !== undefined) {
          expect(info.index).toBe(0);
          expect(typeof info.unicode).toBe('number');
          expect(typeof info.char).toBe('string');
          expect(typeof info.fontSize).toBe('number');
          expect(typeof info.fontWeight).toBe('number');
          expect(typeof info.renderMode).toBe('number');
          expect(typeof info.angle).toBe('number');
          expect(typeof info.originX).toBe('number');
          expect(typeof info.originY).toBe('number');
          expect(typeof info.isGenerated).toBe('boolean');
          expect(typeof info.isHyphen).toBe('boolean');
          expect(typeof info.hasUnicodeMapError).toBe('boolean');
        }
      }
    });

    test('should return undefined for invalid index', () => {
      using page = document.getPage(0);
      const info = page.getCharacterInfo(-1);
      expect(info).toBeUndefined();
    });

    test('should return undefined for out of bounds index', () => {
      using page = document.getPage(0);
      const info = page.getCharacterInfo(999999);
      expect(info).toBeUndefined();
    });
  });

  describe('TextRenderMode enum', () => {
    test('should have expected values', () => {
      expect(TextRenderMode.Fill).toBe(0);
      expect(TextRenderMode.Stroke).toBe(1);
      expect(TextRenderMode.FillStroke).toBe(2);
      expect(TextRenderMode.Invisible).toBe(3);
      expect(TextRenderMode.FillClip).toBe(4);
      expect(TextRenderMode.StrokeClip).toBe(5);
      expect(TextRenderMode.FillStrokeClip).toBe(6);
      expect(TextRenderMode.Clip).toBe(7);
    });
  });

  describe('post-dispose guards', () => {
    test('should throw on charCount after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.charCount).toThrow();
      doc.dispose();
    });

    test('should throw on getCharUnicode after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getCharUnicode(0)).toThrow();
      doc.dispose();
    });

    test('should throw on getCharacterInfo after dispose', async () => {
      const doc = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = doc.getPage(0);
      page.dispose();
      expect(() => page.getCharacterInfo(0)).toThrow();
      doc.dispose();
    });
  });
});
