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
import type {
  Colour,
  FlattenFlags,
  FormFieldType,
  ImportPagesOptions,
  NUpLayoutOptions,
  SaveOptions,
  SerialisedError,
  TextSearchFlags,
} from '../core/types.js';
import { AnnotationAppearanceMode, PageBoxType, PathFillMode } from '../core/types.js';
import type { PDFiumAnnotation } from '../document/annotation.js';
import type { PDFiumDocument } from '../document/document.js';
import type { PDFiumPage } from '../document/page.js';
import {
  PDFiumImageObject,
  type PDFiumPageObject,
  PDFiumPathObject,
  PDFiumTextObject,
} from '../document/page-object.js';
import { PDFium } from '../pdfium.js';
import type {
  CharAtPosResponse,
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
  SerialisedSignature,
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

// ────────────────────────────────────────────────────────────
// Lookup helpers
// ────────────────────────────────────────────────────────────

function lookupDocument(id: string, documentId: string): PDFiumDocument | undefined {
  const document = state.documents.get(documentId);
  if (document === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: `Document ${documentId} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
  }
  return document;
}

function lookupPage(id: string, pageId: string): PDFiumPage | undefined {
  const page = state.pages.get(pageId);
  if (page === undefined) {
    postError(id, {
      name: 'PageError',
      message: `Page ${pageId} not found`,
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
  }
  return page;
}

// ────────────────────────────────────────────────────────────
// Serialisation helpers
// ────────────────────────────────────────────────────────────

function serialiseAnnotation(annot: PDFiumAnnotation, index: number): SerialisedAnnotation {
  const strokeColour = annot.getColour('stroke');
  const interiorColour = annot.getColour('interior');
  const border = annot.getBorder();
  const appearance = annot.getAppearance(AnnotationAppearanceMode.Normal);
  const line = annot.getLine();
  const vertices = annot.getVertices();
  const fontSize = annot.getFontSize();

  // Ink paths
  let inkPaths: Array<Array<{ x: number; y: number }>> | undefined;
  const inkPathCount = annot.inkPathCount;
  if (inkPathCount > 0) {
    inkPaths = [];
    for (let p = 0; p < inkPathCount; p++) {
      const path = annot.getInkPath(p);
      if (path) {
        inkPaths.push(path);
      }
    }
  }

  // Attachment points (quad points)
  let attachmentPoints: SerialisedAnnotation['attachmentPoints'];
  const quadCount = annot.attachmentPointCount;
  if (quadCount > 0) {
    attachmentPoints = [];
    for (let q = 0; q < quadCount; q++) {
      const quad = annot.getAttachmentPoints(q);
      if (quad) {
        attachmentPoints.push({
          x1: quad.x1,
          y1: quad.y1,
          x2: quad.x2,
          y2: quad.y2,
          x3: quad.x3,
          y3: quad.y3,
          x4: quad.x4,
          y4: quad.y4,
        });
      }
    }
  }

  // Widget data
  let widget: SerialisedAnnotation['widget'];
  if (annot.isWidget()) {
    widget = {
      fieldType: annot.getFormFieldType(),
      fieldName: annot.getFormFieldName() ?? '',
      fieldValue: annot.getFormFieldValue() ?? '',
      alternateName: annot.getFormFieldAlternateName() ?? '',
      exportValue: annot.getFormFieldExportValue() ?? '',
      fieldFlags: annot.getFormFieldFlags(),
      options: annot.getFormFieldOptions() ?? [],
    };
  }

  // Link data
  let link: SerialisedAnnotation['link'];
  const linkData = annot.getLink();
  if (linkData) {
    link = {
      action: linkData.action
        ? {
            type: linkData.action.type,
            uri: linkData.action.uri,
            filePath: linkData.action.filePath,
          }
        : undefined,
      destination: linkData.destination
        ? {
            pageIndex: linkData.destination.pageIndex,
            fitType: linkData.destination.fitType,
            x: linkData.destination.x,
            y: linkData.destination.y,
            zoom: linkData.destination.zoom,
          }
        : undefined,
    };
  }

  return {
    index,
    type: annot.type,
    bounds: annot.bounds,
    colour: { stroke: strokeColour ?? undefined, interior: interiorColour ?? undefined },
    flags: annot.flags,
    contents: annot.getStringValue('Contents') ?? '',
    author: annot.getStringValue('T') ?? '',
    subject: annot.getStringValue('Subj') ?? '',
    border: border ?? null,
    appearance: appearance ?? null,
    fontSize: fontSize ?? 0,
    line: line ? { start: { x: line.startX, y: line.startY }, end: { x: line.endX, y: line.endY } } : undefined,
    vertices: vertices ?? undefined,
    inkPaths,
    attachmentPoints,
    widget,
    link,
  };
}

function serialisePageObject(obj: PDFiumPageObject): SerialisedPageObject {
  const matrix = obj.matrix ?? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const marks = obj.marks;

  let text: SerialisedPageObject['text'];
  let image: SerialisedPageObject['image'];
  let path: SerialisedPageObject['path'];

  if (obj instanceof PDFiumTextObject) {
    using font = obj.getFont();
    const fontInfo = font?.getInfo();
    const fontMetrics = font?.getMetrics(obj.fontSize);
    text = {
      text: obj.text,
      fontSize: obj.fontSize,
      fontName: fontInfo?.fontName ?? '',
      familyName: fontInfo?.familyName ?? '',
      weight: fontInfo?.weight ?? 0,
      isEmbedded: fontInfo?.isEmbedded ?? false,
      italicAngle: fontInfo?.italicAngle ?? 0,
      fontFlags: fontInfo?.flags ?? 0,
      metrics: {
        ascent: fontMetrics?.ascent ?? 0,
        descent: fontMetrics?.descent ?? 0,
      },
    };
  } else if (obj instanceof PDFiumImageObject) {
    const metadata = obj.getMetadata();
    image = {
      width: obj.width,
      height: obj.height,
      metadata: metadata ?? {
        width: obj.width,
        height: obj.height,
        bitsPerPixel: 0,
        colourSpace: 'Unknown' as import('../core/types.js').ImageColourSpace,
        horizontalDpi: 0,
        verticalDpi: 0,
        markedContent: 'None' as import('../core/types.js').ImageMarkedContentType,
      },
    };
  } else if (obj instanceof PDFiumPathObject) {
    const segCount = obj.segmentCount;
    const segments: import('./protocol.js').SerialisedPathSegment[] = [];
    for (let s = 0; s < segCount; s++) {
      const seg = obj.getSegment(s);
      if (seg) {
        const pt = seg.point;
        segments.push({
          type: seg.type,
          x: pt?.x ?? 0,
          y: pt?.y ?? 0,
          close: seg.isClosing,
        });
      }
    }
    const drawMode = obj.getDrawMode();
    path = {
      segmentCount: segCount,
      segments,
      drawMode: { fill: drawMode?.fillMode ?? PathFillMode.None, stroke: drawMode?.stroke ?? false },
      strokeWidth: obj.strokeWidth ?? 0,
      lineCap: obj.lineCap,
      lineJoin: obj.lineJoin,
    };
  }

  return {
    type: obj.type,
    bounds: obj.bounds,
    matrix,
    marks,
    text,
    image,
    path,
  };
}

function serialiseLink(link: import('../core/types.js').PDFLink): SerialisedLink {
  return {
    index: link.index,
    bounds: link.bounds,
    action: link.action ? { type: link.action.type, uri: link.action.uri, filePath: link.action.filePath } : undefined,
    destination: link.destination
      ? {
          pageIndex: link.destination.pageIndex,
          fitType: link.destination.fitType,
          x: link.destination.x,
          y: link.destination.y,
          zoom: link.destination.zoom,
        }
      : undefined,
  };
}

// ────────────────────────────────────────────────────────────
// Existing handlers
// ────────────────────────────────────────────────────────────

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
 * Handle standalone render: load page, render, close — all in one message.
 *
 * Eliminates 2 round-trips compared to LOAD_PAGE → RENDER_PAGE → CLOSE_PAGE.
 */
function handleRenderPageStandalone(
  id: string,
  documentId: string,
  pageIndex: number,
  options: import('../core/types.js').RenderOptions,
): void {
  const document = state.documents.get(documentId);
  if (document === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: `Document ${documentId} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  using page = document.getPage(pageIndex);
  const rendered = page.render(options);

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

// ────────────────────────────────────────────────────────────
// Document-level handlers
// ────────────────────────────────────────────────────────────

/**
 * Handle get document info request.
 */
function handleGetDocumentInfo(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const response: DocumentInfoResponse = {
    isTagged: document.isTagged(),
    hasForm: document.hasForm(),
    formType: document.formType,
    namedDestinationCount: document.namedDestinationCount,
    pageMode: document.pageMode,
  };
  postSuccess(id, response);
}

/**
 * Handle get all page dimensions request.
 */
function handleGetAllPageDimensions(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const dimensions: Array<{ width: number; height: number }> = [];
  for (let i = 0; i < document.pageCount; i++) {
    const page = document.getPage(i);
    try {
      dimensions.push({ width: page.width, height: page.height });
    } finally {
      page.dispose();
    }
  }
  postSuccess(id, dimensions);
}

/**
 * Handle get bookmarks request.
 */
function handleGetBookmarks(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getBookmarks());
}

/**
 * Handle get attachments request.
 */
function handleGetAttachments(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const attachments = document.getAttachments();
  const serialised: SerialisedAttachment[] = [];
  const transferList: ArrayBuffer[] = [];

  for (const att of attachments) {
    // Copy into a fresh ArrayBuffer for transfer — avoids SharedArrayBuffer issues
    const buffer = new ArrayBuffer(att.data.byteLength);
    new Uint8Array(buffer).set(att.data);
    serialised.push({ index: att.index, name: att.name, data: buffer });
    transferList.push(buffer);
  }

  postSuccess(id, serialised, transferList);
}

/**
 * Handle get named destinations request.
 */
function handleGetNamedDestinations(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getNamedDestinations());
}

/**
 * Handle get named destination by name request.
 */
function handleGetNamedDestByName(id: string, documentId: string, name: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const result = document.getNamedDestinationByName(name);
  postSuccess(id, result ?? null);
}

/**
 * Handle get page label request.
 */
function handleGetPageLabel(id: string, documentId: string, pageIndex: number): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getPageLabel(pageIndex) ?? null);
}

