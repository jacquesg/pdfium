import { SIZEOF_INT, UTF16LE_BYTES_PER_CHAR, UTF16LE_NULL_TERMINATOR_BYTES } from '../internal/constants.js';
import type { WASMPointer } from '../internal/handles.js';
import { NULL_PTR, ptrOffset, type WASMMemoryManager } from './memory.js';

type GetterFn = (buffer: WASMPointer, length: number) => number;

/**
 * Helper to retrieve a UTF-16LE string from a PDFium function that follows the
 * standard "call once for size, allocate, call again for data" pattern.
 *
 * @param memory - The memory manager instance.
 * @param getter - The bound function to call (e.g. `(buf, len) => module._Func(handle, buf, len)`).
 *                 If undefined (function missing), returns undefined.
 * @returns The decoded string, or undefined if the function is missing, fails, or returns empty.
 */
export function getWasmStringUTF16LE(memory: WASMMemoryManager, getter: GetterFn | undefined): string | undefined {
  if (typeof getter !== 'function') {
    return undefined;
  }

  // Get required size in bytes
  const size = getter(NULL_PTR, 0);
  if (size <= UTF16LE_NULL_TERMINATOR_BYTES) {
    return undefined;
  }

  using buffer = memory.alloc(size);
  const written = getter(buffer.ptr, size);
  if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
    return undefined;
  }

  // Calculate char count (excluding null terminator)
  const charCount = (written - UTF16LE_NULL_TERMINATOR_BYTES) / UTF16LE_BYTES_PER_CHAR;
  return memory.readUTF16LE(buffer.ptr, charCount);
}

/**
 * Helper to retrieve a UTF-8/ASCII string from a PDFium function that follows the
 * standard "call once for size, allocate, call again for data" pattern.
 *
 * @param memory - The memory manager instance.
 * @param getter - The bound function to call.
 * @returns The decoded string, or undefined.
 */
export function getWasmStringUTF8(memory: WASMMemoryManager, getter: GetterFn | undefined): string | undefined {
  if (typeof getter !== 'function') {
    return undefined;
  }

  // Get required size in bytes
  const size = getter(NULL_PTR, 0);
  if (size <= 0) {
    return undefined;
  }

  using buffer = memory.alloc(size);
  const written = getter(buffer.ptr, size);
  if (written <= 0) {
    return undefined;
  }

  // Read as UTF-8 (excluding null terminator)
  // PDFium usually returns size including null terminator for these APIs.
  return memory.readUtf8String(buffer.ptr, written - 1);
}

/**
 * Helper to retrieve raw bytes (Uint8Array) from a PDFium function.
 *
 * @param memory - The memory manager instance.
 * @param getter - The bound function to call.
 * @returns The data copy, or undefined.
 */
export function getWasmBytes(memory: WASMMemoryManager, getter: GetterFn | undefined): Uint8Array | undefined {
  if (typeof getter !== 'function') {
    return undefined;
  }

  const size = getter(NULL_PTR, 0);
  if (size <= 0) {
    return undefined;
  }

  using buffer = memory.alloc(size);
  const written = getter(buffer.ptr, size);
  if (written <= 0) {
    return undefined;
  }

  return memory.copyFromWASM(buffer.ptr, written);
}

/**
 * Helper to retrieve an Int32Array from a PDFium function that returns element count.
 *
 * @param memory - The memory manager instance.
 * @param getter - The bound function to call (returns element count, takes buffer pointer and count).
 * @returns The number array, or undefined.
 */
export function getWasmInt32Array(memory: WASMMemoryManager, getter: GetterFn | undefined): number[] | undefined {
  if (typeof getter !== 'function') {
    return undefined;
  }

  const count = getter(NULL_PTR, 0);
  if (count <= 0) {
    return undefined;
  }

  using buffer = memory.alloc(count * SIZEOF_INT);
  const written = getter(buffer.ptr, count);
  if (written <= 0) {
    return undefined;
  }

  const view = new Int32Array(memory.heapU8.buffer, buffer.ptr, written);
  return Array.from(view);
}

/**
 * Helper to retrieve an FS_RECTF (4 floats) from a PDFium function.
 *
 * @param memory - The memory manager instance.
 * @param getter - The bound function to call (e.g. `(ptr) => module._Func(handle, ptr)`).
 * @returns The rect object { left, top, right, bottom } or undefined if failed.
 */
export function getWasmRect(
  memory: WASMMemoryManager,
  getter: (ptr: WASMPointer) => number | boolean,
): { left: number; top: number; right: number; bottom: number } | undefined {
  if (typeof getter !== 'function') {
    return undefined;
  }

  using buffer = memory.alloc(16); // 4 floats * 4 bytes
  const result = getter(buffer.ptr);

  // PDFium functions return 1 (true) for success, 0 (false) for failure
  if (!result) {
    return undefined;
  }

  // FS_RECTF struct layout per fpdfview.h: { left, top, right, bottom } at byte offsets [0, 4, 8, 12].
  const left = memory.readFloat32(buffer.ptr);
  const top = memory.readFloat32(ptrOffset(buffer.ptr, 4));
  const right = memory.readFloat32(ptrOffset(buffer.ptr, 8));
  const bottom = memory.readFloat32(ptrOffset(buffer.ptr, 12));

  return { left, top, right, bottom };
}
