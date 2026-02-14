import { describe, expect, it, type vi } from 'vitest';
import * as objects from '../../../src/document/page_impl/objects.js';
import { asHandle, WASMMemoryManager } from '../../../src/wasm/memory.js';
import { createMockWasmModule } from '../../utils/mock-wasm.js';

describe('Objects implementation - Mark getters (failure paths)', () => {
  describe('pageObjMarkGetName', () => {
    it('should return undefined when first call returns 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // Mock first call to return 0 (no name)
      mockModule._FPDFPageObjMark_GetName.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetName(mockModule, memory, mark);

      expect(result).toBeUndefined();
    });

    it('should return undefined when size <= 2 (UTF16LE_NULL_TERMINATOR_BYTES)', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetName.mockImplementation((_mark, _bufferPtr, _size, outLenPtr) => {
        callCount++;
        if (callCount === 1) {
          // First call: return size of 2 (just null terminator)
          const heap = new Uint32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
          heap[0] = 2;
          return 1;
        }
        return 0;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetName(mockModule, memory, mark);

      expect(result).toBeUndefined();
    });

    it('should return undefined when size is exactly UTF16LE_NULL_TERMINATOR_BYTES', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetName.mockImplementation((_mark, _bufferPtr, _size, outLenPtr) => {
        callCount++;
        if (callCount === 1) {
          // First call: return exactly 2 bytes
          const heap = new Uint32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
          heap[0] = 2;
          return 1;
        }
        return 0;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetName(mockModule, memory, mark);

      expect(result).toBeUndefined();
    });

    it('should return name when size > UTF16LE_NULL_TERMINATOR_BYTES', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetName.mockImplementation((_mark, bufferPtr, _size, outLenPtr) => {
        callCount++;
        if (callCount === 1) {
          // First call: return size (4 chars * 2 bytes + 2 null = 10 bytes)
          const heap = new Uint32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
          heap[0] = 10;
          return 1;
        }
        // Second call: write the name
        const view = new Uint16Array(mockModule.HEAPU8.buffer, bufferPtr, 5);
        view[0] = 0x004d; // 'M'
        view[1] = 0x0061; // 'a'
        view[2] = 0x0072; // 'r'
        view[3] = 0x006b; // 'k'
        view[4] = 0x0000; // null
        return 1;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetName(mockModule, memory, mark);

      expect(result).toBe('Mark');
      expect(callCount).toBe(2);
    });
  });

  describe('pageObjMarkGetParamKey', () => {
    it('should return undefined when keyLen <= 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetParamKey.mockImplementation((_mark, _index, _buf, _size, outLenPtr) => {
        // Write -1 to indicate failure
        const heap = new Int32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
        heap[0] = -1;
        return 0;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamKey(mockModule, memory, mark, 0);

      expect(result).toBeUndefined();
    });

    it('should return undefined when keyLen is 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetParamKey.mockImplementation((_mark, _index, _buf, _size, outLenPtr) => {
        const heap = new Int32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
        heap[0] = 0;
        return 0;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamKey(mockModule, memory, mark, 0);

      expect(result).toBeUndefined();
    });

    it('should return key when keyLen > 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetParamKey.mockImplementation((_mark, _index, bufferPtr, size, outLenPtr) => {
        callCount++;
        if (callCount === 1) {
          // First call: return key length (4 bytes + null = 5)
          const heap = new Int32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
          heap[0] = 5;
          return 0;
        }
        // Second call: write the key (UTF-8)
        const view = new Uint8Array(mockModule.HEAPU8.buffer, bufferPtr, size);
        view[0] = 0x4b; // 'K'
        view[1] = 0x65; // 'e'
        view[2] = 0x79; // 'y'
        view[3] = 0x31; // '1'
        view[4] = 0x00; // null
        return 0;
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamKey(mockModule, memory, mark, 0);

      expect(result).toBe('Key1');
      expect(callCount).toBe(2);
    });
  });

  describe('pageObjMarkGetParamIntValue', () => {
    it('should return undefined when call fails', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // Mock to return false (0)
      mockModule._FPDFPageObjMark_GetParamIntValue.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamIntValue(mockModule, memory, mark, 'myKey');

      expect(result).toBeUndefined();
      expect(mockModule._FPDFPageObjMark_GetParamIntValue).toHaveBeenCalled();
    });

    it('should return int value when call succeeds', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // @ts-expect-error - Mock signature mismatch
      mockModule._FPDFPageObjMark_GetParamIntValue.mockImplementation((_mark, _keyPtr, valPtr) => {
        // Write the int value
        const heap = new Int32Array(mockModule.HEAPU8.buffer, valPtr, 1);
        heap[0] = 42;
        return 1; // success
      });

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamIntValue(mockModule, memory, mark, 'count');

      expect(result).toBe(42);
    });
  });

  describe('pageObjMarkGetParamStringValue', () => {
    it('should return undefined when valLen <= 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // Mock to return 0
      mockModule._FPDFPageObjMark_GetParamStringValue.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamStringValue(mockModule, memory, mark, 'textKey');

      expect(result).toBeUndefined();
    });

    it('should return undefined when valLen is negative', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      mockModule._FPDFPageObjMark_GetParamStringValue.mockReturnValue(-1);

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamStringValue(mockModule, memory, mark, 'badKey');

      expect(result).toBeUndefined();
    });

    it('should return string value when valLen > 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      (mockModule._FPDFPageObjMark_GetParamStringValue as ReturnType<typeof vi.fn>).mockImplementation(
        (_mark: number, _keyPtr: number, bufferPtr: number, size: number, _outLenPtr: number) => {
          callCount++;
          if (callCount === 1) {
            // First call: return size (3 chars * 2 + 2 null = 8 bytes)
            return 8;
          }
          // Second call: write UTF-16LE string
          const view = new Uint16Array(mockModule.HEAPU8.buffer, bufferPtr, size / 2);
          view[0] = 0x0046; // 'F'
          view[1] = 0x006f; // 'o'
          view[2] = 0x006f; // 'o'
          view[3] = 0x0000; // null
          return 8;
        },
      );

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamStringValue(mockModule, memory, mark, 'name');

      expect(result).toBe('Foo');
      expect(callCount).toBe(2);
    });
  });

  describe('pageObjMarkGetParamBlobValue', () => {
    it('should return undefined when size is 0', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      // Mock to return 0 (no data)
      mockModule._FPDFPageObjMark_GetParamBlobValue.mockReturnValue(0);

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamBlobValue(mockModule, memory, mark, 'blobKey');

      expect(result).toBeUndefined();
    });

    it('should return undefined when len <= 0 after reading size', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      (mockModule._FPDFPageObjMark_GetParamBlobValue as ReturnType<typeof vi.fn>).mockImplementation(
        (_mark: number, _keyPtr: number, _bufferPtr: number, _size: number, outLenPtr: number) => {
          callCount++;
          if (callCount === 1) {
            // First call: return non-zero size to proceed
            // But write 0 to outLenPtr
            const heap = new Uint32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
            heap[0] = 0;
            return 1; // non-zero to indicate we should check outLenPtr
          }
          return 0;
        },
      );

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamBlobValue(mockModule, memory, mark, 'data');

      expect(result).toBeUndefined();
    });

    it('should return Uint8Array when blob data exists', () => {
      const mockModule = createMockWasmModule();
      // @ts-expect-error - Mock module type mismatch
      const memory = new WASMMemoryManager(mockModule);
      const mark = asHandle(900);

      let callCount = 0;
      (mockModule._FPDFPageObjMark_GetParamBlobValue as ReturnType<typeof vi.fn>).mockImplementation(
        (_mark: number, _keyPtr: number, bufferPtr: number, size: number, outLenPtr: number) => {
          callCount++;
          if (callCount === 1) {
            // First call: return size and set outLenPtr
            const heap = new Uint32Array(mockModule.HEAPU8.buffer, outLenPtr, 1);
            heap[0] = 4; // 4 bytes
            return 1;
          }
          // Second call: write the blob data
          const view = new Uint8Array(mockModule.HEAPU8.buffer, bufferPtr, size);
          view[0] = 0xde;
          view[1] = 0xad;
          view[2] = 0xbe;
          view[3] = 0xef;
          return 1;
        },
      );

      // @ts-expect-error - Mock module type mismatch
      const result = objects.pageObjMarkGetParamBlobValue(mockModule, memory, mark, 'binary');

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result?.length).toBe(4);
      expect(result?.[0]).toBe(0xde);
      expect(result?.[1]).toBe(0xad);
      expect(result?.[2]).toBe(0xbe);
      expect(result?.[3]).toBe(0xef);
      expect(callCount).toBe(2);
    });
  });
});
