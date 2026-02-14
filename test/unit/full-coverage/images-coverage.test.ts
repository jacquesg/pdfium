import { describe, expect, it } from 'vitest';
import { ImageColourSpace, ImageMarkedContentType } from '../../../src/core/types.js';
import * as images from '../../../src/document/page_impl/images.js';
import { asHandle, WASMMemoryManager } from '../../../src/wasm/memory.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('Images implementation (failure paths)', () => {
  describe('imageObjSetMatrix', () => {
    it('should call _FPDFImageObj_SetMatrix and return true on success', () => {
      const mockModule = createMockWasmModule();
      const imageObj = asHandle(800);

      mockModule._FPDFImageObj_SetMatrix.mockReturnValue(1);

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjSetMatrix(mockModule, imageObj, 1, 0, 0, 1, 100, 200);

      expect(result).toBe(true);
      expect(mockModule._FPDFImageObj_SetMatrix).toHaveBeenCalledWith(800, 1, 0, 0, 1, 100, 200);
    });

    it('should return false when _FPDFImageObj_SetMatrix fails', () => {
      const mockModule = createMockWasmModule();
      const imageObj = asHandle(800);

      mockModule._FPDFImageObj_SetMatrix.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjSetMatrix(mockModule, imageObj, 1, 0, 0, 1, 50, 75);

      expect(result).toBe(false);
      expect(mockModule._FPDFImageObj_SetMatrix).toHaveBeenCalled();
    });
  });

  describe('imageObjGetMetadata', () => {
    it('should return null when _FPDFImageObj_GetImageMetadata returns false', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const imageObj = asHandle(800);
      const page = asHandle(200);

      // Mock to return false (0)
      mockModule._FPDFImageObj_GetImageMetadata.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjGetMetadata(mockModule, memory, imageObj, page);

      expect(result).toBeNull();
      expect(mockModule._FPDFImageObj_GetImageMetadata).toHaveBeenCalled();
    });

    it('should return ImageMetadata when _FPDFImageObj_GetImageMetadata succeeds', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const imageObj = asHandle(800);
      const page = asHandle(200);

      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFImageObj_GetImageMetadata.mockImplementation((_obj, _page, metadataPtr) => {
        // FPDF_IMAGEOBJ_METADATA struct layout (28 bytes):
        // 0:  width (uint32)
        // 4:  height (uint32)
        // 8:  horizontal_dpi (float)
        // 12: vertical_dpi (float)
        // 16: bits_per_pixel (uint32)
        // 20: colorspace (int32)
        // 24: marked_content_id (int32)

        const heapU32 = new Uint32Array(mockModule.HEAPU8.buffer, metadataPtr, 7);
        const heapF32 = new Float32Array(mockModule.HEAPU8.buffer, metadataPtr, 7);
        const heapI32 = new Int32Array(mockModule.HEAPU8.buffer, metadataPtr, 7);

        heapU32[0] = 1024; // width
        heapU32[1] = 768; // height
        heapF32[2] = 72.0; // horizontal_dpi
        heapF32[3] = 72.0; // vertical_dpi
        heapU32[4] = 24; // bits_per_pixel
        heapI32[5] = 1; // colorspace (1 = DeviceGray in native)
        heapI32[6] = 2; // marked_content_id (2 = Tagged)

        return 1; // success
      });

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjGetMetadata(mockModule, memory, imageObj, page);

      expect(result).toBeDefined();
      expect(result?.width).toBe(1024);
      expect(result?.height).toBe(768);
      expect(result?.horizontalDpi).toBe(72.0);
      expect(result?.verticalDpi).toBe(72.0);
      expect(result?.bitsPerPixel).toBe(24);
      expect(result?.colourSpace).toBe(ImageColourSpace.DeviceGray);
      expect(result?.markedContent).toBe(ImageMarkedContentType.Tagged);
    });

    it('should handle unknown colour space and marked content types', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const imageObj = asHandle(800);
      const page = asHandle(200);

      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFImageObj_GetImageMetadata.mockImplementation((_obj, _page, metadataPtr) => {
        const heapU32 = new Uint32Array(mockModule.HEAPU8.buffer, metadataPtr, 7);
        const heapF32 = new Float32Array(mockModule.HEAPU8.buffer, metadataPtr, 7);
        const heapI32 = new Int32Array(mockModule.HEAPU8.buffer, metadataPtr, 7);

        heapU32[0] = 640;
        heapU32[1] = 480;
        heapF32[2] = 96.0;
        heapF32[3] = 96.0;
        heapU32[4] = 32;
        heapI32[5] = 999; // unknown colour space
        heapI32[6] = -999; // unknown marked content

        return 1;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjGetMetadata(mockModule, memory, imageObj, page);

      expect(result).toBeDefined();
      expect(result?.colourSpace).toBe(ImageColourSpace.Unknown);
      expect(result?.markedContent).toBe(ImageMarkedContentType.None);
    });
  });

  describe('imageObjSetBitmap', () => {
    it('should return true when _FPDFImageObj_SetBitmap succeeds', () => {
      const mockModule = createMockWasmModule();
      const imageObj = asHandle(800);
      const bitmap = asHandle(400);

      mockModule._FPDFImageObj_SetBitmap.mockReturnValue(1);

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjSetBitmap(mockModule, imageObj, bitmap);

      expect(result).toBe(true);
    });

    it('should return false when _FPDFImageObj_SetBitmap fails', () => {
      const mockModule = createMockWasmModule();
      const imageObj = asHandle(800);
      const bitmap = asHandle(400);

      mockModule._FPDFImageObj_SetBitmap.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = images.imageObjSetBitmap(mockModule, imageObj, bitmap);

      expect(result).toBe(false);
    });
  });
});
