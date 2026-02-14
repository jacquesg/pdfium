/**
 * Tests for uncovered branches across src/document/page_impl/images.ts,
 * src/document/page.ts, and src/document/document.ts.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PageActionType } from '../../../src/core/types.js';
import type { PDFiumImageObject } from '../../../src/document/page-object.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('Remaining branch coverage', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;

  beforeEach(() => {
    vi.resetModules();
    mockModule = createMockWasmModule();
  });

  async function importPDFiumWithMock() {
    vi.doMock('../../../src/wasm/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/wasm/index.js')>();
      return { ...actual, loadWASM: vi.fn(() => Promise.resolve(mockModule)) };
    });
    const { PDFium } = await import('../../../src/pdfium.js');
    return PDFium;
  }

  describe('src/document/page_impl/images.ts', () => {
    describe('imageObjGetDecodedData — line 42 null branch', () => {
      test('returns null when WASM call returns 0 bytes', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock a document with a page containing an image object
        mockModule._FPDFPage_CountObjects.mockImplementation(() => 1);
        mockModule._FPDFPage_GetObject.mockImplementation(() => 500);
        mockModule._FPDFPageObj_GetType.mockImplementation(() => 3); // FPDF_PAGEOBJ_IMAGE
        mockModule._FPDFPageObj_GetBounds.mockImplementation(() => 1);
        mockModule._FPDFImageObj_GetImagePixelSize.mockImplementation(() => 1);

        // Mock getDecodedData to fail (returns 0)
        mockModule._FPDFImageObj_GetImageDataDecoded.mockImplementation(() => 0);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const page = document.getPage(0);

        const objects = [...page.objects()];
        expect(objects).toHaveLength(1);

        const imageObj = objects[0] as PDFiumImageObject;
        expect(imageObj.type).toBe('Image');

        // This should trigger the null branch on line 42
        const decodedData = imageObj.getDecodedData();
        expect(decodedData).toBeNull();

        page.dispose();
        document.dispose();
      });
    });

    describe('imageObjGetRawData — line 50 null branch', () => {
      test('returns null when WASM call returns 0 bytes', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock a document with a page containing an image object
        mockModule._FPDFPage_CountObjects.mockImplementation(() => 1);
        mockModule._FPDFPage_GetObject.mockImplementation(() => 500);
        mockModule._FPDFPageObj_GetType.mockImplementation(() => 3); // FPDF_PAGEOBJ_IMAGE
        mockModule._FPDFPageObj_GetBounds.mockImplementation(() => 1);
        mockModule._FPDFImageObj_GetImagePixelSize.mockImplementation(() => 1);

        // Mock getRawData to fail (returns 0)
        mockModule._FPDFImageObj_GetImageDataRaw.mockImplementation(() => 0);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const page = document.getPage(0);

        const objects = [...page.objects()];
        expect(objects).toHaveLength(1);

        const imageObj = objects[0] as PDFiumImageObject;

        // This should trigger the null branch on line 50
        const rawData = imageObj.getRawData();
        expect(rawData).toBeNull();

        page.dispose();
        document.dispose();
      });
    });
  });

  describe('src/document/page.ts', () => {
    describe('link/action branches — lines 2817, 2880', () => {
      test('handles link with no action or destination', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock link enumeration
        let enumerateCallCount = 0;
        mockModule._FPDFLink_Enumerate.mockImplementation((_page, _startPos, outLinkHandle) => {
          if (enumerateCallCount === 0) {
            enumerateCallCount++;
            // Write link handle to outLinkHandle pointer
            const view = new Int32Array(mockModule.HEAPU8.buffer);
            view[outLinkHandle / 4] = 700; // Arbitrary link handle
            return 1; // Success
          }
          return 0; // No more links
        });

        // Mock link bounds
        mockModule._FPDFLink_GetAnnotRect.mockImplementation(() => 1);

        // Mock action and destination to return null values
        mockModule._FPDFLink_GetAction.mockImplementation(() => 0); // NULL_ACTION
        mockModule._FPDFLink_GetDest.mockImplementation(() => 0); // NULL_DEST

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const page = document.getPage(0);

        const links = page.getLinks();
        expect(links).toHaveLength(1);
        const link0 = links[0]!;
        expect(link0).toMatchObject({
          index: 0,
          bounds: expect.any(Object),
        });

        // The link should not have action or destination properties (lines 2817, 2880 branches)
        expect(link0).not.toHaveProperty('action');
        expect(link0).not.toHaveProperty('destination');

        page.dispose();
        document.dispose();
      });

      test('handles action with filePath for Launch action — line 2880 branch', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock link enumeration
        let enumerateCallCount = 0;
        mockModule._FPDFLink_Enumerate.mockImplementation((_page, _startPos, outLinkHandle) => {
          if (enumerateCallCount === 0) {
            enumerateCallCount++;
            const view = new Int32Array(mockModule.HEAPU8.buffer);
            view[outLinkHandle / 4] = 700;
            return 1;
          }
          return 0;
        });

        mockModule._FPDFLink_GetAnnotRect.mockImplementation(() => 1);
        mockModule._FPDFLink_GetAction.mockImplementation(() => 800); // Non-null action

        // Mock action type as Launch (type 4 according to enum map)
        mockModule._FPDFAction_GetType.mockImplementation(() => 4);

        // Mock file path return (simulate empty string case)
        let getFilePathCallCount = 0;
        mockModule._FPDFAction_GetFilePath.mockImplementation(() => {
          getFilePathCallCount++;
          if (getFilePathCallCount === 1) {
            return 2; // 2 bytes (null-terminated empty string: \0)
          }
          return 0; // Return 0 to indicate no actual string
        });

        mockModule._FPDFLink_GetDest.mockImplementation(() => 0); // NULL_DEST

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const page = document.getPage(0);

        const links = page.getLinks();
        expect(links).toHaveLength(1);
        const link0 = links[0]!;
        expect(link0.action).toBeDefined();
        expect(link0.action?.type).toBe('Launch');

        // This triggers line 2880 branch (filePath is undefined when getWasmStringUTF8 returns undefined)
        expect(link0.action).not.toHaveProperty('filePath');

        page.dispose();
        document.dispose();
      });
    });

    describe('executePageAction — line 3089 early return branch', () => {
      test('returns early when form handle is NULL_FORM', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock form environment to return 0 (NULL_FORM)
        mockModule._FPDFDOC_InitFormFillEnvironment.mockImplementation(() => 0);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const page = document.getPage(0);

        // This should trigger the early return on line 3089
        page.executePageAction(PageActionType.Open);

        // Verify FORM_DoPageAAction was NOT called
        expect(mockModule._FORM_DoPageAAction).not.toHaveBeenCalled();

        page.dispose();
        document.dispose();
      });
    });
  });

  describe('src/document/document.ts', () => {
    describe('getTrailerEnds — line 718 early return branch', () => {
      test('returns empty array when count is 0', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock FPDF_GetTrailerEnds to return 0 count
        mockModule._FPDF_GetTrailerEnds.mockImplementation(() => 0);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const trailerEnds = document.getTrailerEnds();

        // This triggers line 718 branch (count <= 0)
        expect(trailerEnds).toEqual([]);

        document.dispose();
      });

      test('returns empty array when count is negative', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock to return negative count
        mockModule._FPDF_GetTrailerEnds.mockImplementation(() => -1);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const trailerEnds = document.getTrailerEnds();
        expect(trailerEnds).toEqual([]);

        document.dispose();
      });
    });

    describe('getPrintPageRanges — lines 839-852 branches', () => {
      test('returns undefined when pageRange handle is 0', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock to return 0 (null handle)
        mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockImplementation(() => 0);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const ranges = document.getPrintPageRanges();

        // This triggers line 835-836 branch
        expect(ranges).toBeUndefined();

        document.dispose();
      });

      test('returns undefined when count is 0', async () => {
        const PDFium = await importPDFiumWithMock();

        // Mock to return valid handle but 0 count
        mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockImplementation(() => 900); // Non-zero
        mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockImplementation(() => 0);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const ranges = document.getPrintPageRanges();

        // This triggers line 840-841 branch
        expect(ranges).toBeUndefined();

        document.dispose();
      });

      test('returns undefined when count is negative', async () => {
        const PDFium = await importPDFiumWithMock();

        mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockImplementation(() => 900);
        mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockImplementation(() => -1);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const ranges = document.getPrintPageRanges();
        expect(ranges).toBeUndefined();

        document.dispose();
      });

      test('filters out negative page elements and returns undefined if all negative', async () => {
        const PDFium = await importPDFiumWithMock();

        mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockImplementation(() => 900);
        mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockImplementation(() => 3);

        // All elements return -1 (negative)
        mockModule._FPDF_VIEWERREF_GetPrintPageRangeElement.mockImplementation(() => -1);

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const ranges = document.getPrintPageRanges();

        // This triggers lines 847-849 and line 852 (pages.length === 0)
        expect(ranges).toBeUndefined();

        document.dispose();
      });

      test('returns only non-negative page elements', async () => {
        const PDFium = await importPDFiumWithMock();

        mockModule._FPDF_VIEWERREF_GetPrintPageRange.mockImplementation(() => 900);
        mockModule._FPDF_VIEWERREF_GetPrintPageRangeCount.mockImplementation(() => 4);

        // Mix of valid and invalid elements
        let callCount = 0;
        mockModule._FPDF_VIEWERREF_GetPrintPageRangeElement.mockImplementation(() => {
          const idx = callCount++;
          if (idx === 0) return 0; // Valid
          if (idx === 1) return -1; // Invalid (skip)
          if (idx === 2) return 5; // Valid
          if (idx === 3) return -2; // Invalid (skip)
          return -1;
        });

        const pdfium = await PDFium.init({ wasmBinary: new ArrayBuffer(0) });
        const document = await pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

        const ranges = document.getPrintPageRanges();

        // This tests the filtering logic on lines 844-850
        expect(ranges).toEqual([0, 5]);

        document.dispose();
      });
    });
  });
});
