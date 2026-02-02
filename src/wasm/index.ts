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
  type PDFiumWASM,
  RenderFlags,
  type WASMLoadOptions,
} from './bindings/index.js';
export { loadWASM } from './loader.js';
export { NULL_PTR, WASMMemoryManager } from './memory.js';