/**
 * Handle save document request.
 */
function handleSaveDocument(id: string, documentId: string, options?: SaveOptions): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const bytes = document.save(options ?? {});
  // Copy to a fresh ArrayBuffer — bytes.buffer may be a SharedArrayBuffer (WASM heap)
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  postSuccess(id, buffer, [buffer]);
}

// ────────────────────────────────────────────────────────────
// Page-level read handlers
// ────────────────────────────────────────────────────────────

/**
 * Handle get page info request.
 */
function handleGetPageInfo(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const response: PageInfoResponse = {
    rotation: page.rotation,
    hasTransparency: page.hasTransparency(),
    boundingBox: {
      left: 0,
      bottom: 0,
      right: page.width,
      top: page.height,
    },
    charCount: page.charCount,
    pageBoxes: {
      media: page.getPageBox(PageBoxType.MediaBox),
      crop: page.getPageBox(PageBoxType.CropBox),
      bleed: page.getPageBox(PageBoxType.BleedBox),
      trim: page.getPageBox(PageBoxType.TrimBox),
      art: page.getPageBox(PageBoxType.ArtBox),
    },
  };
  postSuccess(id, response);
}

/**
 * Handle get annotations request.
 */
function handleGetAnnotations(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const result: SerialisedAnnotation[] = [];
  for (using annot of page.annotations()) {
    result.push(serialiseAnnotation(annot, annot.index));
  }
  postSuccess(id, result);
}

