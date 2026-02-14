/**
 * Serialisation correctness tests for worker protocol.
 *
 * Verifies that serialised annotation, page object, link, and bookmark data:
 * - Contains only plain values (no class instances, no functions)
 * - Survives `structuredClone()` (simulating `postMessage`)
 * - Handles all optional fields correctly (undefined, not missing)
 * - Preserves nested structures at arbitrary depth
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { FormFieldType } from '../../../src/core/types.js';

// Captured postMessage calls
const postedMessages: Array<{ data: WorkerResponse; transfer: Transferable[] }> = [];

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
  return {
    ...widget,
    getFormFieldType: vi.fn().mockReturnValue(FormFieldType.TextField),
    getFormFieldName: vi.fn().mockReturnValue('FullName'),
    getFormFieldValue: vi.fn().mockReturnValue('John Doe'),
    getFormFieldAlternateName: vi.fn().mockReturnValue('Name'),
    getFormFieldExportValue: vi.fn().mockReturnValue(''),
    getFormFieldFlags: vi.fn().mockReturnValue(0),
    getFormFieldOptions: vi.fn().mockReturnValue([]),
  };
}

// Mock annotation generator
function* mockAnnotationsGen() {
  yield createMockAnnotation();
}

// Mock page instance
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
    getFormSelectedText: vi.fn().mockReturnValue(null),
    canFormUndo: vi.fn().mockReturnValue(false),
    formUndo: vi.fn().mockReturnValue(false),
    dispose: vi.fn(),
  };
}

// Mock document instance
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
    getBookmarks: vi.fn().mockReturnValue([
      {
        title: 'Chapter 1',
        pageIndex: 0,
        children: [
          {
            title: 'Section 1.1',
            pageIndex: 1,
            children: [{ title: 'Subsection 1.1.1', pageIndex: 2, children: [] }],
          },
        ],
      },
    ]),
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

// Track mock instances for assertions
let mockPdfiumDispose: ReturnType<typeof vi.fn>;
let mockOpenDocument: ReturnType<typeof vi.fn>;
let currentMockDocument: ReturnType<typeof createMockDocument>;

describe('Worker serialisation correctness', () => {
  beforeEach(() => {
    vi.resetModules();
    postedMessages.length = 0;

    mockPdfiumDispose = vi.fn();
    currentMockDocument = createMockDocument(4);
    mockOpenDocument = vi.fn().mockResolvedValue(currentMockDocument);

    vi.stubGlobal('self', {
      postMessage: (data: WorkerResponse, options?: { transfer?: Transferable[] }) => {
        postedMessages.push({ data, transfer: options?.transfer ?? [] });
      },
      onmessage: null,
      location: { origin: 'https://example.com' },
    });

    vi.doMock('../../../src/pdfium.js', () => ({
      PDFium: {
        init: vi.fn().mockResolvedValue({
          openDocument: mockOpenDocument,
          dispose: mockPdfiumDispose,
        }),
      },
    }));
  });

  /** Import setupWorker and install the message handler. */
  async function setup(): Promise<(request: WorkerRequest) => Promise<void>> {
    const { setupWorker } = await import('../../../src/context/worker-script.js');
    await setupWorker();

    const handler = (self as unknown as { onmessage: (event: MessageEvent<WorkerRequest>) => Promise<void> }).onmessage;
    return async (request: WorkerRequest) => {
      await handler(new MessageEvent('message', { data: request }));
    };
  }

  function lastResponse(): WorkerResponse {
    return postedMessages[postedMessages.length - 1]!.data;
  }

  function lastTransfer(): Transferable[] {
    return postedMessages[postedMessages.length - 1]!.transfer;
  }

  /** Initialise, open a document, and load page 0. Returns documentId and pageId. */
  async function initAndLoadPage(send: (request: WorkerRequest) => Promise<void>) {
    await send({ type: 'INIT', id: 'init-1', payload: { wasmBinary: new ArrayBuffer(8) } });
    expect(lastResponse().type).toBe('SUCCESS');

    await send({ type: 'OPEN_DOCUMENT', id: 'open-1', payload: { data: new ArrayBuffer(100) } });
    const openResp = lastResponse();
    expect(openResp.type).toBe('SUCCESS');
    const { documentId } = (openResp as { type: 'SUCCESS'; payload: { documentId: string } }).payload;

    await send({ type: 'LOAD_PAGE', id: 'load-1', payload: { documentId, pageIndex: 0 } });
    const loadResp = lastResponse();
    expect(loadResp.type).toBe('SUCCESS');
    const { pageId } = (loadResp as { type: 'SUCCESS'; payload: { pageId: string } }).payload;

    return { documentId, pageId };
  }

  describe('annotation serialisation', () => {
    test('produces JSON-serialisable POJO with all standard fields', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_ANNOTATIONS', id: 'annot-1', payload: { pageId } });

      const response = lastResponse();
      expect(response.type).toBe('SUCCESS');
      const annotations = (response as { type: 'SUCCESS'; payload: unknown[] }).payload;
      expect(annotations.length).toBeGreaterThan(0);

      const annot = annotations[0] as Record<string, unknown>;
      expect(annot.index).toBeTypeOf('number');
      expect(annot.bounds).toBeDefined();
      expect(annot.colour).toBeDefined();
      expect(annot.flags).toBeTypeOf('number');
      expect(annot.contents).toBeTypeOf('string');
      expect(annot.author).toBeTypeOf('string');
      expect(annot.subject).toBeTypeOf('string');
      expect(annot.fontSize).toBeTypeOf('number');

      // JSON-safe: no functions, no class instances
      const json = JSON.stringify(annot);
      expect(json).toBeTypeOf('string');
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed.index).toBe(annot.index);
      expect(parsed.contents).toBe(annot.contents);
    });

    test('survives structuredClone (simulating postMessage)', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_ANNOTATIONS', id: 'annot-2', payload: { pageId } });

      const annotations = (lastResponse() as { type: 'SUCCESS'; payload: unknown[] }).payload;
      const annot = annotations[0] as Record<string, unknown>;
      const cloned = structuredClone(annot);
      expect(cloned).toEqual(annot);
    });

    test('includes quad points in attachmentPoints', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_ANNOTATIONS', id: 'annot-3', payload: { pageId } });

      const annotations = (lastResponse() as { type: 'SUCCESS'; payload: Array<{ attachmentPoints?: unknown[] }> })
        .payload;
      const annot = annotations[0]!;

      expect(annot.attachmentPoints).toBeDefined();
      expect(annot.attachmentPoints!.length).toBe(1);
      const quad = annot.attachmentPoints![0] as Record<string, number>;
      expect(quad.x1).toBeTypeOf('number');
      expect(quad.y1).toBeTypeOf('number');
    });

    test('widget annotation includes form field data', async () => {
      // Override to use a widget annotation
      const widgetAnnot = createMockWidgetAnnotation();
      const page = createMockPage(0, 612, 792);
      page.annotations = vi.fn().mockReturnValue(
        (function* () {
          yield widgetAnnot;
        })(),
      );
      currentMockDocument.getPage = vi.fn().mockReturnValue(page);

      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_ANNOTATIONS', id: 'annot-w', payload: { pageId } });

      const annotations = (lastResponse() as { type: 'SUCCESS'; payload: Array<{ widget?: Record<string, unknown> }> })
        .payload;
      const annot = annotations[0]!;

      expect(annot.widget).toBeDefined();
      expect(annot.widget!.fieldName).toBe('FullName');
      expect(annot.widget!.fieldValue).toBe('John Doe');

      // Widget data survives structuredClone
      const cloned = structuredClone(annot);
      expect(cloned.widget).toEqual(annot.widget);
    });

    test('link annotation includes action and destination', async () => {
      const linkAnnot = createMockAnnotation();
      linkAnnot.getLink = vi.fn().mockReturnValue({
        action: { type: 'uri', uri: 'https://example.com', filePath: undefined },
        destination: { pageIndex: 3, fitType: 'XYZ', x: 0, y: 792, zoom: 1 },
      });

      const page = createMockPage(0, 612, 792);
      page.annotations = vi.fn().mockReturnValue(
        (function* () {
          yield linkAnnot;
        })(),
      );
      currentMockDocument.getPage = vi.fn().mockReturnValue(page);

      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_ANNOTATIONS', id: 'annot-l', payload: { pageId } });

      const annotations = (lastResponse() as { type: 'SUCCESS'; payload: Array<{ link?: Record<string, unknown> }> })
        .payload;
      const annot = annotations[0]!;

      expect(annot.link).toBeDefined();
      const action = annot.link!.action as Record<string, unknown>;
      expect(action.type).toBe('uri');
      expect(action.uri).toBe('https://example.com');

      const destination = annot.link!.destination as Record<string, unknown>;
      expect(destination.pageIndex).toBe(3);
    });

    test('line annotation includes start and end points', async () => {
      // Create annotation with getLine returning LinePoints format
      const lineAnnot = createMockAnnotation();
      lineAnnot.getLine = vi.fn().mockReturnValue({ startX: 50, startY: 100, endX: 200, endY: 300 });

      const page = createMockPage(0, 612, 792);
      page.annotations = vi.fn().mockReturnValue(
        (function* () {
          yield lineAnnot;
        })(),
      );
      currentMockDocument.getPage = vi.fn().mockReturnValue(page);

      const send = await setup();
      const { pageId } = await initAndLoadPage(send);
      await send({ type: 'GET_ANNOTATIONS', id: 'annot-line', payload: { pageId } });

      const annotations = (
        lastResponse() as {
          type: 'SUCCESS';
          payload: Array<{ line?: { start: { x: number; y: number }; end: { x: number; y: number } } }>;
        }
      ).payload;
      const annot = annotations[0]!;
      expect(annot.line).toBeDefined();
      expect(annot.line!.start).toEqual({ x: 50, y: 100 });
      expect(annot.line!.end).toEqual({ x: 200, y: 300 });
    });

    test('polygon annotation includes vertices array', async () => {
      const polyAnnot = createMockAnnotation();
      polyAnnot.getVertices = vi.fn().mockReturnValue([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 80 },
      ]);

      const page = createMockPage(0, 612, 792);
      page.annotations = vi.fn().mockReturnValue(
        (function* () {
          yield polyAnnot;
        })(),
      );
      currentMockDocument.getPage = vi.fn().mockReturnValue(page);

      const send = await setup();
      const { pageId } = await initAndLoadPage(send);
      await send({ type: 'GET_ANNOTATIONS', id: 'annot-poly', payload: { pageId } });

      const annotations = (
        lastResponse() as { type: 'SUCCESS'; payload: Array<{ vertices?: Array<{ x: number; y: number }> }> }
      ).payload;
      const annot = annotations[0]!;
      expect(annot.vertices).toBeDefined();
      expect(annot.vertices).toHaveLength(3);
      expect(annot.vertices![0]).toEqual({ x: 0, y: 0 });
    });

    test('ink annotation includes multiple ink paths', async () => {
      const inkAnnot = createMockAnnotation();
      inkAnnot.inkPathCount = 2;
      inkAnnot.getInkPath = vi.fn().mockImplementation((index: number) => {
        if (index === 0)
          return [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ];
        if (index === 1)
          return [
            { x: 50, y: 60 },
            { x: 70, y: 80 },
            { x: 90, y: 100 },
          ];
        return null;
      });

      const page = createMockPage(0, 612, 792);
      page.annotations = vi.fn().mockReturnValue(
        (function* () {
          yield inkAnnot;
        })(),
      );
      currentMockDocument.getPage = vi.fn().mockReturnValue(page);

      const send = await setup();
      const { pageId } = await initAndLoadPage(send);
      await send({ type: 'GET_ANNOTATIONS', id: 'annot-ink', payload: { pageId } });

      const annotations = (
        lastResponse() as { type: 'SUCCESS'; payload: Array<{ inkPaths?: Array<Array<{ x: number; y: number }>> }> }
      ).payload;
      const annot = annotations[0]!;
      expect(annot.inkPaths).toBeDefined();
      expect(annot.inkPaths).toHaveLength(2);
      expect(annot.inkPaths![0]).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]);
      expect(annot.inkPaths![1]).toHaveLength(3);
    });
  });

  describe('page object serialisation', () => {
    test('produces JSON-serialisable POJO', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_PAGE_OBJECTS', id: 'obj-1', payload: { pageId } });

      const response = lastResponse();
      expect(response.type).toBe('SUCCESS');
      const objects = (response as { type: 'SUCCESS'; payload: unknown[] }).payload;
      expect(objects.length).toBeGreaterThan(0);

      const obj = objects[0] as Record<string, unknown>;
      expect(obj.bounds).toBeDefined();
      expect(obj.matrix).toBeDefined();
      expect(obj.marks).toBeInstanceOf(Array);

      const json = JSON.stringify(obj);
      expect(json).toBeTypeOf('string');
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed.bounds).toEqual(obj.bounds);
    });

    test('survives structuredClone', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_PAGE_OBJECTS', id: 'obj-2', payload: { pageId } });

      const objects = (lastResponse() as { type: 'SUCCESS'; payload: unknown[] }).payload;
      const obj = objects[0] as Record<string, unknown>;
      const cloned = structuredClone(obj);
      expect(cloned).toEqual(obj);
    });
  });

  describe('link serialisation', () => {
    test('produces JSON-serialisable link array', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_LINKS', id: 'link-1', payload: { pageId } });

      const response = lastResponse();
      expect(response.type).toBe('SUCCESS');
      const links = (response as { type: 'SUCCESS'; payload: unknown[] }).payload;
      expect(links.length).toBeGreaterThan(0);

      const link = links[0] as Record<string, unknown>;
      expect(link.index).toBeTypeOf('number');
      expect(link.bounds).toBeDefined();

      const json = JSON.stringify(link);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed.index).toBe(link.index);
    });

    test('link with action survives structuredClone', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_LINKS', id: 'link-2', payload: { pageId } });

      const links = (lastResponse() as { type: 'SUCCESS'; payload: unknown[] }).payload;
      const link = links[0] as Record<string, unknown>;
      const cloned = structuredClone(link);
      expect(cloned).toEqual(link);
    });
  });

  describe('bookmark serialisation', () => {
    test('preserves 3-level nested bookmark tree', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'GET_BOOKMARKS', id: 'bm-1', payload: { documentId } });

      const response = lastResponse();
      expect(response.type).toBe('SUCCESS');
      const bookmarks = (response as { type: 'SUCCESS'; payload: Array<{ title: string; children: unknown[] }> })
        .payload;
      expect(bookmarks.length).toBe(1);

      const root = bookmarks[0]!;
      expect(root.title).toBe('Chapter 1');
      expect(root.children.length).toBe(1);

      const level2 = root.children[0] as { title: string; children: unknown[] };
      expect(level2.title).toBe('Section 1.1');
      expect(level2.children.length).toBe(1);

      const level3 = level2.children[0] as { title: string; children: unknown[] };
      expect(level3.title).toBe('Subsection 1.1.1');
      expect(level3.children).toEqual([]);
    });

    test('bookmark tree survives structuredClone', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'GET_BOOKMARKS', id: 'bm-2', payload: { documentId } });

      const payload = (lastResponse() as { type: 'SUCCESS'; payload: unknown }).payload;
      const cloned = structuredClone(payload);
      expect(cloned).toEqual(payload);
    });
  });

  describe('structure element serialisation', () => {
    test('returns nested structure elements that survive structuredClone', async () => {
      const page = createMockPage(0, 612, 792);
      page.getStructureTree = vi.fn().mockReturnValue([
        {
          type: 'Document',
          title: 'Main',
          altText: undefined,
          lang: 'en',
          children: [
            { type: 'P', title: undefined, altText: 'Paragraph', lang: undefined, children: [] },
            {
              type: 'Table',
              title: 'Data',
              altText: undefined,
              lang: undefined,
              children: [{ type: 'TR', title: undefined, altText: undefined, lang: undefined, children: [] }],
            },
          ],
        },
      ]);
      currentMockDocument.getPage = vi.fn().mockReturnValue(page);

      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_STRUCTURE_TREE', id: 'st-1', payload: { pageId } });

      const response = lastResponse();
      expect(response.type).toBe('SUCCESS');
      const tree = (response as { type: 'SUCCESS'; payload: Array<{ type: string; children: unknown[] }> }).payload;
      expect(tree.length).toBe(1);

      const root = tree[0]!;
      expect(root.type).toBe('Document');
      expect(root.children.length).toBe(2);

      // Survives structuredClone
      const cloned = structuredClone(tree);
      expect(cloned).toEqual(tree);
    });
  });

  describe('attachment serialisation', () => {
    test('attachment data is transferable ArrayBuffer', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'GET_ATTACHMENTS', id: 'att-1', payload: { documentId } });

      const response = lastResponse();
      expect(response.type).toBe('SUCCESS');
      const attachments = (
        response as { type: 'SUCCESS'; payload: Array<{ index: number; name: string; data: ArrayBuffer }> }
      ).payload;
      expect(attachments.length).toBe(1);
      expect(attachments[0]!.name).toBe('test.txt');
      expect(attachments[0]!.data).toBeInstanceOf(ArrayBuffer);
    });

    test('attachment data ArrayBuffer is in transfer list', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'GET_ATTACHMENTS', id: 'att-2', payload: { documentId } });

      const transfer = lastTransfer();
      expect(transfer.length).toBeGreaterThan(0);
      expect(transfer[0]).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('roundtrip fidelity', () => {
    test('save response ArrayBuffer is in transfer list', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'SAVE_DOCUMENT', id: 'save-1', payload: { documentId } });

      const transfer = lastTransfer();
      expect(transfer.length).toBe(1);
      expect(transfer[0]).toBeInstanceOf(ArrayBuffer);
    });

    test('web links survive structuredClone', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_WEB_LINKS', id: 'wl-1', payload: { pageId } });

      const payload = (lastResponse() as { type: 'SUCCESS'; payload: unknown }).payload;
      const cloned = structuredClone(payload);
      expect(cloned).toEqual(payload);
    });

    test('character info survives structuredClone', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_CHAR_AT_POS', id: 'char-1', payload: { pageId, x: 100, y: 700 } });

      const payload = (lastResponse() as { type: 'SUCCESS'; payload: unknown }).payload;
      const cloned = structuredClone(payload);
      expect(cloned).toEqual(payload);
    });

    test('named destinations survive structuredClone', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'GET_NAMED_DESTINATIONS', id: 'nd-1', payload: { documentId } });

      const payload = (lastResponse() as { type: 'SUCCESS'; payload: unknown }).payload;
      const cloned = structuredClone(payload);
      expect(cloned).toEqual(payload);
    });

    test('document info survives structuredClone', async () => {
      const send = await setup();
      const { documentId } = await initAndLoadPage(send);

      await send({ type: 'GET_DOCUMENT_INFO', id: 'di-1', payload: { documentId } });

      const payload = (lastResponse() as { type: 'SUCCESS'; payload: unknown }).payload;
      const cloned = structuredClone(payload);
      expect(cloned).toEqual(payload);
    });

    test('page info with boxes survives structuredClone', async () => {
      const send = await setup();
      const { pageId } = await initAndLoadPage(send);

      await send({ type: 'GET_PAGE_INFO', id: 'pi-1', payload: { pageId } });

      const payload = (lastResponse() as { type: 'SUCCESS'; payload: unknown }).payload;
      const cloned = structuredClone(payload);
      expect(cloned).toEqual(payload);
    });
  });
});
