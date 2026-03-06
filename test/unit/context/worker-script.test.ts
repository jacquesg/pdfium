/**
 * Unit tests for worker-script message handlers.
 *
 * Mocks PDFium, PDFiumDocument, and PDFiumPage to test each handler
 * in isolation without WASM dependencies.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';
import { AnnotationType, FormFieldType, PageRotation } from '../../../src/core/types.js';

// Captured postMessage calls
const postedMessages: Array<{ data: WorkerResponse; transfer: Transferable[] }> = [];

// Mock annotation generator
function* mockAnnotationsGen() {
  const annot = createMockAnnotation();
  yield annot;
}

// Mock annotation instance
function createMockAnnotation() {
  return {
    index: 0,
    type: 4,
    bounds: { left: 72, bottom: 700, right: 200, top: 720 },
    getColour: vi
      .fn()
      .mockImplementation((type: string) => (type === 'stroke' ? { r: 255, g: 0, b: 0, a: 255 } : undefined)),
    flags: 4,
    getStringValue: vi.fn().mockImplementation((key: string) => {
      if (key === 'Contents') return 'Note';
      if (key === 'T') return 'Author';
      if (key === 'Subj') return 'Review';
      return undefined;
    }),
    getBorder: vi.fn().mockReturnValue({ horizontalRadius: 0, verticalRadius: 0, borderWidth: 1 }),
    getAppearance: vi.fn().mockReturnValue(null),
    getNumberValue: vi.fn().mockReturnValue(undefined),
    getLine: vi.fn().mockReturnValue(undefined),
    getVertices: vi.fn().mockReturnValue(undefined),
    getInkPath: vi.fn().mockReturnValue([]),
    inkPathCount: 0,
    getAttachmentPoints: vi
      .fn()
      .mockReturnValue({ x1: 72, y1: 720, x2: 200, y2: 720, x3: 72, y3: 700, x4: 200, y4: 700 }),
    attachmentPointCount: 1,
    isWidget: vi.fn().mockReturnValue(false),
    getLink: vi.fn().mockReturnValue(undefined),
    getFontSize: vi.fn().mockReturnValue(12),
    dispose: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  };
}

// Mock mutable annotation (used by getAnnotation for mutation handlers)
function createMockMutableAnnotation(index = 0) {
  return {
    index,
    setRect: vi.fn().mockReturnValue(true),
    setColour: vi.fn().mockReturnValue(true),
    setFlags: vi.fn().mockReturnValue(true),
    setStringValue: vi.fn().mockReturnValue(true),
    setBorder: vi.fn().mockReturnValue(true),
    setAttachmentPoints: vi.fn().mockReturnValue(true),
    appendAttachmentPoints: vi.fn().mockReturnValue(true),
    setURI: vi.fn().mockReturnValue(true),
    addInkStroke: vi.fn().mockReturnValue(0),
    // serialiseAnnotation fields (needed if annotation is serialised after creation)
    type: 4,
    bounds: { left: 0, top: 10, right: 100, bottom: 0 },
    getColour: vi.fn().mockReturnValue(undefined),
    flags: 0,
    getStringValue: vi.fn().mockReturnValue(undefined),
    getBorder: vi.fn().mockReturnValue(null),
    getAppearance: vi.fn().mockReturnValue(null),
    getNumberValue: vi.fn().mockReturnValue(undefined),
    getLine: vi.fn().mockReturnValue(undefined),
    getVertices: vi.fn().mockReturnValue(undefined),
    getInkPath: vi.fn().mockReturnValue([]),
    inkPathCount: 0,
    getAttachmentPoints: vi.fn().mockReturnValue(undefined),
    attachmentPointCount: 0,
    isWidget: vi.fn().mockReturnValue(false),
    getLink: vi.fn().mockReturnValue(undefined),
    getFontSize: vi.fn().mockReturnValue(0),
    dispose: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  };
}

// Mock widget annotation
function createMockWidgetAnnotation() {
  const widget = createMockAnnotation();
  widget.isWidget = vi.fn().mockReturnValue(true);
  (widget as unknown as { getFormFieldType: () => number }).getFormFieldType = vi.fn().mockReturnValue(0);
  (widget as unknown as { getFormFieldName: () => string }).getFormFieldName = vi.fn().mockReturnValue('name');
  (widget as unknown as { getFormFieldValue: () => string }).getFormFieldValue = vi.fn().mockReturnValue('John');
  (widget as unknown as { getFormFieldAlternateName: () => string }).getFormFieldAlternateName = vi
    .fn()
    .mockReturnValue('');
  (widget as unknown as { getFormFieldExportValue: () => string }).getFormFieldExportValue = vi
    .fn()
    .mockReturnValue('');
  (widget as unknown as { getFormFieldFlags: () => number }).getFormFieldFlags = vi.fn().mockReturnValue(0);
  (widget as unknown as { getFormFieldOptions: () => unknown[] }).getFormFieldOptions = vi.fn().mockReturnValue([]);
  return widget;
}

// Mock page instances
function createMockPage(index: number, width: number, height: number) {
  return {
    index,
    width,
    height,
    size: { width, height },
    rotation: PageRotation.None,
    charCount: 9,
    render: vi.fn().mockReturnValue({
      width: Math.round(width),
      height: Math.round(height),
      originalWidth: width,
      originalHeight: height,
      data: new Uint8Array([1, 2, 3, 4]),
    }),
    getText: vi.fn().mockReturnValue('Hello PDF'),
    getTextLayout: vi.fn().mockReturnValue({
      text: 'Hello',
      rects: new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]),
    }),
    hasTransparency: vi.fn().mockReturnValue(false),
    getPageBox: vi
      .fn()
      .mockImplementation((type: string) =>
        type === 'MediaBox' ? { left: 0, bottom: 0, right: 612, top: 792 } : undefined,
      ),
    annotations: vi.fn().mockReturnValue(mockAnnotationsGen()),
    objects: vi.fn().mockReturnValue([
      {
        type: 1,
        bounds: { left: 72, bottom: 700, right: 200, top: 720 },
        matrix: { a: 1, b: 0, c: 0, d: 1, e: 72, f: 700 },
        marks: [{ name: 'Span', params: {} }],
      },
    ]),
    getLinks: vi.fn().mockReturnValue([
      {
        index: 0,
        bounds: { left: 72, bottom: 700, right: 200, top: 720 },
        action: { type: 'uri', uri: 'https://example.com', filePath: undefined },
        destination: undefined,
      },
    ]),
    getWebLinks: vi.fn().mockReturnValue([
      {
        index: 0,
        url: 'https://example.com',
        rects: [{ left: 72, bottom: 700, right: 200, top: 720 }],
        textRange: { startCharIndex: 10, charCount: 19 },
      },
    ]),
    getStructureTree: vi
      .fn()
      .mockReturnValue([{ type: 'P', title: undefined, altText: undefined, lang: 'en', children: [] }]),
    getCharIndexAtPos: vi.fn().mockReturnValue(5),
    getCharacterInfo: vi.fn().mockReturnValue({
      index: 5,
      unicode: 72,
      char: 'H',
      fontSize: 12,
      fontWeight: 400,
      fontName: 'Helvetica',
      renderMode: 'fill',
      angle: 0,
      originX: 72.5,
      originY: 710.2,
      isGenerated: false,
      isHyphen: false,
      hasUnicodeMapError: false,
      fillColour: { r: 0, g: 0, b: 0, a: 255 },
      strokeColour: undefined,
    }),
    getCharBox: vi.fn().mockReturnValue({ left: 72, right: 80, bottom: 700, top: 712 }),
    getTextInRect: vi.fn().mockReturnValue('Hello'),
    findText: vi
      .fn()
      .mockReturnValue([{ charIndex: 0, charCount: 5, rects: [{ left: 72, bottom: 700, right: 200, top: 720 }] }]),
    flatten: vi.fn().mockReturnValue(1),
    applyRedactions: vi.fn().mockReturnValue({
      appliedRegionCount: 0,
      removedObjectCount: 0,
      removedAnnotationCount: 0,
      insertedFillObjectCount: 0,
    }),
    getFormSelectedText: vi.fn().mockReturnValue('selected'),
    canFormUndo: vi.fn().mockReturnValue(true),
    formUndo: vi.fn().mockReturnValue(true),
    // Annotation mutations
    createAnnotation: vi.fn().mockReturnValue(createMockMutableAnnotation()),
    removeAnnotation: vi.fn().mockReturnValue(true),
    getAnnotation: vi.fn().mockReturnValue(createMockMutableAnnotation()),
    generateContent: vi.fn().mockReturnValue(true),
    dispose: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  };
}

// Mock document instances
function createMockDocument(pageCount: number) {
  const mockPage = createMockPage(0, 612, 792);
  return {
    pageCount,
    getPage: vi.fn().mockReturnValue(mockPage),
    isTagged: vi.fn().mockReturnValue(true),
    hasForm: vi.fn().mockReturnValue(false),
    formType: 0,
    namedDestinationCount: 2,
    pageMode: 'useNone',
    getBookmarks: vi.fn().mockReturnValue([{ title: 'Ch1', pageIndex: 0, children: [] }]),
    getAttachments: vi.fn().mockReturnValue([{ index: 0, name: 'test.txt', data: new Uint8Array([65, 66]) }]),
    getNamedDestinations: vi.fn().mockReturnValue([{ name: 'ch1', pageIndex: 0 }]),
    getNamedDestinationByName: vi
      .fn()
      .mockImplementation((name: string) => (name === 'ch1' ? { name: 'ch1', pageIndex: 0 } : undefined)),
    getPageLabel: vi.fn().mockReturnValue('i'),
    save: vi.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])),
    killFormFocus: vi.fn().mockReturnValue(true),
    deletePage: vi.fn(),
    insertBlankPage: vi.fn(),
    movePages: vi.fn(),
    setFormFieldHighlightColour: vi.fn(),
    setFormFieldHighlightAlpha: vi.fn(),
    importPages: vi.fn(),
    createNUpDocument: vi.fn().mockReturnValue({ pageCount: 2, dispose: vi.fn() }),
    dispose: vi.fn(),
    _mockPage: mockPage,
  };
}

function createMockBuilderPage() {
  return {
    addRectangle: vi.fn(),
    addText: vi.fn(),
    addLine: vi.fn(),
    addEllipse: vi.fn(),
    dispose: vi.fn(),
    disposed: false,
  };
}

function createMockBuilderFont() {
  return {
    dispose: vi.fn(),
  };
}

function createMockBuilder() {
  return {
    addPage: vi.fn().mockReturnValue(createMockBuilderPage()),
    loadStandardFont: vi.fn().mockReturnValue(createMockBuilderFont()),
    save: vi.fn().mockReturnValue(new Uint8Array([37, 80, 68, 70])),
    dispose: vi.fn(),
    disposed: false,
  };
}

// Track mock instances for assertions
let mockPdfiumDispose: ReturnType<typeof vi.fn>;
let mockOpenDocument: ReturnType<typeof vi.fn>;
let mockCreateDocument: ReturnType<typeof vi.fn>;
let currentMockDocument: ReturnType<typeof createMockDocument>;
let currentMockBuilder: ReturnType<typeof createMockBuilder>;

describe('worker-script', () => {
  beforeEach(async () => {
    vi.resetModules();
    postedMessages.length = 0;

    mockPdfiumDispose = vi.fn();
    currentMockDocument = createMockDocument(5);
    currentMockBuilder = createMockBuilder();
    mockOpenDocument = vi.fn().mockResolvedValue(currentMockDocument);
    mockCreateDocument = vi.fn().mockReturnValue(currentMockBuilder);

    // Mock self.postMessage
    vi.stubGlobal('self', {
      postMessage: (data: WorkerResponse, options?: { transfer?: Transferable[] }) => {
        postedMessages.push({ data, transfer: options?.transfer ?? [] });
      },
      onmessage: null,
      location: {
        origin: 'https://example.com',
      },
    });

    // Mock PDFium module
    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn().mockResolvedValue({
          openDocument: mockOpenDocument,
          createDocument: mockCreateDocument,
          dispose: mockPdfiumDispose,
        }),
      },
    }));
  });

  /** Helper: import setupWorker and install the message handler. */
  async function setup(): Promise<(request: WorkerRequest) => Promise<void>> {
    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;
    return async (request: WorkerRequest) => {
      await handler(new MessageEvent('message', { data: request }));
    };
  }

  /** Helper: get the last posted response. */
  function lastResponse(): WorkerResponse {
    return postedMessages[postedMessages.length - 1]!.data;
  }

  test('INIT should initialise PDFium and post success', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('init-1');
  });

  test('INIT should reject double initialisation', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'INIT', id: 'init-2', payload: { wasmBinary: new ArrayBuffer(8) } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    expect(response.id).toBe('init-2');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.INIT_LIBRARY_FAILED);
    }
  });

  test('OPEN_DOCUMENT should open document and return documentId + pageCount', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { documentId: string; pageCount: number };
      expect(typeof payload.documentId).toBe('string');
      expect(payload.documentId.length).toBeGreaterThan(0);
      expect(payload.pageCount).toBe(5);
    }
  });

  test('OPEN_DOCUMENT should reject when not initialised', async () => {
    const send = await setup();

    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.INIT_LIBRARY_FAILED);
    }
  });

  test('OPEN_DOCUMENT should reject when document limit reached', async () => {
    const send = await setup();

    await send({
      type: 'INIT',
      id: 'init-1',
      payload: { wasmBinary: new ArrayBuffer(8), maxDocuments: 1, maxPages: 10 },
    });

    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-2', payload: { data: new ArrayBuffer(100) } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.WORKER_RESOURCE_LIMIT);
    }
  });

  test('CLOSE_DOCUMENT should close document and associated pages', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    // Load a page first
    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });

    // Now close the document — should also close the page
    await send({ type: 'CLOSE_DOCUMENT', id: 'close-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('close-1');
  });

  test('CLOSE_DOCUMENT should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CLOSE_DOCUMENT', id: 'close-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_PAGE_COUNT should return page count', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_PAGE_COUNT', id: 'count-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(5);
    }
  });

  test('GET_PAGE_COUNT should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_COUNT', id: 'count-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('LOAD_PAGE should load page and return dimensions', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { pageId: string; index: number; width: number; height: number };
      expect(typeof payload.pageId).toBe('string');
      expect(payload.pageId.length).toBeGreaterThan(0);
      expect(payload.index).toBe(0);
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
    }
  });

  test('LOAD_PAGE should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId: 'nonexistent', pageIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('LOAD_PAGE should reject when page limit reached', async () => {
    const send = await setup();

    await send({
      type: 'INIT',
      id: 'init-1',
      payload: { wasmBinary: new ArrayBuffer(8), maxDocuments: 10, maxPages: 1 },
    });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    await send({ type: 'LOAD_PAGE', id: 'load-2', payload: { documentId, pageIndex: 1 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.WORKER_RESOURCE_LIMIT);
    }
  });

  test('CLOSE_PAGE should close page', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'CLOSE_PAGE', id: 'close-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('close-1');
  });

  test('CLOSE_PAGE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CLOSE_PAGE', id: 'close-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_PAGE_SIZE should return width and height', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_PAGE_SIZE', id: 'size-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { width: number; height: number };
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
    }
  });

  test('GET_PAGE_SIZE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_SIZE', id: 'size-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('RENDER_PAGE should render and transfer buffer', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'RENDER_PAGE', id: 'render-1', payload: { pageId, options: {} } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { width: number; height: number; data: ArrayBuffer };
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
      expect(payload.data).toBeInstanceOf(ArrayBuffer);
    }

    // Verify buffer was transferred
    const lastPost = postedMessages[postedMessages.length - 1]!;
    expect(lastPost.transfer.length).toBe(1);
  });

  test('RENDER_PAGE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'RENDER_PAGE', id: 'render-1', payload: { pageId: 'nonexistent', options: {} } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('RENDER_PAGE_STANDALONE should load, render, and close page in one message', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({
      type: 'RENDER_PAGE_STANDALONE',
      id: 'render-standalone-1',
      payload: { documentId, pageIndex: 0, options: {} },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { width: number; height: number; data: ArrayBuffer };
      expect(payload.width).toBe(612);
      expect(payload.height).toBe(792);
      expect(payload.data).toBeInstanceOf(ArrayBuffer);
    }

    // Verify buffer was transferred
    const lastPost = postedMessages[postedMessages.length - 1]!;
    expect(lastPost.transfer.length).toBe(1);
  });

  test('RENDER_PAGE_STANDALONE should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'RENDER_PAGE_STANDALONE',
      id: 'render-standalone-1',
      payload: { documentId: 'nonexistent', pageIndex: 0, options: {} },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_TEXT should extract text content', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_TEXT', id: 'text-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe('Hello PDF');
    }
  });

  test('GET_TEXT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_TEXT', id: 'text-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('DESTROY should dispose all resources', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });

    await send({ type: 'DESTROY', id: 'destroy-1' } as WorkerRequest);

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('destroy-1');
    expect(mockPdfiumDispose).toHaveBeenCalled();
  });

  test('unknown request type should return error', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'UNKNOWN_TYPE', id: 'unknown-1' } as unknown as WorkerRequest);

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.WORKER_COMMUNICATION_FAILED);
    }
  });

  test('PING should respond with success', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'PING', id: 'ping-1' } as WorkerRequest);

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('ping-1');
  });

  test('GET_TEXT_LAYOUT should return text and rects', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_TEXT_LAYOUT', id: 'layout-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { text: string; rects: Float32Array };
      expect(payload.text).toBe('Hello');
      expect(payload.rects).toBeInstanceOf(Float32Array);
    }

    const lastPost = postedMessages[postedMessages.length - 1]!;
    expect(lastPost.transfer.length).toBe(1);
  });

  test('INIT with maxDocuments and maxPages options', async () => {
    const send = await setup();

    await send({
      type: 'INIT',
      id: 'init-1',
      payload: { wasmBinary: new ArrayBuffer(8), maxDocuments: 2, maxPages: 5 },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');

    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-2', payload: { data: new ArrayBuffer(100) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-3', payload: { data: new ArrayBuffer(100) } });

    const errorResponse = lastResponse();
    expect(errorResponse.type).toBe('ERROR');
    if (errorResponse.type === 'ERROR') {
      expect(errorResponse.error.code).toBe(PDFiumErrorCode.WORKER_RESOURCE_LIMIT);
    }
  });

  test('OPEN_DOCUMENT passes password', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'OPEN_DOCUMENT',
      id: 'open-1',
      payload: { data: new ArrayBuffer(100), password: 'secret' },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(mockOpenDocument).toHaveBeenCalledWith(expect.any(ArrayBuffer), { password: 'secret' });
  });

  test('builder requests should create and mutate a worker-side document builder', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });

    await send({ type: 'CREATE_DOCUMENT_BUILDER', id: 'builder-create-1' } as WorkerRequest);
    const createResponse = lastResponse();
    expect(createResponse.type).toBe('SUCCESS');
    let builderId = '';
    if (createResponse.type === 'SUCCESS') {
      builderId = (createResponse.payload as { builderId: string }).builderId;
      expect(builderId.length).toBeGreaterThan(0);
    }
    expect(mockCreateDocument).toHaveBeenCalledTimes(1);

    await send({
      type: 'BUILDER_ADD_PAGE',
      id: 'builder-add-page-1',
      payload: { builderId, options: { width: 595, height: 842 } },
    });
    const addPageResponse = lastResponse();
    expect(addPageResponse.type).toBe('SUCCESS');
    let pageBuilderId = '';
    if (addPageResponse.type === 'SUCCESS') {
      pageBuilderId = (addPageResponse.payload as { pageBuilderId: string }).pageBuilderId;
      expect(pageBuilderId.length).toBeGreaterThan(0);
    }
    expect(currentMockBuilder.addPage).toHaveBeenCalledWith({ width: 595, height: 842 });

    await send({
      type: 'BUILDER_LOAD_STANDARD_FONT',
      id: 'builder-font-1',
      payload: { builderId, fontName: 'Helvetica' },
    });
    const fontResponse = lastResponse();
    expect(fontResponse.type).toBe('SUCCESS');
    let fontId = '';
    if (fontResponse.type === 'SUCCESS') {
      fontId = (fontResponse.payload as { fontId: string }).fontId;
      expect(fontId.length).toBeGreaterThan(0);
    }
    expect(currentMockBuilder.loadStandardFont).toHaveBeenCalledWith('Helvetica');

    await send({
      type: 'BUILDER_PAGE_ADD_TEXT',
      id: 'builder-text-1',
      payload: {
        pageBuilderId,
        text: 'Hello worker builder',
        x: 72,
        y: 770,
        fontId,
        fontSize: 24,
      },
    });
    const addTextResponse = lastResponse();
    expect(addTextResponse.type).toBe('SUCCESS');
    const pageBuilder = currentMockBuilder.addPage.mock.results[0]?.value as {
      addText: ReturnType<typeof vi.fn>;
    };
    expect(pageBuilder.addText).toHaveBeenCalledWith(
      'Hello worker builder',
      72,
      770,
      currentMockBuilder.loadStandardFont.mock.results[0]?.value,
      24,
      undefined,
    );

    await send({ type: 'BUILDER_SAVE', id: 'builder-save-1', payload: { builderId } });
    const saveResponse = lastResponse();
    expect(saveResponse.type).toBe('SUCCESS');
    if (saveResponse.type === 'SUCCESS') {
      expect(saveResponse.payload).toBeInstanceOf(ArrayBuffer);
    }
    expect(currentMockBuilder.save).toHaveBeenCalledWith({});

    await send({ type: 'DISPOSE_DOCUMENT_BUILDER', id: 'builder-dispose-1', payload: { builderId } });
    const disposeResponse = lastResponse();
    expect(disposeResponse.type).toBe('SUCCESS');
    expect(currentMockBuilder.dispose).toHaveBeenCalledTimes(1);
  });

  test('builder shape requests should delegate to the page builder', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CREATE_DOCUMENT_BUILDER', id: 'builder-create-1' } as WorkerRequest);
    const createResponse = lastResponse();
    const builderId =
      createResponse.type === 'SUCCESS' ? (createResponse.payload as { builderId: string }).builderId : '';

    await send({
      type: 'BUILDER_ADD_PAGE',
      id: 'builder-add-page-1',
      payload: { builderId, options: { width: 595, height: 842 } },
    });
    const addPageResponse = lastResponse();
    const pageBuilderId =
      addPageResponse.type === 'SUCCESS' ? (addPageResponse.payload as { pageBuilderId: string }).pageBuilderId : '';

    const pageBuilder = currentMockBuilder.addPage.mock.results[0]?.value as ReturnType<typeof createMockBuilderPage>;

    await send({
      type: 'BUILDER_PAGE_ADD_RECTANGLE',
      id: 'builder-rect-1',
      payload: {
        pageBuilderId,
        x: 10,
        y: 20,
        w: 30,
        h: 40,
        style: { stroke: { r: 1, g: 2, b: 3, a: 255 } },
      },
    });
    expect(pageBuilder.addRectangle).toHaveBeenCalledWith(10, 20, 30, 40, {
      stroke: { r: 1, g: 2, b: 3, a: 255 },
    });

    await send({
      type: 'BUILDER_PAGE_ADD_LINE',
      id: 'builder-line-1',
      payload: {
        pageBuilderId,
        x1: 1,
        y1: 2,
        x2: 3,
        y2: 4,
        style: { strokeWidth: 2 },
      },
    });
    expect(pageBuilder.addLine).toHaveBeenCalledWith(1, 2, 3, 4, { strokeWidth: 2 });

    await send({
      type: 'BUILDER_PAGE_ADD_ELLIPSE',
      id: 'builder-ellipse-1',
      payload: {
        pageBuilderId,
        cx: 50,
        cy: 60,
        rx: 70,
        ry: 80,
        style: { fill: { r: 9, g: 8, b: 7, a: 200 } },
      },
    });
    expect(pageBuilder.addEllipse).toHaveBeenCalledWith(50, 60, 70, 80, {
      fill: { r: 9, g: 8, b: 7, a: 200 },
    });
  });

  test('builder text requests reject fonts from a different builder', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });

    await send({ type: 'CREATE_DOCUMENT_BUILDER', id: 'builder-create-a' } as WorkerRequest);
    const builderAResponse = lastResponse();
    const builderAId =
      builderAResponse.type === 'SUCCESS' ? (builderAResponse.payload as { builderId: string }).builderId : '';
    await send({
      type: 'BUILDER_ADD_PAGE',
      id: 'builder-add-page-a',
      payload: { builderId: builderAId, options: { width: 595, height: 842 } },
    });
    const pageResponse = lastResponse();
    const pageBuilderId =
      pageResponse.type === 'SUCCESS' ? (pageResponse.payload as { pageBuilderId: string }).pageBuilderId : '';

    await send({ type: 'CREATE_DOCUMENT_BUILDER', id: 'builder-create-b' } as WorkerRequest);
    const builderBResponse = lastResponse();
    const builderBId =
      builderBResponse.type === 'SUCCESS' ? (builderBResponse.payload as { builderId: string }).builderId : '';
    await send({
      type: 'BUILDER_LOAD_STANDARD_FONT',
      id: 'builder-font-b',
      payload: { builderId: builderBId, fontName: 'Helvetica' },
    });
    const fontResponse = lastResponse();
    const fontId = fontResponse.type === 'SUCCESS' ? (fontResponse.payload as { fontId: string }).fontId : '';

    await send({
      type: 'BUILDER_PAGE_ADD_TEXT',
      id: 'builder-text-mismatch',
      payload: {
        pageBuilderId,
        text: 'Wrong owner',
        x: 10,
        y: 20,
        fontId,
        fontSize: 12,
      },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_FORMAT_INVALID);
    }
  });

  test('page management and redaction requests delegate to the document and page', async () => {
    const send = await setup();

    currentMockDocument.deletePage = vi.fn();
    currentMockDocument.insertBlankPage = vi.fn();
    currentMockDocument.movePages = vi.fn();
    currentMockDocument._mockPage.applyRedactions = vi.fn().mockReturnValue({
      appliedRegionCount: 1,
      removedObjectCount: 2,
      removedAnnotationCount: 3,
      insertedFillObjectCount: 1,
    });

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'DELETE_PAGE', id: 'delete-page-1', payload: { documentId, pageIndex: 2 } });
    expect(currentMockDocument.deletePage).toHaveBeenCalledWith(2);

    await send({
      type: 'INSERT_BLANK_PAGE',
      id: 'insert-page-1',
      payload: { documentId, pageIndex: 1, width: 400, height: 300 },
    });
    expect(currentMockDocument.insertBlankPage).toHaveBeenCalledWith(1, 400, 300);

    await send({
      type: 'MOVE_PAGES',
      id: 'move-pages-1',
      payload: { documentId, pageIndices: [1], destPageIndex: 4 },
    });
    expect(currentMockDocument.movePages).toHaveBeenCalledWith([1], 4);

    await send({
      type: 'SET_PAGE_ROTATION',
      id: 'rotate-page-1',
      payload: { pageId, rotation: PageRotation.Clockwise90 },
    });
    expect(currentMockDocument._mockPage.rotation).toBe(PageRotation.Clockwise90);

    await send({
      type: 'APPLY_REDACTIONS',
      id: 'apply-redactions-1',
      payload: {
        pageId,
        fillColour: { r: 10, g: 20, b: 30, a: 255 },
        removeIntersectingAnnotations: false,
      },
    });
    expect(currentMockDocument._mockPage.applyRedactions).toHaveBeenCalledWith({
      fillColour: { r: 10, g: 20, b: 30, a: 255 },
      removeIntersectingAnnotations: false,
    });
    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toEqual({
        appliedRegionCount: 1,
        removedObjectCount: 2,
        removedAnnotationCount: 3,
        insertedFillObjectCount: 1,
      });
    }
  });

  test('builder lookup handlers post already-closed errors for missing builder resources', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });

    const requests: WorkerRequest[] = [
      {
        type: 'BUILDER_ADD_PAGE',
        id: 'missing-builder',
        payload: { builderId: 'missing-builder', options: { width: 100, height: 100 } },
      },
      {
        type: 'BUILDER_PAGE_ADD_RECTANGLE',
        id: 'missing-page-builder',
        payload: { pageBuilderId: 'missing-page', x: 0, y: 0, w: 10, h: 10 },
      },
      {
        type: 'BUILDER_PAGE_ADD_TEXT',
        id: 'missing-page-for-text',
        payload: { pageBuilderId: 'missing-page', text: 'x', x: 0, y: 0, fontId: 'missing-font', fontSize: 12 },
      },
      {
        type: 'BUILDER_SAVE',
        id: 'missing-builder-save',
        payload: { builderId: 'missing-builder' },
      },
      {
        type: 'DISPOSE_DOCUMENT_BUILDER',
        id: 'missing-builder-dispose',
        payload: { builderId: 'missing-builder' },
      },
    ];

    for (const request of requests) {
      await send(request);
      const response = lastResponse();
      expect(response.type).toBe('ERROR');
      if (response.type === 'ERROR') {
        expect(
          [PDFiumErrorCode.DOC_ALREADY_CLOSED, PDFiumErrorCode.PAGE_ALREADY_CLOSED].includes(response.error.code),
        ).toBe(true);
      }
    }
  });

  test('DESTROY disposes active builder resources as well as PDFium', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CREATE_DOCUMENT_BUILDER', id: 'builder-create-1' } as WorkerRequest);
    const createResponse = lastResponse();
    const builderId =
      createResponse.type === 'SUCCESS' ? (createResponse.payload as { builderId: string }).builderId : '';

    await send({
      type: 'BUILDER_ADD_PAGE',
      id: 'builder-add-page-1',
      payload: { builderId, options: { width: 595, height: 842 } },
    });
    const pageBuilder = currentMockBuilder.addPage.mock.results[0]?.value as ReturnType<typeof createMockBuilderPage>;

    await send({ type: 'DESTROY', id: 'destroy-builders-1' } as WorkerRequest);

    expect(pageBuilder.dispose).toHaveBeenCalledTimes(1);
    expect(currentMockBuilder.dispose).toHaveBeenCalledTimes(1);
    expect(mockPdfiumDispose).toHaveBeenCalledTimes(1);
  });

  test('handleMessage ignores messages with wrong origin', async () => {
    vi.resetModules();
    postedMessages.length = 0;

    mockPdfiumDispose = vi.fn();
    const mockDoc = createMockDocument(5);
    mockOpenDocument = vi.fn().mockResolvedValue(mockDoc);

    // Set up self WITH location.origin so expectedMessageOrigin is set
    vi.stubGlobal('self', {
      postMessage: (data: WorkerResponse, options?: { transfer?: Transferable[] }) => {
        postedMessages.push({ data, transfer: options?.transfer ?? [] });
      },
      onmessage: null,
      location: { origin: 'https://trusted.example.com' },
    });

    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn().mockResolvedValue({
          openDocument: mockOpenDocument,
          createDocument: mockCreateDocument,
          dispose: mockPdfiumDispose,
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;

    // Init first
    await handler(
      new MessageEvent('message', {
        data: { type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } },
      }),
    );

    const messagesBefore = postedMessages.length;

    // Capture the expected origin rejection warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const event = new MessageEvent('message', {
      data: { type: 'PING', id: 'ping-1' } as WorkerRequest,
    });
    Object.defineProperty(event, 'origin', { value: 'https://evil.com' });

    await handler(event);

    expect(postedMessages.length).toBe(messagesBefore);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Worker rejected message from unexpected origin'),
      'https://evil.com',
    );
    warnSpy.mockRestore();
  });

  test('handleMessage allows empty origin', async () => {
    vi.resetModules();
    postedMessages.length = 0;

    mockPdfiumDispose = vi.fn();
    const mockDoc = createMockDocument(5);
    mockOpenDocument = vi.fn().mockResolvedValue(mockDoc);

    vi.stubGlobal('self', {
      postMessage: (data: WorkerResponse, options?: { transfer?: Transferable[] }) => {
        postedMessages.push({ data, transfer: options?.transfer ?? [] });
      },
      onmessage: null,
      location: { origin: 'https://trusted.example.com' },
    });

    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn().mockResolvedValue({
          openDocument: mockOpenDocument,
          createDocument: mockCreateDocument,
          dispose: mockPdfiumDispose,
        }),
      },
    }));

    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;

    await handler(
      new MessageEvent('message', {
        data: { type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } },
      }),
    );

    const event = new MessageEvent('message', {
      data: { type: 'PING', id: 'ping-1' } as WorkerRequest,
    });
    Object.defineProperty(event, 'origin', { value: '' });

    await handler(event);

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(response.id).toBe('ping-1');
  });

  // ────────────────────────────────────────────────────────────
  // Document-level handlers
  // ────────────────────────────────────────────────────────────

  test('GET_DOCUMENT_INFO should return document info', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_DOCUMENT_INFO', id: 'info-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as {
        isTagged: boolean;
        hasForm: boolean;
        formType: number;
        namedDestinationCount: number;
        pageMode: string;
      };
      expect(payload.isTagged).toBe(true);
      expect(payload.hasForm).toBe(false);
      expect(payload.formType).toBe(0);
      expect(payload.namedDestinationCount).toBe(2);
      expect(payload.pageMode).toBe('useNone');
    }
  });

  test('GET_DOCUMENT_INFO should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_DOCUMENT_INFO', id: 'info-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_BOOKMARKS should return bookmark array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_BOOKMARKS', id: 'bookmarks-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ title: string; pageIndex: number }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.title).toBe('Ch1');
      expect(payload[0]!.pageIndex).toBe(0);
    }
  });

  test('GET_BOOKMARKS should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_BOOKMARKS', id: 'bookmarks-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_ATTACHMENTS should return attachment array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_ATTACHMENTS', id: 'attachments-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ index: number; name: string; data: ArrayBuffer }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.index).toBe(0);
      expect(payload[0]!.name).toBe('test.txt');
      expect(payload[0]!.data).toBeInstanceOf(ArrayBuffer);
      expect(new Uint8Array(payload[0]!.data)).toEqual(new Uint8Array([65, 66]));
    }

    const lastPost = postedMessages[postedMessages.length - 1]!;
    expect(lastPost.transfer.length).toBe(1);
  });

  test('GET_ATTACHMENTS should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_ATTACHMENTS', id: 'attachments-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_NAMED_DESTINATIONS should return named destinations', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_NAMED_DESTINATIONS', id: 'dests-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ name: string; pageIndex: number }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.name).toBe('ch1');
    }
  });

  test('GET_NAMED_DESTINATIONS should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_NAMED_DESTINATIONS', id: 'dests-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_NAMED_DEST_BY_NAME should return destination when found', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_NAMED_DEST_BY_NAME', id: 'dest-1', payload: { documentId, name: 'ch1' } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { name: string; pageIndex: number };
      expect(payload.name).toBe('ch1');
      expect(payload.pageIndex).toBe(0);
    }
  });

  test('GET_NAMED_DEST_BY_NAME should return null when not found', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_NAMED_DEST_BY_NAME', id: 'dest-1', payload: { documentId, name: 'unknown' } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBeNull();
    }
  });

  test('GET_NAMED_DEST_BY_NAME should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_NAMED_DEST_BY_NAME', id: 'dest-1', payload: { documentId: 'nonexistent', name: 'ch1' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('GET_PAGE_LABEL should return page label', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'GET_PAGE_LABEL', id: 'label-1', payload: { documentId, pageIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe('i');
    }
  });

  test('GET_PAGE_LABEL should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_LABEL', id: 'label-1', payload: { documentId: 'nonexistent', pageIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('SAVE_DOCUMENT should return ArrayBuffer', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'SAVE_DOCUMENT', id: 'save-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBeInstanceOf(ArrayBuffer);
      const bytes = new Uint8Array(response.payload as ArrayBuffer);
      expect(bytes).toEqual(new Uint8Array([37, 80, 68, 70]));
    }
  });

  test('SAVE_DOCUMENT should transfer buffer', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'SAVE_DOCUMENT', id: 'save-1', payload: { documentId } });

    const lastPost = postedMessages[postedMessages.length - 1]!;
    expect(lastPost.transfer.length).toBe(1);
  });

  test('SAVE_DOCUMENT should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'SAVE_DOCUMENT', id: 'save-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Page-level read handlers
  // ────────────────────────────────────────────────────────────

  test('GET_PAGE_INFO should return page info', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_PAGE_INFO', id: 'info-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as {
        rotation: PageRotation;
        hasTransparency: boolean;
        charCount: number;
        pageBoxes: { media: unknown };
      };
      expect(payload.rotation).toBe(PageRotation.None);
      expect(payload.hasTransparency).toBe(false);
      expect(payload.charCount).toBe(9);
      expect(payload.pageBoxes.media).toEqual({ left: 0, bottom: 0, right: 612, top: 792 });
    }
  });

  test('GET_PAGE_INFO should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_INFO', id: 'info-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_ANNOTATIONS should return serialised annotation array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ index: number; type: number; contents: string }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.index).toBe(0);
      expect(payload[0]!.type).toBe(4);
      expect(payload[0]!.contents).toBe('Note');
    }
  });

  test('GET_ANNOTATIONS should fallback to appearance colours when annotation colours are unavailable', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    const fallbackAnnot = createMockAnnotation();
    fallbackAnnot.getColour = vi.fn().mockReturnValue(null);
    fallbackAnnot.getAppearance = vi.fn().mockReturnValue('/GS gs 0 0 1 rg 0 1 0 RG 1 w 100.5 100.5 99 99 re b');
    fallbackAnnot.getNumberValue = vi.fn().mockImplementation((key: string) => (key === 'CA' ? 0.4 : undefined));

    const page = currentMockDocument.getPage(0);
    page.annotations = vi.fn().mockReturnValue(
      (function* fallbackAnnotGen() {
        yield fallbackAnnot;
      })(),
    );

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-fallback-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ colour: { stroke?: unknown; interior?: unknown } }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]?.colour.stroke).toEqual({ r: 0, g: 255, b: 0, a: 102 });
      expect(payload[0]?.colour.interior).toEqual({ r: 0, g: 0, b: 255, a: 102 });
    }
  });

  test('GET_ANNOTATIONS should not infer interior colour from stroke-only appearances', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    const fallbackAnnot = createMockAnnotation();
    fallbackAnnot.getColour = vi.fn().mockReturnValue(null);
    fallbackAnnot.getAppearance = vi.fn().mockReturnValue('/GS gs 0 0 1 rg 0 1 0 RG 1 w 100 100 80 80 re S');
    fallbackAnnot.getNumberValue = vi.fn().mockImplementation((key: string) => (key === 'CA' ? 0.4 : undefined));

    const page = currentMockDocument.getPage(0);
    page.annotations = vi.fn().mockReturnValue(
      (function* fallbackAnnotGen() {
        yield fallbackAnnot;
      })(),
    );

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-fallback-stroke-only-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ colour: { stroke?: unknown; interior?: unknown } }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]?.colour.stroke).toEqual({ r: 0, g: 255, b: 0, a: 102 });
      expect(payload[0]?.colour.interior).toBeUndefined();
    }
  });

  test('GET_ANNOTATIONS should fallback border width from appearance when native border is unavailable', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    const fallbackAnnot = createMockAnnotation();
    fallbackAnnot.type = AnnotationType.Square as unknown as number;
    fallbackAnnot.getBorder = vi.fn().mockReturnValue(null);
    fallbackAnnot.getAppearance = vi.fn().mockReturnValue('0 0 0 RG 3.5 w 100 100 80 80 re S');

    const page = currentMockDocument.getPage(0);
    page.annotations = vi.fn().mockReturnValue(
      (function* fallbackAnnotGen() {
        yield fallbackAnnot;
      })(),
    );

    await send({ type: 'GET_ANNOTATIONS', id: 'annots-fallback-border-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ border: unknown }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]?.border).toEqual({
        horizontalRadius: 0,
        verticalRadius: 0,
        borderWidth: 3.5,
      });
    }
  });

  test('GET_ANNOTATIONS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_ANNOTATIONS', id: 'annots-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_PAGE_OBJECTS should return serialised page object array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ type: number; bounds: unknown }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.type).toBe(1);
    }
  });

  test('GET_PAGE_OBJECTS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_PAGE_OBJECTS', id: 'objects-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_LINKS should return link array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_LINKS', id: 'links-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ index: number; action: { uri: string } }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.index).toBe(0);
      expect(payload[0]!.action.uri).toBe('https://example.com');
    }
  });

  test('GET_LINKS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_LINKS', id: 'links-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_WEB_LINKS should return web link array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_WEB_LINKS', id: 'weblinks-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ index: number; url: string }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.index).toBe(0);
      expect(payload[0]!.url).toBe('https://example.com');
    }
  });

  test('GET_WEB_LINKS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_WEB_LINKS', id: 'weblinks-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_STRUCTURE_TREE should return tree', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_STRUCTURE_TREE', id: 'tree-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ type: string; lang: string }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.type).toBe('P');
      expect(payload[0]!.lang).toBe('en');
    }
  });

  test('GET_STRUCTURE_TREE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_STRUCTURE_TREE', id: 'tree-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_CHAR_AT_POS should return char info when found', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_CHAR_AT_POS', id: 'char-1', payload: { pageId, x: 100, y: 100 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { index: number; info: { char: string }; box: unknown };
      expect(payload.index).toBe(5);
      expect(payload.info.char).toBe('H');
      expect(payload.box).toBeDefined();
    }
  });

  test('GET_CHAR_AT_POS should return null when not found', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    currentMockDocument._mockPage.getCharIndexAtPos.mockReturnValueOnce(-1);

    await send({ type: 'GET_CHAR_AT_POS', id: 'char-1', payload: { pageId, x: 1000, y: 1000 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBeNull();
    }
  });

  test('GET_CHAR_AT_POS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_CHAR_AT_POS', id: 'char-1', payload: { pageId: 'nonexistent', x: 100, y: 100 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_TEXT_IN_RECT should return text', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({
      type: 'GET_TEXT_IN_RECT',
      id: 'rect-1',
      payload: { pageId, left: 0, top: 0, right: 100, bottom: 100 },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe('Hello');
    }
  });

  test('GET_TEXT_IN_RECT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'GET_TEXT_IN_RECT',
      id: 'rect-1',
      payload: { pageId: 'nonexistent', left: 0, top: 0, right: 100, bottom: 100 },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('FIND_TEXT should return results array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'FIND_TEXT', id: 'find-1', payload: { pageId, query: 'Hello' } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ charIndex: number; charCount: number }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.charIndex).toBe(0);
      expect(payload[0]!.charCount).toBe(5);
    }
  });

  test('FIND_TEXT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'FIND_TEXT', id: 'find-1', payload: { pageId: 'nonexistent', query: 'Hello' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_CHARACTER_INFO should return info', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_CHARACTER_INFO', id: 'charinfo-1', payload: { pageId, charIndex: 5 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { char: string; fontSize: number };
      expect(payload.char).toBe('H');
      expect(payload.fontSize).toBe(12);
    }
  });

  test('GET_CHARACTER_INFO should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_CHARACTER_INFO', id: 'charinfo-1', payload: { pageId: 'nonexistent', charIndex: 5 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_CHAR_BOX should return box', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_CHAR_BOX', id: 'charbox-1', payload: { pageId, charIndex: 5 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { left: number; right: number; bottom: number; top: number };
      expect(payload.left).toBe(72);
      expect(payload.right).toBe(80);
    }
  });

  test('GET_CHAR_BOX should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_CHAR_BOX', id: 'charbox-1', payload: { pageId: 'nonexistent', charIndex: 5 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Page-level mutation handlers
  // ────────────────────────────────────────────────────────────

  test('FLATTEN_PAGE should return result', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'FLATTEN_PAGE', id: 'flatten-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(1);
    }
  });

  test('FLATTEN_PAGE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'FLATTEN_PAGE', id: 'flatten-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GET_FORM_WIDGETS should return widget array', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    currentMockDocument._mockPage.annotations = vi.fn().mockReturnValue(
      (function* () {
        yield createMockWidgetAnnotation();
      })(),
    );

    await send({ type: 'GET_FORM_WIDGETS', id: 'widgets-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as Array<{ annotationIndex: number; fieldName: string; fieldValue: string }>;
      expect(payload).toHaveLength(1);
      expect(payload[0]!.annotationIndex).toBe(0);
      expect(payload[0]!.fieldName).toBe('name');
      expect(payload[0]!.fieldValue).toBe('John');
    }
  });

  test('GET_FORM_WIDGETS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_FORM_WIDGETS', id: 'widgets-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Form operation handlers
  // ────────────────────────────────────────────────────────────

  test('GET_FORM_SELECTED_TEXT should return text', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'GET_FORM_SELECTED_TEXT', id: 'seltext-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe('selected');
    }
  });

  test('GET_FORM_SELECTED_TEXT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GET_FORM_SELECTED_TEXT', id: 'seltext-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('CAN_FORM_UNDO should return boolean', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'CAN_FORM_UNDO', id: 'canundo-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(true);
    }
  });

  test('CAN_FORM_UNDO should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'CAN_FORM_UNDO', id: 'canundo-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('FORM_UNDO should return boolean', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    await send({ type: 'FORM_UNDO', id: 'undo-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(true);
    }
  });

  test('FORM_UNDO should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'FORM_UNDO', id: 'undo-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('KILL_FORM_FOCUS should return success', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'KILL_FORM_FOCUS', id: 'killfocus-1', payload: { documentId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(true);
    }
  });

  test('KILL_FORM_FOCUS should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'KILL_FORM_FOCUS', id: 'killfocus-1', payload: { documentId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Document operation handlers
  // ────────────────────────────────────────────────────────────

  test('SET_FORM_HIGHLIGHT should set colour and alpha', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({
      type: 'SET_FORM_HIGHLIGHT',
      id: 'highlight-1',
      payload: { documentId, fieldType: FormFieldType.Unknown, colour: { r: 255, g: 0, b: 0, a: 255 }, alpha: 128 },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(currentMockDocument.setFormFieldHighlightColour).toHaveBeenCalledWith(FormFieldType.Unknown, {
      r: 255,
      g: 0,
      b: 0,
      a: 255,
    });
    expect(currentMockDocument.setFormFieldHighlightAlpha).toHaveBeenCalledWith(128);
  });

  test('SET_FORM_HIGHLIGHT should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_FORM_HIGHLIGHT',
      id: 'highlight-1',
      payload: {
        documentId: 'nonexistent',
        fieldType: FormFieldType.Unknown,
        colour: { r: 255, g: 0, b: 0, a: 255 },
        alpha: 128,
      },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('IMPORT_PAGES should import from source to target', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-2', payload: { data: new ArrayBuffer(100) } });

    const targetResponse = postedMessages[1]!.data;
    const targetDocId = (targetResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    const sourceResponse = postedMessages[2]!.data;
    const sourceDocId = (sourceResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'IMPORT_PAGES', id: 'import-1', payload: { targetDocId, sourceDocId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(currentMockDocument.importPages).toHaveBeenCalled();
  });

  test('IMPORT_PAGES should error when source document not found', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const targetResponse = postedMessages[1]!.data;
    const targetDocId = (targetResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'IMPORT_PAGES', id: 'import-1', payload: { targetDocId, sourceDocId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('IMPORT_PAGES should error when target document not found', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const sourceResponse = postedMessages[1]!.data;
    const sourceDocId = (sourceResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'IMPORT_PAGES', id: 'import-1', payload: { targetDocId: 'nonexistent', sourceDocId } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  test('CREATE_N_UP should return new documentId and pageCount', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({
      type: 'CREATE_N_UP',
      id: 'nup-1',
      payload: { documentId, options: { outputWidth: 612, outputHeight: 792, pagesPerRow: 2, pagesPerColumn: 2 } },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      const payload = response.payload as { documentId: string; pageCount: number };
      expect(typeof payload.documentId).toBe('string');
      expect(payload.documentId.length).toBeGreaterThan(0);
      expect(payload.pageCount).toBe(2);
    }
  });

  test('CREATE_N_UP should error for unknown documentId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'CREATE_N_UP',
      id: 'nup-1',
      payload: {
        documentId: 'nonexistent',
        options: { outputWidth: 612, outputHeight: 792, pagesPerRow: 2, pagesPerColumn: 2 },
      },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.DOC_ALREADY_CLOSED);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Annotation mutation handlers
  // ────────────────────────────────────────────────────────────

  async function setupWithPage() {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });

    const openResponse = postedMessages[1]!.data;
    const documentId = (openResponse as { type: 'SUCCESS'; payload: { documentId: string } }).payload.documentId;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResponse = postedMessages[2]!.data;
    const pageId = (loadResponse as { type: 'SUCCESS'; payload: { pageId: string } }).payload.pageId;

    return { send, documentId, pageId };
  }

  test('CREATE_ANNOTATION should call createAnnotation and return serialised annotation', async () => {
    const { AnnotationType } = await import('../../../src/core/types.js');
    const { send, pageId } = await setupWithPage();

    await send({
      type: 'CREATE_ANNOTATION',
      id: 'create-annot-1',
      payload: { pageId, subtype: AnnotationType.Highlight },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(currentMockDocument._mockPage.createAnnotation).toHaveBeenCalledWith(AnnotationType.Highlight);
  });

  test('CREATE_ANNOTATION should post error when createAnnotation returns null', async () => {
    const { AnnotationType } = await import('../../../src/core/types.js');
    const { send, pageId } = await setupWithPage();

    currentMockDocument._mockPage.createAnnotation = vi.fn().mockReturnValue(null);

    await send({
      type: 'CREATE_ANNOTATION',
      id: 'create-annot-fail',
      payload: { pageId, subtype: AnnotationType.Highlight },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.ANNOT_LOAD_FAILED);
    }
  });

  test('CREATE_ANNOTATION should error for unknown pageId', async () => {
    const { AnnotationType } = await import('../../../src/core/types.js');
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'CREATE_ANNOTATION',
      id: 'create-annot-1',
      payload: { pageId: 'nonexistent', subtype: AnnotationType.Highlight },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('REMOVE_ANNOTATION should call removeAnnotation and return true', async () => {
    const { send, pageId } = await setupWithPage();

    await send({ type: 'REMOVE_ANNOTATION', id: 'rm-annot-1', payload: { pageId, annotationIndex: 2 } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(true);
    }
    expect(currentMockDocument._mockPage.removeAnnotation).toHaveBeenCalledWith(2);
  });

  test('REMOVE_ANNOTATION should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'REMOVE_ANNOTATION', id: 'rm-annot-1', payload: { pageId: 'nonexistent', annotationIndex: 0 } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_RECT should call setRect on annotation and return true', async () => {
    const { send, pageId } = await setupWithPage();
    const rect = { left: 10, top: 100, right: 200, bottom: 50 };

    await send({ type: 'SET_ANNOTATION_RECT', id: 'set-rect-1', payload: { pageId, annotationIndex: 0, rect } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    expect(currentMockDocument._mockPage.getAnnotation).toHaveBeenCalledWith(0);
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setRect).toHaveBeenCalledWith(rect);
  });

  test('SET_ANNOTATION_RECT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_RECT',
      id: 'set-rect-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, rect: { left: 0, top: 10, right: 100, bottom: 0 } },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_COLOUR should call setColour on annotation', async () => {
    const { send, pageId } = await setupWithPage();
    const colour = { r: 255, g: 0, b: 0, a: 255 };

    await send({
      type: 'SET_ANNOTATION_COLOUR',
      id: 'set-colour-1',
      payload: { pageId, annotationIndex: 1, colourType: 'stroke', colour },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setColour).toHaveBeenCalledWith(colour, 'stroke');
  });

  test('SET_ANNOTATION_COLOUR should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_COLOUR',
      id: 'set-colour-1',
      payload: {
        pageId: 'nonexistent',
        annotationIndex: 0,
        colourType: 'stroke',
        colour: { r: 0, g: 0, b: 0, a: 255 },
      },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_FLAGS should call setFlags on annotation', async () => {
    const { send, pageId } = await setupWithPage();

    await send({
      type: 'SET_ANNOTATION_FLAGS',
      id: 'set-flags-1',
      payload: { pageId, annotationIndex: 0, flags: 4 },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setFlags).toHaveBeenCalledWith(4);
  });

  test('SET_ANNOTATION_FLAGS should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_FLAGS',
      id: 'set-flags-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, flags: 0 },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_STRING should call setStringValue on annotation', async () => {
    const { send, pageId } = await setupWithPage();

    await send({
      type: 'SET_ANNOTATION_STRING',
      id: 'set-str-1',
      payload: { pageId, annotationIndex: 0, key: 'Contents', value: 'Hello world' },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setStringValue).toHaveBeenCalledWith('Contents', 'Hello world');
  });

  test('SET_ANNOTATION_STRING should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_STRING',
      id: 'set-str-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, key: 'T', value: '' },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_BORDER should call setBorder with radius and width', async () => {
    const { send, pageId } = await setupWithPage();

    await send({
      type: 'SET_ANNOTATION_BORDER',
      id: 'set-border-1',
      payload: { pageId, annotationIndex: 0, hRadius: 2, vRadius: 3, borderWidth: 1 },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setBorder).toHaveBeenCalledWith({ horizontalRadius: 2, verticalRadius: 3, borderWidth: 1 });
  });

  test('SET_ANNOTATION_BORDER should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_BORDER',
      id: 'set-border-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, hRadius: 1, vRadius: 1, borderWidth: 1 },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_ATTACHMENT_POINTS should call setAttachmentPoints on annotation', async () => {
    const { send, pageId } = await setupWithPage();
    const points = { x1: 0, y1: 10, x2: 100, y2: 10, x3: 100, y3: 0, x4: 0, y4: 0 };

    await send({
      type: 'SET_ANNOTATION_ATTACHMENT_POINTS',
      id: 'set-quad-1',
      payload: { pageId, annotationIndex: 0, quadIndex: 1, points },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setAttachmentPoints).toHaveBeenCalledWith(1, points);
  });

  test('SET_ANNOTATION_ATTACHMENT_POINTS should error for unknown pageId', async () => {
    const send = await setup();
    const points = { x1: 0, y1: 10, x2: 100, y2: 10, x3: 100, y3: 0, x4: 0, y4: 0 };

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_ATTACHMENT_POINTS',
      id: 'set-quad-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, quadIndex: 0, points },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('APPEND_ANNOTATION_ATTACHMENT_POINTS should call appendAttachmentPoints on annotation', async () => {
    const { send, pageId } = await setupWithPage();
    const points = { x1: 5, y1: 15, x2: 105, y2: 15, x3: 105, y3: 5, x4: 5, y4: 5 };

    await send({
      type: 'APPEND_ANNOTATION_ATTACHMENT_POINTS',
      id: 'append-quad-1',
      payload: { pageId, annotationIndex: 0, points },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.appendAttachmentPoints).toHaveBeenCalledWith(points);
  });

  test('APPEND_ANNOTATION_ATTACHMENT_POINTS should error for unknown pageId', async () => {
    const send = await setup();
    const points = { x1: 5, y1: 15, x2: 105, y2: 15, x3: 105, y3: 5, x4: 5, y4: 5 };

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'APPEND_ANNOTATION_ATTACHMENT_POINTS',
      id: 'append-quad-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, points },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('SET_ANNOTATION_URI should call setURI on annotation', async () => {
    const { send, pageId } = await setupWithPage();

    await send({
      type: 'SET_ANNOTATION_URI',
      id: 'set-uri-1',
      payload: { pageId, annotationIndex: 0, uri: 'https://example.com' },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.setURI).toHaveBeenCalledWith('https://example.com');
  });

  test('SET_ANNOTATION_URI should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'SET_ANNOTATION_URI',
      id: 'set-uri-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, uri: 'https://example.com' },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('ADD_INK_STROKE should call addInkStroke on annotation and return stroke count', async () => {
    const { send, pageId } = await setupWithPage();
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ];

    await send({
      type: 'ADD_INK_STROKE',
      id: 'ink-1',
      payload: { pageId, annotationIndex: 0, points },
    });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(0);
    }
    const annot = currentMockDocument._mockPage.getAnnotation.mock.results[0]!.value;
    expect(annot.addInkStroke).toHaveBeenCalledWith(points);
  });

  test('ADD_INK_STROKE should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({
      type: 'ADD_INK_STROKE',
      id: 'ink-1',
      payload: { pageId: 'nonexistent', annotationIndex: 0, points: [{ x: 0, y: 0 }] },
    });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });

  test('GENERATE_PAGE_CONTENT should call generateContent on page and return true', async () => {
    const { send, pageId } = await setupWithPage();

    await send({ type: 'GENERATE_PAGE_CONTENT', id: 'gen-content-1', payload: { pageId } });

    const response = lastResponse();
    expect(response.type).toBe('SUCCESS');
    if (response.type === 'SUCCESS') {
      expect(response.payload).toBe(true);
    }
    expect(currentMockDocument._mockPage.generateContent).toHaveBeenCalled();
  });

  test('GENERATE_PAGE_CONTENT should error for unknown pageId', async () => {
    const send = await setup();

    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    await send({ type: 'GENERATE_PAGE_CONTENT', id: 'gen-content-1', payload: { pageId: 'nonexistent' } });

    const response = lastResponse();
    expect(response.type).toBe('ERROR');
    if (response.type === 'ERROR') {
      expect(response.error.code).toBe(PDFiumErrorCode.PAGE_ALREADY_CLOSED);
    }
  });
});