/**
 * Handle get page objects request.
 */
function handleGetPageObjects(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const result: SerialisedPageObject[] = [];
  for (const obj of page.objects()) {
    result.push(serialisePageObject(obj));
  }
  postSuccess(id, result);
}

/**
 * Handle get links request.
 */
function handleGetLinks(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const links = page.getLinks();
  postSuccess(id, links.map(serialiseLink));
}

/**
 * Handle get web links request.
 */
function handleGetWebLinks(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.getWebLinks());
}

/**
 * Handle get structure tree request.
 */
function handleGetStructureTree(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.getStructureTree() ?? null);
}

/**
 * Handle get char at pos request (batched).
 */
function handleGetCharAtPos(id: string, pageId: string, x: number, y: number): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const idx = page.getCharIndexAtPos(x, y);
  if (idx < 0) {
    postSuccess(id, null);
    return;
  }

  const info = page.getCharacterInfo(idx);
  const box = page.getCharBox(idx);

  const response: CharAtPosResponse = {
    index: idx,
    info,
    box,
  };
  postSuccess(id, response);
}

/**
 * Handle get text in rect request.
 */
function handleGetTextInRect(
  id: string,
  pageId: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.getTextInRect(left, top, right, bottom));
}

/**
 * Handle find text request.
 */
