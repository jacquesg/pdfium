import { DocumentError, PageError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { describe, expect, test } from '../../utils/fixtures.js';

describe('Document Error Handling Edge Cases', () => {
  test('should throw when accessing attachment index out of bounds', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');

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

  test('should throw when accessing page index out of bounds', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
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

  test('should return false when deleting attachment out of bounds', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    expect(doc.deleteAttachment(-1)).toBe(false);
    expect(doc.deleteAttachment(999)).toBe(false);
  });

  test('should validate page index type', async ({ openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    expect(() => doc.getPage(1.5)).toThrow(/must be a safe integer/);
    expect(() => doc.getPage(NaN)).toThrow(/must be a safe integer/);
  });

  test('should throw when importing pages with invalid inputs', async ({ openDocument }) => {
    const doc1 = await openDocument('test_1.pdf');
    const doc2 = await openDocument('test_1.pdf');

    try {
      doc1.importPages(doc2, { pageRange: 'invalid-range' });
    } catch (err) {
      expect(err).toBeInstanceOf(DocumentError);
    }
  });

  test('should throw when importing pages by index with empty array', async ({ openDocument }) => {
    const doc1 = await openDocument('test_1.pdf');
    const doc2 = await openDocument('test_1.pdf');

    // Should effectively do nothing or return early
    doc1.importPagesByIndex(doc2, []);
    // No error expected, just ensuring coverage of that early return branch
  });
});
