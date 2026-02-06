/**
 * High-level worker-backed PDFium API.
 *
 * Provides ergonomic document/page wrappers on top of WorkerProxy so callers
 * can use worker mode without dealing with low-level document/page IDs.
 *
 * @module context/worker-client
 */

import { AsyncDisposable } from '../core/disposable.js';
import { PDFiumError, PDFiumErrorCode } from '../core/errors.js';
import type { OpenDocumentOptions, ProgressCallback, RenderOptions, RenderResult } from '../core/types.js';
import type { WorkerRequest, WorkerResponse } from './protocol.js';
import { WorkerProxy, type WorkerProxyOptions, type WorkerTransport } from './worker-proxy.js';

function toOwnedArrayBuffer(data: Uint8Array | ArrayBuffer): ArrayBuffer {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/**
 * Options for creating a high-level worker-backed PDFium instance.
 */
export interface WorkerPDFiumOptions extends WorkerProxyOptions {
  /** URL to the worker entry script. */
  workerUrl: string | URL;
  /** Preloaded PDFium WASM binary to initialise inside the worker. */
  wasmBinary: ArrayBuffer;
  /** Custom worker factory (advanced / Node.js integration). */
  workerFactory?: (url: string | URL) => WorkerTransport;
}

/**
 * High-level worker-backed PDFium instance.
 *
 * Use this when you want an ergonomic API over worker mode:
 * - `openDocument(...)`
 * - `document.getPage(...)`
 * - `document.renderPage(...)`
 */
export class WorkerPDFium extends AsyncDisposable {
  readonly #proxy: WorkerProxy;
  readonly #documents = new Set<WorkerPDFiumDocument>();

  private constructor(proxy: WorkerProxy) {
    super('WorkerPDFium');
    this.#proxy = proxy;
  }

  /**
   * Create a worker-backed PDFium instance.
   */
  static async create(options: WorkerPDFiumOptions): Promise<WorkerPDFium> {
    const proxyOptions: WorkerProxyOptions = {};
    if (options.timeout !== undefined) {
      proxyOptions.timeout = options.timeout;
    }
    if (options.renderTimeout !== undefined) {
      proxyOptions.renderTimeout = options.renderTimeout;
    }
    if (options.destroyTimeout !== undefined) {
      proxyOptions.destroyTimeout = options.destroyTimeout;
    }
    if (options.workerFactory !== undefined) {
      proxyOptions.workerFactory = options.workerFactory;
    }

    const proxy = await WorkerProxy.create(options.workerUrl, options.wasmBinary, proxyOptions);
    return new WorkerPDFium(proxy);
  }

  /**
   * Open a document in the worker.
   */
  async openDocument(data: Uint8Array | ArrayBuffer, options: OpenDocumentOptions = {}): Promise<WorkerPDFiumDocument> {
    this.ensureNotDisposed();

    const bytes = toOwnedArrayBuffer(data);
    options.onProgress?.(0);
    const response = await this.#proxy.openDocument(bytes, options.password);
    options.onProgress?.(1);

    const document = new WorkerPDFiumDocument(this.#proxy, response.documentId, response.pageCount, () => {
      this.#documents.delete(document);
    });
    this.#documents.add(document);
    return document;
  }

  /**
   * Health-check the worker transport.
   */
  async ping(timeout = 5_000): Promise<boolean> {
    this.ensureNotDisposed();
    return this.#proxy.ping(timeout);
  }

  protected async disposeInternalAsync(): Promise<void> {
    for (const document of this.#documents) {
      try {
        await document.dispose();
      } catch {
        // Best-effort teardown: continue disposing remaining resources.
      }
    }
    this.#documents.clear();
    await this.#proxy.dispose();
  }
}

/**
 * High-level worker-backed PDF document.
 */
export class WorkerPDFiumDocument extends AsyncDisposable {
  readonly #proxy: WorkerProxy;
  readonly #documentId: string;
  readonly #pages = new Set<WorkerPDFiumPage>();
  readonly #onDispose: () => void;

  /**
   * Number of pages in this document.
   */
  readonly pageCount: number;

