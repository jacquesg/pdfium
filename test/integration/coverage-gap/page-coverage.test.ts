import { describe, expect, test } from 'vitest';
import { TextError } from '../../../src/core/errors.js';
import { PDFium } from '../../../src/pdfium.js';
import { loadTestPdfData } from '../../utils/helpers.js';

describe('Page Coverage Gap', () => {
  test('should throw TextError when character count exceeds limits', async () => {
    // Re-init with tight limits — cannot use fixture for this
    using limitedPdfium = await PDFium.init({
      limits: { maxTextCharCount: 1 }, // impossibly small limit
    });

    const pdfBytes = await loadTestPdfData('test_1.pdf');
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
