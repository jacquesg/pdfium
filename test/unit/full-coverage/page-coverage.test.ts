import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationType, PageBoxType, PageRotation, ProgressiveRenderStatus } from '../../../src/core/types.js';
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

describe('PDFiumPage Coverage Tests', () => {
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

  describe('Page Box Methods', () => {
    it('should return undefined when page box is not set', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetMediaBox.mockReturnValue(0); // Not set
      expect(page.getPageBox(PageBoxType.MediaBox)).toBeUndefined();

      mockModule._FPDFPage_GetCropBox.mockReturnValue(0);
      expect(page.getPageBox(PageBoxType.CropBox)).toBeUndefined();

      mockModule._FPDFPage_GetBleedBox.mockReturnValue(0);
      expect(page.getPageBox(PageBoxType.BleedBox)).toBeUndefined();

      mockModule._FPDFPage_GetTrimBox.mockReturnValue(0);
      expect(page.getPageBox(PageBoxType.TrimBox)).toBeUndefined();

      mockModule._FPDFPage_GetArtBox.mockReturnValue(0);
      expect(page.getPageBox(PageBoxType.ArtBox)).toBeUndefined();
    });

    it('should return undefined for invalid box type', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      // @ts-expect-error - Testing invalid enum value
      expect(page.getPageBox(999)).toBeUndefined();
    });

    it('should return bounding box with fallback to page dimensions', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_GetPageBoundingBox.mockReturnValue(0); // Failure
      const box = page.boundingBox;

      expect(box).toEqual({
        left: 0,
        bottom: 0,
        right: 595, // Default width from mock
        top: 842, // Default height from mock
      });
    });

    it('should return bounding box when available', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_GetPageBoundingBox.mockReturnValue(1); // Success
      // @ts-expect-error - Mock callback params
      mockModule._FPDF_GetPageBoundingBox.mockImplementation((_, ptr) => {
        // Write mock values: left=10, top=20, right=30, bottom=40
        mockModule.HEAPF32[ptr / 4] = 10;
        mockModule.HEAPF32[ptr / 4 + 1] = 20;
        mockModule.HEAPF32[ptr / 4 + 2] = 30;
        mockModule.HEAPF32[ptr / 4 + 3] = 40;
        return 1;
      });

      const box = page.boundingBox;
      expect(box.left).toBe(10);
      expect(box.top).toBe(20);
      expect(box.right).toBe(30);
      expect(box.bottom).toBe(40);
    });
  });

  describe('Thumbnail Methods', () => {
    it('should return false when page has no thumbnail', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetDecodedThumbnailData.mockReturnValue(0); // No thumbnail
      expect(page.hasThumbnail()).toBe(false);
    });

    it('should return true when page has thumbnail', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetDecodedThumbnailData.mockReturnValue(100); // Has thumbnail
      expect(page.hasThumbnail()).toBe(true);
    });

    it('should return undefined when thumbnail bitmap is unavailable', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetThumbnailAsBitmap.mockReturnValue(0); // No bitmap
      expect(page.getThumbnailAsBitmap()).toBeUndefined();
    });

    it('should return undefined when thumbnail bitmap has invalid dimensions', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetThumbnailAsBitmap.mockReturnValue(999); // Valid handle
      mockModule._FPDFBitmap_GetWidth.mockReturnValue(0); // Invalid width
      mockModule._FPDFBitmap_GetHeight.mockReturnValue(100);
      mockModule._FPDFBitmap_GetBuffer.mockReturnValue(1000);

      expect(page.getThumbnailAsBitmap()).toBeUndefined();
      expect(mockModule._FPDFBitmap_Destroy).toHaveBeenCalledWith(999);
    });

    it('should handle thumbnail with stride padding', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetThumbnailAsBitmap.mockReturnValue(999);
      mockModule._FPDFBitmap_GetWidth.mockReturnValue(10);
      mockModule._FPDFBitmap_GetHeight.mockReturnValue(10);
      mockModule._FPDFBitmap_GetStride.mockReturnValue(48); // 10*4=40, but stride=48 (padding)
      mockModule._FPDFBitmap_GetBuffer.mockReturnValue(1000);

      const result = page.getThumbnailAsBitmap();
      expect(result).toBeDefined();
      expect(result?.width).toBe(10);
      expect(result?.height).toBe(10);
      expect(mockModule._FPDFBitmap_Destroy).toHaveBeenCalledWith(999);
    });

    it('should handle thumbnail without stride padding (fast path)', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetThumbnailAsBitmap.mockReturnValue(999);
      mockModule._FPDFBitmap_GetWidth.mockReturnValue(10);
      mockModule._FPDFBitmap_GetHeight.mockReturnValue(10);
      mockModule._FPDFBitmap_GetStride.mockReturnValue(40); // Exact: 10*4=40 (no padding)
      mockModule._FPDFBitmap_GetBuffer.mockReturnValue(1000);

      const result = page.getThumbnailAsBitmap();
      expect(result).toBeDefined();
      expect(result?.width).toBe(10);
      expect(result?.height).toBe(10);
      expect(mockModule._FPDFBitmap_Destroy).toHaveBeenCalledWith(999);
    });

    it('should return undefined when decoded thumbnail data is empty', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetDecodedThumbnailData.mockReturnValue(0); // No data
      expect(page.getDecodedThumbnailData()).toBeUndefined();
    });

    it('should return undefined when raw thumbnail data is empty', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetRawThumbnailData.mockReturnValue(0); // No data
      expect(page.getRawThumbnailData()).toBeUndefined();
    });
  });

  describe('Text Extraction', () => {
    it('should return empty string when page has no text', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_CountChars.mockReturnValue(0); // No characters
      expect(page.getText()).toBe('');
    });

    it('should return empty string from getTextInRect when no text in region', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetBoundedText.mockReturnValue(0); // No text in rect
      expect(page.getTextInRect(0, 0, 100, 100)).toBe('');
    });

    it('should return undefined when character box is not found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetCharBox.mockReturnValue(0); // Not found
      expect(page.getCharBox(0)).toBeUndefined();
    });

    it('should return undefined when character loose box is not found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetLooseCharBox.mockReturnValue(0); // Not found
      expect(page.getCharLooseBox(0)).toBeUndefined();
    });

    it('should return character origin when found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetCharOrigin.mockImplementation(
        (_textPage: number, _index: number, xPtr: number, yPtr: number) => {
          mockModule.HEAPF64[xPtr / 8] = 100;
          mockModule.HEAPF64[yPtr / 8] = 200;
          return 1;
        },
      );
      expect(page.getCharOrigin(0)).toEqual({ x: 100, y: 200 });
    });

    it('should return undefined when character fill colour is not found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetFillColor.mockReturnValue(0); // Not found
      expect(page.getCharFillColour(0)).toBeUndefined();
    });

    it('should return undefined when character stroke colour is not found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetStrokeColor.mockReturnValue(0); // Not found
      expect(page.getCharStrokeColour(0)).toBeUndefined();
    });

    it('should return character info when available', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetCharBox.mockReturnValue(1); // Box found
      const info = page.getCharacterInfo(0);
      expect(info).toBeDefined();
      expect(info?.index).toBe(0);
    });

    it('should return undefined when font name is empty', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetFontInfo.mockReturnValue(0); // Empty name
      expect(page.getCharFontName(0)).toBeUndefined();
    });
  });

  describe('Text Search', () => {
    it('should yield no results when text is not found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_FindStart.mockReturnValue(500); // Valid handle
      mockModule._FPDFText_FindNext.mockReturnValue(0); // Not found

      const results = Array.from(page.findText('missing'));
      expect(results).toHaveLength(0);
      expect(mockModule._FPDFText_FindClose).toHaveBeenCalledWith(500);
    });

    it('should handle empty search string', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_FindStart.mockReturnValue(500);
      mockModule._FPDFText_FindNext.mockReturnValue(0); // No results for empty string

      const results = Array.from(page.findText(''));
      expect(results).toHaveLength(0);
    });

    it('should return null when search handle creation fails', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_FindStart.mockReturnValue(0); // Failed to create handle

      const results = Array.from(page.findText('test'));
      expect(results).toHaveLength(0);
    });
  });

  describe('Coordinate Transformation', () => {
    it('should handle deviceToPage coordinate transformation', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_DeviceToPage.mockReturnValue(1); // Success
      (mockModule._FPDF_DeviceToPage as ReturnType<typeof vi.fn>).mockImplementation(
        (
          _page: number,
          _sx: number,
          _sy: number,
          _szx: number,
          _szy: number,
          _rot: number,
          _dx: number,
          _dy: number,
          xPtr: number,
          yPtr: number,
        ) => {
          mockModule.HEAPF64[xPtr / 8] = 50;
          mockModule.HEAPF64[yPtr / 8] = 75;
          return 1;
        },
      );

      const result = page.deviceToPage(
        { startX: 0, startY: 0, sizeX: 595, sizeY: 842, rotate: PageRotation.None },
        100,
        200,
      );

      expect(result).toEqual({ x: 50, y: 75 });
    });

    it('should handle pageToDevice coordinate transformation', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_PageToDevice.mockReturnValue(1); // Success
      (mockModule._FPDF_PageToDevice as ReturnType<typeof vi.fn>).mockImplementation(
        (
          _page: number,
          _sx: number,
          _sy: number,
          _szx: number,
          _szy: number,
          _rot: number,
          _px: number,
          _py: number,
          xPtr: number,
          yPtr: number,
        ) => {
          mockModule.HEAP32[xPtr / 4] = 150;
          mockModule.HEAP32[yPtr / 4] = 250;
          return 1;
        },
      );

      const result = page.pageToDevice(
        { startX: 0, startY: 0, sizeX: 595, sizeY: 842, rotate: PageRotation.None },
        100,
        200,
      );

      expect(result).toEqual({ x: 150, y: 250 });
    });
  });

  describe('Generators', () => {
    it('should yield no annotations when count is zero', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetAnnotCount.mockReturnValue(0);

      const annotations = Array.from(page.annotations());
      expect(annotations).toHaveLength(0);
    });

    it('should yield annotations when available', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GetAnnotCount.mockReturnValue(2);
      mockModule._FPDFPage_GetAnnot.mockReturnValue(700); // Valid annotation handle

      const annotations = Array.from(page.annotations());
      expect(annotations).toHaveLength(2);
      for (const a of annotations) {
        a.dispose();
      }
    });

    it('should yield no objects when count is zero', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_CountObjects.mockReturnValue(0);

      const objects = Array.from(page.objects());
      expect(objects).toHaveLength(0);
    });

    it('should yield objects when available', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_CountObjects.mockReturnValue(2);
      mockModule._FPDFPage_GetObject.mockReturnValue(800); // Valid object handle
      mockModule._FPDFPageObj_GetType.mockReturnValue(1); // FPDF_PAGEOBJ_TEXT

      const objects = Array.from(page.objects());
      expect(objects).toHaveLength(2);
      // Objects are not disposable - managed by page
    });
  });

  describe('Structure Tree', () => {
    it('should return undefined when structure tree is not available', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_StructTree_GetForPage.mockReturnValue(0); // NULL handle

      expect(page.getStructureTree()).toBeUndefined();
    });

    it('should return empty array when structure tree has no children', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_StructTree_GetForPage.mockReturnValue(900); // Valid handle
      mockModule._FPDF_StructTree_CountChildren.mockReturnValue(0);

      const tree = page.getStructureTree();
      expect(tree).toEqual([]);
      expect(mockModule._FPDF_StructTree_Close).toHaveBeenCalledWith(900);
    });

    it('should parse structure element with lang attribute', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_StructTree_GetForPage.mockReturnValue(900);
      mockModule._FPDF_StructTree_CountChildren.mockReturnValue(1);
      mockModule._FPDF_StructTree_GetChildAtIndex.mockReturnValue(901);
      mockModule._FPDF_StructElement_CountChildren.mockReturnValue(0);

      // Type returns 'P' (paragraph)
      (mockModule._FPDF_StructElement_GetType as ReturnType<typeof vi.fn>).mockImplementation(
        (_elem: number, bufPtr: number, bufLen: number) => {
          if (bufLen === 0) return 4; // 1 char + null = 4 bytes (UTF-16LE)
          if (bufPtr > 0) {
            const view = new Uint16Array(mockModule.HEAPU8.buffer, bufPtr, 2);
            view[0] = 0x0050; // 'P'
            view[1] = 0x0000; // null
          }
          return 4;
        },
      );

      // AltText returns 'hi' (non-empty)
      (mockModule._FPDF_StructElement_GetAltText as ReturnType<typeof vi.fn>).mockImplementation(
        (_elem: number, bufPtr: number, bufLen: number) => {
          if (bufLen === 0) return 6; // 2 chars + null = 6 bytes (UTF-16LE)
          if (bufPtr > 0) {
            const view = new Uint16Array(mockModule.HEAPU8.buffer, bufPtr, 3);
            view[0] = 0x0068; // 'h'
            view[1] = 0x0069; // 'i'
            view[2] = 0x0000; // null
          }
          return 6;
        },
      );

      // Lang returns 'en' (non-empty)
      (mockModule._FPDF_StructElement_GetLang as ReturnType<typeof vi.fn>).mockImplementation(
        (_elem: number, bufPtr: number, bufLen: number) => {
          if (bufLen === 0) return 6; // 2 chars + null = 6 bytes (UTF-16LE)
          if (bufPtr > 0) {
            const view = new Uint16Array(mockModule.HEAPU8.buffer, bufPtr, 3);
            view[0] = 0x0065; // 'e'
            view[1] = 0x006e; // 'n'
            view[2] = 0x0000; // null
          }
          return 6;
        },
      );

      const tree = page.getStructureTree();
      expect(tree).toBeDefined();
      expect(tree).toHaveLength(1);
      if (tree?.[0]) {
        expect(tree[0].lang).toBe('en');
        expect(tree[0].altText).toBe('hi');
      }
    });

    it('should return undefined for structureElements generator when tree unavailable', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_StructTree_GetForPage.mockReturnValue(0); // NULL handle

      expect(page.structureElements()).toBeUndefined();
    });
  });

  describe('Rendering Options', () => {
    it('should handle render without clip rect', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFBitmap_CreateEx.mockReturnValue(1000);

      const result = page.render();

      expect(result).toBeDefined();
      expect(mockModule._FPDF_RenderPageBitmap).toHaveBeenCalled();
      expect(mockModule._FPDFBitmap_Destroy).toHaveBeenCalledWith(1000);
    });

    it('should render with renderFormFields option', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFBitmap_CreateEx.mockReturnValue(1000);

      page.render({ renderFormFields: true });

      expect(mockModule._FPDF_FFLDraw).toHaveBeenCalled();
      expect(mockModule._FPDFBitmap_Destroy).toHaveBeenCalledWith(1000);
    });

    it('should throw error on re-entrant render call', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFBitmap_CreateEx.mockReturnValue(1000);

      // Simulate re-entrant call by calling render within render setup
      // This is a bit tricky - we need to make the render method detect it's already rendering
      let renderCalled = false;
      mockModule._FPDF_RenderPageBitmap.mockImplementation(() => {
        if (!renderCalled) {
          renderCalled = true;
          // Try to call render again (should throw)
          expect(() => page.render()).toThrow('Re-entrant render call detected');
        }
      });

      page.render();
    });
  });

  describe('Progressive Rendering', () => {
    it('should create progressive render context', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFBitmap_CreateEx.mockReturnValue(1000);
      mockModule._FPDF_RenderPageBitmap_Start.mockReturnValue(1); // RENDERING_TOBECONTINUED

      using context = page.startProgressiveRender();
      expect(context).toBeDefined();

      // Context disposal should clean up
      context.dispose();
      expect(mockModule._FPDF_RenderPage_Close).toHaveBeenCalled();
      expect(mockModule._FPDFBitmap_Destroy).toHaveBeenCalledWith(1000);
    });

    it('should handle progressive render completion', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFBitmap_CreateEx.mockReturnValue(1000);
      mockModule._FPDF_RenderPageBitmap_Start.mockReturnValue(0); // RENDERING_DONE
      mockModule._FPDF_RenderPage_Continue.mockReturnValue(0); // Already done

      using context = page.startProgressiveRender();
      const status = context.continue();

      expect(status).toBe(ProgressiveRenderStatus.Ready); // Status when already done
    });
  });

  describe('Annotation Methods', () => {
    it('should return null when creating unsupported annotation type', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_CreateAnnot.mockReturnValue(0); // Failed to create

      const annot = page.createAnnotation(AnnotationType.Text);
      expect(annot).toBeNull();
    });

    it('should check annotation subtype support', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFAnnot_IsSupportedSubtype.mockReturnValue(1);
      expect(page.isAnnotationSubtypeSupported(AnnotationType.Text)).toBe(true);

      mockModule._FPDFAnnot_IsSupportedSubtype.mockReturnValue(0);
      expect(page.isAnnotationSubtypeSupported(AnnotationType.Text)).toBe(false);
    });

    it('should check annotation object subtype support', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFAnnot_IsObjectSupportedSubtype.mockReturnValue(1);
      expect(page.isAnnotationObjectSubtypeSupported(AnnotationType.Text)).toBe(true);

      mockModule._FPDFAnnot_IsObjectSupportedSubtype.mockReturnValue(0);
      expect(page.isAnnotationObjectSubtypeSupported(AnnotationType.Text)).toBe(false);
    });

    it('should get focusable subtypes count', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFAnnot_GetFocusableSubtypesCount.mockReturnValue(5);
      expect(page.getFocusableSubtypesCount()).toBe(5);
    });

    it('should get empty array when no focusable subtypes', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFAnnot_GetFocusableSubtypesCount.mockReturnValue(0);
      expect(page.getFocusableSubtypes()).toEqual([]);
    });

    it('should return empty array when fetching focusable subtypes fails', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFAnnot_GetFocusableSubtypesCount.mockReturnValue(2);
      mockModule._FPDFAnnot_GetFocusableSubtypes.mockReturnValue(0);

      expect(page.getFocusableSubtypes()).toEqual([]);
    });

    it('should set focusable subtypes', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFAnnot_SetFocusableSubtypes.mockReturnValue(1);
      expect(page.setFocusableSubtypes([AnnotationType.Text, AnnotationType.Highlight])).toBe(true);

      mockModule._FPDFAnnot_SetFocusableSubtypes.mockReturnValue(0);
      expect(page.setFocusableSubtypes([AnnotationType.Text])).toBe(false);
    });
  });

  describe('Link Methods', () => {
    it('should return null when no link at point', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFLink_GetLinkAtPoint.mockReturnValue(0); // No link

      expect(page.getLinkAtPoint(100, 100)).toBeNull();
    });

    it('should get link z-order at point', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFLink_GetLinkZOrderAtPoint.mockReturnValue(5);
      expect(page.getLinkZOrderAtPoint(100, 100)).toBe(5);
    });

    it('should yield no links when page has none', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      // Mock link enumeration to return no links
      mockModule._FPDFLink_Enumerate.mockReturnValue(0); // No more links

      const links = Array.from(page.links());
      expect(links).toHaveLength(0);
    });

    it('should get empty web links when none available', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFLink_LoadWebLinks.mockReturnValue(1100); // Valid handle
      mockModule._FPDFLink_CountWebLinks.mockReturnValue(0); // No web links

      const webLinks = page.getWebLinks();
      expect(webLinks).toEqual([]);
      expect(mockModule._FPDFLink_CloseWebLinks).toHaveBeenCalledWith(1100);
    });

    it('should return 0 for webLinkCount when loadWebLinks fails', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFLink_LoadWebLinks.mockReturnValue(0); // NULL handle - failure

      expect(page.webLinkCount).toBe(0);
    });
  });

  describe('Image Object Creation', () => {
    it('should return null when image object creation fails', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPageObj_NewImageObj.mockReturnValue(0); // Failed

      expect(page.createImageObject()).toBeNull();
    });

    it('should create image object successfully', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPageObj_NewImageObj.mockReturnValue(1200); // Success

      const imgObj = page.createImageObject();
      expect(imgObj).not.toBeNull();
      // Image objects are not disposable - managed by page
    });
  });

  describe('Page Object Manipulation', () => {
    it('should remove object successfully', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_CountObjects.mockReturnValue(1);
      mockModule._FPDFPage_GetObject.mockReturnValue(1300);
      mockModule._FPDFPageObj_GetType.mockReturnValue(1); // Text object
      mockModule._FPDFPage_RemoveObject.mockReturnValue(1); // Success

      const obj = page.getObjects()[0]!;
      expect(page.removeObject(obj)).toBe(true);
    });

    it('should fail to remove object', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_CountObjects.mockReturnValue(1);
      mockModule._FPDFPage_GetObject.mockReturnValue(1300);
      mockModule._FPDFPageObj_GetType.mockReturnValue(1);
      mockModule._FPDFPage_RemoveObject.mockReturnValue(0); // Failure

      const obj = page.getObjects()[0]!;
      expect(page.removeObject(obj)).toBe(false);
    });

    it('should generate page content', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_GenerateContent.mockReturnValue(1); // Success
      expect(page.generateContent()).toBe(true);

      mockModule._FPDFPage_GenerateContent.mockReturnValue(0); // Failure
      expect(page.generateContent()).toBe(false);
    });

    it('should set clip path', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_CreateClipPath.mockReturnValue(1400); // Valid clip path
      expect(page.setClipPath({ left: 0, bottom: 0, right: 100, top: 100 })).toBe(true);
      expect(mockModule._FPDF_DestroyClipPath).toHaveBeenCalledWith(1400);
    });

    it('should fail to set clip path when creation fails', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDF_CreateClipPath.mockReturnValue(0); // Failed
      expect(page.setClipPath({ left: 0, bottom: 0, right: 100, top: 100 })).toBe(false);
    });
  });

  describe('Form Field Methods Without Form Handle', () => {
    it('should return null for form field type when no form handle', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL form handle

      expect(page.getFormFieldTypeAtPoint(100, 100)).toBeNull();
    });

    it('should return -1 for form field z-order when no form handle', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL form handle

      expect(page.getFormFieldZOrderAtPoint(100, 100)).toBe(-1);
    });

    it('should return undefined for form selected text when no form handle', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL form handle

      expect(page.getFormSelectedText()).toBeUndefined();
    });

    it('should return undefined for form focused text when no form handle', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL form handle

      expect(page.getFormFocusedText()).toBeUndefined();
    });

    it('should return false for form undo/redo when no form handle', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL form handle

      expect(page.canFormUndo()).toBe(false);
      expect(page.canFormRedo()).toBe(false);
      expect(page.formUndo()).toBe(false);
      expect(page.formRedo()).toBe(false);
    });

    it('should return false for form mouse/keyboard events when no form handle', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFDOC_InitFormFillEnvironment.mockReturnValue(0); // NULL form handle

      expect(page.formMouseMove(0, 100, 100)).toBe(false);
      expect(page.formMouseWheel(0, 100, 100, 0, 10)).toBe(false);
      expect(page.formFocus(0, 100, 100)).toBe(false);
      expect(page.formMouseDown('left', 0, 100, 100)).toBe(false);
      expect(page.formMouseUp('left', 0, 100, 100)).toBe(false);
      expect(page.formDoubleClick(0, 100, 100)).toBe(false);
      expect(page.formKeyDown(13, 0)).toBe(false);
      expect(page.formKeyUp(13, 0)).toBe(false);
      expect(page.formChar(65, 0)).toBe(false);
    });
  });

  describe('Form Field Text Extraction', () => {
    it('returns undefined when selected text write length is only null terminator', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      let calls = 0;
      mockModule._FORM_GetSelectedText.mockImplementation(() => {
        calls += 1;
        if (calls === 1) return 8;
        return 2;
      });

      expect(page.getFormSelectedText()).toBeUndefined();
    });

    it('returns undefined when focused text write length is only null terminator', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      let calls = 0;
      mockModule._FORM_GetFocusedText.mockImplementation(() => {
        calls += 1;
        if (calls === 1) return 8;
        return 2;
      });

      expect(page.getFormFocusedText()).toBeUndefined();
    });
  });

  describe('Character Index Methods', () => {
    it('should return -1 when character index at position not found', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetCharIndexAtPos.mockReturnValue(-1); // Not found

      expect(page.getCharIndexAtPos(100, 100)).toBe(-1);
    });

    it('should return -3 when character index at position not found with tolerance', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_GetCharIndexAtPos.mockReturnValue(-3); // Not found with tolerance

      expect(page.getCharIndexAtPos(100, 100, 5, 5)).toBe(-3);
    });
  });

  describe('Additional text edge branches', () => {
    it('returns empty string when second bounded text call extracts <= 0 chars', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      let calls = 0;
      mockModule._FPDFText_GetBoundedText.mockImplementation(() => {
        calls += 1;
        if (calls === 1) return 5;
        return 0;
      });

      expect(page.getTextInRect(0, 0, 100, 100)).toBe('');
    });

    it('returns empty rect arrays when findText rect counting returns <= 0', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFText_FindStart.mockReturnValue(500);
      mockModule._FPDFText_FindNext.mockImplementationOnce(() => 1).mockImplementation(() => 0);
      mockModule._FPDFText_GetSchResultIndex.mockReturnValue(3);
      mockModule._FPDFText_GetSchCount.mockReturnValue(2);
      mockModule._FPDFText_CountRects.mockReturnValue(0);

      const results = Array.from(page.findText('sample'));
      expect(results).toHaveLength(1);
      expect(results[0]?.rects).toEqual([]);
    });
  });

  describe('Annotation Removal', () => {
    it('should remove annotation successfully', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_RemoveAnnot.mockReturnValue(1); // Success

      expect(page.removeAnnotation(0)).toBe(true);
    });

    it('should fail to remove annotation', async () => {
      using doc = await pdfium.openDocument(new Uint8Array(10));
      using page = doc.getPage(0);

      mockModule._FPDFPage_RemoveAnnot.mockReturnValue(0); // Failure

      expect(page.removeAnnotation(0)).toBe(false);
    });
  });
});
