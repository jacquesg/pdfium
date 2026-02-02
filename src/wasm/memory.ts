/**
 * WASM memory management utilities.
 *
 * Provides type-safe memory allocation and deallocation for WASM operations.
 *
 * @module wasm/memory
 */

import { MemoryError, PDFiumErrorCode } from '../core/errors.js';
import type { WASMPointer } from '../internal/handles.js';
import { WASMAllocation } from './allocation.js';
import type { PDFiumWASM } from './bindings/index.js';

/** Module-level text encoder/decoder instances. */
export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder('utf-8');
export const utf16leDecoder = new TextDecoder('utf-16le');
export const asciiDecoder = new TextDecoder('ascii');

/**
 * Creates a branded WASM pointer from a number.
 *
 * @param value - The raw numeric pointer value.
 * @returns A branded {@link WASMPointer}.
 */
export function asPointer(value: number): WASMPointer {
  return value as WASMPointer;
}

/**
 * Offset a WASM pointer by a number of bytes, returning a branded pointer.
 *
 * Replaces unsafe `(ptr + N) as WASMPointer` casts.
 *
 * @param base - The base pointer to offset from.
 * @param offset - Number of bytes to add to the base pointer.
 * @returns A new branded {@link WASMPointer} at `base + offset`.
 */
export function ptrOffset(base: WASMPointer, offset: number): WASMPointer {
  return (base + offset) as WASMPointer;
}

/**
 * Encode a JavaScript string as UTF-16LE with a null terminator.
 *
 * PDFium uses UTF-16LE for text operations. This utility provides
 * a single shared implementation used by both page and builder code.
 */
export function encodeUTF16LE(str: string): Uint8Array {
  const result = new Uint8Array((str.length + 1) * 2);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    result[i * 2] = code & 0xff;
    result[i * 2 + 1] = (code >> 8) & 0xff;
  }
  // Null terminator (already zeroed by Uint8Array constructor)
  return result;
}

/**
 * Creates a branded handle from a number.
 *
 * @internal
 */
export function asHandle<T extends number & { readonly __brand: string }>(value: number): T {
  return value as T;
}

/**
 * NULL pointer constant.
 */
export const NULL_PTR = asPointer(0);

/**
 * WASM memory allocation wrapper with automatic cleanup tracking.
 *
 * All WASM memory allocations should go through this class to ensure:
 * 1. Type-safe pointer handling (branded number type)
 * 2. Automatic deallocation on dispose
 * 3. Leak detection in development mode
 */
export class WASMMemoryManager {
  readonly #module: PDFiumWASM;
  readonly #allocations = new Set<WASMPointer>();

  constructor(module: PDFiumWASM) {
    this.#module = module;
  }

  /**
   * Allocate a block of memory in the WASM heap.
   *
   * @param size - Number of bytes to allocate
   * @returns The allocated pointer
   * @throws {MemoryError} If allocation fails
   */
  malloc(size: number): WASMPointer {
    if (size <= 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED, `Invalid allocation size: ${size}`, {
        requestedSize: size,
      });
    }

