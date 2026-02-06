import { beforeEach, describe, expect, it } from 'vitest';
import { WASMMemoryManager } from '../../../src/wasm/memory.js';
import { FSMatrix, FSPointF, FSQuadPointsF, FSRectF } from '../../../src/wasm/structs.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('WASM Structs', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;
  let memory: WASMMemoryManager;

  beforeEach(() => {
    mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    memory = new WASMMemoryManager(mockModule);
  });

  describe('FSRectF', () => {
    it('should read/write values correctly', () => {
      using rect = new FSRectF(memory);

      rect.left = 10;
      rect.top = 20;
      rect.right = 30;
      rect.bottom = 40;

      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.right).toBe(30);
      expect(rect.bottom).toBe(40);

      // Verify memory layout (4 floats = 16 bytes)
      const view = new Float32Array(memory.heapU8.buffer, rect.ptr, 4);
      expect(view[0]).toBe(10); // left
      expect(view[1]).toBe(20); // top
      expect(view[2]).toBe(30); // right
      expect(view[3]).toBe(40); // bottom
    });
  });

  describe('FSMatrix', () => {
    it('should read/write values correctly', () => {
      using matrix = new FSMatrix(memory);

      matrix.a = 1;
      matrix.b = 2;
      matrix.c = 3;
      matrix.d = 4;
      matrix.e = 5;
      matrix.f = 6;

      expect(matrix.a).toBe(1);
      expect(matrix.b).toBe(2);
      expect(matrix.c).toBe(3);
      expect(matrix.d).toBe(4);
      expect(matrix.e).toBe(5);
      expect(matrix.f).toBe(6);

      const view = new Float32Array(memory.heapU8.buffer, matrix.ptr, 6);
      expect(view[0]).toBe(1);
      expect(view[5]).toBe(6);
    });
  });

  describe('FSPointF', () => {
    it('should read/write values correctly', () => {
      using point = new FSPointF(memory);

      point.x = 100.5;
      point.y = 200.5;

      expect(point.x).toBe(100.5);
      expect(point.y).toBe(200.5);

      const view = new Float32Array(memory.heapU8.buffer, point.ptr, 2);
      expect(view[0]).toBe(100.5);
      expect(view[1]).toBe(200.5);
    });
  });

  describe('FSQuadPointsF', () => {
    it('should read values correctly', () => {
      using quad = new FSQuadPointsF(memory);
      const view = new Float32Array(memory.heapU8.buffer, quad.ptr, 8);
      view[0] = 1;
      view[1] = 2;
      view[2] = 3;
      view[3] = 4;
      view[4] = 5;
      view[5] = 6;
      view[6] = 7;
      view[7] = 8;

      expect(quad.x1).toBe(1);
      expect(quad.y1).toBe(2);
      expect(quad.x2).toBe(3);
      expect(quad.y2).toBe(4);
      expect(quad.x3).toBe(5);
      expect(quad.y3).toBe(6);
      expect(quad.x4).toBe(7);
      expect(quad.y4).toBe(8);
    });
  });
});
