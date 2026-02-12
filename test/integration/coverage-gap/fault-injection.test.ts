import { DocumentError, PageError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { describe, expect, test } from '../../utils/fixtures.js';

describe('Fault Injection & Compatibility', () => {
  test('should handle missing FPDF_GetPageCount symbol', async ({ pdfium, openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    const module = pdfium[INTERNAL].module;

    // Save original
    const original = module._FPDF_GetPageCount;

    // Sabotage
    // @ts-expect-error
    module._FPDF_GetPageCount = undefined;

    try {
      expect(() => doc.pageCount).toThrow();
    } finally {
      module._FPDF_GetPageCount = original;
    }
  });

  test('should handle failure in FPDF_LoadPage (simulate OOM or corruption)', async ({ pdfium, openDocument }) => {
    const doc = await openDocument('test_1.pdf');
    const module = pdfium[INTERNAL].module;
    const original = module._FPDF_LoadPage;

    // Mock to return 0 (NULL)
    // biome-ignore lint/suspicious/noExplicitAny: Mocking
    module._FPDF_LoadPage = () => 0 as any;

    try {
      expect(() => doc.getPage(0)).toThrow(PageError);
      try {
        doc.getPage(0);
      } catch (err) {
        expect((err as PageError).code).toBe(PDFiumErrorCode.PAGE_LOAD_FAILED);
      }
    } finally {
      module._FPDF_LoadPage = original;
    }
  });

  test('should handle failure in FPDF_ImportPages (simulate failure)', async ({ pdfium, openDocument }) => {
    const doc1 = await openDocument('test_1.pdf');
    const doc2 = await openDocument('test_1.pdf');
    const module = pdfium[INTERNAL].module;
    const original = module._FPDF_ImportPages;

    // Mock to return 0 (failure)
    module._FPDF_ImportPages = () => 0;

    try {
      expect(() => doc1.importPages(doc2)).toThrow(DocumentError);
    } finally {
      module._FPDF_ImportPages = original;
    }
  });

  test('should handle missing FPDF_ImportPagesByIndex symbol (old version simulation)', async ({
    pdfium,
    openDocument,
  }) => {
    const doc1 = await openDocument('test_1.pdf');
    const doc2 = await openDocument('test_1.pdf');
    const module = pdfium[INTERNAL].module;
    const original = module._FPDF_ImportPagesByIndex;

    // @ts-expect-error
    module._FPDF_ImportPagesByIndex = undefined;

    try {
      expect(() => doc1.importPagesByIndex(doc2, [0])).toThrow(TypeError);
      try {
        doc1.importPagesByIndex(doc2, [0]);
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
      }
    } finally {
      module._FPDF_ImportPagesByIndex = original;
    }
  });
});
