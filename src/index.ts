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
  DestroyPayload,
  LoadPageResponse,
  OpenDocumentResponse,
  PageSizeResponse,
  RenderPagePayload,
  RenderPageResponse,
  WorkerRequest,
  WorkerResponse,
} from './context/protocol.js';
// Worker APIs (high-level + low-level)
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
// Document and page classes
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
// Main PDFium class
export { PDFium } from './pdfium.js';
