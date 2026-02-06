import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DocumentError, PageError, PDFiumErrorCode } from '../../../src/core/errors.js';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { PDFium } from '../../../src/pdfium.js';

describe('Fault Injection & Compatibility', () => {
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

  it('should handle missing FPDF_GetPageCount symbol', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
    const module = pdfium[INTERNAL].module;

    // Save original
    const original = module._FPDF_GetPageCount;

    // Sabotage
    // @ts-expect-error
    module._FPDF_GetPageCount = undefined;

    // Force cache clear if needed (pageCount is cached, so we access private property or rely on fresh doc)
    // Document caches pageCount, so we need a fresh document *after* sabotage?
    // Or we sabotage before opening? _FPDF_LoadMemDocument might rely on things? No.
    // But doc.pageCount accesses the symbol lazily.

    // We need a fresh doc instance to bypass cache if it was already accessed.
    // But we can't easily open a new doc if we break core symbols?
    // _FPDF_GetPageCount is only used in doc.pageCount getter.

    // Let's create a new doc just in case, but reusing `doc` is fine if we haven't read pageCount yet?
    // In beforeAll/setup we might have? No, `doc` is local here.

    try {
      // The getter calls the function. If undefined, it will throw "not a function" usually.
      // The wrapper might not guard `typeof fn !== 'function'` for *every* core function,
      // but if it does, we test that. If it doesn't, we just verifying it crashes "safely" (throws).
      expect(() => doc.pageCount).toThrow();
    } finally {
      // Restore
      module._FPDF_GetPageCount = original;
    }
  });

  it('should handle failure in FPDF_LoadPage (simulate OOM or corruption)', async () => {
    using doc = await pdfium.openDocument(pdfBytes);
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

  it('should handle failure in FPDF_ImportPages (simulate failure)', async () => {
    using doc1 = await pdfium.openDocument(pdfBytes);
    using doc2 = await pdfium.openDocument(pdfBytes);
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

  it('should handle missing FPDF_ImportPagesByIndex symbol (old version simulation)', async () => {
    using doc1 = await pdfium.openDocument(pdfBytes);
    using doc2 = await pdfium.openDocument(pdfBytes);
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
        // Message depends on browser/node version but usually contains "is not a function"
      }
    } finally {
      module._FPDF_ImportPagesByIndex = original;
    }
  });
});
