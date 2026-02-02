/**
 * Worker entry point for @scaryterry/pdfium.
 *
 * This module is loaded in Web Workers or Node.js Worker threads
 * to enable off-main-thread PDF processing.
 *
 * @example
 * ```typescript
 * // In your worker script:
 * import '@scaryterry/pdfium/worker';
 *
 * // The worker will automatically set up message handling
 * ```
 *
 * @packageDocumentation
 */

import { setupWorker } from './context/worker-script.js';

export * from './core/index.js';

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;

// Set up the worker message handler
setupWorker();
