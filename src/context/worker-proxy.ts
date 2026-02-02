/**
 * Worker proxy for off-main-thread PDF processing.
 *
 * This class provides a Promise-based API for communicating with the PDF worker.
 *
 * @module context/worker-proxy
 */

import { AsyncDisposable } from '../core/disposable.js';
import { InitialisationError, PDFiumError, PDFiumErrorCode, WorkerError } from '../core/errors.js';
import type { ProgressCallback, RenderOptions, RenderResult, SerialisedError } from '../core/types.js';
import type {
  LoadPageResponse,
  OpenDocumentResponse,
  PageSizeResponse,
  RenderPageResponse,
  WorkerRequest,
  WorkerResponse,
} from './protocol.js';

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 30_000;

/** Extended timeout for render operations. */
const RENDER_TIMEOUT = 120_000;

/** Timeout for graceful DESTROY message before forced termination. */
const DESTROY_TIMEOUT = 5_000;

/** Pre-computed set of known PDFiumErrorCode numeric values for validation. */
const KNOWN_ERROR_CODES = new Set<number>(
  Object.values(PDFiumErrorCode).filter((v): v is number => typeof v === 'number'),
);

/**
 * Options for creating a worker proxy.
 */
export interface WorkerProxyOptions {
  /** Default request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Timeout for render operations in milliseconds (default: 120000) */
  renderTimeout?: number;
  /** Timeout for graceful DESTROY before forced termination in milliseconds (default: 5000) */
  destroyTimeout?: number;
}

/**
 * Pending request tracking.
 */
interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: PDFiumError) => void;
  timer: ReturnType<typeof setTimeout>;
  onProgress?: ProgressCallback | undefined;
}

/**
 * Worker proxy for off-main-thread PDF processing.
 *
 * Provides the same API as the main-thread implementation but executes
 * all operations in a Web Worker.
 *
 * @example
 * ```typescript
 * await using proxy = await WorkerProxy.create(workerUrl, wasmBinary);
 * const doc = await proxy.openDocument(pdfArrayBuffer);
 * ```
 */
export class WorkerProxy extends AsyncDisposable {
  readonly #worker: Worker;
  /**
   * Map of pending requests keyed by request ID.
   *
   * The value type is `PendingRequest<unknown>` because the Map must store
   * requests for different response types. The type parameter is erased at
   * the Map boundary but preserved in the Promise returned to the caller.
   */
  readonly #pending = new Map<string, PendingRequest<unknown>>();
  readonly #timeout: number;
  readonly #renderTimeout: number;
  readonly #destroyTimeout: number;

  private constructor(worker: Worker, timeout: number, renderTimeout: number, destroyTimeout: number) {
    super('WorkerProxy');
    this.#worker = worker;
    this.#timeout = timeout;
    this.#renderTimeout = renderTimeout;
    this.#destroyTimeout = destroyTimeout;
    this.#worker.onmessage = this.#handleMessage.bind(this);
    this.#worker.onerror = this.#handleError.bind(this);

    this.setFinalizerCleanup(() => {
      worker.terminate();
    });
  }

  /**
   * Create a new worker proxy.
   *
   * @param workerUrl - URL to the worker script
   * @param wasmBinary - Pre-loaded WASM binary
   * @param options - Optional configuration
   * @returns The worker proxy instance
   * @throws {InitialisationError} If worker creation or initialisation fails
   */
  static async create(
    workerUrl: string | URL,
    wasmBinary: ArrayBuffer,
    options?: WorkerProxyOptions,
  ): Promise<WorkerProxy> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const renderTimeout = options?.renderTimeout ?? RENDER_TIMEOUT;
    const destroyTimeout = options?.destroyTimeout ?? DESTROY_TIMEOUT;

    let worker: Worker;
    try {
      worker = new Worker(workerUrl, { type: 'module' });
    } catch (error) {
      throw new InitialisationError(
        PDFiumErrorCode.INIT_INVALID_OPTIONS,
        `Failed to create worker from URL: ${String(workerUrl)}`,
        { cause: error },
      );
    }

