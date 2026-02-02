/**
 * Helper for the "double-call" WASM string reading pattern.
 *
 * Many PDFium APIs require two calls: the first with a NULL buffer to get
 * the required size, and the second with a real buffer to get the data.
 * This helper encapsulates that pattern.
 *
 * @module internal/wasm-string
 * @internal
 */

import { utf16leDecoder, type WASMMemoryManager } from '../wasm/memory.js';
import { UTF16LE_NULL_TERMINATOR_BYTES } from './constants.js';
import type { WASMPointer } from './handles.js';

/**
 * Callback that performs the actual WASM call.
 *
 * Must accept a buffer pointer and buffer size as the last two arguments.
 * Returns the number of bytes required (first call) or written (second call).
 */
type WasmStringCallback = (bufferPtr: WASMPointer, bufferSize: number) => number;

/**
 * Read a UTF-16LE string from a WASM API using the double-call pattern.
 *
 * @param memory - WASM memory manager
 * @param call - Callback that wraps the WASM function call
 * @returns The decoded string, or undefined if empty/unavailable
 */
export function readUtf16leString(memory: WASMMemoryManager, call: WasmStringCallback): string | undefined {
  const requiredSize = call(0 as WASMPointer, 0);
  if (requiredSize <= UTF16LE_NULL_TERMINATOR_BYTES) {
    return undefined;
  }

  using buffer = memory.alloc(requiredSize);
  const written = call(buffer.ptr, requiredSize);
  if (written <= UTF16LE_NULL_TERMINATOR_BYTES) {
    return undefined;
  }

  const dataView = memory.heapU8.subarray(buffer.ptr, buffer.ptr + written - UTF16LE_NULL_TERMINATOR_BYTES);
  return utf16leDecoder.decode(dataView);
}

/**
 * Read a UTF-8 string from a WASM API using the double-call pattern.
 *
 * @param memory - WASM memory manager
 * @param call - Callback that wraps the WASM function call
 * @returns The decoded string, or empty string if unavailable
 */
export function readUtf8String(memory: WASMMemoryManager, call: WasmStringCallback): string {
  const requiredSize = call(0 as WASMPointer, 0);
  if (requiredSize <= 0) {
    return '';
  }

  using buffer = memory.alloc(requiredSize);
  const written = call(buffer.ptr, requiredSize);
  if (written <= 0) {
    return '';
  }

  return memory.readUtf8String(buffer.ptr, written - 1); // -1 to exclude null terminator
}
