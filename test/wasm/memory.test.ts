/**
 * Unit tests for WASMMemoryManager.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { MemoryError } from '../../src/core/errors.js';
import { PDFium } from '../../src/pdfium.js';
import type { WASMMemoryManager } from '../../src/wasm/memory.js';
import { asPointer, NULL_PTR } from '../../src/wasm/memory.js';
import { initPdfium } from '../helpers.js';

describe('WASMMemoryManager', () => {
  let pdfium: PDFium;
  let memory: WASMMemoryManager;

  beforeAll(async () => {
    pdfium = await initPdfium();
    memory = pdfium.memory;
  });

  afterAll(() => {
    pdfium?.dispose();
  });

  describe('asPointer', () => {
    test('should create a branded pointer from a number', () => {
      const ptr = asPointer(1234);
      expect(ptr).toBe(1234);
    });
  });

  describe('NULL_PTR', () => {
    test('should be zero', () => {
      expect(NULL_PTR).toBe(0);
    });
  });

  describe('malloc and free', () => {
    test('should allocate and free memory', () => {
      const ptr = memory.malloc(100);
      expect(ptr).not.toBe(0);

      // Free should not throw
      expect(() => memory.free(ptr)).not.toThrow();
    });

    test('should track allocations', () => {
      const initialCount = memory.activeAllocations;

      const ptr = memory.malloc(50);
      expect(memory.activeAllocations).toBe(initialCount + 1);
      memory.free(ptr);
      expect(memory.activeAllocations).toBe(initialCount);
    });

    test('should ignore free of NULL_PTR', () => {
      // Should not throw
      expect(() => memory.free(NULL_PTR)).not.toThrow();
    });
  });

  describe('copyToWASM and copyFromWASM', () => {
    test('should copy data to and from WASM memory', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const ptr = memory.copyToWASM(data);
      const copied = memory.copyFromWASM(ptr, data.length);

      expect(copied).toEqual(data);
      memory.free(ptr);
    });
  });

  describe('copyBufferToWASM', () => {
    test('should copy ArrayBuffer to WASM memory', () => {
      const buffer = new ArrayBuffer(10);
      const view = new Uint8Array(buffer);
      view.set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

      const ptr = memory.copyBufferToWASM(buffer);
      const copied = memory.copyFromWASM(ptr, 10);

      expect(copied).toEqual(view);
      memory.free(ptr);
    });
  });

  describe('readInt32 and writeInt32', () => {
    test('should read and write 32-bit integers', () => {
      const ptr = memory.malloc(4);

      memory.writeInt32(ptr, 0x12345678);
      const value = memory.readInt32(ptr);

      expect(value).toBe(0x12345678);
      memory.free(ptr);
    });

    test('should handle negative integers', () => {
      const ptr = memory.malloc(4);

      memory.writeInt32(ptr, -1);
      const value = memory.readInt32(ptr);

      expect(value).toBe(-1);
      memory.free(ptr);
    });
  });

  describe('copyStringToWASM', () => {
    test('should copy null-terminated string to WASM', () => {
      const ptr = memory.copyStringToWASM('hello');
      // Read back including null terminator
      const bytes = memory.copyFromWASM(ptr, 6);

      expect(bytes[0]).toBe(104); // 'h'
      expect(bytes[1]).toBe(101); // 'e'
      expect(bytes[2]).toBe(108); // 'l'
      expect(bytes[3]).toBe(108); // 'l'
      expect(bytes[4]).toBe(111); // 'o'
      expect(bytes[5]).toBe(0); // null terminator

      memory.free(ptr);
    });
  });

  describe('readUTF16LE', () => {
    test('should read UTF-16LE encoded text', () => {
      // "Hi" in UTF-16LE is: 0x48 0x00 0x69 0x00
      const data = new Uint8Array([0x48, 0x00, 0x69, 0x00]);
      const ptr = memory.copyToWASM(data);
      const text = memory.readUTF16LE(ptr, 2);

      expect(text).toBe('Hi');
      memory.free(ptr);
    });
  });

  describe('heapU8', () => {
    test('should return the HEAPU8 view', () => {
      const heap = memory.heapU8;
      expect(heap).toBeInstanceOf(Uint8Array);
      expect(heap.length).toBeGreaterThan(0);
    });
  });

  describe('activeAllocations', () => {
    test('should return current allocation count', () => {
      const count = memory.activeAllocations;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('alloc', () => {
    test('should return a disposable allocation with correct pointer', () => {
      using allocation = memory.alloc(16);
      expect(allocation.ptr).not.toBe(0);
    });

    test('should free memory on dispose', () => {
      const before = memory.activeAllocations;
      const allocation = memory.alloc(16);
      expect(memory.activeAllocations).toBe(before + 1);
      allocation[Symbol.dispose]();
      expect(memory.activeAllocations).toBe(before);
    });
  });

  describe('allocFrom', () => {
    test('should copy data and return disposable allocation', () => {
      const data = new Uint8Array([10, 20, 30]);
      using allocation = memory.allocFrom(data);
      const result = memory.copyFromWASM(allocation.ptr, 3);
      expect(result).toEqual(data);
    });
  });

  describe('allocString', () => {
    test('should copy string and return disposable allocation', () => {
      using allocation = memory.allocString('test');
      const bytes = memory.copyFromWASM(allocation.ptr, 5);
      expect(bytes[0]).toBe(116); // 't'
      expect(bytes[4]).toBe(0);   // null terminator
    });
  });

  describe('allocBuffer', () => {
    test('should copy ArrayBuffer and return disposable allocation', () => {
      const buf = new ArrayBuffer(3);
      new Uint8Array(buf).set([7, 8, 9]);
      using allocation = memory.allocBuffer(buf);
      const result = memory.copyFromWASM(allocation.ptr, 3);
      expect(result).toEqual(new Uint8Array([7, 8, 9]));
    });
  });

  describe('freeAll', () => {
    test('should free all tracked allocations', async () => {
      const localPdfium = await initPdfium();
      const localMemory = localPdfium.memory;
      localMemory.malloc(10);
      localMemory.malloc(20);
      expect(localMemory.activeAllocations).toBeGreaterThanOrEqual(2);
      localMemory.freeAll();
      expect(localMemory.activeAllocations).toBe(0);
      localPdfium.dispose();
    });
  });

  describe('copyStringToWASM', () => {
    test('should handle empty string', () => {
      const ptr = memory.copyStringToWASM('');
      const bytes = memory.copyFromWASM(ptr, 1);
      expect(bytes[0]).toBe(0); // just null terminator
      memory.free(ptr);
    });
  });

  describe('bounds checking', () => {
    test('malloc throws for size <= 0', () => {
      expect(() => memory.malloc(0)).toThrow(MemoryError);
      expect(() => memory.malloc(-1)).toThrow(MemoryError);
    });

    test('copyFromWASM throws for length <= 0', () => {
      const ptr = memory.malloc(4);
      expect(() => memory.copyFromWASM(ptr, 0)).toThrow(MemoryError);
      expect(() => memory.copyFromWASM(ptr, -1)).toThrow(MemoryError);
      memory.free(ptr);
    });

    test('copyFromWASM throws for out-of-bounds read', () => {
      const ptr = memory.malloc(4);
      const heapSize = memory.heapU8.length;
      expect(() => memory.copyFromWASM(asPointer(heapSize - 2), 4)).toThrow(MemoryError);
      memory.free(ptr);
    });

    test('readInt32 throws for misaligned pointer', () => {
      expect(() => memory.readInt32(asPointer(1))).toThrow(MemoryError);
      expect(() => memory.readInt32(asPointer(3))).toThrow(MemoryError);
    });

    test('writeInt32 throws for misaligned pointer', () => {
      expect(() => memory.writeInt32(asPointer(1), 42)).toThrow(MemoryError);
      expect(() => memory.writeInt32(asPointer(3), 42)).toThrow(MemoryError);
    });

    test('readUTF16LE throws for negative charCount', () => {
      const ptr = memory.malloc(4);
      expect(() => memory.readUTF16LE(ptr, -1)).toThrow(MemoryError);
      memory.free(ptr);
    });

    test('readUTF16LE returns empty string for zero charCount', () => {
      const ptr = memory.malloc(4);
      expect(memory.readUTF16LE(ptr, 0)).toBe('');
      memory.free(ptr);
    });

    test('readUTF16LE throws for out-of-bounds read', () => {
      const heapSize = memory.heapU8.length;
      expect(() => memory.readUTF16LE(asPointer(heapSize - 2), 4)).toThrow(MemoryError);
    });

    test('readInt32 and writeInt32 work with aligned pointers', () => {
      const ptr = memory.malloc(4);
      memory.writeInt32(ptr, 0xdeadbeef);
      // readInt32 returns signed value; 0xDEADBEEF as signed 32-bit = -559038737
      expect(memory.readInt32(ptr)).toBe(-559038737);
      memory.free(ptr);
    });
  });
});
