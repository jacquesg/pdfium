/**
 * @jacquesg/pdfium - Universal PDFium WASM wrapper for Browser and Node.js
 *
 * This is the main entry point that auto-detects the environment
 * and loads the appropriate implementation.
 *
 * @packageDocumentation
 */

export * from './core/index.js';

// Re-export version info
declare const __PACKAGE_VERSION__: string;
declare const __WASM_HASH__: string;

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;

export type {
  LoadPageResponse,
  OpenDocumentResponse,
  RenderPageResponse,
  WorkerRequest,
  WorkerResponse,
} from './context/protocol.js';
// Worker proxy for off-main-thread processing
export { WorkerProxy } from './context/worker-proxy.js';
// Document and page classes
export { PDFiumDocument } from './document/document.js';
export { PDFiumPage } from './document/page.js';
// Main PDFium class
export { PDFium } from './pdfium.js';

// WASM types for advanced usage
export type { NativeHandle, WASMAllocation } from './wasm/allocation.js';
export type { PDFiumWASM, WASMLoadOptions } from './wasm/bindings.js';
export { BitmapFormat, PDFiumNativeErrorCode, RenderFlags } from './wasm/bindings.js';
export type { WASMMemoryManager } from './wasm/memory.js';
