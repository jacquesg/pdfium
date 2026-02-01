/**
 * Worker entry script for off-main-thread PDF processing.
 *
 * This script runs inside a Web Worker and handles all PDFium operations.
 *
 * @module context/worker-script
 */

import { PDFium } from '../pdfium.js';
import type { PDFiumDocument } from '../document/document.js';
import type { PDFiumPage } from '../document/page.js';
import type { SerialisedError } from '../core/types.js';
import type {
  WorkerRequest,
  WorkerResponse,
  RenderPageResponse,
  OpenDocumentResponse,
  LoadPageResponse,
  PageSizeResponse,
} from './protocol.js';

// Global state
let pdfium: PDFium | null = null;
const documents = new Map<number, PDFiumDocument>();
const pages = new Map<number, PDFiumPage>();
let nextDocumentId = 1;
let nextPageId = 1;

/**
 * Post a success response to the main thread.
 */
function postSuccess(id: string, payload: unknown, transfer: Transferable[] = []): void {
  const response: WorkerResponse = { type: 'SUCCESS', id, payload };
  self.postMessage(response, { transfer });
}

/**
 * Post an error response to the main thread.
 */
function postError(id: string, error: Error | SerialisedError): void {
  let serialised: SerialisedError;

  if (error instanceof Error) {
    const errorWithCode = error as { code?: number; context?: Record<string, unknown> };
    serialised = {
      name: error.name,
      message: error.message,
      code: errorWithCode.code ?? 0,
    };
    if (errorWithCode.context !== undefined) {
      serialised.context = errorWithCode.context;
    }
  } else {
    serialised = error;
  }

  const response: WorkerResponse = { type: 'ERROR', id, error: serialised };
  self.postMessage(response);
}

/**
 * Handle initialisation request.
 */
async function handleInit(id: string, wasmBinary: ArrayBuffer): Promise<void> {
  if (pdfium !== null) {
    postError(id, { name: 'InitialisationError', message: 'Worker already initialised', code: 101 });
    return;
  }

  pdfium = await PDFium.init({ wasmBinary });
  postSuccess(id, undefined);
}

/**
 * Handle open document request.
 */
async function handleOpenDocument(id: string, data: ArrayBuffer, password: string | undefined): Promise<void> {
  if (pdfium === null) {
    postError(id, { name: 'InitialisationError', message: 'Worker not initialised', code: 101 });
    return;
  }

  const options = password !== undefined ? { password } : {};
  const document = await pdfium.openDocument(data, options);
  const documentId = nextDocumentId++;
  documents.set(documentId, document);

  const response: OpenDocumentResponse = {
    documentId,
    pageCount: document.pageCount,
  };
  postSuccess(id, response);
}

/**
 * Handle close document request.
 */
function handleCloseDocument(id: string, documentId: number): void {
  const document = documents.get(documentId);
  if (document === undefined) {
    postError(id, { name: 'DocumentError', message: `Document ${documentId} not found`, code: 205 });
    return;
  }

  // Close all pages belonging to this document
  for (const [pageId, page] of pages) {
    if ((page as { documentId?: number }).documentId === documentId) {
      page.dispose();
      pages.delete(pageId);
    }
  }

  document.dispose();
  documents.delete(documentId);
  postSuccess(id, undefined);
}

/**
 * Handle get page count request.
 */
function handleGetPageCount(id: string, documentId: number): void {
  const document = documents.get(documentId);
  if (document === undefined) {
    postError(id, { name: 'DocumentError', message: `Document ${documentId} not found`, code: 205 });
    return;
  }

  postSuccess(id, document.pageCount);
}

/**
 * Handle load page request.
 */
function handleLoadPage(id: string, documentId: number, pageIndex: number): void {
  const document = documents.get(documentId);
  if (document === undefined) {
    postError(id, { name: 'DocumentError', message: `Document ${documentId} not found`, code: 205 });
    return;
  }

  const page = document.getPage(pageIndex);
  const pageId = nextPageId++;
  pages.set(pageId, page);

  // Store documentId for cleanup
  (page as { documentId?: number }).documentId = documentId;

  const response: LoadPageResponse = {
    pageId,
    index: page.index,
    width: page.width,
    height: page.height,
  };
  postSuccess(id, response);
}

