/**
 * Unit tests for worker-script message handlers.
 *
 * Mocks PDFium, PDFiumDocument, and PDFiumPage to test each handler
 * in isolation without WASM dependencies.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';
import { FormFieldType } from '../../../src/core/types.js';

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
    getBorder: vi.fn().mockReturnValue({ width: 1, style: 'solid', dashArray: [] }),
    getAppearance: vi.fn().mockReturnValue(null),
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
    rotation: 0,
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
    getFormSelectedText: vi.fn().mockReturnValue('selected'),
    canFormUndo: vi.fn().mockReturnValue(true),
    formUndo: vi.fn().mockReturnValue(true),
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
        rotation: number;
        hasTransparency: boolean;
        charCount: number;
        pageBoxes: { media: unknown };
      };
      expect(payload.rotation).toBe(0);
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
});