function handleFindText(id: string, pageId: string, query: string, flags?: TextSearchFlags): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const results = [...page.findText(query, flags)];
  postSuccess(id, results);
}

/**
 * Handle get character info request.
 */
function handleGetCharacterInfo(id: string, pageId: string, charIndex: number): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.getCharacterInfo(charIndex) ?? null);
}

/**
 * Handle get char box request.
 */
function handleGetCharBox(id: string, pageId: string, charIndex: number): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.getCharBox(charIndex) ?? null);
}

// ────────────────────────────────────────────────────────────
// Page-level mutation handlers
// ────────────────────────────────────────────────────────────

/**
 * Handle flatten page request.
 */
function handleFlattenPage(id: string, pageId: string, flags?: FlattenFlags): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.flatten(flags));
}

/**
 * Handle get form widgets request.
 */
function handleGetFormWidgets(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  const widgets: SerialisedFormWidget[] = [];
  for (using annot of page.annotations()) {
    if (annot.isWidget()) {
      widgets.push({
        annotationIndex: annot.index,
        fieldName: annot.getFormFieldName() ?? '',
        fieldType: annot.getFormFieldType(),
        fieldValue: annot.getFormFieldValue() ?? '',
      });
    }
  }
  postSuccess(id, widgets);
}

// ────────────────────────────────────────────────────────────
// Form operation handlers
// ────────────────────────────────────────────────────────────

/**
 * Handle get form selected text request.
 */
function handleGetFormSelectedText(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.getFormSelectedText() ?? null);
}

/**
 * Handle can form undo request.
 */
function handleCanFormUndo(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.canFormUndo());
}

/**
 * Handle form undo request.
 */
function handleFormUndo(id: string, pageId: string): void {
  const page = lookupPage(id, pageId);
  if (!page) return;

  postSuccess(id, page.formUndo());
}

/**
 * Handle kill form focus request.
 */
function handleKillFormFocus(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.killFormFocus());
}

// ────────────────────────────────────────────────────────────
// Document operation handlers
// ────────────────────────────────────────────────────────────

/**
 * Handle set form highlight request.
 */
function handleSetFormHighlight(
  id: string,
  documentId: string,
  fieldType: FormFieldType,
  colour: Colour,
  alpha: number,
): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  document.setFormFieldHighlightColour(fieldType, colour);
  document.setFormFieldHighlightAlpha(alpha);
  postSuccess(id, undefined);
}

/**
 * Handle import pages request.
 */
function handleImportPages(id: string, targetDocId: string, sourceDocId: string, options?: ImportPagesOptions): void {
  const target = lookupDocument(id, targetDocId);
  if (!target) return;

  const source = state.documents.get(sourceDocId);
  if (source === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: `Source document ${sourceDocId} not found`,
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    return;
  }

  target.importPages(source, options ?? {});
  postSuccess(id, undefined);
}

