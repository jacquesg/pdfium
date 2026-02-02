/**
 * RAII wrappers for WASM memory allocations and native handles.
 *
 * These lightweight disposable types integrate with ES2024 `using` keyword
 * to make resource leaks structurally impossible.
 *
 * @module wasm/allocation
 */

import { MemoryError, PDFiumErrorCode } from '../core/errors.js';
import type { WASMPointer } from '../core/types.js';
import { NULL_PTR, type WASMMemoryManager } from './memory.js';

/**
 * RAII wrapper for WASM heap allocations.
 *
 * Implements `Symbol.dispose` so it can be used with the `using` keyword
 * for automatic cleanup at scope exit.
 *
 * @example
 * ```typescript
 * using alloc = memory.alloc(256);
 * memory.writeInt32(alloc.ptr, 42);
 * // alloc is automatically freed when scope exits
 * ```
 *
 * @example Ownership transfer with `take()`:
 * ```typescript
 * using alloc = memory.allocFrom(data);
 * const handle = createNativeResource(alloc.ptr);
 * if (handle === 0) throw new Error('failed'); // alloc auto-freed
 * const ptr = alloc.take(); // disarm auto-free, caller owns the pointer
 * ```
 */
export class WASMAllocation implements Disposable {
  #ptr: WASMPointer;
  readonly #memory: WASMMemoryManager;

  constructor(ptr: WASMPointer, memory: WASMMemoryManager) {
    this.#ptr = ptr;
    this.#memory = memory;
  }

  /**
   * Get the underlying WASM pointer.
   *
   * @throws {MemoryError} If the allocation has been disposed or taken.
   */
  get ptr(): WASMPointer {
    if (this.#ptr === NULL_PTR) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_INVALID_POINTER, 'Allocation has been disposed or taken');
    }
    return this.#ptr;
  }

  /**
   * Transfer ownership of the pointer to the caller.
   *
   * Returns the pointer and disarms automatic disposal. The pointer remains
   * tracked in `WASMMemoryManager`'s allocation set — it is still allocated,
   * just owned elsewhere now.
   *
   * @returns The WASM pointer
   * @throws {MemoryError} If the allocation has already been disposed or taken.
   */
  take(): WASMPointer {
    if (this.#ptr === NULL_PTR) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_INVALID_POINTER, 'Allocation has already been disposed or taken');
    }
    const ptr = this.#ptr;
    this.#ptr = NULL_PTR;
    return ptr;
  }

  /**
   * Free the WASM allocation. Idempotent — safe to call multiple times.
   */
  [Symbol.dispose](): void {
    if (this.#ptr === NULL_PTR) {
      return;
    }
    const ptr = this.#ptr;
    this.#ptr = NULL_PTR;
    this.#memory.free(ptr);
  }
}

/**
 * RAII wrapper for native C handles (e.g. bitmap handles).
 *
 * Accepts a handle value and a destroy callback. Implements `Symbol.dispose`
 * for automatic cleanup with the `using` keyword.
 *
 * The generic parameter `T` defaults to `number` for backward compatibility
 * but can be narrowed to a branded handle type for additional type safety.
 *
 * @example
 * ```typescript
 * using bitmap = new NativeHandle(bitmapHandle, (h) => module._FPDFBitmap_Destroy(h));
 * module._FPDFBitmap_FillRect(bitmap.handle, 0, 0, width, height, colour);
 * // bitmap is automatically destroyed when scope exits
 * ```
 */
export class NativeHandle<T extends number = number> implements Disposable {
  #handle: T | 0;
  readonly #destroy: (handle: T) => void;

  constructor(handle: T, destroy: (handle: T) => void) {
    this.#handle = handle;
    this.#destroy = destroy;
  }

  /**
   * Get the underlying handle value.
   *
   * @throws {MemoryError} If the handle has been disposed.
   */
  get handle(): T {
    if (this.#handle === 0) {
      throw new MemoryError(PDFiumErrorCode.MEMORY_INVALID_POINTER, 'Handle has been disposed');
    }
    return this.#handle;
  }

  /**
   * Destroy the native handle. Idempotent — safe to call multiple times.
   */
  [Symbol.dispose](): void {
    if (this.#handle === 0) {
      return;
    }
    const handle = this.#handle;
    this.#handle = 0;
    this.#destroy(handle);
  }
}
