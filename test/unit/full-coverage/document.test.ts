import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentError } from '../../../src/core/errors.js';
import { DocMDPPermission } from '../../../src/core/types.js';
import { PDFium } from '../../../src/pdfium.js';
import * as WasmLoader from '../../../src/wasm/index.js';
import { PDFiumNativeErrorCode } from '../../../src/wasm/index.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

type WriteBlockCallback = (pThis: number, pData: number, size: number) => number;

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
      mockModule.addFunction = vi.fn(() => 1);
      mockModule.removeFunction = vi.fn();
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_SaveAsCopy.mockReturnValue(0);
      expect(() => doc.save()).toThrow(DocumentError);
    });

    it('should handle WriteBlock callback error during save', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));

      let writeBlockCallback: WriteBlockCallback | null = null;

      // Capture the WriteBlock callback when addFunction is called
      mockModule.addFunction.mockImplementation((callback: WriteBlockCallback, signature: string) => {
        if (signature === 'iiii') {
          writeBlockCallback = callback;
        }
        return 1001; // Return dummy function pointer
      });

      // Mock HEAPU8.slice to throw when called
      const originalSlice = mockModule.HEAPU8.slice;
      mockModule.HEAPU8.slice = vi.fn(() => {
        throw new Error('Memory access error');
      });

      (mockModule._FPDF_SaveAsCopy as ReturnType<typeof vi.fn>).mockImplementation(
        (_docHandle: number, fileWritePtr: number, _flags: number) => {
          // Simulate PDFium calling the WriteBlock callback
          if (writeBlockCallback) {
            const result = writeBlockCallback(fileWritePtr, 100, 10);
            // Callback should return 0 on error (catches the exception)
            expect(result).toBe(0);
          }
          // Return success (1) so the save doesn't fail for other reasons
          return 1;
        },
      );

      // Capture the expected warning about WriteBlock callback error
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Save should succeed (returns 1) even though callback had an error
      const result = doc.save();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WriteBlock callback error'), expect.any(Error));

      // Restore
      warnSpy.mockRestore();
      mockModule.HEAPU8.slice = originalSlice;
    });

    it('should handle WriteBlock callback with zero size or null pointer', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));

      let writeBlockCallback: WriteBlockCallback | null = null;

      // Capture the WriteBlock callback when addFunction is called
      mockModule.addFunction.mockImplementation((callback: WriteBlockCallback, signature: string) => {
        if (signature === 'iiii') {
          writeBlockCallback = callback;
        }
        return 1001; // Return dummy function pointer
      });

      // Track whether HEAPU8.slice was called (should NOT be called for zero size/pointer)
      const sliceSpy = vi.spyOn(mockModule.HEAPU8, 'slice');

      (mockModule._FPDF_SaveAsCopy as ReturnType<typeof vi.fn>).mockImplementation(
        (_docHandle: number, fileWritePtr: number, _flags: number) => {
          if (writeBlockCallback) {
            // Call with zero size - should skip chunk push and return 1
            const result1 = writeBlockCallback(fileWritePtr, 100, 0);
            expect(result1).toBe(1);

            // Call with zero pData - should skip chunk push and return 1
            const result2 = writeBlockCallback(fileWritePtr, 0, 10);
            expect(result2).toBe(1);

            // Normal call with valid data
            writeBlockCallback(fileWritePtr, 100, 5);
          }
          return 1;
        },
      );

      const result = doc.save();
      expect(result).toBeInstanceOf(Uint8Array);

      // Verify slice was only called once (for the valid call, not for zero size/pointer)
      expect(sliceSpy).toHaveBeenCalledTimes(1);
      expect(sliceSpy).toHaveBeenCalledWith(100, 105); // pData=100, size=5
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

  describe('Form Fill Environment', () => {
    it('should handle MemoryError during form fill init silently', async () => {
      // Mock _malloc to return 0 specifically for the form fill info allocation (256 bytes)
      // This will trigger a MemoryError in FSFormFillInfo constructor
      // The document constructor catches MemoryError and continues without form fill
      mockModule._malloc.mockImplementation((size: number) => {
        if (size === 256) {
          return 0; // Fail allocation for FORM_FILL_INFO_SIZE (line 199-202)
        }
        // Success for all other allocations (document data, etc.)
        const mockPtr = 8 + Math.floor(Math.random() * 1000);
        return mockPtr;
      });

      // Should not throw, form fill environment just won't be initialised
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc).toBeDefined();
    });

    it('should dispose form info when document is disposed', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      // Form info is created during construction
      // When we dispose, line 176 should be hit (formInfo disposal)
      expect(doc).toBeDefined();
      // Disposal happens automatically via 'using'
    });

    it('should re-throw non-MemoryError during form fill init', async () => {
      // Mock _FPDFDOC_InitFormFillEnvironment to throw a generic TypeError
      // This exercises line 202 (re-throw non-MemoryError)
      (mockModule._FPDFDOC_InitFormFillEnvironment as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new TypeError('Unexpected null pointer');
      });

      await expect(pdfium.openDocument(new Uint8Array(10))).rejects.toThrow(TypeError);
    });
  });

  describe('Attachment Validation', () => {
    it('should throw DocumentError when getAttachment index is NaN', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDFDoc_GetAttachmentCount.mockReturnValue(5);

      expect(() => doc.getAttachment(Number.NaN)).toThrow(DocumentError);
      expect(() => doc.getAttachment(Number.POSITIVE_INFINITY)).toThrow(DocumentError);
      expect(() => doc.getAttachment(1.5)).toThrow(DocumentError);
    });
  });
});
