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
export { NativePDFiumDocument } from './document/native-document.js';
export { NativePDFiumInstance } from './document/native-instance.js';
export { NativePDFiumPage } from './document/native-page.js';
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
export { loadNativeBinding } from './native/loader.js';
export type { NativePdfium } from './native/types.js';
export { PDFium } from './pdfium.js';

export const VERSION = __PACKAGE_VERSION__;
export const WASM_HASH = __WASM_HASH__;