    const ptr = asPointer(this.#module._malloc(size));
    if (ptr === NULL_PTR) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED, `Failed to allocate ${size} bytes in WASM heap`, {
        requestedSize: size,
      });
    }
    this.#allocations.add(ptr);
    return ptr;
  }

  /**
   * Free a previously allocated block.
   *
   * This method is defensive: freeing NULL_PTR is a no-op, and freeing an
   * untracked pointer logs a warning in development mode but does not throw.
   * This avoids double-free crashes in safety-net finaliser paths.
   *
   * @param ptr - Pointer to free
   */
  free(ptr: WASMPointer): void {
    if (ptr === NULL_PTR) {
      return;
    }
    if (!this.#allocations.has(ptr)) {
      console.warn('[PDFium] Attempted to free untracked pointer:', ptr);
      return;
    }
    this.#module._free(ptr);
    this.#allocations.delete(ptr);
  }

  /**
   * Copy JavaScript Uint8Array to WASM memory.
   *
   * @param data - Data to copy
   * @returns The allocated pointer
   * @throws {MemoryError} If allocation fails
   */
  copyToWASM(data: Uint8Array): WASMPointer {
    const ptr = this.malloc(data.length);
    this.#module.HEAPU8.set(data, ptr);
    return ptr;
  }

  /**
   * Copy ArrayBuffer to WASM memory.
   *
   * If the buffer is backed by a `SharedArrayBuffer`, it is defensively
   * copied first to avoid race conditions from concurrent mutation.
   *
   * @param buffer - Buffer to copy
   * @returns The allocated pointer
   * @throws {MemoryError} If allocation fails
   */
  copyBufferToWASM(buffer: ArrayBuffer): WASMPointer {
    const view = new Uint8Array(buffer);
    // Defensively copy SharedArrayBuffer-backed data to avoid races
    const data = buffer instanceof SharedArrayBuffer ? view.slice() : view;
    return this.copyToWASM(data);
  }

  /**
   * Read bytes from WASM memory to JavaScript.
   *
   * @param ptr - Pointer to read from
   * @param length - Number of bytes to read
   * @returns Copy of the data
   */
  copyFromWASM(ptr: WASMPointer, length: number): Uint8Array {
    if (length <= 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_BUFFER_OVERFLOW, `Invalid read length: ${length}`, {
        length,
      });
    }
    if (ptr + length > this.#module.HEAPU8.length) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_BUFFER_OVERFLOW, 'Read exceeds WASM heap bounds', {
        ptr,
        length,
        heapSize: this.#module.HEAPU8.length,
      });
    }
    return this.#module.HEAPU8.slice(ptr, ptr + length);
  }

  /**
   * Read a 32-bit integer from WASM memory.
   *
   * @param ptr - Pointer to read from (must be 4-byte aligned)
   * @returns The integer value
   */
  readInt32(ptr: WASMPointer): number {
    if ((ptr & 3) !== 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_INVALID_POINTER, `Misaligned pointer for 32-bit read: ${ptr}`, {
        ptr,
        alignment: ptr & 3,
      });
    }
    // HEAP32 is indexed by 32-bit words, not bytes
    const index = ptr >> 2;
    const value = this.#module.HEAP32[index];
    if (value === undefined) {
      if (__DEV__) {
        console.warn(`[PDFium] readInt32: out-of-bounds read at pointer ${ptr} (HEAP32 index ${index})`);
      }
      return 0;
    }
    return value;
  }

  /**
   * Write a 32-bit integer to WASM memory.
   *
   * @param ptr - Pointer to write to (must be 4-byte aligned)
   * @param value - Value to write
   */
  writeInt32(ptr: WASMPointer, value: number): void {
    if ((ptr & 3) !== 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_INVALID_POINTER, `Misaligned pointer for 32-bit write: ${ptr}`, {
        ptr,
        alignment: ptr & 3,
      });
    }
    // HEAP32 is indexed by 32-bit words, not bytes
    this.#module.HEAP32[ptr >> 2] = value;
  }

  /**
   * Read an unsigned 32-bit integer from WASM memory.
   *
   * @param ptr - Pointer to read from (must be 4-byte aligned)
   * @returns The unsigned integer value
   */
  readUint32(ptr: WASMPointer): number {
    // Read as signed and convert to unsigned
    const signed = this.readInt32(ptr);
    return signed >>> 0;
  }

  /**
   * Read a 32-bit float from WASM memory.
   *
   * @param ptr - Pointer to read from (must be 4-byte aligned)
   * @returns The float value
   */
  readFloat32(ptr: WASMPointer): number {
    if ((ptr & 3) !== 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_INVALID_POINTER, `Misaligned pointer for float read: ${ptr}`, {
        ptr,
        alignment: ptr & 3,
      });
    }
    // Create a DataView to read the float
    const buffer = this.#module.HEAPU8.buffer;
    const view = new DataView(buffer, ptr, 4);
    return view.getFloat32(0, true); // little-endian
  }

  /**
   * Read a null-terminated UTF-8 string from WASM memory.
   *
   * @param ptr - Pointer to the string buffer
   * @param maxLength - Maximum number of bytes to read (excluding null terminator)
   * @returns The decoded string
   */
  readUtf8String(ptr: WASMPointer, maxLength: number): string {
    if (maxLength <= 0) {
      return '';
    }
    const bytes = this.#module.HEAPU8.subarray(ptr, ptr + maxLength);
    return textDecoder.decode(bytes);
  }

  /**
   * Copy a null-terminated UTF-8 string to WASM memory.
   *
   * @param str - String to copy
   * @returns The allocated pointer
   * @throws {MemoryError} If allocation fails
   */
  copyStringToWASM(str: string): WASMPointer {
    const encoded = textEncoder.encode(str);
    const ptr = this.malloc(encoded.length + 1); // +1 for null terminator
    this.#module.HEAPU8.set(encoded, ptr);
    this.#module.HEAPU8[ptr + encoded.length] = 0; // null terminator
    return ptr;
  }

  /**
   * Read UTF-16LE text from WASM memory.
   *
   * PDFium returns text in UTF-16LE format. Surrogate pairs (characters
   * outside the BMP) are handled correctly by the underlying TextDecoder.
   *
   * @param ptr - Pointer to the text buffer
   * @param charCount - Number of characters (not bytes)
   * @returns The decoded string
   */
  readUTF16LE(ptr: WASMPointer, charCount: number): string {
    if (charCount < 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_BUFFER_OVERFLOW, `Invalid character count: ${charCount}`, {
        charCount,
      });
    }
    if (charCount === 0) {
      return '';
    }
    const byteLength = charCount * 2; // UTF-16 is 2 bytes per character
    if (ptr + byteLength > this.#module.HEAPU8.length) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_BUFFER_OVERFLOW, 'UTF-16LE read exceeds WASM heap bounds', {
        ptr,
        charCount,
        byteLength,
        heapSize: this.#module.HEAPU8.length,
      });
    }
    const bytes = this.#module.HEAPU8.subarray(ptr, ptr + byteLength);
    return utf16leDecoder.decode(bytes);
  }

  /**
   * Get the HEAPU8 view for direct access.
   */
  get heapU8(): Uint8Array {
    return this.#module.HEAPU8;
  }

  /**
   * Free all tracked allocations.
   *
   * Called during disposal to ensure no memory leaks.
   */
  freeAll(): void {
    for (const ptr of this.#allocations) {
      this.#module._free(ptr);
    }
    this.#allocations.clear();
  }

  /**
   * Allocate a block and return an RAII wrapper.
   *
   * The returned `WASMAllocation` is disposable via the `using` keyword.
   *
   * @param size - Number of bytes to allocate
   * @returns A disposable allocation wrapper
   * @throws {MemoryError} If allocation fails
   */
  alloc(size: number): WASMAllocation {
    return new WASMAllocation(this.malloc(size), this);
  }

  /**
   * Copy a Uint8Array to WASM memory and return an RAII wrapper.
   *
   * @param data - Data to copy
   * @returns A disposable allocation wrapper
   * @throws {MemoryError} If allocation fails
   */
  allocFrom(data: Uint8Array): WASMAllocation {
    return new WASMAllocation(this.copyToWASM(data), this);
  }

  /**
   * Copy a null-terminated UTF-8 string to WASM memory and return an RAII wrapper.
   *
   * @param str - String to copy
   * @returns A disposable allocation wrapper
   * @throws {MemoryError} If allocation fails
   */
  allocString(str: string): WASMAllocation {
    return new WASMAllocation(this.copyStringToWASM(str), this);
  }

  /**
   * Copy an ArrayBuffer to WASM memory and return an RAII wrapper.
   *
   * @param buffer - Buffer to copy
   * @returns A disposable allocation wrapper
   * @throws {MemoryError} If allocation fails
   */
  allocBuffer(buffer: ArrayBuffer): WASMAllocation {
    return new WASMAllocation(this.copyBufferToWASM(buffer), this);
  }

  /**
   * Get the number of active allocations.
   *
   * Useful for debugging memory leaks.
   */
  get activeAllocations(): number {
    return this.#allocations.size;
  }
}
