/**
 * Worker entry script for off-main-thread PDF processing.
 *
 * This script runs inside a Web Worker and handles all PDFium operations.
 *
 * @module context/worker-script
 */

import { isNodeEnvironment } from '../core/env.js';
import { PDFiumError, PDFiumErrorCode } from '../core/errors.js';
import { getLogger } from '../core/logger.js';
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

type TransferList = readonly unknown[];
type MessageToMainThread = (response: WorkerResponse, transfer?: TransferList) => void;

interface BrowserWorkerScope {
  postMessage: (message: WorkerResponse, options?: { transfer?: Transferable[] }) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  location?: {
    origin?: string;
  };
}

/**
 * Encapsulated worker state.
 *
 * Holds all mutable state for the worker thread: the PDFium instance,
 * open documents, loaded pages, and configurable resource limits.
 * A single instance is created at module scope and shared across all
 * message handlers.
 */
class WorkerState {
  /** The initialised PDFium instance, or `null` before INIT. */
  pdfium: PDFium | null = null;
  /** Open documents keyed by unique document ID. */
  readonly documents = new Map<string, PDFiumDocument>();
  /** Loaded pages keyed by unique page ID. */
  readonly pages = new Map<string, PDFiumPage>();
  /** Maps each loaded page back to its parent document ID. */
  readonly pageDocumentMap = new WeakMap<PDFiumPage, string>();
  /** Maximum number of concurrently open documents. */
  maxDocuments = DEFAULT_MAX_DOCUMENTS;
  /** Maximum number of concurrently loaded pages. */
  maxPages = DEFAULT_MAX_PAGES;

  nextDocumentId(): string {
    return crypto.randomUUID();
  }

  nextPageId(): string {
    return crypto.randomUUID();
  }
}

const state = new WorkerState();
let postToMainThread: MessageToMainThread | null = null;
let expectedMessageOrigin: string | undefined;

function getBrowserWorkerScope(): BrowserWorkerScope | null {
  const scopeCandidate = (globalThis as { self?: unknown }).self ?? globalThis;
  if (scopeCandidate === null || typeof scopeCandidate !== 'object') {
    return null;
  }

  const scope = scopeCandidate as Partial<BrowserWorkerScope>;
  if (typeof scope.postMessage !== 'function') {
    return null;
  }
  if (!('onmessage' in scope)) {
    return null;
  }

  return scope as BrowserWorkerScope;
}

function post(response: WorkerResponse, transfer: TransferList = []): void {
  if (postToMainThread === null) {
    throw new Error('Worker message transport has not been initialised');
  }
  postToMainThread(response, transfer);
}

/**
 * Post a success response to the main thread.
 */
function postSuccess(id: string, payload: unknown, transfer: TransferList = []): void {
  const response: WorkerResponse = { type: 'SUCCESS', id, payload };
  post(response, transfer);
}

/**
 * Post an error response to the main thread.
 */
function postError(id: string, error: Error | SerialisedError): void {
  let serialised: SerialisedError;

  if (error instanceof PDFiumError) {
    serialised = {
      name: error.name,
      message: error.message,
      code: error.code,
    };
    if (error.context !== undefined) {
      serialised.context = error.context;
    }
    if (__DEV__ && error.stack !== undefined) {
      serialised.stack = error.stack;
    }
  } else if (error instanceof Error) {
    serialised = {
      name: error.name,
      message: error.message,
      code: 0,
    };
    if (__DEV__ && error.stack !== undefined) {
      serialised.stack = error.stack;
    }
  } else {
    serialised = error;
  }

  const response: WorkerResponse = { type: 'ERROR', id, error: serialised };
  post(response);
}

/**
 * Handle initialisation request.
 */
async function handleInit(
  id: string,
  wasmBinary: ArrayBuffer,
  options?: { maxDocuments?: number; maxPages?: number },
): Promise<void> {
  if (state.pdfium !== null) {
    postError(id, {
      name: 'InitialisationError',
      message: 'Worker already initialised',
      code: PDFiumErrorCode.INIT_LIBRARY_FAILED,
    });
    return;
  }

  if (!(wasmBinary instanceof ArrayBuffer)) {
    postError(id, {
      name: 'InitialisationError',
      message: 'wasmBinary must be an ArrayBuffer',
      code: PDFiumErrorCode.INIT_INVALID_OPTIONS,
    });
    return;
  }

  if (options?.maxDocuments !== undefined) {
    state.maxDocuments = options.maxDocuments;
  }
  if (options?.maxPages !== undefined) {
    state.maxPages = options.maxPages;
  }

  state.pdfium = await PDFium.init({ wasmBinary });
  postSuccess(id, undefined);
}

/**
 * Handle open document request.
 */
async function handleOpenDocument(id: string, data: ArrayBuffer, password: string | undefined): Promise<void> {
  if (state.pdfium === null) {
    postError(id, {
      name: 'InitialisationError',
      message: 'Worker not initialised',
      code: PDFiumErrorCode.INIT_LIBRARY_FAILED,
    });
    return;
  }

  if (state.documents.size >= state.maxDocuments) {
    postError(id, {
      name: 'WorkerError',
      message: `Document limit reached (max ${String(state.maxDocuments)})`,
      code: PDFiumErrorCode.WORKER_RESOURCE_LIMIT,
    });
    return;
  }

  const options = password !== undefined ? { password } : {};
  const document = await state.pdfium.openDocument(data, options);
  const documentId = state.nextDocumentId();
  state.documents.set(documentId, document);

  const response: OpenDocumentResponse = {
    documentId,
    pageCount: document.pageCount,
  };
  postSuccess(id, response);
}

/**
 * Handle close document request.
 */
