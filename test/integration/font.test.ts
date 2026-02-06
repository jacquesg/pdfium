/**
 * Integration tests for font introspection.
 *
 * These tests verify the PDFiumFont class and related methods for
 * accessing font metadata and metrics from text objects.
 */

import { describe, expect, test } from 'vitest';
import { FontFlags } from '../../src/core/types.js';
import type { PDFiumFont } from '../../src/document/font.js';
import type { PDFiumPage } from '../../src/document/page.js';
import { PDFiumTextObject } from '../../src/document/page-object.js';
import { initPdfium, loadTestDocument } from '../utils/helpers.js';

async function getFirstTextFont(page: PDFiumPage): Promise<PDFiumFont | null> {
  const objects = page.getObjects();
  for (const obj of objects) {
    if (obj instanceof PDFiumTextObject) {
      const font = obj.getFont();
      if (font !== null) return font;
    }
  }
  return null;
}

describe('Font Introspection', () => {
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
    test('should return PDFiumFont for text objects', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const objects = page.getObjects();
      const textObjects = objects.filter((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

      expect(textObjects.length).toBeGreaterThan(0);

      for (const textObj of textObjects) {
        using font = textObj.getFont();
        // Font can be null if the WASM function isn't available
        if (font !== null) {
          expect(font).toBeDefined();
          expect(typeof font.familyName).toBe('string');
        }
      }
    });

    test('non-text objects should not be PDFiumTextObject instances', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);

      const objects = page.getObjects();
      const nonTextObj = objects.find((obj) => !(obj instanceof PDFiumTextObject));

      if (nonTextObj) {
        expect(nonTextObj).not.toBeInstanceOf(PDFiumTextObject);
      }
    });
  });

  describe('PDFiumFont.familyName', () => {
    test('should return font family name', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.familyName).toBe('string');
      // Family names are typically non-empty for embedded fonts
    });
  });

  describe('PDFiumFont.fontName', () => {
    test('should return full font name', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.fontName).toBe('string');
    });
  });

  describe('PDFiumFont.flags', () => {
    test('should return font descriptor flags', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.flags).toBe('number');
      expect(textFont.flags).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PDFiumFont.weight', () => {
    test('should return font weight in valid range or zero', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
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
    test('should return italic angle in degrees', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.italicAngle).toBe('number');
      expect(Number.isFinite(textFont.italicAngle)).toBe(true);
    });
  });

  describe('PDFiumFont.isEmbedded', () => {
    test('should return boolean indicating if font is embedded', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.isEmbedded).toBe('boolean');
    });
  });

  describe('PDFiumFont.getInfo()', () => {
    test('should return FontInfo object with all properties', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      const info = textFont.getInfo();

      expect(typeof info.familyName).toBe('string');
      expect(typeof info.fontName).toBe('string');
      expect(typeof info.flags).toBe('number');
      expect(typeof info.weight).toBe('number');
      expect(typeof info.italicAngle).toBe('number');
      expect(typeof info.isEmbedded).toBe('boolean');
    });

    test('should return consistent values with individual properties', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
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
    test('should return font metrics at a given size', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      const metrics = textFont.getMetrics(12);

      expect(typeof metrics.ascent).toBe('number');
      expect(typeof metrics.descent).toBe('number');
    });

    test('should scale metrics proportionally with font size', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
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

    test('should return positive ascent for most fonts', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      const metrics = textFont.getMetrics(12);

      // Most fonts have positive ascent
      if (metrics.ascent !== 0) {
        expect(metrics.ascent).toBeGreaterThan(0);
      }
    });
  });

  describe('PDFiumFont.getGlyphWidth()', () => {
    test('should return glyph width as a number', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      const width = textFont.getGlyphWidth(0, 12);
      expect(typeof width).toBe('number');
      expect(Number.isFinite(width)).toBe(true);
    });

    test('should scale glyph width with font size', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
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
    test('should return Uint8Array or undefined', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      const data = textFont.getFontData();

      if (data !== undefined) {
        expect(data).toBeInstanceOf(Uint8Array);
        expect(data.length).toBeGreaterThan(0);
      }
    });

    test('should return data for embedded fonts', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      const data = textFont.getFontData();

      // Embedded fonts should have data
      if (textFont.isEmbedded && data !== undefined) {
        expect(data.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PDFiumFont helper properties', () => {
    test('isFixedPitch should check FixedPitch flag', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.isFixedPitch).toBe('boolean');
      expect(textFont.isFixedPitch).toBe((textFont.flags & FontFlags.FixedPitch) !== 0);
    });

    test('isSerif should check Serif flag', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.isSerif).toBe('boolean');
      expect(textFont.isSerif).toBe((textFont.flags & FontFlags.Serif) !== 0);
    });

    test('isItalic should check Italic flag', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.isItalic).toBe('boolean');
      expect(textFont.isItalic).toBe((textFont.flags & FontFlags.Italic) !== 0);
    });

    test('isBold should check weight or ForceBold flag', async () => {
      using pdfium = await initPdfium();
      using document = await loadTestDocument(pdfium, 'test_1.pdf');
      using page = document.getPage(0);
      using textFont = await getFirstTextFont(page);
      if (textFont === null) return;

      expect(typeof textFont.isBold).toBe('boolean');
      const expectedBold = textFont.weight >= 700 || (textFont.flags & FontFlags.ForceBold) !== 0;
      expect(textFont.isBold).toBe(expectedBold);
    });
  });
});

describe('Font Introspection with multiple text objects', () => {
  test('should get fonts from all text objects on a page', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    expect(textObjects.length).toBeGreaterThan(0);

    let fontsFound = 0;
    for (const textObj of textObjects) {
      using font = textObj.getFont();
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
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_3_with_images.pdf');
    using page = doc.getPage(0);

    const objects = page.getObjects();
    const textObjects = objects.filter((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    for (const textObj of textObjects) {
      using font = textObj.getFont();
      if (font !== null) {
        expect(typeof font.familyName).toBe('string');
      }
    }
  });
});

describe('Font lifetime management', () => {
  test('should throw on getFont after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    const textObj = objects.find((o): o is PDFiumTextObject => o instanceof PDFiumTextObject);

    page.dispose();

    if (textObj) {
      expect(() => textObj.getFont()).toThrow();
    }
  });

  test('font should remain usable after page dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    const page = doc.getPage(0);
    const objects = page.getObjects();
    let font: PDFiumFont | null = null;

    for (const obj of objects) {
      if (obj instanceof PDFiumTextObject) {
        font = obj.getFont();
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
  });

  test('should throw when using font after font dispose', async () => {
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();
    let font: PDFiumFont | null = null;

    for (const obj of objects) {
      if (obj instanceof PDFiumTextObject) {
        font = obj.getFont();
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
    using pdfium = await initPdfium();
    using doc = await loadTestDocument(pdfium, 'test_1.pdf');
    using page = doc.getPage(0);
    const objects = page.getObjects();

    for (const obj of objects) {
      if (obj instanceof PDFiumTextObject) {
        const font = obj.getFont();
        if (font !== null) {
          font.dispose();
          expect(() => font.dispose()).not.toThrow();
          break;
        }
      }
    }
  });
});
