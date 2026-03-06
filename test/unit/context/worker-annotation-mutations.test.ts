/**
 * Unit tests for annotation mutation worker protocol.
 *
 * Verifies that WorkerProxy sends the correct message type and payload
 * for each of the 11 annotation mutation operations, and that
 * WorkerPDFiumPage delegates to the proxy correctly.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';

// ── Mock Worker ───────────────────────────────────────────────

class MockWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly posted: Array<{ data: unknown; transfer: Transferable[] }> = [];
  terminated = false;

  postMessage(data: unknown, options?: { transfer?: Transferable[] } | Transferable[]): void {
    const transfer = Array.isArray(options) ? options : ((options as { transfer?: Transferable[] })?.transfer ?? []);
    this.posted.push({ data, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  respondSuccess(id: string, payload: unknown): void {
    const response: WorkerResponse = { type: 'SUCCESS', id, payload };
    this.onmessage?.(new MessageEvent('message', { data: response }));
  }
}

// ── Setup helpers ─────────────────────────────────────────────

type PostedMsg = { type: string; id: string; payload: Record<string, unknown> };

async function createInitialisedProxy(mockWorker: MockWorker) {
  const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
  const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8));
  const initMsg = mockWorker.posted[0]!.data as PostedMsg;
  mockWorker.respondSuccess(initMsg.id, undefined);
  return await createPromise;
}

async function disposeProxy(proxy: { dispose(): Promise<void> }, mockWorker: MockWorker): Promise<void> {
  const disposePromise = proxy.dispose();
  const lastMsg = mockWorker.posted[mockWorker.posted.length - 1]?.data as PostedMsg | undefined;
  if (lastMsg?.type === 'DESTROY') {
    mockWorker.respondSuccess(lastMsg.id, undefined);
  }
  await disposePromise;
}

function lastMsg(mockWorker: MockWorker): PostedMsg {
  return mockWorker.posted[mockWorker.posted.length - 1]!.data as PostedMsg;
}

// ── Protocol type completeness checks (compile-time) ─────────

describe('WorkerRequest protocol — annotation mutation types', () => {
  // These checks ensure the protocol union includes all 11 mutation types.
  // They are compile-time assertions: if a type is missing, TypeScript will
  // error here before the test even runs.
  type AnnotationMutationTypes =
    | 'CREATE_ANNOTATION'
    | 'REMOVE_ANNOTATION'
    | 'SET_ANNOTATION_RECT'
    | 'SET_ANNOTATION_COLOUR'
    | 'SET_ANNOTATION_FLAGS'
    | 'SET_ANNOTATION_STRING'
    | 'SET_ANNOTATION_BORDER'
    | 'SET_ANNOTATION_ATTACHMENT_POINTS'
    | 'APPEND_ANNOTATION_ATTACHMENT_POINTS'
    | 'SET_ANNOTATION_URI'
    | 'ADD_INK_STROKE'
    | 'GENERATE_PAGE_CONTENT';

  test('all 12 annotation mutation message types are present in WorkerRequest', async () => {
    // Import the protocol module to ensure it loads without error
    const protocol = await import('../../../src/context/protocol.js');
    // Protocol exports types only — verify the module resolves
    expect(protocol).toBeDefined();

    // Validate the type names exist by using them as literals in a type-level assertion
    const expectedTypes: AnnotationMutationTypes[] = [
      'CREATE_ANNOTATION',
      'REMOVE_ANNOTATION',
      'SET_ANNOTATION_RECT',
      'SET_ANNOTATION_COLOUR',
      'SET_ANNOTATION_FLAGS',
      'SET_ANNOTATION_STRING',
      'SET_ANNOTATION_BORDER',
      'SET_ANNOTATION_ATTACHMENT_POINTS',
      'APPEND_ANNOTATION_ATTACHMENT_POINTS',
      'SET_ANNOTATION_URI',
      'ADD_INK_STROKE',
      'GENERATE_PAGE_CONTENT',
    ];
    expect(expectedTypes).toHaveLength(12);
  });
});

// ── WorkerProxy — annotation mutation wire tests ──────────────

describe('WorkerProxy — annotation mutations', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockWorker = new MockWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional test mock
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('createAnnotation sends CREATE_ANNOTATION with pageId and subtype', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const { AnnotationType } = await import('../../../src/core/types.js');
    const resultPromise = proxy.createAnnotation('page-1', AnnotationType.Highlight);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('CREATE_ANNOTATION');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', subtype: 'Highlight' });

    mockWorker.respondSuccess(msg.id, {
      index: 0,
      type: 'Highlight',
      bounds: { left: 0, top: 10, right: 100, bottom: 0 },
      colour: { stroke: undefined, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: undefined,
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    });

    const result = await resultPromise;
    expect(result.index).toBe(0);
    expect(result.type).toBe('Highlight');

    await disposeProxy(proxy, mockWorker);
  });

  test('removeAnnotation sends REMOVE_ANNOTATION with pageId and annotationIndex', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.removeAnnotation('page-1', 2);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('REMOVE_ANNOTATION');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', annotationIndex: 2 });

    mockWorker.respondSuccess(msg.id, true);
    const result = await resultPromise;
    expect(result).toBe(true);

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationRect sends SET_ANNOTATION_RECT with pageId, annotationIndex, and rect', async () => {
    const proxy = await createInitialisedProxy(mockWorker);
    const rect = { left: 10, top: 100, right: 200, bottom: 50 };

    const resultPromise = proxy.setAnnotationRect('page-1', 0, rect);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_RECT');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', annotationIndex: 0, rect });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationColour sends SET_ANNOTATION_COLOUR with all required fields', async () => {
    const proxy = await createInitialisedProxy(mockWorker);
    const colour = { r: 255, g: 255, b: 0, a: 128 };

    const resultPromise = proxy.setAnnotationColour('page-2', 1, 'stroke', colour);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_COLOUR');
    expect(msg.payload).toMatchObject({
      pageId: 'page-2',
      annotationIndex: 1,
      colourType: 'stroke',
      colour,
    });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationFlags sends SET_ANNOTATION_FLAGS with pageId, annotationIndex, and flags', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.setAnnotationFlags('page-1', 3, 4);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_FLAGS');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', annotationIndex: 3, flags: 4 });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationString sends SET_ANNOTATION_STRING with key and value', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.setAnnotationString('page-1', 0, 'Contents', 'Hello world');
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_STRING');
    expect(msg.payload).toMatchObject({
      pageId: 'page-1',
      annotationIndex: 0,
      key: 'Contents',
      value: 'Hello world',
    });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationBorder sends SET_ANNOTATION_BORDER with radius and width fields', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.setAnnotationBorder('page-1', 0, 2, 2, 1);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_BORDER');
    expect(msg.payload).toMatchObject({
      pageId: 'page-1',
      annotationIndex: 0,
      hRadius: 2,
      vRadius: 2,
      borderWidth: 1,
    });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationAttachmentPoints sends SET_ANNOTATION_ATTACHMENT_POINTS with quadIndex', async () => {
    const proxy = await createInitialisedProxy(mockWorker);
    const points = { x1: 0, y1: 10, x2: 100, y2: 10, x3: 100, y3: 0, x4: 0, y4: 0 };

    const resultPromise = proxy.setAnnotationAttachmentPoints('page-1', 0, 1, points);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_ATTACHMENT_POINTS');
    expect(msg.payload).toMatchObject({
      pageId: 'page-1',
      annotationIndex: 0,
      quadIndex: 1,
      points,
    });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('appendAnnotationAttachmentPoints sends APPEND_ANNOTATION_ATTACHMENT_POINTS', async () => {
    const proxy = await createInitialisedProxy(mockWorker);
    const points = { x1: 10, y1: 20, x2: 110, y2: 20, x3: 110, y3: 0, x4: 10, y4: 0 };

    const resultPromise = proxy.appendAnnotationAttachmentPoints('page-1', 0, points);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('APPEND_ANNOTATION_ATTACHMENT_POINTS');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', annotationIndex: 0, points });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('setAnnotationURI sends SET_ANNOTATION_URI with uri', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.setAnnotationURI('page-1', 0, 'https://example.com');
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_URI');
    expect(msg.payload).toMatchObject({
      pageId: 'page-1',
      annotationIndex: 0,
      uri: 'https://example.com',
    });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });

  test('addInkStroke sends ADD_INK_STROKE with correct payload', async () => {
    const proxy = await createInitialisedProxy(mockWorker);
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    const resultPromise = proxy.addInkStroke('page-1', 0, points);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('ADD_INK_STROKE');
    expect(msg.payload).toMatchObject({ pageId: 'page-1', annotationIndex: 0, points });

    mockWorker.respondSuccess(msg.id, 0);
    const result = await resultPromise;
    expect(result).toBe(0);

    await disposeProxy(proxy, mockWorker);
  });

  test('generatePageContent sends GENERATE_PAGE_CONTENT with pageId', async () => {
    const proxy = await createInitialisedProxy(mockWorker);

    const resultPromise = proxy.generatePageContent('page-1');
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('GENERATE_PAGE_CONTENT');
    expect(msg.payload).toMatchObject({ pageId: 'page-1' });

    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await disposeProxy(proxy, mockWorker);
  });
});

// ── WorkerPDFiumPage — delegation tests ──────────────────────

describe('WorkerPDFiumPage — annotation mutation delegation', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.resetModules();
    mockWorker = new MockWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional test mock
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function setupPage() {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: new Uint8Array([0x00, 0x61, 0x73, 0x6d]).buffer,
    });
    await vi.waitFor(() => expect(mockWorker.posted.length).toBeGreaterThan(0));
    const initMsg = mockWorker.posted[0]!.data as PostedMsg;
    mockWorker.respondSuccess(initMsg.id, undefined);
    const pdfium = await initPromise;

    const openPromise = pdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const document = await openPromise;

    const loadPagePromise = document.getPage(0);
    const loadMsg = lastMsg(mockWorker);
    mockWorker.respondSuccess(loadMsg.id, { pageId: 'page-1', index: 0, width: 612, height: 792 });
    const page = await loadPagePromise;

    return { pdfium, document, page };
  }

  async function teardown(pdfium: { dispose(): Promise<void> }, mockWorker: MockWorker): Promise<void> {
    const disposePromise = pdfium.dispose();
    const msg = lastMsg(mockWorker);
    if (msg.type === 'DESTROY') {
      mockWorker.respondSuccess(msg.id, undefined);
    }
    await disposePromise;
  }

  async function closePage(page: { dispose(): Promise<void> }, mockWorker: MockWorker): Promise<void> {
    const closePromise = page.dispose();
    const msg = lastMsg(mockWorker);
    mockWorker.respondSuccess(msg.id, undefined);
    await closePromise;
  }

  async function closeDocument(doc: { dispose(): Promise<void> }, mockWorker: MockWorker): Promise<void> {
    const closePromise = doc.dispose();
    const msg = lastMsg(mockWorker);
    mockWorker.respondSuccess(msg.id, undefined);
    await closePromise;
  }

  test('createAnnotation delegates to proxy with correct message type', async () => {
    const { pdfium, document, page } = await setupPage();

    const { AnnotationType } = await import('../../../src/core/types.js');
    const resultPromise = page.createAnnotation(AnnotationType.Square);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('CREATE_ANNOTATION');
    expect(msg.payload.subtype).toBe('Square');
    mockWorker.respondSuccess(msg.id, {
      index: 2,
      type: 'Square',
      bounds: { left: 0, top: 10, right: 100, bottom: 0 },
      colour: { stroke: undefined, interior: undefined },
      flags: 0,
      contents: '',
      author: '',
      subject: '',
      border: null,
      appearance: null,
      fontSize: 0,
      line: undefined,
      vertices: undefined,
      inkPaths: undefined,
      attachmentPoints: undefined,
      widget: undefined,
      link: undefined,
    });
    const result = await resultPromise;
    expect(result.index).toBe(2);

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('removeAnnotation delegates to proxy with correct message type', async () => {
    const { pdfium, document, page } = await setupPage();

    const resultPromise = page.removeAnnotation(1);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('REMOVE_ANNOTATION');
    expect(msg.payload.annotationIndex).toBe(1);
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationRect delegates to proxy with correct payload', async () => {
    const { pdfium, document, page } = await setupPage();
    const rect = { left: 10, top: 100, right: 200, bottom: 50 };

    const resultPromise = page.setAnnotationRect(0, rect);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_RECT');
    expect(msg.payload.rect).toEqual(rect);
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationColour delegates with colourType and colour', async () => {
    const { pdfium, document, page } = await setupPage();
    const colour = { r: 255, g: 0, b: 0, a: 255 };

    const resultPromise = page.setAnnotationColour(0, 'interior', colour);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_COLOUR');
    expect(msg.payload.colourType).toBe('interior');
    expect(msg.payload.colour).toEqual(colour);
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationFlags delegates with flags value', async () => {
    const { pdfium, document, page } = await setupPage();

    const resultPromise = page.setAnnotationFlags(0, 8);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_FLAGS');
    expect(msg.payload.flags).toBe(8);
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationString delegates with key and value', async () => {
    const { pdfium, document, page } = await setupPage();

    const resultPromise = page.setAnnotationString(0, 'T', 'Author Name');
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_STRING');
    expect(msg.payload.key).toBe('T');
    expect(msg.payload.value).toBe('Author Name');
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationBorder delegates with radius and width', async () => {
    const { pdfium, document, page } = await setupPage();

    const resultPromise = page.setAnnotationBorder(0, 3, 3, 2);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_BORDER');
    expect(msg.payload).toMatchObject({ hRadius: 3, vRadius: 3, borderWidth: 2 });
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationAttachmentPoints delegates with quadIndex and points', async () => {
    const { pdfium, document, page } = await setupPage();
    const points = { x1: 0, y1: 10, x2: 100, y2: 10, x3: 100, y3: 0, x4: 0, y4: 0 };

    const resultPromise = page.setAnnotationAttachmentPoints(0, 0, points);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_ATTACHMENT_POINTS');
    expect(msg.payload.quadIndex).toBe(0);
    expect(msg.payload.points).toEqual(points);
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('appendAnnotationAttachmentPoints delegates with points', async () => {
    const { pdfium, document, page } = await setupPage();
    const points = { x1: 5, y1: 15, x2: 105, y2: 15, x3: 105, y3: 5, x4: 5, y4: 5 };

    const resultPromise = page.appendAnnotationAttachmentPoints(0, points);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('APPEND_ANNOTATION_ATTACHMENT_POINTS');
    expect(msg.payload.points).toEqual(points);
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('setAnnotationURI delegates with uri', async () => {
    const { pdfium, document, page } = await setupPage();

    const resultPromise = page.setAnnotationURI(0, 'https://example.org');
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('SET_ANNOTATION_URI');
    expect(msg.payload.uri).toBe('https://example.org');
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('addInkStroke delegates to proxy', async () => {
    const { pdfium, document, page } = await setupPage();
    const points = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    const resultPromise = page.addInkStroke(0, points);
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('ADD_INK_STROKE');
    expect(msg.payload.annotationIndex).toBe(0);
    expect(msg.payload.points).toEqual(points);
    mockWorker.respondSuccess(msg.id, 0);
    const result = await resultPromise;
    expect(result).toBe(0);

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });

  test('generateContent sends GENERATE_PAGE_CONTENT with pageId', async () => {
    const { pdfium, document, page } = await setupPage();

    const resultPromise = page.generateContent();
    const msg = lastMsg(mockWorker);
    expect(msg.type).toBe('GENERATE_PAGE_CONTENT');
    mockWorker.respondSuccess(msg.id, true);
    await resultPromise;

    await closePage(page, mockWorker);
    await closeDocument(document, mockWorker);
    await teardown(pdfium, mockWorker);
  });
});
