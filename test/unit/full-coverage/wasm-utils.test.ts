import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WASMMemoryManager } from '../../../src/wasm/memory.js';
import {
  getWasmBytes,
  getWasmInt32Array,
  getWasmRect,
  getWasmStringUTF8,
  getWasmStringUTF16LE,
} from '../../../src/wasm/utils.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('WASM Utils', () => {
  let mockModule: ReturnType<typeof createMockWasmModule>;
  let memory: WASMMemoryManager;

  beforeEach(() => {
    mockModule = createMockWasmModule();
    // @ts-expect-error - Mock module is incomplete but sufficient for tests
    memory = new WASMMemoryManager(mockModule);
  });

  describe('getWasmStringUTF16LE', () => {
    it('should return undefined if getter is undefined', () => {
      expect(getWasmStringUTF16LE(memory, undefined)).toBeUndefined();
    });

    it('should return undefined if size is 0 or too small', () => {
      const getter = vi.fn().mockReturnValue(0);
      expect(getWasmStringUTF16LE(memory, getter)).toBeUndefined();

      getter.mockReturnValue(2); // Just null terminator
      expect(getWasmStringUTF16LE(memory, getter)).toBeUndefined();
    });

    it('should return undefined if second call fails (returns 0)', () => {
      // First call returns valid size (e.g. 4 bytes = 1 char + null)
      // Second call returns 0
      const getter = vi.fn().mockReturnValueOnce(4).mockReturnValueOnce(0);

      expect(getWasmStringUTF16LE(memory, getter)).toBeUndefined();
    });

    it('should return undefined if second call returns too small size', () => {
      const getter = vi.fn().mockReturnValueOnce(4).mockReturnValueOnce(2); // Only null terminator written

      expect(getWasmStringUTF16LE(memory, getter)).toBeUndefined();
    });

    it('should return correct string', () => {
      const getter = vi
        .fn()
        .mockReturnValueOnce(6) // 'A' + null = 2 chars * 2 = 4 bytes. Wait.
        // "A" is 0x0041. UTF16LE: 41 00. Null: 00 00. Total 4 bytes.
        // If I want "AB", it's 6 bytes.
        .mockImplementation((ptr, _len) => {
          if (ptr > 0) {
            // Write "AB\0" -> 41 00 42 00 00 00
            memory.heapU8.set([0x41, 0x00, 0x42, 0x00, 0x00, 0x00], ptr);
            return 6;
          }
          return 6;
        });

      expect(getWasmStringUTF16LE(memory, getter)).toBe('AB');
    });
  });

  describe('getWasmStringUTF8', () => {
    it('should return undefined if getter is undefined', () => {
      expect(getWasmStringUTF8(memory, undefined)).toBeUndefined();
    });

    it('should return undefined if size is <= 0', () => {
      const getter = vi.fn().mockReturnValue(0);
      expect(getWasmStringUTF8(memory, getter)).toBeUndefined();
    });

    it('should return undefined if second call fails', () => {
      const getter = vi.fn().mockReturnValueOnce(5).mockReturnValueOnce(0);
      expect(getWasmStringUTF8(memory, getter)).toBeUndefined();
    });

    it('should return correct string', () => {
      const getter = vi
        .fn()
        .mockReturnValueOnce(4) // "ABC\0"
        .mockImplementation((ptr, _len) => {
          if (ptr > 0) {
            memory.heapU8.set([0x41, 0x42, 0x43, 0x00], ptr);
            return 4;
          }
          return 4;
        });

      expect(getWasmStringUTF8(memory, getter)).toBe('ABC');
    });
  });

  describe('getWasmRect', () => {
    it('should return undefined if getter is undefined', () => {
      // @ts-expect-error - Testing undefined input
      expect(getWasmRect(memory, undefined)).toBeUndefined();
    });

    it('should return undefined if getter returns false', () => {
      const getter = vi.fn().mockReturnValue(0);
      expect(getWasmRect(memory, getter)).toBeUndefined();
    });

    it('should return rect', () => {
      const getter = vi.fn().mockImplementation((ptr) => {
        // Write float values: 10, 20, 30, 40
        // Little endian
        const view = new DataView(memory.heapU8.buffer, ptr, 16);
        view.setFloat32(0, 10, true);
        view.setFloat32(4, 20, true);
        view.setFloat32(8, 30, true);
        view.setFloat32(12, 40, true);
        return 1;
      });

      expect(getWasmRect(memory, getter)).toEqual({
        left: 10,
        top: 20,
        right: 30,
        bottom: 40,
      });
    });
  });

  describe('getWasmBytes', () => {
    it('should return undefined if getter is undefined', () => {
      expect(getWasmBytes(memory, undefined)).toBeUndefined();
    });

    it('should return undefined if size is <= 0', () => {
      const getter = vi.fn().mockReturnValue(0);
      expect(getWasmBytes(memory, getter)).toBeUndefined();
    });

    it('should return undefined if second call fails', () => {
      const getter = vi.fn().mockReturnValueOnce(5).mockReturnValueOnce(0);
      expect(getWasmBytes(memory, getter)).toBeUndefined();
    });

    it('should return correct bytes', () => {
      const getter = vi
        .fn()
        .mockReturnValueOnce(3)
        .mockImplementation((ptr, _len) => {
          if (ptr > 0) {
            memory.heapU8.set([1, 2, 3], ptr);
            return 3;
          }
          return 3;
        });

      const result = getWasmBytes(memory, getter);
      expect(result).toBeDefined();
      expect(Array.from(result!)).toEqual([1, 2, 3]);
    });
  });

  describe('getWasmInt32Array', () => {
    it('should return undefined if getter is undefined', () => {
      expect(getWasmInt32Array(memory, undefined)).toBeUndefined();
    });

    it('should return undefined if count is <= 0', () => {
      const getter = vi.fn().mockReturnValue(0);
      expect(getWasmInt32Array(memory, getter)).toBeUndefined();
    });

    it('should return undefined if second call fails', () => {
      const getter = vi.fn().mockReturnValueOnce(5).mockReturnValueOnce(0);
      expect(getWasmInt32Array(memory, getter)).toBeUndefined();
    });

    it('should return correct int array', () => {
      const getter = vi
        .fn()
        .mockReturnValueOnce(2) // 2 ints
        .mockImplementation((ptr, count) => {
          if (ptr > 0) {
            const view = new Int32Array(memory.heapU8.buffer, ptr, count);
            view[0] = 100;
            view[1] = 200;
            return 2;
          }
          return 2;
        });

      expect(getWasmInt32Array(memory, getter)).toEqual([100, 200]);
    });
  });
});
