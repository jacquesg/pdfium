import { describe, expect, it } from 'vitest';
import { RenderError } from '../../../src/core/errors.js';
import { ProgressiveRenderStatus } from '../../../src/core/types.js';
import { createProgressiveRenderContext } from '../../../src/document/progressive-render.js';
import { NULL_BITMAP } from '../../../src/internal/constants.js';
import { asHandle, WASMMemoryManager } from '../../../src/wasm/memory.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('ProgressiveRenderContext (failure paths)', () => {
  describe('continue()', () => {
    it('should return current status when status is not ToBeContinued', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => retainCount--;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.Done, // Already done
      );

      const result = context.continue();

      expect(result).toBe(ProgressiveRenderStatus.Done);
      expect(mockModule._FPDF_RenderPage_Continue).not.toHaveBeenCalled();

      context.dispose();
    });

    it('should return Failed when _FPDF_RenderPage_Continue is not a function', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => retainCount--;

      // Remove the function to simulate it being missing
      // @ts-expect-error - Intentionally removing the function
      mockModule._FPDF_RenderPage_Continue = undefined;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.ToBeContinued,
      );

      const result = context.continue();

      expect(result).toBe(ProgressiveRenderStatus.Failed);
      expect(context.status).toBe(ProgressiveRenderStatus.Failed);

      context.dispose();
    });

    it('should call _FPDF_RenderPage_Continue and update status when ToBeContinued', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => retainCount--;

      // Mock to return 2 (FPDF_RENDER_DONE in native)
      mockModule._FPDF_RenderPage_Continue.mockReturnValue(2);

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.ToBeContinued,
      );

      const result = context.continue();

      expect(mockModule._FPDF_RenderPage_Continue).toHaveBeenCalled();
      expect(result).toBe(ProgressiveRenderStatus.Done);
      expect(context.status).toBe(ProgressiveRenderStatus.Done);

      context.dispose();
    });
  });

  describe('getResult()', () => {
    it('should throw RenderError when status is not Done', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => retainCount--;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.ToBeContinued,
      );

      expect(() => context.getResult()).toThrow(RenderError);
      expect(() => context.getResult()).toThrow(/Cannot get result/);

      context.dispose();
    });

    it('should throw RenderError when status is Failed', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => retainCount--;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.Failed,
      );

      expect(() => context.getResult()).toThrow(RenderError);

      context.dispose();
    });

    it('should return RenderResult when status is Done', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      // Create buffer with known data (BGRA format)
      const width = 2;
      const height = 2;
      const bufferSize = width * height * 4;
      const bufferAllocation = memory.alloc(bufferSize);

      // Write some BGRA data to the buffer
      const bgraData = new Uint8Array(mockModule.HEAPU8.buffer, bufferAllocation.ptr, bufferSize);
      // Pixel 1: BGRA (255, 0, 0, 255) -> should become RGBA (0, 0, 255, 255)
      bgraData[0] = 255;
      bgraData[1] = 0;
      bgraData[2] = 0;
      bgraData[3] = 255;
      // Pixel 2: BGRA (0, 255, 0, 128) -> should become RGBA (0, 255, 0, 128)
      bgraData[4] = 0;
      bgraData[5] = 255;
      bgraData[6] = 0;
      bgraData[7] = 128;
      // Pixel 3: BGRA (0, 0, 255, 64) -> should become RGBA (255, 0, 0, 64)
      bgraData[8] = 0;
      bgraData[9] = 0;
      bgraData[10] = 255;
      bgraData[11] = 64;
      // Pixel 4: BGRA (128, 128, 128, 255) -> should become RGBA (128, 128, 128, 255)
      bgraData[12] = 128;
      bgraData[13] = 128;
      bgraData[14] = 128;
      bgraData[15] = 255;

      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => retainCount--;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        width,
        height,
        100,
        100,
        ProgressiveRenderStatus.Done,
      );

      const result = context.getResult();

      expect(result).toBeDefined();
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.originalWidth).toBe(100);
      expect(result.originalHeight).toBe(100);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(bufferSize);

      // Verify BGRA -> RGBA conversion
      expect(result.data[0]).toBe(0); // R (was B)
      expect(result.data[1]).toBe(0); // G
      expect(result.data[2]).toBe(255); // B (was R)
      expect(result.data[3]).toBe(255); // A

      context.dispose();
    });
  });

  describe('disposal', () => {
    it('should clean up resources on dispose', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      let releaseCount = 0;
      const retain = () => retainCount++;
      const release = () => releaseCount++;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.ToBeContinued,
      );

      expect(retainCount).toBe(1);
      expect(releaseCount).toBe(0);

      context.dispose();

      expect(releaseCount).toBe(1);
      expect(mockModule._FPDF_RenderPage_Close).toHaveBeenCalledWith(pageHandle);
      expect(context.disposed).toBe(true);
    });

    it('should not call _FPDF_RenderPage_Close if it is not a function', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      const bitmapHandleValue = asHandle(400);

      let retainCount = 0;
      const retain = () => retainCount++;
      const release = () => {};

      // Remove the function
      // @ts-expect-error - Intentionally removing the function
      mockModule._FPDF_RenderPage_Close = undefined;

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.ToBeContinued,
      );

      // Should not throw even though the function is missing
      expect(() => context.dispose()).not.toThrow();
      expect(context.disposed).toBe(true);
    });

    it('should not destroy bitmap when handle is NULL_BITMAP', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const pageHandle = asHandle(200);

      const bufferAllocation = memory.alloc(1024);
      // Use createProgressiveRenderContext which creates the NativeHandle with cleanup logic
      const bitmapHandleValue = NULL_BITMAP as number;

      const retain = () => {};
      const release = () => {};

      const context = createProgressiveRenderContext(
        // @ts-expect-error - Mock module type mismatch
        mockModule,
        memory,
        pageHandle,
        bufferAllocation,
        bitmapHandleValue,
        retain,
        release,
        100,
        100,
        100,
        100,
        ProgressiveRenderStatus.Done,
      );

      context.dispose();

      // Should not call _FPDFBitmap_Destroy for NULL_BITMAP
      // because the cleanup callback checks if h !== NULL_BITMAP
      expect(mockModule._FPDFBitmap_Destroy).not.toHaveBeenCalled();
    });
  });
});