  /** @internal */
  constructor(proxy: WorkerProxy, documentId: string, pageCount: number, onDispose: () => void) {
    super('WorkerPDFiumDocument', PDFiumErrorCode.DOC_ALREADY_CLOSED);
    this.#proxy = proxy;
    this.#documentId = documentId;
    this.pageCount = pageCount;
    this.#onDispose = onDispose;
  }

  /**
   * Internal document ID used by the worker protocol.
   */
  get id(): string {
    return this.#documentId;
  }

  /**
   * Load a page and return a worker-backed page object.
   */
  async getPage(pageIndex: number): Promise<WorkerPDFiumPage> {
    this.ensureNotDisposed();
    const page = await this.#proxy.loadPage(this.#documentId, pageIndex);
    const workerPage = new WorkerPDFiumPage(this.#proxy, page.pageId, page.index, page.width, page.height, () => {
      this.#pages.delete(workerPage);
    });
    this.#pages.add(workerPage);
    return workerPage;
  }

  /**
   * High-level convenience rendering method.
   *
   * Loads the page, renders it, and closes the page automatically.
   */
  async renderPage(
    pageIndex: number,
    options: RenderOptions = {},
    onProgress?: ProgressCallback,
  ): Promise<RenderResult> {
    this.ensureNotDisposed();
    await using page = await this.getPage(pageIndex);
    return page.render(options, onProgress);
  }

  protected async disposeInternalAsync(): Promise<void> {
    for (const page of this.#pages) {
      try {
        await page.dispose();
      } catch {
        // Best-effort teardown: continue disposing remaining resources.
      }
    }
    this.#pages.clear();

    try {
      await this.#proxy.closeDocument(this.#documentId);
    } catch (error) {
      if (!(error instanceof PDFiumError) || error.code !== PDFiumErrorCode.DOC_ALREADY_CLOSED) {
        throw error;
      }
    } finally {
      this.#onDispose();
    }
  }
}

/**
 * High-level worker-backed PDF page.
 */
export class WorkerPDFiumPage extends AsyncDisposable {
  readonly #proxy: WorkerProxy;
  readonly #pageId: string;
  readonly #onDispose: () => void;

  /**
   * Zero-based page index.
   */
  readonly index: number;
  /**
   * Page width in points.
   */
  readonly width: number;
  /**
   * Page height in points.
   */
  readonly height: number;

  /** @internal */
  constructor(proxy: WorkerProxy, pageId: string, index: number, width: number, height: number, onDispose: () => void) {
    super('WorkerPDFiumPage', PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    this.#proxy = proxy;
    this.#pageId = pageId;
    this.index = index;
    this.width = width;
    this.height = height;
    this.#onDispose = onDispose;
  }

  /**
   * Internal page ID used by the worker protocol.
   */
  get id(): string {
    return this.#pageId;
  }

  /**
   * Render this page.
   */
  async render(options: RenderOptions = {}, onProgress?: ProgressCallback): Promise<RenderResult> {
    this.ensureNotDisposed();
    return this.#proxy.renderPage(this.#pageId, options, onProgress);
  }

  /**
   * Extract text from this page.
   */
  async getText(): Promise<string> {
    this.ensureNotDisposed();
    return this.#proxy.getText(this.#pageId);
  }

  /**
   * Extract text and text rectangles from this page.
   */
  async getTextLayout(): Promise<{ text: string; rects: Float32Array }> {
    this.ensureNotDisposed();
    return this.#proxy.getTextLayout(this.#pageId);
  }

  protected async disposeInternalAsync(): Promise<void> {
    try {
      await this.#proxy.closePage(this.#pageId);
    } catch (error) {
      if (
        !(
          error instanceof PDFiumError &&
          (error.code === PDFiumErrorCode.PAGE_ALREADY_CLOSED || error.code === PDFiumErrorCode.DOC_ALREADY_CLOSED)
        )
      ) {
        throw error;
      }
    } finally {
      this.#onDispose();
    }
  }
}

export type WorkerProtocolRequest = WorkerRequest;
export type WorkerProtocolResponse = WorkerResponse;
