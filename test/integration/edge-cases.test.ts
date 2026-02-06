/**
 * Tests for edge cases and invalid inputs.
 */

import { describe, expect, test } from 'vitest';
import { DocumentError, PDFiumErrorCode } from '../../src/core/errors.js';
import { initPdfium } from '../utils/helpers.js';

describe('Edge Cases', () => {
  test('should reject empty buffer', async () => {
    using pdfium = await initPdfium();
    const empty = new Uint8Array(0);
    try {
      await pdfium.openDocument(empty);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentError);
      // Format invalid or similar
      if (error instanceof DocumentError) {
        expect([PDFiumErrorCode.DOC_FORMAT_INVALID, PDFiumErrorCode.DOC_LOAD_UNKNOWN]).toContain(error.code);
      }
    }
  });

  test('should reject garbage buffer', async () => {
    using pdfium = await initPdfium();
    const garbage = new Uint8Array([1, 2, 3, 4]);
    try {
      await pdfium.openDocument(garbage);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentError);
      if (error instanceof DocumentError) {
        expect(error.code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
      }
    }
  });
});
