/**
 * Worker proxy for off-main-thread PDF processing.
 *
 * This class provides a Promise-based API for communicating with the PDF worker.
 *
 * @module context/worker-proxy
 */

import { AsyncDisposable } from '../core/disposable.js';
import { isNodeEnvironment } from '../core/env.js';
import { InitialisationError, PDFiumError, PDFiumErrorCode, WorkerError } from '../core/errors.js';
import { getLogger } from '../core/logger.js';
import type {
  AnnotationColourType,
  AnnotationType,
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
  PageRotation,
  ProgressCallback,
  Rect,
  RenderOptions,
  RenderResult,
  SaveOptions,
  SerialisedError,
  ShapeStyle,
  StructureElement,
  TextSearchFlags,
  TextSearchResult,
  ViewerPreferences,
  WebLink,
} from '../core/types.js';
import type {
  ApplyRedactionsResponse,
  BuilderAddPageResponse,
  BuilderLoadStandardFontResponse,
  CharAtPosResponse,
  CreateDocumentBuilderResponse,
  CreateNUpResponse,
  DocumentInfoResponse,
  ExtendedDocumentInfoResponse,
  LoadPageResponse,
  OpenDocumentResponse,
  PageInfoResponse,
  PageSizeResponse,
  RenderPageResponse,
  SerialisedAnnotation,
  SerialisedAttachment,
  SerialisedFormWidget,
  SerialisedLink,
  SerialisedPageObject,
  SerialisedQuadPoints,
  SerialisedSignature,
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
  /** Custom factory to create the worker transport (useful for testing or Node.js) */
  workerFactory?: (url: string | URL) => WorkerTransport;
}

/**
 * Minimal message event used by WorkerTransport.
 */
export interface WorkerMessageEvent<T> {
  data: T;
}

/**
 * Minimal error event used by WorkerTransport.
 */
export interface WorkerErrorEvent {
  message?: string;
}

/**
 * Minimal worker transport abstraction shared by browser Worker and Node worker_threads.
 */
export interface WorkerTransport {
  onmessage: ((event: WorkerMessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: WorkerErrorEvent) => void) | null;
  postMessage(data: WorkerRequest, transfer?: readonly unknown[]): void;
  terminate(): void;
}

function importRuntimeModule<T>(specifier: string): Promise<T> {
  return import(/* @vite-ignore */ specifier) as Promise<T>;
}

