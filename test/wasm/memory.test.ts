/**
 * Unit tests for WASMMemoryManager.
 */

import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PDFium } from '../../src/pdfium.js';
import type { WASMMemoryManager } from '../../src/wasm/memory.js';
import { asPointer, NULL_PTR } from '../../src/wasm/memory.js';

/**
 * Load the WASM binary for testing.
 */
async function loadWasmBinary(): Promise<ArrayBuffer> {
  const buffer = await readFile('src/vendor/pdfium.wasm');
  return buffer.buffer as ArrayBuffer;
}

describe('WASMMemoryManager', () => {
  let pdfium: PDFium;
  let memory: WASMMemoryManager;

  beforeAll(async () => {
    const wasmBinary = await loadWasmBinary();
    pdfium = await PDFium.init({ wasmBinary });
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
});
