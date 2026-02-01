/**
 * WASM memory management utilities.
 *
 * Provides type-safe memory allocation and deallocation for WASM operations.
 *
 * @module wasm/memory
 */

import { MemoryError, PDFiumErrorCode } from '../core/errors.js';
import type { WASMPointer } from '../core/types.js';
import type { PDFiumWASM } from './bindings.js';

/**
 * Creates a branded WASM pointer from a number.
 */
export function asPointer(value: number): WASMPointer {
  return value as WASMPointer;
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
    const ptr = asPointer(this.#module.wasmExports.malloc(size));
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
   * @param ptr - Pointer to free
   */
  free(ptr: WASMPointer): void {
    if (ptr === NULL_PTR) {
      return;
    }
    if (!this.#allocations.has(ptr)) {
      if (__DEV__) {
        console.warn('[PDFium] Attempted to free untracked pointer:', ptr);
      }
      return;
    }
    this.#module.wasmExports.free(ptr);
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
   * @param buffer - Buffer to copy
   * @returns The allocated pointer
   * @throws {MemoryError} If allocation fails
   */
  copyBufferToWASM(buffer: ArrayBuffer): WASMPointer {
    return this.copyToWASM(new Uint8Array(buffer));
  }

  /**
   * Read bytes from WASM memory to JavaScript.
   *
   * @param ptr - Pointer to read from
   * @param length - Number of bytes to read
   * @returns Copy of the data
   */
  copyFromWASM(ptr: WASMPointer, length: number): Uint8Array {
    return this.#module.HEAPU8.slice(ptr, ptr + length);
  }

  /**
   * Read a 32-bit integer from WASM memory.
   *
   * @param ptr - Pointer to read from (must be 4-byte aligned)
   * @returns The integer value
   */
  readInt32(ptr: WASMPointer): number {
    // HEAP32 is indexed by 32-bit words, not bytes
    const index = ptr >> 2;
    const value = this.#module.HEAP32[index];
    if (value === undefined) {
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
    // HEAP32 is indexed by 32-bit words, not bytes
    this.#module.HEAP32[ptr >> 2] = value;
  }

  /**
   * Copy a null-terminated UTF-8 string to WASM memory.
   *
   * @param str - String to copy
   * @returns The allocated pointer
   * @throws {MemoryError} If allocation fails
   */
  copyStringToWASM(str: string): WASMPointer {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    const ptr = this.malloc(encoded.length + 1); // +1 for null terminator
    this.#module.HEAPU8.set(encoded, ptr);
    this.#module.HEAPU8[ptr + encoded.length] = 0; // null terminator
    return ptr;
  }

  /**
   * Read UTF-16LE text from WASM memory.
   *
   * PDFium returns text in UTF-16LE format.
   *
   * @param ptr - Pointer to the text buffer
   * @param charCount - Number of characters (not bytes)
   * @returns The decoded string
   */
  readUTF16LE(ptr: WASMPointer, charCount: number): string {
    const byteLength = charCount * 2; // UTF-16 is 2 bytes per character
    const bytes = this.#module.HEAPU8.subarray(ptr, ptr + byteLength);
    const decoder = new TextDecoder('utf-16le');
    return decoder.decode(bytes);
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
      this.#module.wasmExports.free(ptr);
    }
    this.#allocations.clear();
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

// Declare the global __DEV__ variable
declare const __DEV__: boolean;
