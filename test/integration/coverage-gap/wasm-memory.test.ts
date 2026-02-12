import { MemoryError } from '../../../src/core/errors.js';
import { INTERNAL } from '../../../src/internal/symbols.js';
import { asPointer } from '../../../src/wasm/memory.js';
import { describe, expect, test } from '../../utils/fixtures.js';

describe('WASM Memory Manager Coverage', () => {
  test('should throw when allocating non-positive bytes', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    expect(() => memory.malloc(0)).toThrow(MemoryError);
    expect(() => memory.malloc(-1)).toThrow(MemoryError);
  });

  test('should throw when reading from misaligned 32-bit pointer', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    using alloc = memory.alloc(8);
    const misaligned = asPointer(alloc.ptr + 1);

    expect(() => memory.readInt32(misaligned)).toThrow(MemoryError);
    expect(() => memory.writeInt32(misaligned, 1)).toThrow(MemoryError);
    expect(() => memory.readFloat32(misaligned)).toThrow(MemoryError);
    expect(() => memory.writeFloat32(misaligned, 1.0)).toThrow(MemoryError);
  });

  test('should throw when reading from misaligned 64-bit pointer', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    using alloc = memory.alloc(16);
    const misaligned = asPointer(alloc.ptr + 1);

    expect(() => memory.readFloat64(misaligned)).toThrow(MemoryError);
    expect(() => memory.writeFloat64(misaligned, 1.0)).toThrow(MemoryError);
  });

  test('should throw when reading out of bounds', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    using alloc = memory.alloc(4);
    // Huge length
    expect(() => memory.copyFromWASM(alloc.ptr, 2 * 1024 * 1024 * 1024)).toThrow(MemoryError);

    // Negative length
    expect(() => memory.copyFromWASM(alloc.ptr, -1)).toThrow(MemoryError);
  });

  test('should throw when reading UTF16 out of bounds or invalid count', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    using alloc = memory.alloc(4);

    expect(() => memory.readUTF16LE(alloc.ptr, -1)).toThrow(MemoryError);
    expect(() => memory.readUTF16LE(alloc.ptr, 1024 * 1024 * 1024)).toThrow(MemoryError);
  });

  test('should support secure string allocation', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    const str = 'SecretPassword';

    // Allocate secure
    {
      using alloc = memory.allocString(str, true);

      // Verify content
      const readBack = memory.readUtf8String(alloc.ptr, str.length);
      expect(readBack).toBe(str);
    } // Disposed here
  });

  test('should handle readUtf8String with zero or negative length', async ({ pdfium }) => {
    const memory = pdfium[INTERNAL].memory;
    using alloc = memory.alloc(4);
    expect(memory.readUtf8String(alloc.ptr, 0)).toBe('');
    expect(memory.readUtf8String(alloc.ptr, -5)).toBe('');
  });
});
