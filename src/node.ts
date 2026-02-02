/**
 * Node.js-specific entry point for @jacquesg/pdfium.
 *
 * Use this entry point when running in Node.js for optimal
 * performance and automatic WASM loading from the package.
 *
 * @example
 * ```typescript
 * import { PDFium } from '@jacquesg/pdfium/node';
 *
 * // WASM is loaded automatically from node_modules
 * const pdfium = await PDFium.init();
 * ```
 *
 * @packageDocumentation
 */

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