/**
 * Handle create N-up document request.
 */
function handleCreateNUp(id: string, documentId: string, options: NUpLayoutOptions): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const nupDoc = document.createNUpDocument(options);
  if (nupDoc === undefined) {
    postError(id, {
      name: 'DocumentError',
      message: 'Failed to create N-up document',
      code: PDFiumErrorCode.DOC_FORMAT_INVALID,
    });
    return;
  }

  const newDocId = state.nextDocumentId();
  state.documents.set(newDocId, nupDoc);

  const response: CreateNUpResponse = {
    documentId: newDocId,
    pageCount: nupDoc.pageCount,
  };
  postSuccess(id, response);
}

// ────────────────────────────────────────────────────────────
// Extended document-level handlers
// ────────────────────────────────────────────────────────────

/**
 * Handle get metadata request.
 */
function handleGetMetadata(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getMetadata());
}

/**
 * Handle get permissions request.
 */
function handleGetPermissions(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getPermissions());
}

/**
 * Handle get viewer preferences request.
 */
function handleGetViewerPreferences(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getViewerPreferences());
}

/**
 * Handle get JavaScript actions request.
 */
function handleGetJavaScriptActions(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getJavaScriptActions());
}

/**
 * Handle get signatures request.
 */
function handleGetSignatures(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const signatures = document.getSignatures();
  const serialised: SerialisedSignature[] = [];
  const transferList: ArrayBuffer[] = [];

  for (const sig of signatures) {
    let contents: ArrayBuffer | undefined;
    if (sig.contents !== undefined) {
      // Copy into a fresh ArrayBuffer for transfer — avoids SharedArrayBuffer issues
      const buffer = new ArrayBuffer(sig.contents.byteLength);
      new Uint8Array(buffer).set(sig.contents);
      contents = buffer;
      transferList.push(buffer);
    }

    serialised.push({
      index: sig.index,
      contents,
      byteRange: sig.byteRange,
      subFilter: sig.subFilter,
      reason: sig.reason,
      time: sig.time,
      docMDPPermission: sig.docMDPPermission,
    });
  }

  postSuccess(id, serialised, transferList);
}

/**
 * Handle get print page ranges request.
 */
function handleGetPrintPageRanges(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  postSuccess(id, document.getPrintPageRanges());
}

/**
 * Handle get extended document info request.
 */
function handleGetExtendedDocumentInfo(id: string, documentId: string): void {
  const document = lookupDocument(id, documentId);
  if (!document) return;

  const response: ExtendedDocumentInfoResponse = {
    fileVersion: document.fileVersion,
    rawPermissions: document.rawPermissions,
    securityHandlerRevision: document.securityHandlerRevision,
    signatureCount: document.signatureCount,
    hasValidCrossReferenceTable: document.hasValidCrossReferenceTable(),
  };
  postSuccess(id, response);
}

