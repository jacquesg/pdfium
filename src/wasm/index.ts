/**
 * WASM module exports.
 *
 * Internal utilities (asPointer, asHandle) are not re-exported
 * to prevent misuse outside the library.
 *
 * @module wasm
 */

export { NativeHandle, WASMAllocation } from './allocation.js';
export {
  BitmapFormat,
  PageObjectTypeNative,
  PDFiumNativeErrorCode,
  RenderFlags,
  type PDFiumWASM,
  type WASMLoadOptions,
} from './bindings.js';
export { loadWASM } from './loader.js';
export { NULL_PTR, WASMMemoryManager } from './memory.js';
