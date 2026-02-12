import { describe, expect, test } from '../../utils/fixtures.js';

describe('Font Coverage Gap', () => {
  test('should handle standard font loading', async ({ pdfium }) => {
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

  test('should return undefined for invalid font name', async ({ pdfium }) => {
    using doc = pdfium.createDocument();
    expect(() => doc.loadStandardFont('InvalidFontName')).toThrow();
  });
});
