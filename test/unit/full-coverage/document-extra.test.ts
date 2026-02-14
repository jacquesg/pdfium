import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentError } from '../../../src/core/errors.js';
import { DocumentActionType, FormFieldType } from '../../../src/core/types.js';
import { PDFium } from '../../../src/pdfium.js';
import * as WasmLoader from '../../../src/wasm/index.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

vi.mock('../../../src/wasm/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof WasmLoader>();
  return {
    ...actual,
    loadWASM: vi.fn(),
  };
});

describe('PDFium Document Extra Coverage', () => {
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

  describe('Signatures (Extra)', () => {
    it('getSignature should return undefined for invalid index', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getSignature(-1)).toBeUndefined();

      mockModule._FPDF_GetSignatureCount.mockReturnValue(5);
      expect(doc.getSignature(10)).toBeUndefined();
    });

    it('getSignature should return undefined if FPDF_GetSignatureObject missing', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      // @ts-expect-error
      mockModule._FPDF_GetSignatureObject = undefined;
      expect(doc.getSignature(0)).toBeUndefined();
    });

    it('getSignature should return undefined if handle is null', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_GetSignatureCount.mockReturnValue(1);
      mockModule._FPDF_GetSignatureObject.mockReturnValue(0);
      expect(doc.getSignature(0)).toBeUndefined();
    });
  });

  describe('Form (Extra)', () => {
    it('killFormFocus should return false if no form', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // Must be set BEFORE openDocument
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.killFormFocus()).toBe(false);
    });

    it('setFormFieldHighlightColour/Alpha should do nothing if no form', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // Must be set BEFORE openDocument
      using doc = await pdfium.openDocument(new Uint8Array(10));
      doc.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 0, g: 0, b: 0, a: 0 }); // Should not crash
      doc.setFormFieldHighlightAlpha(0); // Should not crash
    });

    it('setFormFieldHighlightColour should convert Colour to ARGB', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      doc.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 255, g: 0, b: 0, a: 255 });
      // 0xFFFF0000 = 4294901760
      expect(mockModule._FPDF_SetFormFieldHighlightColor).toHaveBeenCalledWith(
        expect.anything(), // form handle
        expect.anything(), // field type
        0xffff0000,
      );
    });

    it('setFormFieldHighlightColour should convert semi-transparent green', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      doc.setFormFieldHighlightColour(FormFieldType.Unknown, { r: 0, g: 255, b: 0, a: 128 });
      // 0x8000FF00 = 2147549952
      expect(mockModule._FPDF_SetFormFieldHighlightColor).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        0x8000ff00,
      );
    });
  });

  describe('Import Pages (Extra)', () => {
    it('importPages should handle failure with range', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using src = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_ImportPages.mockReturnValue(0);
      expect(() => doc.importPages(src, { pageRange: '1-2' })).toThrow(DocumentError);
    });

    it('importPagesByIndex should do nothing for empty array', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using src = await pdfium.openDocument(new Uint8Array(10));
      doc.importPagesByIndex(src, []);
      expect(mockModule._FPDF_ImportPagesByIndex).not.toHaveBeenCalled();
    });
  });

  describe('N-Up (Extra)', () => {
    it('createNUpDocument should handle failure (return 0)', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      mockModule._FPDF_ImportNPagesToOne.mockReturnValue(0);
      // @ts-expect-error - Passing invalid options for testing
      expect(doc.createNUpDocument({})).toBeUndefined();
    });
  });

  describe('Trailer Ends + Print Page Ranges', () => {
    it('getTrailerEnds returns empty array when count <= 0', async () => {
      mockModule._FPDF_GetTrailerEnds.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getTrailerEnds()).toEqual([]);
    });

    it('getTrailerEnds returns array of ends when count > 0', async () => {
      mockModule._FPDF_GetTrailerEnds
        .mockReturnValueOnce(2) // first call: count
        .mockReturnValueOnce(2); // second call: actual count
      using doc = await pdfium.openDocument(new Uint8Array(10));
      const ends = doc.getTrailerEnds();
      expect(ends).toHaveLength(2);
    });

    it('getPrintPageRanges returns undefined when pageRange handle is 0', async () => {
      mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getPrintPageRanges()).toBeUndefined();
    });

    it('getPrintPageRanges returns undefined when count <= 0', async () => {
      mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockReturnValue(100);
      mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getPrintPageRanges()).toBeUndefined();
    });

    it('getPrintPageRanges returns array of page numbers', async () => {
      mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockReturnValue(100);
      mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockReturnValue(2);
      mockModule._FPDF_VIEWERREF_GetPrintPageRangeElement.mockReturnValueOnce(0).mockReturnValueOnce(3);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getPrintPageRanges()).toEqual([0, 3]);
    });

    it('getPrintPageRanges skips negative elements', async () => {
      mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockReturnValue(100);
      mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockReturnValue(2);
      mockModule._FPDF_VIEWERREF_GetPrintPageRangeElement.mockReturnValueOnce(-1).mockReturnValueOnce(-1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getPrintPageRanges()).toBeUndefined(); // Empty after filtering
    });
  });

  describe('Viewer Preferences + Document Metadata', () => {
    it('hasValidCrossReferenceTable returns boolean', async () => {
      mockModule._FPDF_DocumentHasValidCrossReferenceTable.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.hasValidCrossReferenceTable()).toBe(true);
    });

    it('getPageLabel returns undefined for invalid page', async () => {
      mockModule._FPDF_GetPageLabel.mockReturnValue(0);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.getPageLabel(0)).toBeUndefined();
    });

    it('copyViewerPreferences returns boolean', async () => {
      mockModule._FPDF_CopyViewerPreferences.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using src = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.copyViewerPreferences(src)).toBe(true);
    });

    it('getNumCopies returns number', async () => {
      mockModule._FPDF_VIEWERREF_GetNumCopies.mockReturnValue(3);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.numCopies).toBe(3);
    });

    it('printScaling returns boolean', async () => {
      mockModule._FPDF_VIEWERREF_GetPrintScaling.mockReturnValue(1);
      using doc = await pdfium.openDocument(new Uint8Array(10));
      expect(doc.printScaling).toBe(true);
    });
  });

  describe('Form Actions (Extra)', () => {
    it('executeDocumentAction should do nothing if no form', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // Before openDocument
      using doc = await pdfium.openDocument(new Uint8Array(10));
      doc.executeDocumentAction(DocumentActionType.WillSave);
      expect(mockModule._FORM_DoDocumentAAction).not.toHaveBeenCalled();
    });

    it('executeDocumentJSAction should do nothing if no form', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // Before openDocument
      using doc = await pdfium.openDocument(new Uint8Array(10));
      doc.executeDocumentJSAction();
      expect(mockModule._FORM_DoDocumentJSAction).not.toHaveBeenCalled();
    });

    it('executeDocumentOpenAction should do nothing if no form', async () => {
      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // Before openDocument
      using doc = await pdfium.openDocument(new Uint8Array(10));
      doc.executeDocumentOpenAction();
      expect(mockModule._FORM_DoDocumentOpenAction).not.toHaveBeenCalled();
    });
  });
});
