/**
 * Worker proxy for off-main-thread PDF processing.
 *
 * This class provides a Promise-based API for communicating with the PDF worker.
 *
 * @module context/worker-proxy
 */

import { Disposable } from '../core/disposable.js';
import { InitialisationError, PDFiumError, PDFiumErrorCode, WorkerError } from '../core/errors.js';
import type { SerialisedError, RenderOptions, RenderResult } from '../core/types.js';
import type {
  WorkerRequest,
  WorkerResponse,
  OpenDocumentResponse,
  LoadPageResponse,
  RenderPageResponse,
  PageSizeResponse,
} from './protocol.js';

/**
 * Pending request tracking.
 */
interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: PDFiumError) => void;
}

/**
 * Worker proxy for off-main-thread PDF processing.
 *
 * Provides the same API as the main-thread implementation but executes
 * all operations in a Web Worker.
 *
 * @example
 * ```typescript
 * using proxy = await WorkerProxy.create(workerUrl, wasmBinary);
 * const doc = await proxy.openDocument(pdfArrayBuffer);
 * ```
 */
export class WorkerProxy extends Disposable {
  readonly #worker: Worker;
  readonly #pending = new Map<string, PendingRequest<unknown>>();
  #requestId = 0;

  private constructor(worker: Worker) {
    super('WorkerProxy');
    this.#worker = worker;
    this.#worker.onmessage = this.#handleMessage.bind(this);
    this.#worker.onerror = this.#handleError.bind(this);
  }

  /**
   * Create a new worker proxy.
   *
   * @param workerUrl - URL to the worker script
   * @param wasmBinary - Pre-loaded WASM binary
   * @returns The worker proxy instance
   * @throws {InitialisationError} If worker creation or initialisation fails
   */
  static async create(workerUrl: string | URL, wasmBinary: ArrayBuffer): Promise<WorkerProxy> {
    try {
      const worker = new Worker(workerUrl, { type: 'module' });
      const proxy = new WorkerProxy(worker);

      try {
        await proxy.#sendRequest<void>('INIT', { wasmBinary }, [wasmBinary]);
      } catch (error) {
        worker.terminate();
        throw new InitialisationError(
          PDFiumErrorCode.INIT_LIBRARY_FAILED,
          `Failed to initialise worker: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return proxy;
    } catch (error) {
      if (error instanceof InitialisationError) {
        throw error;
      }
      throw new InitialisationError(
        PDFiumErrorCode.WORKER_CREATE_FAILED,
        `Failed to create worker: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Open a PDF document.
   *
   * @param data - PDF file data
   * @param password - Optional password for encrypted documents
   * @returns The document info
   * @throws {PDFiumError} If the document cannot be opened
   */
  async openDocument(data: ArrayBuffer, password?: string): Promise<OpenDocumentResponse> {
    return this.#sendRequest<OpenDocumentResponse>('OPEN_DOCUMENT', { data, password }, [data]);
  }

  /**
   * Close a document.
   *
   * @param documentId - Document ID returned from openDocument
   * @throws {PDFiumError} If the document cannot be closed
   */
  async closeDocument(documentId: number): Promise<void> {
    return this.#sendRequest<void>('CLOSE_DOCUMENT', { documentId });
  }

  /**
   * Get the page count of a document.
   *
   * @param documentId - Document ID
   * @returns The page count
   * @throws {PDFiumError} If the page count cannot be retrieved
   */
  async getPageCount(documentId: number): Promise<number> {
    return this.#sendRequest<number>('GET_PAGE_COUNT', { documentId });
  }

  /**
   * Load a page from a document.
   *
   * @param documentId - Document ID
   * @param pageIndex - Zero-based page index
   * @returns The page info
   * @throws {PDFiumError} If the page cannot be loaded
   */
  async loadPage(documentId: number, pageIndex: number): Promise<LoadPageResponse> {
    return this.#sendRequest<LoadPageResponse>('LOAD_PAGE', { documentId, pageIndex });
  }

  /**
   * Close a page.
   *
   * @param pageId - Page ID returned from loadPage
   * @throws {PDFiumError} If the page cannot be closed
   */
  async closePage(pageId: number): Promise<void> {
    return this.#sendRequest<void>('CLOSE_PAGE', { pageId });
  }

  /**
   * Get the size of a page.
   *
   * @param pageId - Page ID
   * @returns The page size
   * @throws {PDFiumError} If the page size cannot be retrieved
   */
  async getPageSize(pageId: number): Promise<PageSizeResponse> {
    return this.#sendRequest<PageSizeResponse>('GET_PAGE_SIZE', { pageId });
  }

  /**
   * Render a page.
   *
   * @param pageId - Page ID
   * @param options - Render options
   * @returns The render result
   * @throws {PDFiumError} If rendering fails
   */
  async renderPage(pageId: number, options: RenderOptions = {}): Promise<RenderResult> {
    const response = await this.#sendRequest<RenderPageResponse>('RENDER_PAGE', { pageId, options });
    return {
      width: response.width,
      height: response.height,
      originalWidth: response.originalWidth,
      originalHeight: response.originalHeight,
      data: new Uint8Array(response.data),
    };
  }

  /**
   * Get text content from a page.
   *
   * @param pageId - Page ID
   * @returns The text content
   * @throws {PDFiumError} If text extraction fails
   */
  async getText(pageId: number): Promise<string> {
    return this.#sendRequest<string>('GET_TEXT', { pageId });
  }

  /**
   * Send a request to the worker and wait for a response.
   */
  async #sendRequest<T>(
    type: WorkerRequest['type'],
    payload: Record<string, unknown>,
    transfer: Transferable[] = [],
  ): Promise<T> {
    this.ensureNotDisposed();

    const id = String(++this.#requestId);
    const request = { type, id, payload } as WorkerRequest;

    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.#worker.postMessage(request, transfer);
    });
  }

  /**
   * Handle messages from the worker.
   */
  #handleMessage(event: MessageEvent<WorkerResponse>): void {
    const response = event.data;
    const { type, id } = response;

    const pending = this.#pending.get(id);
    if (pending === undefined) {
      console.warn('[PDFium] Received response for unknown request:', id);
      return;
    }

    switch (type) {
      case 'SUCCESS':
        this.#pending.delete(id);
        pending.resolve(response.payload);
        break;

      case 'ERROR':
        this.#pending.delete(id);
        pending.reject(this.#deserialiseError(response.error));
        break;

      case 'PROGRESS':
        // Progress events don't resolve the promise
        // Could emit an event here for progress tracking
        break;
    }
  }

  /**
   * Handle worker errors.
   */
  #handleError(error: ErrorEvent): void {
    console.error('[PDFium] Worker error:', error);

    // Reject all pending requests
    const workerError = new WorkerError(
      PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
      `Worker error: ${error.message}`,
    );

    for (const [id, pending] of this.#pending) {
      pending.reject(workerError);
      this.#pending.delete(id);
    }
  }

  /**
   * Deserialise an error from the worker.
   */
  #deserialiseError(serialised: SerialisedError): PDFiumError {
    return new PDFiumError(serialised.code as PDFiumErrorCode, serialised.message, serialised.context);
  }

  protected disposeInternal(): void {
    // Send destroy message to worker
    const id = String(++this.#requestId);
    this.#worker.postMessage({ type: 'DESTROY', id });

    // Terminate the worker
    this.#worker.terminate();

    // Reject any pending requests
    for (const [, pending] of this.#pending) {
      pending.reject(
        new WorkerError(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED, 'Worker terminated'),
      );
    }
    this.#pending.clear();
  }
}
