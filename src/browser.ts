/**
 * Browser-specific entry point for @jacquesg/pdfium.
 *
 * Use this entry point when you need browser-optimised code
 * that doesn't include Node.js-specific features.
 *
 * @example
 * ```typescript
 * import { PDFium } from '@jacquesg/pdfium/browser';
 *
 * const pdfium = await PDFium.init({
 *   wasmUrl: '/pdfium.wasm'
 * });
 * ```
 *
 * @packageDocumentation
 */

export type { WorkerRequest, WorkerResponse } from './context/protocol.js';
export { WorkerProxy, type WorkerProxyOptions } from './context/worker-proxy.js';
export * from './core/index.js';
export { PDFiumDocument } from './document/document.js';
export { PDFiumPage } from './document/page.js';
export { PDFium } from './pdfium.js';
export { BitmapFormat, type PDFiumWASM, RenderFlags, type WASMLoadOptions } from './wasm/bindings.js';

// Re-export version info
declare const __PACKAGE_VERSION__: string;
declare const __WASM_HASH__: string;

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;
