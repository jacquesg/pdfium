import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TextError } from '../../../src/core/errors.js';
import { PDFium } from '../../../src/pdfium.js';

describe('Page Coverage Gap', () => {
  let pdfium: PDFium;
  let pdfBytes: Uint8Array;

  beforeAll(async () => {
    pdfium = await PDFium.init();
    const buffer = await readFile('test/fixtures/test_1.pdf');
    pdfBytes = new Uint8Array(buffer);
  });

  afterAll(() => {
    pdfium.dispose();
  });

  it('should throw TextError when character count exceeds limits', async () => {
    // Re-init with tight limits
    using limitedPdfium = await PDFium.init({
      limits: { maxTextCharCount: 1 }, // impossibly small limit
    });

    using doc = await limitedPdfium.openDocument(pdfBytes);
    using page = doc.getPage(0);

    expect(() => page.getText()).toThrow(TextError);
    try {
      page.getText();
    } catch (err) {
      expect((err as TextError).message).toContain('exceeds maximum');
    }
  });
});