function handleCloseDocument(id: string, documentId: string): void {
  const document = state.documents.get(documentId);
  if (document === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: `Document ${documentId} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  // Close all pages belonging to this document
  for (const [pageId, page] of state.pages) {
    if (state.pageDocumentMap.get(page) === documentId) {
      page.dispose();
      state.pages.delete(pageId);
    }
  }

  document.dispose();
  state.documents.delete(documentId);
  postSuccess(id, undefined);
}

/**
 * Handle get page count request.
 */
function handleGetPageCount(id: string, documentId: string): void {
  const document = state.documents.get(documentId);
  if (document === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: `Document ${documentId} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  postSuccess(id, document.pageCount);
}

/**
 * Handle load page request.
 */
function handleLoadPage(id: string, documentId: string, pageIndex: number): void {
  const document = state.documents.get(documentId);
  if (document === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: `Document ${documentId} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  if (state.pages.size >= state.maxPages) {
    postError(id, {
      name: 'WorkerError',
      message: `Page limit reached (max ${String(state.maxPages)})`,
      code: PDFiumErrorCode.WORKER_RESOURCE_LIMIT,
    });
    return;
  }

  const page = document.getPage(pageIndex);
  const pageId = state.nextPageId();
  state.pages.set(pageId, page);
  state.pageDocumentMap.set(page, documentId);

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
function handleClosePage(id: string, pageId: string): void {
  const page = state.pages.get(pageId);
  if (page === undefined) {
    postError(id, {
      name: 'PageError',
      message: `Page ${pageId} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
    return;
  }

  page.dispose();
  state.pages.delete(pageId);
  postSuccess(id, undefined);
}

/**
 * Handle get page size request.
 */
function handleGetPageSize(id: string, pageId: string): void {
  const page = state.pages.get(pageId);
  if (page === undefined) {
    postError(id, {
      name: 'PageError',
      message: `Page ${pageId} not found`,
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
function handleRenderPage(id: string, pageId: string, options: import('../core/types.js').RenderOptions): void {
  const page = state.pages.get(pageId);
  if (page === undefined) {
    postError(id, {
      name: 'PageError',
      message: `Page ${pageId} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
    return;
  }

  const rendered = page.render(options);

  // Transfer the data buffer for efficiency
  // Copy into a fresh ArrayBuffer for transfer — avoids SharedArrayBuffer issues
  const buffer = new ArrayBuffer(rendered.data.byteLength);
  new Uint8Array(buffer).set(rendered.data);
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
function handleGetText(id: string, pageId: string): void {
  const page = state.pages.get(pageId);
  if (page === undefined) {
    postError(id, {
      name: 'PageError',
      message: `Page ${pageId} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
    return;
  }

  const text = page.getText();
  postSuccess(id, text);
}

/**
 * Handle get text rects request.
 */
function handleGetTextLayout(id: string, pageId: string): void {
  const page = state.pages.get(pageId);
  if (page === undefined) {
    postError(id, {
      name: 'PageError',
      message: `Page ${pageId} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
    return;
  }

  const { text, rects } = page.getTextLayout();
  postSuccess(id, { text, rects }, [rects.buffer]);
}

/**
 * Handle destroy request.
 */
function handleDestroy(id: string): void {
  // Close all pages
  for (const page of state.pages.values()) {
    page.dispose();
  }
  state.pages.clear();

  // Close all documents
  for (const document of state.documents.values()) {
    document.dispose();
  }
  state.documents.clear();

  // Dispose PDFium
  if (state.pdfium !== null) {
    state.pdfium.dispose();
    state.pdfium = null;
  }

  postSuccess(id, undefined);
}

/**
 * Set up the worker message handler.
 *
 * Call this from the worker entry point to initialise
 * message handling for off-main-thread PDF processing.
 */
export async function setupWorker(): Promise<void> {
  const browserScope = getBrowserWorkerScope();
  if (browserScope !== null) {
    expectedMessageOrigin = browserScope.location?.origin;
    postToMainThread = (response, transfer = []) => {
      if (transfer.length > 0) {
        browserScope.postMessage(response, { transfer: [...transfer] as Transferable[] });
        return;
      }
      browserScope.postMessage(response);
    };
    browserScope.onmessage = (event) => {
      void handleMessage(event.data, event.origin);
    };
    return;
  }

  if (isNodeEnvironment()) {
    const { parentPort } = await import('node:worker_threads');
    if (parentPort === null) {
      throw new Error('Node worker_threads parentPort is not available');
    }

    postToMainThread = (response, transfer = []) => {
      if (transfer.length > 0) {
        parentPort.postMessage(response, transfer as []);
        return;
      }
      parentPort.postMessage(response);
    };

    parentPort.on('message', (message: unknown) => {
      void handleMessage(message as WorkerRequest);
    });
    return;
  }

  throw new Error('Unsupported worker runtime: expected browser worker or Node worker_threads');
}

/**
 * Handle incoming messages from the main thread.
 */
async function handleMessage(request: WorkerRequest, origin?: string): Promise<void> {
  // Defence-in-depth: validate message origin
  if (
    origin !== undefined &&
    expectedMessageOrigin !== undefined &&
    origin !== '' &&
    origin !== expectedMessageOrigin
  ) {
    getLogger().warn('Worker rejected message from unexpected origin:', origin);
    return;
  }

  const { type, id } = request;

  try {
    switch (type) {
      case 'INIT':
        await handleInit(
          id,
          request.payload.wasmBinary,
          request.payload as { maxDocuments?: number; maxPages?: number },
        );
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

      case 'GET_TEXT_LAYOUT':
        handleGetTextLayout(id, request.payload.pageId);
        break;

      case 'PING':
        postSuccess(id, undefined);
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
