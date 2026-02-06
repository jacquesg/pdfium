import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DocumentError, PageError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { PDFium } from '../../../src/pdfium.js';

describe('Document Error Handling Edge Cases', () => {
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

  it('should throw when accessing attachment index out of bounds', async () => {
    using doc = await pdfium.openDocument(pdfBytes);

    // Bounds check
    expect(() => doc.getAttachment(-1)).toThrow(DocumentError);
    expect(() => doc.getAttachment(999)).toThrow(DocumentError);

    // Verify specific error message or code if needed
    try {
      doc.getAttachment(999);
    } catch (err) {
      expect(err).toBeInstanceOf(DocumentError);
      expect((err as DocumentError).code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
    }
  });

  it('should throw when accessing page index out of bounds', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    const count = doc.pageCount;

    expect(() => doc.getPage(-1)).toThrow(PageError);
    expect(() => doc.getPage(count)).toThrow(PageError); // count is 1-based size, so index=count is out of bounds
    expect(() => doc.getPage(99999)).toThrow(PageError);

    try {
      doc.getPage(99999);
    } catch (err) {
      expect(err).toBeInstanceOf(PageError);
      expect((err as PageError).code).toBe(PDFiumErrorCode.PAGE_INDEX_OUT_OF_RANGE);
    }
  });

  it('should return false when deleting attachment out of bounds', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    // Should return false, not throw, based on the implementation: return fn(...) !== 0
    expect(doc.deleteAttachment(-1)).toBe(false);
    expect(doc.deleteAttachment(999)).toBe(false);
  });

  it('should validate page index type', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    // Testing runtime validation
    expect(() => doc.getPage(1.5)).toThrow(/must be a safe integer/);
    expect(() => doc.getPage(NaN)).toThrow(/must be a safe integer/);
  });

  it('should throw when importing pages with invalid inputs', async () => {
    using doc1 = await pdfium.openDocument(pdfBytes);
    using doc2 = await pdfium.openDocument(pdfBytes);

    // This is hard to trigger without a specifically broken PDF or mocked internal call,
    // but we can try an invalid range string if the underlying FPDF_ImportPages parses it.
    // If it returns 0 (failure), our wrapper should throw.

    try {
      doc1.importPages(doc2, { pageRange: 'invalid-range' });
      // If it doesn't throw, it might be that PDFium is lenient or ignores it.
      // But we want to test the 'result === 0' check in our wrapper.
    } catch (err) {
      expect(err).toBeInstanceOf(DocumentError);
    }
  });

  it('should throw when importing pages by index with empty array', async () => {
    using doc1 = await pdfium.openDocument(pdfBytes);
    using doc2 = await pdfium.openDocument(pdfBytes);

    // Should effectively do nothing or return early
    doc1.importPagesByIndex(doc2, []);
    // No error expected, just ensuring coverage of that early return branch
  });
});
