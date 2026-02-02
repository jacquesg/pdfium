/**
 * Browser-specific entry point for @scaryterry/pdfium.
 *
 * Use this entry point when you need browser-optimised code
 * that doesn't include Node.js-specific features.
 *
 * @example
 * ```typescript
 * import { PDFium } from '@scaryterry/pdfium/browser';
 *
 * const pdfium = await PDFium.init({
 *   wasmUrl: '/pdfium.wasm'
 * });
 * ```
 *
 * @packageDocumentation
 */

export type {
  LoadPageResponse,
  OpenDocumentResponse,
  RenderPageResponse,
  WorkerRequest,
  WorkerResponse,
} from './context/protocol.js';
export { WorkerProxy, type WorkerProxyOptions } from './context/worker-proxy.js';
export * from './core/index.js';
export { PDFiumDocumentBuilder, PDFiumPageBuilder } from './document/builder.js';
export { PDFiumDocument } from './document/document.js';
export { PDFiumFont } from './document/font.js';
export { PDFiumPage } from './document/page.js';
export { ProgressivePDFLoader } from './document/progressive.js';
export { ProgressiveRenderContext } from './document/progressive-render.js';
export { INTERNAL } from './internal/symbols.js';
export { PDFium } from './pdfium.js';
export { BitmapFormat, PDFiumNativeErrorCode, RenderFlags } from './wasm/bindings/index.js';

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;
