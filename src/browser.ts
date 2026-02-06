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
export {
  WorkerPDFium,
  WorkerPDFiumDocument,
  type WorkerPDFiumOptions,
  WorkerPDFiumPage,
} from './context/worker-client.js';
export {
  type WorkerErrorEvent,
  type WorkerMessageEvent,
  WorkerProxy,
  type WorkerProxyOptions,
  type WorkerTransport,
} from './context/worker-proxy.js';
export * from './core/index.js';
export { PDFiumAnnotation } from './document/annotation.js';
export { PDFiumAttachmentWriter } from './document/attachment-writer.js';
export { PDFiumDocumentBuilder, PDFiumPageBuilder } from './document/builder.js';
export { PDFiumBuilderFont } from './document/builder-font.js';
export { type DocumentEvents, PDFiumDocument } from './document/document.js';
export { PDFiumFont } from './document/font.js';
export { PDFiumPage } from './document/page.js';
export {
  PDFiumImageObject,
  PDFiumPageObject,
  PDFiumPathObject,
  PDFiumPathSegment,
  PDFiumTextObject,
} from './document/page-object.js';
export { ProgressivePDFLoader } from './document/progressive.js';
export { ProgressiveRenderContext } from './document/progressive-render.js';
export { PDFium } from './pdfium.js';

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;
