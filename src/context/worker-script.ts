/**
 * Worker entry script for off-main-thread PDF processing.
 *
 * This script runs inside a Web Worker and handles all PDFium operations.
 *
 * @module context/worker-script
 */

import { PDFiumErrorCode } from '../core/errors.js';
import type { SerialisedError } from '../core/types.js';
import type { PDFiumDocument } from '../document/document.js';
import type { PDFiumPage } from '../document/page.js';
import { PDFium } from '../pdfium.js';
import type {
  LoadPageResponse,
  OpenDocumentResponse,
  PageSizeResponse,
  RenderPageResponse,
  WorkerRequest,
  WorkerResponse,
} from './protocol.js';

/** Default maximum number of open documents. */
const DEFAULT_MAX_DOCUMENTS = 10;

/** Default maximum number of open pages. */
const DEFAULT_MAX_PAGES = 100;

// Global state
let pdfium: PDFium | null = null;
const documents = new Map<number, PDFiumDocument>();
const pages = new Map<number, PDFiumPage>();
const pageDocumentMap = new WeakMap<PDFiumPage, number>();
let nextDocumentId = 1;
let nextPageId = 1;
let maxDocuments = DEFAULT_MAX_DOCUMENTS;
let maxPages = DEFAULT_MAX_PAGES;

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
async function handleInit(
  id: string,
  wasmBinary: ArrayBuffer,
  options?: { maxDocuments?: number; maxPages?: number },
): Promise<void> {
  if (pdfium !== null) {
    postError(id, {
      name: 'InitialisationError',
      message: 'Worker already initialised',
      code: PDFiumErrorCode.INIT_LIBRARY_FAILED,
    });
    return;
  }

  if (options?.maxDocuments !== undefined) {
    maxDocuments = options.maxDocuments;
  }
  if (options?.maxPages !== undefined) {
    maxPages = options.maxPages;
  }

  pdfium = await PDFium.init({ wasmBinary });
  postSuccess(id, undefined);
}

/**
 * Handle open document request.
 */
async function handleOpenDocument(id: string, data: ArrayBuffer, password: string | undefined): Promise<void> {
  if (pdfium === null) {
    postError(id, {
      name: 'InitialisationError',
      message: 'Worker not initialised',
      code: PDFiumErrorCode.INIT_LIBRARY_FAILED,
    });
    return;
  }

  if (documents.size >= maxDocuments) {
    postError(id, {
      name: 'WorkerError',
      message: `Document limit reached (max ${String(maxDocuments)})`,
      code: PDFiumErrorCode.WORKER_RESOURCE_LIMIT,
    });
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
    postError(id, {
      name: 'DocumentError',
      message: `Document ${String(documentId)} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  // Close all pages belonging to this document
  for (const [pageId, page] of pages) {
    if (pageDocumentMap.get(page) === documentId) {
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
    postError(id, {
      name: 'DocumentError',
      message: `Document ${String(documentId)} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
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
    postError(id, {
      name: 'DocumentError',
      message: `Document ${String(documentId)} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  if (pages.size >= maxPages) {
    postError(id, {
      name: 'WorkerError',
      message: `Page limit reached (max ${String(maxPages)})`,
      code: PDFiumErrorCode.WORKER_RESOURCE_LIMIT,
    });
    return;
  }

  const page = document.getPage(pageIndex);
  const pageId = nextPageId++;
  pages.set(pageId, page);
  pageDocumentMap.set(page, documentId);

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
    postError(id, {
      name: 'PageError',
      message: `Page ${String(pageId)} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
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
    postError(id, {
      name: 'PageError',
      message: `Page ${String(pageId)} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
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
    postError(id, {
      name: 'PageError',
      message: `Page ${String(pageId)} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
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
    postError(id, {
      name: 'PageError',
      message: `Page ${String(pageId)} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
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
 * Set up the worker message handler.
 *
 * Call this from the worker entry point to initialise
 * message handling for off-main-thread PDF processing.
 */
export function setupWorker(): void {
  self.onmessage = handleMessage;
}

/**
 * Handle incoming messages from the main thread.
 */
async function handleMessage(event: MessageEvent<WorkerRequest>): Promise<void> {
  const request = event.data;
  const { type, id } = request;

  try {
    switch (type) {
      case 'INIT':
        await handleInit(id, request.payload.wasmBinary, request.payload as { maxDocuments?: number; maxPages?: number });
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
        postError(id, {
          name: 'WorkerError',
          message: `Unknown request type: ${(request as { type: string }).type}`,
          code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
        });
    }
  } catch (error) {
    postError(
      id,
      error instanceof Error
        ? error
        : { name: 'WorkerError', message: String(error), code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED },
    );
  }
}
