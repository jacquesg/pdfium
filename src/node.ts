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

// Re-export version info
declare const __PACKAGE_VERSION__: string;
declare const __WASM_HASH__: string;

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;

// TODO: Phase 2 - Export Node.js-specific PDFium
// export { PDFium } from './pdfium.node.js';
