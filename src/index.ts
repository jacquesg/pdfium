/**
 * @scaryterry/pdfium - Universal PDFium WASM wrapper for Browser and Node.js
 *
 * This is the main entry point that auto-detects the environment
 * and loads the appropriate implementation.
 *
 * @packageDocumentation
 */

export * from './core/index.js';

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
export { WorkerProxy, type WorkerProxyOptions } from './context/worker-proxy.js';
// Document and page classes
export { PDFiumDocumentBuilder, PDFiumPageBuilder } from './document/builder.js';
export { PDFiumDocument } from './document/document.js';
export { PDFiumFont } from './document/font.js';
export { PDFiumPage } from './document/page.js';
export { ProgressivePDFLoader } from './document/progressive.js';
export { ProgressiveRenderContext } from './document/progressive-render.js';
// Internal symbol for advanced access
export { INTERNAL } from './internal/symbols.js';
// Main PDFium class
export { PDFium } from './pdfium.js';

// WASM enums only (no types or managers)
export { BitmapFormat, PDFiumNativeErrorCode, RenderFlags } from './wasm/bindings/index.js';
