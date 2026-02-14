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
import type {
  Bookmark,
  CharacterInfo,
  CharBox,
  Colour,
  DocumentMetadata,
  DocumentPermissions,
  FlattenFlags,
  FlattenResult,
  FormFieldType,
  ImportPagesOptions,
  JavaScriptAction,
  NamedDestination,
  NUpLayoutOptions,
  OpenDocumentOptions,
  ProgressCallback,
  RenderOptions,
  RenderResult,
  SaveOptions,
  StructureElement,
  TextSearchFlags,
  TextSearchResult,
  ViewerPreferences,
  WebLink,
} from '../core/types.js';
import type {
  CharAtPosResponse,
  DocumentInfoResponse,
  ExtendedDocumentInfoResponse,
  PageInfoResponse,
  SerialisedAnnotation,
  SerialisedAttachment,
  SerialisedFormWidget,
  SerialisedLink,
  SerialisedPageObject,
  SerialisedSignature,
  WorkerRequest,
  WorkerResponse,
} from './protocol.js';
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
   * Uses a single worker round-trip to load, render, and close the page
   * (instead of 3 sequential round-trips).
   */
  async renderPage(
    pageIndex: number,
    options: RenderOptions = {},
    onProgress?: ProgressCallback,
  ): Promise<RenderResult> {
    this.ensureNotDisposed();
    return this.#proxy.renderPageStandalone(this.#documentId, pageIndex, options, onProgress);
  }

  // ────────────────────────────────────────────────────────────
  // Document-level queries
  // ────────────────────────────────────────────────────────────

  async getDocumentInfo(): Promise<DocumentInfoResponse> {
    this.ensureNotDisposed();
    return this.#proxy.getDocumentInfo(this.#documentId);
  }

  async getBookmarks(): Promise<Bookmark[]> {
    this.ensureNotDisposed();
    return this.#proxy.getBookmarks(this.#documentId);
  }

  async getAttachments(): Promise<SerialisedAttachment[]> {
    this.ensureNotDisposed();
    return this.#proxy.getAttachments(this.#documentId);
  }

  async getNamedDestinations(): Promise<NamedDestination[]> {
    this.ensureNotDisposed();
    return this.#proxy.getNamedDestinations(this.#documentId);
  }

  async getNamedDestinationByName(name: string): Promise<NamedDestination | null> {
    this.ensureNotDisposed();
    return this.#proxy.getNamedDestinationByName(this.#documentId, name);
  }

  async getPageLabel(pageIndex: number): Promise<string | null> {
    this.ensureNotDisposed();
    return this.#proxy.getPageLabel(this.#documentId, pageIndex);
  }

  async getAllPageDimensions(): Promise<Array<{ width: number; height: number }>> {
    this.ensureNotDisposed();
    return this.#proxy.getAllPageDimensions(this.#documentId);
  }

  async save(options?: SaveOptions): Promise<Uint8Array> {
    this.ensureNotDisposed();
    const buffer = await this.#proxy.saveDocument(this.#documentId, options);
    return new Uint8Array(buffer);
  }

  async killFormFocus(): Promise<boolean> {
    this.ensureNotDisposed();
    return this.#proxy.killFormFocus(this.#documentId);
  }

  async setFormHighlight(fieldType: FormFieldType, colour: Colour, alpha: number): Promise<void> {
    this.ensureNotDisposed();
    return this.#proxy.setFormHighlight(this.#documentId, fieldType, colour, alpha);
  }

  async importPages(sourceDocument: WorkerPDFiumDocument, options?: ImportPagesOptions): Promise<void> {
    this.ensureNotDisposed();
    return this.#proxy.importPages(this.#documentId, sourceDocument.id, options);
  }

  async createNUp(options: NUpLayoutOptions): Promise<WorkerPDFiumDocument> {
    this.ensureNotDisposed();
    const response = await this.#proxy.createNUp(this.#documentId, options);
    const document = new WorkerPDFiumDocument(this.#proxy, response.documentId, response.pageCount, () => {
      // The new document is independent — no parent tracking needed
    });
    return document;
  }

  async getMetadata(): Promise<DocumentMetadata> {
    this.ensureNotDisposed();
    return this.#proxy.getMetadata(this.#documentId);
  }

  async getPermissions(): Promise<DocumentPermissions> {
    this.ensureNotDisposed();
    return this.#proxy.getPermissions(this.#documentId);
  }

  async getViewerPreferences(): Promise<ViewerPreferences> {
    this.ensureNotDisposed();
    return this.#proxy.getViewerPreferences(this.#documentId);
  }

  async getJavaScriptActions(): Promise<JavaScriptAction[]> {
    this.ensureNotDisposed();
    return this.#proxy.getJavaScriptActions(this.#documentId);
  }

  async getSignatures(): Promise<SerialisedSignature[]> {
    this.ensureNotDisposed();
    return this.#proxy.getSignatures(this.#documentId);
  }

  async getPrintPageRanges(): Promise<number[] | undefined> {
    this.ensureNotDisposed();
    return this.#proxy.getPrintPageRanges(this.#documentId);
  }

  async getExtendedDocumentInfo(): Promise<ExtendedDocumentInfoResponse> {
    this.ensureNotDisposed();
    return this.#proxy.getExtendedDocumentInfo(this.#documentId);
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

  // ────────────────────────────────────────────────────────────
  // Page-level queries
  // ────────────────────────────────────────────────────────────

  async getPageInfo(): Promise<PageInfoResponse> {
    this.ensureNotDisposed();
    return this.#proxy.getPageInfo(this.#pageId);
  }

  async getAnnotations(): Promise<SerialisedAnnotation[]> {
    this.ensureNotDisposed();
    return this.#proxy.getAnnotations(this.#pageId);
  }

  async getPageObjects(): Promise<SerialisedPageObject[]> {
    this.ensureNotDisposed();
    return this.#proxy.getPageObjects(this.#pageId);
  }

  async getLinks(): Promise<SerialisedLink[]> {
    this.ensureNotDisposed();
    return this.#proxy.getLinks(this.#pageId);
  }

  async getWebLinks(): Promise<WebLink[]> {
    this.ensureNotDisposed();
    return this.#proxy.getWebLinks(this.#pageId);
  }

  async getStructureTree(): Promise<StructureElement[] | null> {
    this.ensureNotDisposed();
    return this.#proxy.getStructureTree(this.#pageId);
  }

  async getCharAtPos(x: number, y: number): Promise<CharAtPosResponse | null> {
    this.ensureNotDisposed();
    return this.#proxy.getCharAtPos(this.#pageId, x, y);
  }

  async getTextInRect(left: number, top: number, right: number, bottom: number): Promise<string> {
    this.ensureNotDisposed();
    return this.#proxy.getTextInRect(this.#pageId, left, top, right, bottom);
  }

  async findText(query: string, flags?: TextSearchFlags): Promise<TextSearchResult[]> {
    this.ensureNotDisposed();
    return this.#proxy.findText(this.#pageId, query, flags);
  }

  async getCharacterInfo(charIndex: number): Promise<CharacterInfo | undefined> {
    this.ensureNotDisposed();
    return this.#proxy.getCharacterInfo(this.#pageId, charIndex);
  }

  async getCharBox(charIndex: number): Promise<CharBox | undefined> {
    this.ensureNotDisposed();
    return this.#proxy.getCharBox(this.#pageId, charIndex);
  }

  // ────────────────────────────────────────────────────────────
  // Page-level mutations
  // ────────────────────────────────────────────────────────────

  async flatten(flags?: FlattenFlags): Promise<FlattenResult> {
    this.ensureNotDisposed();
    return this.#proxy.flattenPage(this.#pageId, flags);
  }

  async getFormWidgets(): Promise<SerialisedFormWidget[]> {
    this.ensureNotDisposed();
    return this.#proxy.getFormWidgets(this.#pageId);
  }

  // ────────────────────────────────────────────────────────────
  // Form operations
  // ────────────────────────────────────────────────────────────

  async getFormSelectedText(): Promise<string | null> {
    this.ensureNotDisposed();
    return this.#proxy.getFormSelectedText(this.#pageId);
  }

  async canFormUndo(): Promise<boolean> {
    this.ensureNotDisposed();
    return this.#proxy.canFormUndo(this.#pageId);
  }

  async formUndo(): Promise<boolean> {
    this.ensureNotDisposed();
    return this.#proxy.formUndo(this.#pageId);
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
