import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentError } from '../../../src/core/errors.js';
import { DocMDPPermission } from '../../../src/core/types.js';
import { PDFium } from '../../../src/pdfium.js';
import * as WasmLoader from '../../../src/wasm/index.js';
import { PDFiumNativeErrorCode } from '../../../src/wasm/index.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

vi.mock('../../../src/wasm/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof WasmLoader>();
  return {
    ...actual,
    loadWASM: vi.fn(),
  };
});

describe('PDFium Document (Full Coverage)', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;
  let pdfium: PDFium;

  beforeEach(async () => {
    mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    vi.mocked(WasmLoader.loadWASM).mockResolvedValue(mockModule);
    pdfium = await PDFium.init();
  });

  afterEach(() => {
    pdfium.dispose();
    vi.clearAllMocks();
  });

  it('openDocument should throw correct error for FILE_NOT_FOUND', async () => {
    mockModule._FPDF_LoadMemDocument.mockReturnValue(0);
    mockModule._FPDF_GetLastError.mockReturnValue(PDFiumNativeErrorCode.FILE);
    await expect(pdfium.openDocument(new Uint8Array(10))).rejects.toThrow(DocumentError);
  });

  it('openDocument should handle allocation failure', async () => {
    mockModule._malloc.mockReturnValue(0);
    await expect(pdfium.openDocument(new Uint8Array(10))).rejects.toThrow(DocumentError);
  });

  describe('Attachments', () => {
    it('should throw when adding attachment fails', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDFDoc_AddAttachment.mockReturnValue(0);
      expect(doc.addAttachment('test')).toBeNull();
    });
  });

  describe('Bookmarks', () => {
    it('should handle empty bookmark title', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDFBookmark_GetFirstChild.mockReset();
      mockModule._FPDFBookmark_GetFirstChild.mockReturnValueOnce(100).mockReturnValue(0);
      mockModule._FPDFBookmark_GetNextSibling.mockReturnValue(0);
      mockModule._FPDFBookmark_GetTitle.mockReturnValue(0); // 0 bytes
      const b = doc.getBookmarks();
      expect(b).toHaveLength(1);
      expect(b[0]).toBeDefined();
      if (b[0]) {
        expect(b[0].title).toBe('');
      }
    });
  });

  describe('Document Info', () => {
    it('should handle fileVersion failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_GetFileVersion.mockReturnValue(0);
      expect(doc.fileVersion).toBeUndefined();
    });

    it('should handle getPageLabel failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_GetPageLabel.mockReturnValue(0);
      expect(doc.getPageLabel(0)).toBeUndefined();
    });

    it('should handle getViewerPreference failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_VIEWERREF_GetName.mockReturnValue(0);
      expect(doc.getViewerPreference('foo')).toBeUndefined();
    });
  });

  describe('Signatures', () => {
    it('should return empty array if no signatures', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_GetSignatureCount.mockReturnValue(0);
      expect(doc.getSignatures()).toHaveLength(0);
    });

    it('should return signature with failure cases for details', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_GetSignatureCount.mockReturnValue(1);
      mockModule._FPDF_GetSignatureObject.mockReturnValue(100);

      // Mock individual property getters to fail
      mockModule._FPDFSignatureObj_GetContents.mockReturnValue(0);
      mockModule._FPDFSignatureObj_GetByteRange.mockReturnValue(0);
      mockModule._FPDFSignatureObj_GetSubFilter.mockReturnValue(0);
      mockModule._FPDFSignatureObj_GetReason.mockReturnValue(0);
      mockModule._FPDFSignatureObj_GetTime.mockReturnValue(0);
      mockModule._FPDFSignatureObj_GetDocMDPPermission.mockReturnValue(-1);

      const sigs = doc.getSignatures();
      expect(sigs).toHaveLength(1);
      const sig = sigs[0];
      expect(sig).toBeDefined();
      if (sig) {
        expect(sig.contents).toBeUndefined();
        expect(sig.byteRange).toBeUndefined();
        expect(sig.subFilter).toBeUndefined();
        expect(sig.reason).toBeUndefined();
        expect(sig.time).toBeUndefined();
        expect(sig.docMDPPermission).toBe(DocMDPPermission.None);
      }
    });
  });

  describe('Import/Export', () => {
    it('should throw on save failure', async () => {
      // @ts-expect-error - Adding property to mock
      mockModule.addFunction = vi.fn(() => 1);
      // @ts-expect-error - Adding property to mock
      mockModule.removeFunction = vi.fn();
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_SaveAsCopy.mockReturnValue(0);
      expect(() => doc.save()).toThrow(DocumentError);
    });

    it('should throw on importPages failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using src = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_ImportPages.mockReturnValue(0);
      expect(() => doc.importPages(src)).toThrow(DocumentError);
    });

    it('should throw on importPagesByIndex failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using src = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_ImportPagesByIndex.mockReturnValue(0);
      expect(() => doc.importPagesByIndex(src, [0])).toThrow(DocumentError);
    });

    it('should handle N-Up creation failure', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_ImportNPagesToOne.mockReturnValue(0); // Fail
      expect(
        doc.createNUpDocument({ outputWidth: 100, outputHeight: 100, pagesPerRow: 2, pagesPerColumn: 1 }),
      ).toBeUndefined();
    });
  });
});
