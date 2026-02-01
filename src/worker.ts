/**
 * Worker entry point for @jacquesg/pdfium.
 *
 * This module is loaded in Web Workers or Node.js Worker threads
 * to enable off-main-thread PDF processing.
 *
 * @example
 * ```typescript
 * // In your worker script:
 * import '@jacquesg/pdfium/worker';
 *
 * // The worker will automatically set up message handling
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

// TODO: Phase 5 - Implement worker script
// import { setupWorker } from './context/worker-script.js';
// setupWorker();