/**
 * Handle close page request.
 */
function handleClosePage(id: string, pageId: number): void {
  const page = pages.get(pageId);
  if (page === undefined) {
    postError(id, { name: 'PageError', message: `Page ${pageId} not found`, code: 302 });
    return;
  }

  page.dispose();
  pages.delete(pageId);
  postSuccess(id, undefined);
}

/**
 * Handle get page size request.
 */
function handleGetPageSize(id: string, pageId: number): void {
  const page = pages.get(pageId);
  if (page === undefined) {
    postError(id, { name: 'PageError', message: `Page ${pageId} not found`, code: 302 });
    return;
  }

  const response: PageSizeResponse = {
    width: page.width,
    height: page.height,
  };
  postSuccess(id, response);
}

/**
 * Handle render page request.
 */
function handleRenderPage(id: string, pageId: number, options: import('../core/types.js').RenderOptions): void {
  const page = pages.get(pageId);
  if (page === undefined) {
    postError(id, { name: 'PageError', message: `Page ${pageId} not found`, code: 302 });
    return;
  }

  const rendered = page.render(options);

  // Transfer the data buffer for efficiency
  const buffer = rendered.data.buffer as ArrayBuffer;
  const response: RenderPageResponse = {
    width: rendered.width,
    height: rendered.height,
    originalWidth: rendered.originalWidth,
    originalHeight: rendered.originalHeight,
    data: buffer,
  };
  postSuccess(id, response, [buffer]);
}

/**
 * Handle get text request.
 */
function handleGetText(id: string, pageId: number): void {
  const page = pages.get(pageId);
  if (page === undefined) {
    postError(id, { name: 'PageError', message: `Page ${pageId} not found`, code: 302 });
    return;
  }

  const text = page.getText();
  postSuccess(id, text);
}

/**
 * Handle destroy request.
 */
function handleDestroy(id: string): void {
  // Close all pages
  for (const page of pages.values()) {
    page.dispose();
  }
  pages.clear();

  // Close all documents
  for (const document of documents.values()) {
    document.dispose();
  }
  documents.clear();

  // Dispose PDFium
  if (pdfium !== null) {
    pdfium.dispose();
    pdfium = null;
  }

  postSuccess(id, undefined);
}

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const { type, id } = request;

  try {
    switch (type) {
      case 'INIT':
        await handleInit(id, request.payload.wasmBinary);
        break;

      case 'OPEN_DOCUMENT':
        await handleOpenDocument(id, request.payload.data, request.payload.password);
        break;

      case 'CLOSE_DOCUMENT':
        handleCloseDocument(id, request.payload.documentId);
        break;

      case 'GET_PAGE_COUNT':
        handleGetPageCount(id, request.payload.documentId);
        break;

      case 'LOAD_PAGE':
        handleLoadPage(id, request.payload.documentId, request.payload.pageIndex);
        break;

      case 'CLOSE_PAGE':
        handleClosePage(id, request.payload.pageId);
        break;

      case 'GET_PAGE_SIZE':
        handleGetPageSize(id, request.payload.pageId);
        break;

      case 'RENDER_PAGE':
        handleRenderPage(id, request.payload.pageId, request.payload.options);
        break;

      case 'GET_TEXT':
        handleGetText(id, request.payload.pageId);
        break;

      case 'DESTROY':
        handleDestroy(id);
        break;

      default:
        postError(id, { name: 'WorkerError', message: `Unknown request type: ${(request as { type: string }).type}`, code: 801 });
    }
  } catch (error) {
    postError(
      id,
      error instanceof Error
        ? error
        : { name: 'WorkerError', message: String(error), code: 801 },
    );
  }
};
