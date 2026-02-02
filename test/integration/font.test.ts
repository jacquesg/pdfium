/**
 * Integration tests for font introspection.
 *
 * These tests verify the PDFiumFont class and related methods for
 * accessing font metadata and metrics from text objects.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { FontFlags, PageObjectType } from '../../src/core/types.js';
import type { PDFiumDocument } from '../../src/document/document.js';
import type { PDFiumFont } from '../../src/document/font.js';
import type { PDFiumPage } from '../../src/document/page.js';
import type { PDFium } from '../../src/pdfium.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

describe('Font Introspection', () => {
  let pdfium: PDFium;
  let document: PDFiumDocument;
  let page: PDFiumPage;
  let textFont: PDFiumFont | null = null;

  beforeAll(async () => {
    pdfium = await initPdfium();
    document = await loadTestDocument(pdfium, 'test_1.pdf');
    page = document.getPage(0);

    // Get a font from the first text object for testing
    const objects = page.getObjects();
    for (const obj of objects) {
      if (obj.type === PageObjectType.Text) {
        textFont = page.getTextObjectFont(obj.handle);
        if (textFont !== null) break;
      }
    }
  });

  afterAll(() => {
    textFont?.dispose();
    page?.dispose();
    document?.dispose();
    pdfium?.dispose();
  });

  describe('FontFlags enum values', () => {
    test('should have correct flag values per PDF specification', () => {
      expect(FontFlags.FixedPitch).toBe(1 << 0);
      expect(FontFlags.Serif).toBe(1 << 1);
      expect(FontFlags.Symbolic).toBe(1 << 2);
      expect(FontFlags.Script).toBe(1 << 3);
      expect(FontFlags.Nonsymbolic).toBe(1 << 5);
      expect(FontFlags.Italic).toBe(1 << 6);
      expect(FontFlags.AllCap).toBe(1 << 16);
      expect(FontFlags.SmallCap).toBe(1 << 17);
      expect(FontFlags.ForceBold).toBe(1 << 18);
    });
  });

  describe('getTextObjectFont', () => {
    test('should return PDFiumFont for text objects', () => {
      const objects = page.getObjects();
      const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

      expect(textObjects.length).toBeGreaterThan(0);

      for (const textObj of textObjects) {
        using font = page.getTextObjectFont(textObj.handle);
        // Font can be null if the WASM function isn't available
        if (font !== null) {
          expect(font).toBeDefined();
          expect(typeof font.familyName).toBe('string');
        }
      }
    });

    test('should return null for non-text objects', () => {
      const objects = page.getObjects();
      const nonTextObj = objects.find((obj) => obj.type !== PageObjectType.Text);

      if (nonTextObj) {
        const font = page.getTextObjectFont(nonTextObj.handle);
        expect(font).toBeNull();
      }
    });
  });

  describe('PDFiumFont.familyName', () => {
    test('should return font family name', () => {
      if (textFont === null) return;

      expect(typeof textFont.familyName).toBe('string');
      // Family names are typically non-empty for embedded fonts
    });
  });

  describe('PDFiumFont.fontName', () => {
    test('should return full font name', () => {
      if (textFont === null) return;

      expect(typeof textFont.fontName).toBe('string');
    });
  });

  describe('PDFiumFont.flags', () => {
    test('should return font descriptor flags', () => {
      if (textFont === null) return;

      expect(typeof textFont.flags).toBe('number');
      expect(textFont.flags).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PDFiumFont.weight', () => {
    test('should return font weight in valid range or zero', () => {
      if (textFont === null) return;

      expect(typeof textFont.weight).toBe('number');
      // Weight is 0 if not available, or 100-900
      if (textFont.weight !== 0) {
        expect(textFont.weight).toBeGreaterThanOrEqual(100);
        expect(textFont.weight).toBeLessThanOrEqual(900);
      }
    });
  });

  describe('PDFiumFont.italicAngle', () => {
    test('should return italic angle in degrees', () => {
      if (textFont === null) return;

      expect(typeof textFont.italicAngle).toBe('number');
      expect(Number.isFinite(textFont.italicAngle)).toBe(true);
    });
  });

  describe('PDFiumFont.isEmbedded', () => {
    test('should return boolean indicating if font is embedded', () => {
      if (textFont === null) return;

      expect(typeof textFont.isEmbedded).toBe('boolean');
    });
  });

  describe('PDFiumFont.getInfo()', () => {
    test('should return FontInfo object with all properties', () => {
      if (textFont === null) return;

      const info = textFont.getInfo();

      expect(typeof info.familyName).toBe('string');
      expect(typeof info.fontName).toBe('string');
      expect(typeof info.flags).toBe('number');
      expect(typeof info.weight).toBe('number');
      expect(typeof info.italicAngle).toBe('number');
      expect(typeof info.isEmbedded).toBe('boolean');
    });

    test('should return consistent values with individual properties', () => {
      if (textFont === null) return;

      const info = textFont.getInfo();

      expect(info.familyName).toBe(textFont.familyName);
      expect(info.fontName).toBe(textFont.fontName);
      expect(info.flags).toBe(textFont.flags);
      expect(info.weight).toBe(textFont.weight);
      expect(info.italicAngle).toBe(textFont.italicAngle);
      expect(info.isEmbedded).toBe(textFont.isEmbedded);
    });
  });

  describe('PDFiumFont.getMetrics()', () => {
    test('should return font metrics at a given size', () => {
      if (textFont === null) return;

      const metrics = textFont.getMetrics(12);

      expect(typeof metrics.ascent).toBe('number');
      expect(typeof metrics.descent).toBe('number');
    });

    test('should scale metrics proportionally with font size', () => {
      if (textFont === null) return;

      const metrics12 = textFont.getMetrics(12);
      const metrics24 = textFont.getMetrics(24);

      // If ascent is non-zero, it should scale proportionally
      if (metrics12.ascent !== 0 && metrics24.ascent !== 0) {
        const ratio = metrics24.ascent / metrics12.ascent;
        expect(ratio).toBeCloseTo(2, 1);
      }

      // Descent should also scale
      if (metrics12.descent !== 0 && metrics24.descent !== 0) {
        const ratio = metrics24.descent / metrics12.descent;
        expect(ratio).toBeCloseTo(2, 1);
      }
    });

    test('should return positive ascent for most fonts', () => {
      if (textFont === null) return;

      const metrics = textFont.getMetrics(12);

      // Most fonts have positive ascent
      if (metrics.ascent !== 0) {
        expect(metrics.ascent).toBeGreaterThan(0);
      }
    });
  });

  describe('PDFiumFont.getGlyphWidth()', () => {
    test('should return glyph width as a number', () => {
      if (textFont === null) return;

      const width = textFont.getGlyphWidth(0, 12);
      expect(typeof width).toBe('number');
      expect(Number.isFinite(width)).toBe(true);
    });

    test('should scale glyph width with font size', () => {
      if (textFont === null) return;

      const width12 = textFont.getGlyphWidth(1, 12);
      const width24 = textFont.getGlyphWidth(1, 24);

      // If width is non-zero, it should scale proportionally
      if (width12 !== 0 && width24 !== 0) {
        const ratio = width24 / width12;
        expect(ratio).toBeCloseTo(2, 1);
      }
    });
  });

  describe('PDFiumFont.getFontData()', () => {
    test('should return Uint8Array or undefined', () => {
      if (textFont === null) return;

      const data = textFont.getFontData();

      if (data !== undefined) {
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    test('should return data for embedded fonts', () => {
      if (textFont === null) return;

      const data = textFont.getFontData();

      // Embedded fonts should have data
      if (textFont.isEmbedded && data !== undefined) {
        expect(data.length).toBeGreaterThan(0);
        // Font files typically start with specific magic bytes
        // TrueType: 0x00010000 or 'true' or 'typ1'
        // OpenType: 'OTTO'
        // But we won't check this as PDFium may return processed data
      }
    });
  });

  describe('PDFiumFont helper properties', () => {
    test('isFixedPitch should check FixedPitch flag', () => {
      if (textFont === null) return;

      expect(typeof textFont.isFixedPitch).toBe('boolean');
      expect(textFont.isFixedPitch).toBe((textFont.flags & FontFlags.FixedPitch) !== 0);
    });

    test('isSerif should check Serif flag', () => {
      if (textFont === null) return;

      expect(typeof textFont.isSerif).toBe('boolean');
      expect(textFont.isSerif).toBe((textFont.flags & FontFlags.Serif) !== 0);
    });

    test('isItalic should check Italic flag', () => {
      if (textFont === null) return;

      expect(typeof textFont.isItalic).toBe('boolean');
      expect(textFont.isItalic).toBe((textFont.flags & FontFlags.Italic) !== 0);
    });

    test('isBold should check weight or ForceBold flag', () => {
      if (textFont === null) return;

      expect(typeof textFont.isBold).toBe('boolean');
      const expectedBold = textFont.weight >= 700 || (textFont.flags & FontFlags.ForceBold) !== 0;
      expect(textFont.isBold).toBe(expectedBold);
    });
  });
});

describe('Font Introspection with multiple text objects', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should get fonts from all text objects on a page', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

    expect(textObjects.length).toBeGreaterThan(0);

    let fontsFound = 0;
    for (const textObj of textObjects) {
      using font = page.getTextObjectFont(textObj.handle);
      if (font !== null) {
        fontsFound++;
        // Verify font is valid
        expect(typeof font.familyName).toBe('string');
        expect(typeof font.weight).toBe('number');
      }
    }

    // At least some text objects should have fonts
    expect(fontsFound).toBeGreaterThan(0);
  });

  test('should work with images PDF', async () => {
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((obj) => obj.type === PageObjectType.Text);

    for (const textObj of textObjects) {
      using font = page.getTextObjectFont(textObj.handle);
      if (font !== null) {
        expect(typeof font.familyName).toBe('string');
      }
    }
  });
});

describe('Font lifetime management', () => {
  let pdfium: PDFium;

  beforeAll(async () => {
    pdfium = await initPdfium();
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  test('should throw on getTextObjectFont after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const textObj = objects.find((obj) => obj.type === PageObjectType.Text);

    page.dispose();

    if (textObj) {
      expect(() => page.getTextObjectFont(textObj.handle)).toThrow();
    }

    doc.dispose();
  });

  test('font should remain usable after page dispose', async () => {
    const doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    let font: PDFiumFont | null = null;

    for (const obj of objects) {
      if (obj.type === PageObjectType.Text) {
        font = page.getTextObjectFont(obj.handle);
        if (font !== null) break;
      }
    }

    if (font !== null) {
      // Capture values while page is alive
      const familyBefore = font.familyName;
      const weightBefore = font.weight;

      // Dispose the page — font's borrow keeps native resources alive
      page.dispose();

      // Font should still work
      expect(font.familyName).toBe(familyBefore);
      expect(font.weight).toBe(weightBefore);
      expect(typeof font.flags).toBe('number');
      expect(() => font.getInfo()).not.toThrow();
      expect(() => font.getMetrics(12)).not.toThrow();

      // Release the font's borrow
      font.dispose();
    }

    doc.dispose();
  });

  test('should throw when using font after font dispose', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    let font: PDFiumFont | null = null;

    for (const obj of objects) {
      if (obj.type === PageObjectType.Text) {
        font = page.getTextObjectFont(obj.handle);
        if (font !== null) break;
      }
    }

    if (font !== null) {
      font.dispose();

      expect(() => font.familyName).toThrow('disposed');
      expect(() => font.weight).toThrow('disposed');
      expect(() => font.getInfo()).toThrow('disposed');
      expect(() => font.getMetrics(12)).toThrow('disposed');
    }
  });

  test('dispose should be idempotent', async () => {
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    for (const obj of objects) {
      if (obj.type === PageObjectType.Text) {
        const font = page.getTextObjectFont(obj.handle);
        if (font !== null) {
          font.dispose();
          expect(() => font.dispose()).not.toThrow();
          break;
        }
      }
    }
  });
});
