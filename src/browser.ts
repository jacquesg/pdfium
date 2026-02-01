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

export * from './core/index.js';

// Re-export version info
declare const __PACKAGE_VERSION__: string;
declare const __WASM_HASH__: string;

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;

// TODO: Phase 2 - Export browser-specific PDFium
// export { PDFium } from './pdfium.browser.js';