// ────────────────────────────────────────────────────────────
// Lifecycle handlers
// ────────────────────────────────────────────────────────────

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

      case 'RENDER_PAGE_STANDALONE':
        handleRenderPageStandalone(id, request.payload.documentId, request.payload.pageIndex, request.payload.options);
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

      // Document-level queries
      case 'GET_DOCUMENT_INFO':
        handleGetDocumentInfo(id, request.payload.documentId);
        break;

      case 'GET_BOOKMARKS':
        handleGetBookmarks(id, request.payload.documentId);
        break;

      case 'GET_ATTACHMENTS':
        handleGetAttachments(id, request.payload.documentId);
        break;

      case 'GET_NAMED_DESTINATIONS':
        handleGetNamedDestinations(id, request.payload.documentId);
        break;

      case 'GET_NAMED_DEST_BY_NAME':
        handleGetNamedDestByName(id, request.payload.documentId, request.payload.name);
        break;

      case 'GET_PAGE_LABEL':
        handleGetPageLabel(id, request.payload.documentId, request.payload.pageIndex);
        break;

      case 'SAVE_DOCUMENT':
        handleSaveDocument(id, request.payload.documentId, request.payload.options);
        break;

      // Page-level read queries
      case 'GET_PAGE_INFO':
        handleGetPageInfo(id, request.payload.pageId);
        break;

      case 'GET_ANNOTATIONS':
        handleGetAnnotations(id, request.payload.pageId);
        break;

      case 'GET_PAGE_OBJECTS':
        handleGetPageObjects(id, request.payload.pageId);
        break;

      case 'GET_LINKS':
        handleGetLinks(id, request.payload.pageId);
        break;

      case 'GET_WEB_LINKS':
        handleGetWebLinks(id, request.payload.pageId);
        break;

      case 'GET_STRUCTURE_TREE':
        handleGetStructureTree(id, request.payload.pageId);
        break;

      case 'GET_CHAR_AT_POS':
        handleGetCharAtPos(id, request.payload.pageId, request.payload.x, request.payload.y);
        break;

      case 'GET_TEXT_IN_RECT':
        handleGetTextInRect(
          id,
          request.payload.pageId,
          request.payload.left,
          request.payload.top,
          request.payload.right,
          request.payload.bottom,
        );
        break;

      case 'FIND_TEXT':
        handleFindText(id, request.payload.pageId, request.payload.query, request.payload.flags);
        break;

      case 'GET_CHARACTER_INFO':
        handleGetCharacterInfo(id, request.payload.pageId, request.payload.charIndex);
        break;

      case 'GET_CHAR_BOX':
        handleGetCharBox(id, request.payload.pageId, request.payload.charIndex);
        break;

      // Page-level mutations
      case 'FLATTEN_PAGE':
        handleFlattenPage(id, request.payload.pageId, request.payload.flags);
        break;

      case 'GET_FORM_WIDGETS':
        handleGetFormWidgets(id, request.payload.pageId);
        break;

      // Form operations
      case 'GET_FORM_SELECTED_TEXT':
        handleGetFormSelectedText(id, request.payload.pageId);
        break;

      case 'CAN_FORM_UNDO':
        handleCanFormUndo(id, request.payload.pageId);
        break;

      case 'FORM_UNDO':
        handleFormUndo(id, request.payload.pageId);
        break;

      case 'KILL_FORM_FOCUS':
        handleKillFormFocus(id, request.payload.documentId);
        break;

      // Document operations
      case 'SET_FORM_HIGHLIGHT':
        handleSetFormHighlight(
          id,
          request.payload.documentId,
          request.payload.fieldType,
          request.payload.colour,
          request.payload.alpha,
        );
        break;

      case 'IMPORT_PAGES':
        handleImportPages(id, request.payload.targetDocId, request.payload.sourceDocId, request.payload.options);
        break;

      case 'CREATE_N_UP':
        handleCreateNUp(id, request.payload.documentId, request.payload.options);
        break;

      // Extended document-level queries
      case 'GET_METADATA':
        handleGetMetadata(id, request.payload.documentId);
        break;

      case 'GET_PERMISSIONS':
        handleGetPermissions(id, request.payload.documentId);
        break;

      case 'GET_VIEWER_PREFERENCES':
        handleGetViewerPreferences(id, request.payload.documentId);
        break;

      case 'GET_JAVASCRIPT_ACTIONS':
        handleGetJavaScriptActions(id, request.payload.documentId);
        break;

      case 'GET_SIGNATURES':
        handleGetSignatures(id, request.payload.documentId);
        break;

      case 'GET_PRINT_PAGE_RANGES':
        handleGetPrintPageRanges(id, request.payload.documentId);
        break;

      case 'GET_EXTENDED_DOCUMENT_INFO':
        handleGetExtendedDocumentInfo(id, request.payload.documentId);
        break;

      case 'GET_ALL_PAGE_DIMENSIONS':
        handleGetAllPageDimensions(id, request.payload.documentId);
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