async function createNodeWorkerTransport(workerUrl: string | URL): Promise<WorkerTransport> {
  const workerThreads = await importRuntimeModule<typeof import('node:worker_threads')>('node:worker_threads');
  // Do not inherit parent CLI flags (e.g. --input-type) that can break worker startup.
  const nodeWorker = new workerThreads.Worker(workerUrl, { execArgv: [] });
  let terminated = false;

  const transport: WorkerTransport = {
    onmessage: null,
    onerror: null,
    postMessage: (data, transfer = []) => {
      nodeWorker.postMessage(data, transfer as []);
    },
    terminate: () => {
      terminated = true;
      void nodeWorker.terminate();
    },
  };

  nodeWorker.on('message', (data: unknown) => {
    transport.onmessage?.({ data: data as WorkerResponse });
  });

  nodeWorker.on('error', (error: Error) => {
    transport.onerror?.({ message: error.message });
  });

  nodeWorker.on('messageerror', () => {
    transport.onerror?.({ message: 'Worker message deserialisation failed' });
  });

  nodeWorker.on('exit', (code: number) => {
    if (terminated) {
      return;
    }
    const message = code === 0 ? 'Worker exited unexpectedly' : `Worker exited with code ${String(code)}`;
    transport.onerror?.({ message });
  });

  return transport;
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
  readonly #worker: WorkerTransport;
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

  private constructor(worker: WorkerTransport, timeout: number, renderTimeout: number, destroyTimeout: number) {
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

    let worker: WorkerTransport;
    try {
      if (options?.workerFactory) {
        worker = options.workerFactory(workerUrl);
      } else if (typeof globalThis.Worker === 'function') {
        // Browser / Web Worker compatible runtime
        const BrowserWorker = globalThis.Worker as unknown as new (
          url: string | URL,
          options?: { type?: string },
        ) => WorkerTransport;
        worker = new BrowserWorker(workerUrl, { type: 'module' });
      } else if (isNodeEnvironment()) {
        // Node.js main thread fallback using worker_threads
        worker = await createNodeWorkerTransport(workerUrl);
      } else {
        throw new Error('No global Worker constructor available and not running in Node.js');
      }
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
        await proxy.#sendRequest<void>('INIT', { wasmBinary }, [wasmBinary], timeout);
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
   * Render a page in one round-trip: load, render, close — all inside the worker.
   *
   * Eliminates 2 round-trips compared to loadPage → renderPage → closePage.
   */
  async renderPageStandalone(
    documentId: string,
    pageIndex: number,
    options: RenderOptions = {},
    onProgress?: ProgressCallback,
  ): Promise<RenderResult> {
    const response = await this.#sendRequest<RenderPageResponse>(
      'RENDER_PAGE_STANDALONE',
      { documentId, pageIndex, options },
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
   * Get text rects from a page.
   *
   * @param pageId - Page ID
   * @returns Object with text and flat array of coordinates [left, right, bottom, top]
   */
  async getTextLayout(pageId: string): Promise<{ text: string; rects: Float32Array }> {
    return this.#sendRequest('GET_TEXT_LAYOUT', { pageId });
  }

  // ────────────────────────────────────────────────────────────
  // Document-level queries
  // ────────────────────────────────────────────────────────────

  async getDocumentInfo(documentId: string): Promise<DocumentInfoResponse> {
    return this.#sendRequest<DocumentInfoResponse>('GET_DOCUMENT_INFO', { documentId });
  }

  async getBookmarks(documentId: string): Promise<Bookmark[]> {
    return this.#sendRequest<Bookmark[]>('GET_BOOKMARKS', { documentId });
  }

  async getAttachments(documentId: string): Promise<SerialisedAttachment[]> {
    return this.#sendRequest<SerialisedAttachment[]>('GET_ATTACHMENTS', { documentId });
  }

  async getNamedDestinations(documentId: string): Promise<NamedDestination[]> {
    return this.#sendRequest<NamedDestination[]>('GET_NAMED_DESTINATIONS', { documentId });
  }

  async getNamedDestinationByName(documentId: string, name: string): Promise<NamedDestination | null> {
    return this.#sendRequest<NamedDestination | null>('GET_NAMED_DEST_BY_NAME', { documentId, name });
  }

  async getPageLabel(documentId: string, pageIndex: number): Promise<string | null> {
    return this.#sendRequest<string | null>('GET_PAGE_LABEL', { documentId, pageIndex });
  }

  async saveDocument(documentId: string, options?: SaveOptions): Promise<ArrayBuffer> {
    return this.#sendRequest<ArrayBuffer>('SAVE_DOCUMENT', { documentId, options });
  }

  // ────────────────────────────────────────────────────────────
  // Page-level read queries
  // ────────────────────────────────────────────────────────────

  async getPageInfo(pageId: string): Promise<PageInfoResponse> {
    return this.#sendRequest<PageInfoResponse>('GET_PAGE_INFO', { pageId });
  }

  async getAnnotations(pageId: string): Promise<SerialisedAnnotation[]> {
    return this.#sendRequest<SerialisedAnnotation[]>('GET_ANNOTATIONS', { pageId });
  }

  async getPageObjects(pageId: string): Promise<SerialisedPageObject[]> {
    return this.#sendRequest<SerialisedPageObject[]>('GET_PAGE_OBJECTS', { pageId });
  }

  async getLinks(pageId: string): Promise<SerialisedLink[]> {
    return this.#sendRequest<SerialisedLink[]>('GET_LINKS', { pageId });
  }

  async getWebLinks(pageId: string): Promise<WebLink[]> {
    return this.#sendRequest<WebLink[]>('GET_WEB_LINKS', { pageId });
  }

  async getStructureTree(pageId: string): Promise<StructureElement[] | null> {
    return this.#sendRequest<StructureElement[] | null>('GET_STRUCTURE_TREE', { pageId });
  }

  async getCharAtPos(pageId: string, x: number, y: number): Promise<CharAtPosResponse | null> {
    return this.#sendRequest<CharAtPosResponse | null>('GET_CHAR_AT_POS', { pageId, x, y });
  }

  async getTextInRect(pageId: string, left: number, top: number, right: number, bottom: number): Promise<string> {
    return this.#sendRequest<string>('GET_TEXT_IN_RECT', { pageId, left, top, right, bottom });
  }

  async findText(pageId: string, query: string, flags?: TextSearchFlags): Promise<TextSearchResult[]> {
    return this.#sendRequest<TextSearchResult[]>('FIND_TEXT', { pageId, query, flags });
  }

  async getCharacterInfo(pageId: string, charIndex: number): Promise<CharacterInfo | undefined> {
    return this.#sendRequest<CharacterInfo | undefined>('GET_CHARACTER_INFO', { pageId, charIndex });
  }

  async getCharBox(pageId: string, charIndex: number): Promise<CharBox | undefined> {
    return this.#sendRequest<CharBox | undefined>('GET_CHAR_BOX', { pageId, charIndex });
  }

  // ────────────────────────────────────────────────────────────
  // Page-level mutations
  // ────────────────────────────────────────────────────────────

  async flattenPage(pageId: string, flags?: FlattenFlags): Promise<FlattenResult> {
    return this.#sendRequest<FlattenResult>('FLATTEN_PAGE', { pageId, flags });
  }

  async applyRedactions(
    pageId: string,
    fillColour?: Colour,
    removeIntersectingAnnotations?: boolean,
  ): Promise<ApplyRedactionsResponse> {
    return this.#sendRequest<ApplyRedactionsResponse>('APPLY_REDACTIONS', {
      pageId,
      fillColour,
      removeIntersectingAnnotations,
    });
  }

  async getFormWidgets(pageId: string): Promise<SerialisedFormWidget[]> {
    return this.#sendRequest<SerialisedFormWidget[]>('GET_FORM_WIDGETS', { pageId });
  }

  // ────────────────────────────────────────────────────────────
  // Form operations
  // ────────────────────────────────────────────────────────────

  async getFormSelectedText(pageId: string): Promise<string | null> {
    return this.#sendRequest<string | null>('GET_FORM_SELECTED_TEXT', { pageId });
  }

  async canFormUndo(pageId: string): Promise<boolean> {
    return this.#sendRequest<boolean>('CAN_FORM_UNDO', { pageId });
  }

  async formUndo(pageId: string): Promise<boolean> {
    return this.#sendRequest<boolean>('FORM_UNDO', { pageId });
  }

  async killFormFocus(documentId: string): Promise<boolean> {
    return this.#sendRequest<boolean>('KILL_FORM_FOCUS', { documentId });
  }

  // ────────────────────────────────────────────────────────────
  // Document operations
  // ────────────────────────────────────────────────────────────

  async setFormHighlight(documentId: string, fieldType: FormFieldType, colour: Colour, alpha: number): Promise<void> {
    return this.#sendRequest<void>('SET_FORM_HIGHLIGHT', { documentId, fieldType, colour, alpha });
  }

  async importPages(targetDocId: string, sourceDocId: string, options?: ImportPagesOptions): Promise<void> {
    return this.#sendRequest<void>('IMPORT_PAGES', { targetDocId, sourceDocId, options });
  }

  async createNUp(documentId: string, options: NUpLayoutOptions): Promise<CreateNUpResponse> {
    return this.#sendRequest<CreateNUpResponse>('CREATE_N_UP', { documentId, options });
  }

  async getAllPageDimensions(documentId: string): Promise<Array<{ width: number; height: number }>> {
    return this.#sendRequest<Array<{ width: number; height: number }>>('GET_ALL_PAGE_DIMENSIONS', { documentId });
  }

  // ────────────────────────────────────────────────────────────
  // Builder operations
  // ────────────────────────────────────────────────────────────

  async createDocumentBuilder(): Promise<CreateDocumentBuilderResponse> {
    return this.#sendRequest<CreateDocumentBuilderResponse>('CREATE_DOCUMENT_BUILDER', {});
  }

  async disposeDocumentBuilder(builderId: string): Promise<void> {
    return this.#sendRequest<void>('DISPOSE_DOCUMENT_BUILDER', { builderId });
  }

  async builderAddPage(
    builderId: string,
    options?: { width?: number; height?: number },
  ): Promise<BuilderAddPageResponse> {
    return this.#sendRequest<BuilderAddPageResponse>('BUILDER_ADD_PAGE', { builderId, options });
  }

  async builderLoadStandardFont(builderId: string, fontName: string): Promise<BuilderLoadStandardFontResponse> {
    return this.#sendRequest<BuilderLoadStandardFontResponse>('BUILDER_LOAD_STANDARD_FONT', { builderId, fontName });
  }

  async builderPageAddRectangle(
    pageBuilderId: string,
    x: number,
    y: number,
    w: number,
    h: number,
    style?: ShapeStyle,
  ): Promise<void> {
    return this.#sendRequest<void>('BUILDER_PAGE_ADD_RECTANGLE', { pageBuilderId, x, y, w, h, style });
  }

  async builderPageAddText(
    pageBuilderId: string,
    text: string,
    x: number,
    y: number,
    fontId: string,
    fontSize: number,
    colour?: Colour,
  ): Promise<void> {
    return this.#sendRequest<void>('BUILDER_PAGE_ADD_TEXT', {
      pageBuilderId,
      text,
      x,
      y,
      fontId,
      fontSize,
      colour,
    });
  }

  async builderPageAddLine(
    pageBuilderId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style?: ShapeStyle,
  ): Promise<void> {
    return this.#sendRequest<void>('BUILDER_PAGE_ADD_LINE', { pageBuilderId, x1, y1, x2, y2, style });
  }

  async builderPageAddEllipse(
    pageBuilderId: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    style?: ShapeStyle,
  ): Promise<void> {
    return this.#sendRequest<void>('BUILDER_PAGE_ADD_ELLIPSE', { pageBuilderId, cx, cy, rx, ry, style });
  }

  async builderSave(builderId: string, options?: SaveOptions): Promise<ArrayBuffer> {
    return this.#sendRequest<ArrayBuffer>('BUILDER_SAVE', { builderId, options });
  }

  async getMetadata(documentId: string): Promise<DocumentMetadata> {
    return this.#sendRequest<DocumentMetadata>('GET_METADATA', { documentId });
  }

  async getPermissions(documentId: string): Promise<DocumentPermissions> {
    return this.#sendRequest<DocumentPermissions>('GET_PERMISSIONS', { documentId });
  }

  async getViewerPreferences(documentId: string): Promise<ViewerPreferences> {
    return this.#sendRequest<ViewerPreferences>('GET_VIEWER_PREFERENCES', { documentId });
  }

  async getJavaScriptActions(documentId: string): Promise<JavaScriptAction[]> {
    return this.#sendRequest<JavaScriptAction[]>('GET_JAVASCRIPT_ACTIONS', { documentId });
  }

  async getSignatures(documentId: string): Promise<SerialisedSignature[]> {
    return this.#sendRequest<SerialisedSignature[]>('GET_SIGNATURES', { documentId });
  }

  async getPrintPageRanges(documentId: string): Promise<number[] | undefined> {
    return this.#sendRequest<number[] | undefined>('GET_PRINT_PAGE_RANGES', { documentId });
  }

  async getExtendedDocumentInfo(documentId: string): Promise<ExtendedDocumentInfoResponse> {
    return this.#sendRequest<ExtendedDocumentInfoResponse>('GET_EXTENDED_DOCUMENT_INFO', { documentId });
  }

  // ────────────────────────────────────────────────────────────
  // Annotation mutations
  // ────────────────────────────────────────────────────────────

  async createAnnotation(pageId: string, subtype: AnnotationType): Promise<SerialisedAnnotation> {
    return this.#sendRequest<SerialisedAnnotation>('CREATE_ANNOTATION', { pageId, subtype });
  }

  async removeAnnotation(pageId: string, annotationIndex: number): Promise<boolean> {
    return this.#sendRequest<boolean>('REMOVE_ANNOTATION', { pageId, annotationIndex });
  }

  async setAnnotationRect(pageId: string, annotationIndex: number, rect: Rect): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_RECT', { pageId, annotationIndex, rect });
  }

  async setAnnotationColour(
    pageId: string,
    annotationIndex: number,
    colourType: AnnotationColourType,
    colour: Colour,
  ): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_COLOUR', { pageId, annotationIndex, colourType, colour });
  }

  async setAnnotationFlags(pageId: string, annotationIndex: number, flags: number): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_FLAGS', { pageId, annotationIndex, flags });
  }

  async setAnnotationString(pageId: string, annotationIndex: number, key: string, value: string): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_STRING', { pageId, annotationIndex, key, value });
  }

  async setAnnotationBorder(
    pageId: string,
    annotationIndex: number,
    hRadius: number,
    vRadius: number,
    borderWidth: number,
  ): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_BORDER', {
      pageId,
      annotationIndex,
      hRadius,
      vRadius,
      borderWidth,
    });
  }

  async setAnnotationAttachmentPoints(
    pageId: string,
    annotationIndex: number,
    quadIndex: number,
    points: SerialisedQuadPoints,
  ): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_ATTACHMENT_POINTS', {
      pageId,
      annotationIndex,
      quadIndex,
      points,
    });
  }

  async appendAnnotationAttachmentPoints(
    pageId: string,
    annotationIndex: number,
    points: SerialisedQuadPoints,
  ): Promise<boolean> {
    return this.#sendRequest<boolean>('APPEND_ANNOTATION_ATTACHMENT_POINTS', {
      pageId,
      annotationIndex,
      points,
    });
  }

  async setAnnotationURI(pageId: string, annotationIndex: number, uri: string): Promise<boolean> {
    return this.#sendRequest<boolean>('SET_ANNOTATION_URI', { pageId, annotationIndex, uri });
  }

  async addInkStroke(
    pageId: string,
    annotationIndex: number,
    points: Array<{ x: number; y: number }>,
  ): Promise<number> {
    return this.#sendRequest<number>('ADD_INK_STROKE', { pageId, annotationIndex, points });
  }

  async generatePageContent(pageId: string): Promise<boolean> {
    return this.#sendRequest<boolean>('GENERATE_PAGE_CONTENT', { pageId });
  }

  // ────────────────────────────────────────────────────────────
  // Page management operations
  // ────────────────────────────────────────────────────────────

  async deletePage(documentId: string, pageIndex: number): Promise<void> {
    return this.#sendRequest<void>('DELETE_PAGE', { documentId, pageIndex });
  }

  async insertBlankPage(documentId: string, pageIndex: number, width: number, height: number): Promise<void> {
    return this.#sendRequest<void>('INSERT_BLANK_PAGE', { documentId, pageIndex, width, height });
  }

  async movePages(documentId: string, pageIndices: number[], destPageIndex: number): Promise<void> {
    return this.#sendRequest<void>('MOVE_PAGES', { documentId, pageIndices, destPageIndex });
  }

  async setPageRotation(pageId: string, rotation: PageRotation): Promise<void> {
    return this.#sendRequest<void>('SET_PAGE_ROTATION', { pageId, rotation });
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
  #handleMessage(event: WorkerMessageEvent<WorkerResponse>): void {
    const response = event.data;
    const { type, id } = response;

    const pending = this.#pending.get(id);
    if (pending === undefined) {
      if (__DEV__) console.warn(`[PDFium] Received response for unknown request ID: ${id}`);
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
  #handleError(error: WorkerErrorEvent): void {
    const workerError = new WorkerError(
      PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
      `Worker error: ${error.message ?? 'Unknown worker error'}`,
    );

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
        getLogger().warn('Worker DESTROY error:', error);
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
