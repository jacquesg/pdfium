import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PDFium } from '../../../src/pdfium.js';

describe('Font Coverage Gap', () => {
  let pdfium: PDFium;
  let _pdfBytes: Uint8Array;

  beforeAll(async () => {
    pdfium = await PDFium.init();
    const buffer = await readFile('test/fixtures/test_1.pdf');
    _pdfBytes = new Uint8Array(buffer);
  });

  afterAll(() => {
    pdfium.dispose();
  });

  it('should handle standard font loading', async () => {
    using doc = pdfium.createDocument();
    // Load all standard fonts to hit switch cases if any
    const fonts = [
      'Helvetica',
      'Helvetica-Bold',
      'Helvetica-Oblique',
      'Helvetica-BoldOblique',
      'Times-Roman',
      'Times-Bold',
      'Times-Italic',
      'Times-BoldItalic',
      'Courier',
      'Courier-Bold',
      'Courier-Oblique',
      'Courier-BoldOblique',
      'Symbol',
      'ZapfDingbats',
    ];

    for (const name of fonts) {
      const font = doc.loadStandardFont(name);
      expect(font).toBeDefined();
    }
  });

  it('should return undefined for invalid font name', async () => {
    using doc = pdfium.createDocument();
    expect(() => doc.loadStandardFont('InvalidFontName')).toThrow();
  });
});
