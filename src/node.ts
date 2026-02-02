/**
 * Node.js-specific entry point for @scaryterry/pdfium.
 *
 * Use this entry point when running in Node.js for optimal
 * performance and automatic WASM loading from the package.
 *
 * @example
 * ```typescript
 * import { PDFium } from '@scaryterry/pdfium/node';
 *
 * // WASM is loaded automatically from node_modules
 * const pdfium = await PDFium.init();
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
export { NativePDFiumDocument } from './document/native-document.js';
export { NativePDFiumInstance } from './document/native-instance.js';
export { NativePDFiumPage } from './document/native-page.js';
export { PDFiumPage } from './document/page.js';
export { ProgressivePDFLoader } from './document/progressive.js';
export { ProgressiveRenderContext } from './document/progressive-render.js';
export { INTERNAL } from './internal/symbols.js';
export { loadNativeBinding } from './native/loader.js';
export type { NativePdfium } from './native/types.js';
export { PDFium } from './pdfium.js';
export { BitmapFormat, PDFiumNativeErrorCode, RenderFlags } from './wasm/bindings/index.js';

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;