    try {
      const proxy = new WorkerProxy(worker, timeout, renderTimeout, destroyTimeout);

      try {
        await proxy.#sendRequest<void>('INIT', { wasmBinary }, [], timeout);
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
  async closeDocument(documentId: string): Promise<void> {
    return this.#sendRequest<void>('CLOSE_DOCUMENT', { documentId });
  }

  /**
   * Get the page count of a document.
   *
   * @param documentId - Document ID
   * @returns The page count
   * @throws {PDFiumError} If the page count cannot be retrieved
   */
  async getPageCount(documentId: string): Promise<number> {
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
  async loadPage(documentId: string, pageIndex: number): Promise<LoadPageResponse> {
    return this.#sendRequest<LoadPageResponse>('LOAD_PAGE', { documentId, pageIndex });
  }

  /**
   * Close a page.
   *
   * @param pageId - Page ID returned from loadPage
   * @throws {PDFiumError} If the page cannot be closed
   */
  async closePage(pageId: string): Promise<void> {
    return this.#sendRequest<void>('CLOSE_PAGE', { pageId });
  }

  /**
   * Get the size of a page.
   *
   * @param pageId - Page ID
   * @returns The page size
   * @throws {PDFiumError} If the page size cannot be retrieved
   */
  async getPageSize(pageId: string): Promise<PageSizeResponse> {
    return this.#sendRequest<PageSizeResponse>('GET_PAGE_SIZE', { pageId });
  }

  /**
   * Render a page.
   *
   * @param pageId - Page ID
   * @param options - Render options
   * @param onProgress - Optional progress callback
   * @returns The render result
   * @throws {PDFiumError} If rendering fails
   */
  async renderPage(pageId: string, options: RenderOptions = {}, onProgress?: ProgressCallback): Promise<RenderResult> {
    const response = await this.#sendRequest<RenderPageResponse>(
      'RENDER_PAGE',
      { pageId, options },
      [],
      this.#renderTimeout,
      onProgress,
    );
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
  async getText(pageId: string): Promise<string> {
    return this.#sendRequest<string>('GET_TEXT', { pageId });
  }

  /**
   * Check if the worker is alive and responsive.
   *
   * Sends a lightweight PING message and waits for a response.
   *
   * @param timeout - Timeout in milliseconds (default: 5000)
   * @returns `true` if the worker responded within the timeout, `false` otherwise
   * @throws Never — errors are caught internally and returned as `false`
   */
  async ping(timeout = 5_000): Promise<boolean> {
    try {
      await this.#sendRequest<void>('PING', {}, [], timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a request to the worker and wait for a response.
   */
  /**
   * Payload types are documented in {@link WorkerRequestPayloadMap}.
   */
  async #sendRequest<T>(
    type: WorkerRequest['type'],
    payload: Record<string, unknown>,
    transfer: Transferable[] = [],
    timeout?: number,
    onProgress?: ProgressCallback,
  ): Promise<T> {
    this.ensureNotDisposed();

    const id = crypto.randomUUID();
    // The assertion is needed because this is a generic dispatcher — the type parameter
    // is erased at the discriminated-union boundary but preserved in each call site.
    const request: WorkerRequest = { type, id, payload } as WorkerRequest;
    const effectiveTimeout = timeout ?? this.#timeout;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(
          new WorkerError(
            PDFiumErrorCode.WORKER_TIMEOUT,
            `Worker request '${type}' timed out after ${String(effectiveTimeout)}ms`,
          ),
        );
      }, effectiveTimeout);

      this.#pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
        onProgress,
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
      return;
    }

    switch (type) {
      case 'SUCCESS':
        clearTimeout(pending.timer);
        this.#pending.delete(id);
        pending.resolve(response.payload);
        break;

      case 'ERROR':
        clearTimeout(pending.timer);
        this.#pending.delete(id);
        pending.reject(this.#deserialiseError(response.error));
        break;

      case 'PROGRESS':
        pending.onProgress?.(response.progress);
        break;
    }
  }

  /**
   * Handle worker errors.
   */
  #handleError(error: ErrorEvent): void {
    const workerError = new WorkerError(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED, `Worker error: ${error.message}`);

    for (const [id, pending] of this.#pending) {
      clearTimeout(pending.timer);
      pending.reject(workerError);
      this.#pending.delete(id);
    }
  }

  /**
   * Deserialise an error from the worker.
   *
   * Validates the error code is a known PDFiumErrorCode value.
   * Falls back to WORKER_COMMUNICATION_FAILED for unrecognised codes.
   */
  #deserialiseError(serialised: SerialisedError): PDFiumError {
    const code = KNOWN_ERROR_CODES.has(serialised.code)
      ? (serialised.code as PDFiumErrorCode)
      : PDFiumErrorCode.WORKER_COMMUNICATION_FAILED;
    return new PDFiumError(code, serialised.message, serialised.context);
  }

  protected async disposeInternalAsync(): Promise<void> {
    // Clear all timers first
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
    }

    // Send DESTROY and wait for acknowledgement (with timeout).
    // Post the message directly — #sendRequest checks ensureNotDisposed which
    // would throw because we're already in the disposal path.
    try {
      await new Promise<void>((resolve, reject) => {
        const id = crypto.randomUUID();
        const timer = setTimeout(() => {
          this.#pending.delete(id);
          resolve(); // Timeout is acceptable — we'll force-terminate below
        }, this.#destroyTimeout);

        this.#pending.set(id, {
          resolve: () => {
            clearTimeout(timer);
            this.#pending.delete(id);
            resolve();
          },
          reject: (error) => {
            clearTimeout(timer);
            this.#pending.delete(id);
            reject(error);
          },
          timer,
        });

        this.#worker.postMessage({ type: 'DESTROY', id });
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('[PDFium] Worker DESTROY error:', error);
      }
    }

    // Terminate the worker
    this.#worker.terminate();

    // Reject any remaining pending requests
    for (const [, pending] of this.#pending) {
      pending.reject(new WorkerError(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED, 'Worker terminated'));
    }
    this.#pending.clear();
  }
}
