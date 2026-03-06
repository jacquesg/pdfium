/**
 * Unit tests for high-level worker-backed PDFium API.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

class MockWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  readonly posted: Array<{ data: unknown; transfer: readonly unknown[] }> = [];
  terminated = false;

  postMessage(data: unknown, transfer: readonly unknown[] = []): void {
    this.posted.push({ data, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  respondSuccess(id: string, payload: unknown): void {
    const response: WorkerResponse = { type: 'SUCCESS', id, payload };
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
  }
}

function createWasmMagicBuffer(): ArrayBuffer {
  return new Uint8Array([0x00, 0x61, 0x73, 0x6d]).buffer;
}

describe('WorkerPDFium high-level API', () => {
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

  test('PDFium.init({ useWorker: true }) returns a worker-backed instance', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });

    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    expect(initMessage.type).toBe('INIT');
    mockWorker.respondSuccess(initMessage.id, undefined);

    const workerPdfium = await initPromise;
    expect(workerPdfium.constructor.name).toBe('WorkerPDFium');

    const disposePromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    expect(destroyMessage.type).toBe('DESTROY');
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePromise;
    expect(mockWorker.terminated).toBe(true);
  });

  test('worker-backed document renderPage uses load -> render -> close flow', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    const openPromise = workerPdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMessage = mockWorker.posted[1]!.data as { type: string; id: string };
    expect(openMessage.type).toBe('OPEN_DOCUMENT');
    mockWorker.respondSuccess(openMessage.id, { documentId: 'doc-1', pageCount: 2 });
    const document = await openPromise;
    expect(document.pageCount).toBe(2);

    const renderPromise = document.renderPage(0, { scale: 2 });

    // renderPage now uses a single RENDER_PAGE_STANDALONE message (load + render + close in one shot)
    const renderMessage = mockWorker.posted[2]!.data as { type: string; id: string };
    expect(renderMessage.type).toBe('RENDER_PAGE_STANDALONE');
    mockWorker.respondSuccess(renderMessage.id, {
      width: 1190,
      height: 1684,
      originalWidth: 595,
      originalHeight: 842,
      data: new ArrayBuffer(8),
    });

    const result = await renderPromise;
    expect(result.width).toBe(1190);
    expect(result.height).toBe(1684);

    const closeDocumentPromise = document.dispose();
    const closeDocumentMessage = mockWorker.posted[3]!.data as { type: string; id: string };
    expect(closeDocumentMessage.type).toBe('CLOSE_DOCUMENT');
    mockWorker.respondSuccess(closeDocumentMessage.id, undefined);
    await closeDocumentPromise;

    const disposePdfiumPromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    expect(destroyMessage.type).toBe('DESTROY');
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePdfiumPromise;
  });

  test('openDocument should not transfer the caller ArrayBuffer instance', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    const callerBuffer = new ArrayBuffer(4);
    const openPromise = workerPdfium.openDocument(callerBuffer);
    const openRecord = mockWorker.posted[1]!;
    const transferred = openRecord.transfer[0];
    expect(transferred).toBeInstanceOf(ArrayBuffer);
    expect(transferred).not.toBe(callerBuffer);

    const openMessage = openRecord.data as {
      type: string;
      id: string;
      payload: { data: ArrayBuffer };
    };
    expect(openMessage.type).toBe('OPEN_DOCUMENT');
    expect(openMessage.payload.data).not.toBe(callerBuffer);

    mockWorker.respondSuccess(openMessage.id, { documentId: 'doc-1', pageCount: 1 });
    const document = await openPromise;
    expect(callerBuffer.byteLength).toBe(4);

    const closeDocumentPromise = document.dispose();
    const closeDocumentMessage = mockWorker.posted[2]!.data as { type: string; id: string };
    expect(closeDocumentMessage.type).toBe('CLOSE_DOCUMENT');
    mockWorker.respondSuccess(closeDocumentMessage.id, undefined);
    await closeDocumentPromise;

    const disposePdfiumPromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    expect(destroyMessage.type).toBe('DESTROY');
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePdfiumPromise;
  });

  test('createDocumentBuilder delegates builder operations to worker proxy', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    const createBuilderPromise = workerPdfium.createDocumentBuilder();
    const createBuilderMessage = mockWorker.posted[1]!.data as { type: string; id: string };
    expect(createBuilderMessage.type).toBe('CREATE_DOCUMENT_BUILDER');
    mockWorker.respondSuccess(createBuilderMessage.id, { builderId: 'builder-1' });
    const builder = await createBuilderPromise;

    const addPagePromise = builder.addPage({ width: 595, height: 842 });
    const addPageMessage = mockWorker.posted[2]!.data as {
      type: string;
      id: string;
      payload: { builderId: string; options: { width: number; height: number } };
    };
    expect(addPageMessage.type).toBe('BUILDER_ADD_PAGE');
    expect(addPageMessage.payload.builderId).toBe('builder-1');
    expect(addPageMessage.payload.options).toEqual({ width: 595, height: 842 });
    mockWorker.respondSuccess(addPageMessage.id, { pageBuilderId: 'builder-page-1' });
    const page = await addPagePromise;

    const loadFontPromise = builder.loadStandardFont('Helvetica');
    const loadFontMessage = mockWorker.posted[3]!.data as {
      type: string;
      id: string;
      payload: { builderId: string; fontName: string };
    };
    expect(loadFontMessage.type).toBe('BUILDER_LOAD_STANDARD_FONT');
    expect(loadFontMessage.payload.fontName).toBe('Helvetica');
    mockWorker.respondSuccess(loadFontMessage.id, { fontId: 'font-1' });
    const font = await loadFontPromise;

    const addTextPromise = page.addText('Hello from worker', 72, 770, font, 24);
    const addTextMessage = mockWorker.posted[4]!.data as {
      type: string;
      id: string;
      payload: {
        pageBuilderId: string;
        text: string;
        x: number;
        y: number;
        fontId: string;
        fontSize: number;
      };
    };
    expect(addTextMessage.type).toBe('BUILDER_PAGE_ADD_TEXT');
    expect(addTextMessage.payload.pageBuilderId).toBe('builder-page-1');
    expect(addTextMessage.payload.fontId).toBe('font-1');
    mockWorker.respondSuccess(addTextMessage.id, undefined);
    await addTextPromise;

    const addRectanglePromise = page.addRectangle(10, 20, 30, 40, {
      stroke: { r: 255, g: 0, b: 0, a: 255 },
      strokeWidth: 2,
    });
    const addRectangleMessage = mockWorker.posted[5]!.data as {
      type: string;
      id: string;
      payload: { pageBuilderId: string; x: number; y: number; w: number; h: number };
    };
    expect(addRectangleMessage.type).toBe('BUILDER_PAGE_ADD_RECTANGLE');
    expect(addRectangleMessage.payload).toMatchObject({ pageBuilderId: 'builder-page-1', x: 10, y: 20, w: 30, h: 40 });
    mockWorker.respondSuccess(addRectangleMessage.id, undefined);
    await expect(addRectanglePromise).resolves.toBe(page);

    const addLinePromise = page.addLine(10, 20, 30, 40, {
      stroke: { r: 0, g: 255, b: 0, a: 255 },
      strokeWidth: 3,
    });
    const addLineMessage = mockWorker.posted[6]!.data as {
      type: string;
      id: string;
      payload: { pageBuilderId: string; x1: number; y1: number; x2: number; y2: number };
    };
    expect(addLineMessage.type).toBe('BUILDER_PAGE_ADD_LINE');
    expect(addLineMessage.payload).toMatchObject({ pageBuilderId: 'builder-page-1', x1: 10, y1: 20, x2: 30, y2: 40 });
    mockWorker.respondSuccess(addLineMessage.id, undefined);
    await expect(addLinePromise).resolves.toBe(page);

    const addEllipsePromise = page.addEllipse(50, 60, 20, 10, {
      fill: { r: 0, g: 0, b: 255, a: 255 },
    });
    const addEllipseMessage = mockWorker.posted[7]!.data as {
      type: string;
      id: string;
      payload: { pageBuilderId: string; cx: number; cy: number; rx: number; ry: number };
    };
    expect(addEllipseMessage.type).toBe('BUILDER_PAGE_ADD_ELLIPSE');
    expect(addEllipseMessage.payload).toMatchObject({
      pageBuilderId: 'builder-page-1',
      cx: 50,
      cy: 60,
      rx: 20,
      ry: 10,
    });
    mockWorker.respondSuccess(addEllipseMessage.id, undefined);
    await expect(addEllipsePromise).resolves.toBe(page);

    const savePromise = builder.save();
    const saveMessage = mockWorker.posted[8]!.data as {
      type: string;
      id: string;
      payload: { builderId: string };
    };
    expect(saveMessage.type).toBe('BUILDER_SAVE');
    expect(saveMessage.payload.builderId).toBe('builder-1');
    mockWorker.respondSuccess(saveMessage.id, new ArrayBuffer(16));
    const bytes = await savePromise;
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(16);

    const disposeBuilderPromise = builder.dispose();
    const disposeBuilderMessage = mockWorker.posted[9]!.data as {
      type: string;
      id: string;
      payload: { builderId: string };
    };
    expect(disposeBuilderMessage.type).toBe('DISPOSE_DOCUMENT_BUILDER');
    expect(disposeBuilderMessage.payload.builderId).toBe('builder-1');
    mockWorker.respondSuccess(disposeBuilderMessage.id, undefined);
    await disposeBuilderPromise;

    const disposePdfiumPromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    expect(destroyMessage.type).toBe('DESTROY');
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePdfiumPromise;
  });

  test('worker-backed document query methods delegate to the worker proxy', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    const openPromise = workerPdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMessage = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMessage.id, { documentId: 'doc-1', pageCount: 1 });
    const document = await openPromise;

    const metadataPromise = document.getMetadata();
    const metadataMessage = mockWorker.posted[2]!.data as { type: string; id: string };
    expect(metadataMessage.type).toBe('GET_METADATA');
    mockWorker.respondSuccess(metadataMessage.id, { title: 'Doc' });
    await expect(metadataPromise).resolves.toEqual({ title: 'Doc' });

    const permissionsPromise = document.getPermissions();
    const permissionsMessage = mockWorker.posted[3]!.data as { type: string; id: string };
    expect(permissionsMessage.type).toBe('GET_PERMISSIONS');
    mockWorker.respondSuccess(permissionsMessage.id, { canPrint: true });
    await expect(permissionsPromise).resolves.toEqual({ canPrint: true });

    const viewerPreferencesPromise = document.getViewerPreferences();
    const viewerPreferencesMessage = mockWorker.posted[4]!.data as { type: string; id: string };
    expect(viewerPreferencesMessage.type).toBe('GET_VIEWER_PREFERENCES');
    mockWorker.respondSuccess(viewerPreferencesMessage.id, { hideToolbar: true });
    await expect(viewerPreferencesPromise).resolves.toEqual({ hideToolbar: true });

    const jsActionsPromise = document.getJavaScriptActions();
    const jsActionsMessage = mockWorker.posted[5]!.data as { type: string; id: string };
    expect(jsActionsMessage.type).toBe('GET_JAVASCRIPT_ACTIONS');
    mockWorker.respondSuccess(jsActionsMessage.id, [{ name: 'OpenAction', script: 'app.alert("hi")' }]);
    await expect(jsActionsPromise).resolves.toEqual([{ name: 'OpenAction', script: 'app.alert("hi")' }]);

    const signaturesPromise = document.getSignatures();
    const signaturesMessage = mockWorker.posted[6]!.data as { type: string; id: string };
    expect(signaturesMessage.type).toBe('GET_SIGNATURES');
    mockWorker.respondSuccess(signaturesMessage.id, [{ name: 'sig-1' }]);
    await expect(signaturesPromise).resolves.toEqual([{ name: 'sig-1' }]);

    const printRangesPromise = document.getPrintPageRanges();
    const printRangesMessage = mockWorker.posted[7]!.data as { type: string; id: string };
    expect(printRangesMessage.type).toBe('GET_PRINT_PAGE_RANGES');
    mockWorker.respondSuccess(printRangesMessage.id, [1, 3, 5]);
    await expect(printRangesPromise).resolves.toEqual([1, 3, 5]);

    const extendedInfoPromise = document.getExtendedDocumentInfo();
    const extendedInfoMessage = mockWorker.posted[8]!.data as { type: string; id: string };
    expect(extendedInfoMessage.type).toBe('GET_EXTENDED_DOCUMENT_INFO');
    mockWorker.respondSuccess(extendedInfoMessage.id, { version: '1.7' });
    await expect(extendedInfoPromise).resolves.toEqual({ version: '1.7' });

    const closeDocumentPromise = document.dispose();
    const closeDocumentMessage = mockWorker.posted[9]!.data as { type: string; id: string };
    expect(closeDocumentMessage.type).toBe('CLOSE_DOCUMENT');
    mockWorker.respondSuccess(closeDocumentMessage.id, undefined);
    await closeDocumentPromise;

    const disposePdfiumPromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    expect(destroyMessage.type).toBe('DESTROY');
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePdfiumPromise;
  });

  test('worker-backed page applyRedactions delegates to the worker proxy', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    const openPromise = workerPdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMessage = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMessage.id, { documentId: 'doc-1', pageCount: 1 });
    const document = await openPromise;

    const getPagePromise = document.getPage(0);
    const loadPageMessage = mockWorker.posted[2]!.data as { type: string; id: string };
    mockWorker.respondSuccess(loadPageMessage.id, { pageId: 'page-1', index: 0, width: 100, height: 100 });
    const page = await getPagePromise;

    const applyRedactionsPromise = page.applyRedactions({ r: 0, g: 0, b: 0, a: 255 }, false);
    const applyRedactionsMessage = mockWorker.posted[3]!.data as {
      type: string;
      id: string;
      payload: { fillColour: { r: number; g: number; b: number; a: number }; removeIntersectingAnnotations: boolean };
    };
    expect(applyRedactionsMessage.type).toBe('APPLY_REDACTIONS');
    expect(applyRedactionsMessage.payload.fillColour).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(applyRedactionsMessage.payload.removeIntersectingAnnotations).toBe(false);
    mockWorker.respondSuccess(applyRedactionsMessage.id, {
      appliedRegionCount: 1,
      removedObjectCount: 2,
      removedAnnotationCount: 0,
      insertedFillObjectCount: 1,
    });
    await expect(applyRedactionsPromise).resolves.toEqual({
      appliedRegionCount: 1,
      removedObjectCount: 2,
      removedAnnotationCount: 0,
      insertedFillObjectCount: 1,
    });

    const pageDisposePromise = page.dispose();
    const closePageMessage = mockWorker.posted[4]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closePageMessage.id, undefined);
    await pageDisposePromise;

    const closeDocumentPromise = document.dispose();
    const closeDocumentMessage = mockWorker.posted[5]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocumentMessage.id, undefined);
    await closeDocumentPromise;

    const disposePdfiumPromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePdfiumPromise;
  });

  test('useWorker and useNative together should throw invalid options', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');
    await expect(
      PDFium.init({
        useWorker: true,
        useNative: true,
        wasmBinary: createWasmMagicBuffer(),
      }),
    ).rejects.toMatchObject({ code: PDFiumErrorCode.INIT_INVALID_OPTIONS });
  });

  test('worker-backed page methods (getText, getTextLayout)', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    // Open Document
    const openPromise = workerPdfium.openDocument(new Uint8Array([1, 2, 3, 4]));
    const openMessage = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMessage.id, { documentId: 'doc-1', pageCount: 1 });
    const document = await openPromise;

    // Get Page
    const getPagePromise = document.getPage(0);
    const loadPageMessage = mockWorker.posted[2]!.data as { type: string; id: string };
    expect(loadPageMessage.type).toBe('LOAD_PAGE');
    mockWorker.respondSuccess(loadPageMessage.id, { pageId: 'page-1', index: 0, width: 100, height: 100 });
    const page = await getPagePromise;

    // Get Text
    const getTextPromise = page.getText();
    const getTextMessage = mockWorker.posted[3]!.data as { type: string; id: string };
    expect(getTextMessage.type).toBe('GET_TEXT');
    mockWorker.respondSuccess(getTextMessage.id, 'Hello World');
    const text = await getTextPromise;
    expect(text).toBe('Hello World');

    // Get Text Layout
    const getLayoutPromise = page.getTextLayout();
    const getLayoutMessage = mockWorker.posted[4]!.data as { type: string; id: string };
    expect(getLayoutMessage.type).toBe('GET_TEXT_LAYOUT');
    const rects = new Float32Array([10, 10, 20, 20]);
    mockWorker.respondSuccess(getLayoutMessage.id, { text: 'H', rects });
    const layout = await getLayoutPromise;
    expect(layout.text).toBe('H');
    expect(layout.rects).toEqual(rects);

    // Dispose Page
    const closePagePromise = page.dispose();
    const closePageMessage = mockWorker.posted[5]!.data as { type: string; id: string };
    expect(closePageMessage.type).toBe('CLOSE_PAGE');
    mockWorker.respondSuccess(closePageMessage.id, undefined);
    await closePagePromise;

    // Dispose Document
    const closeDocPromise = document.dispose();
    const closeDocMessage = mockWorker.posted[6]!.data as { type: string; id: string };
    expect(closeDocMessage.type).toBe('CLOSE_DOCUMENT');
    mockWorker.respondSuccess(closeDocMessage.id, undefined);
    await closeDocPromise;

    // Dispose PDFium
    const disposePdfiumPromise = workerPdfium.dispose();
    const destroyMessage = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(destroyMessage.id, undefined);
    await disposePdfiumPromise;
  });

  test('ping should return true on success', async () => {
    const { PDFium } = await import('../../../src/pdfium.js');

    const initPromise = PDFium.init({
      useWorker: true,
      workerUrl: 'worker.js',
      wasmBinary: createWasmMagicBuffer(),
    });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMessage = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMessage.id, undefined);
    const workerPdfium = await initPromise;

    const pingPromise = workerPdfium.ping();
    const pingMessage = mockWorker.posted[1]!.data as { type: string; id: string };
    expect(pingMessage.type).toBe('PING');
    mockWorker.respondSuccess(pingMessage.id, true);

    expect(await pingPromise).toBe(true);
  });

  // ────────────────────────────────────────────────────────────
  // Helper functions for new tests
  // ────────────────────────────────────────────────────────────

  async function setupDocument() {
    const { PDFium } = await import('../../../src/pdfium.js');
    const initPromise = PDFium.init({ useWorker: true, workerUrl: 'worker.js', wasmBinary: createWasmMagicBuffer() });
    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(0);
    });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const pdfium = await initPromise;

    const openPromise = pdfium.openDocument(new Uint8Array([1, 2, 3]));
    const openMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    return { pdfium, document };
  }

  async function setupPage() {
    const { pdfium, document } = await setupDocument();
    const pagePromise = document.getPage(0);
    const loadMsg = mockWorker.posted[2]!.data as { type: string; id: string };
    mockWorker.respondSuccess(loadMsg.id, { pageId: 'page-1', index: 0, width: 612, height: 792 });
    const page = await pagePromise;
    return { pdfium, document, page };
  }

  function lastPostedMsg() {
    return mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string; payload?: unknown };
  }

  async function teardown(pdfium: { dispose(): Promise<void> }) {
    const disposePromise = pdfium.dispose();
    const destroyMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(destroyMsg.id, undefined);
    await disposePromise;
  }

  // ────────────────────────────────────────────────────────────
  // Document-level methods
  // ────────────────────────────────────────────────────────────

  describe('new document methods', () => {
    test('getDocumentInfo delegates to proxy', async () => {
      const { pdfium, document } = await setupDocument();

      const infoPromise = document.getDocumentInfo();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_DOCUMENT_INFO');
      mockWorker.respondSuccess(msg.id, {
        isTagged: true,
        hasForm: false,
        formType: 'none',
        namedDestinationCount: 5,
        pageMode: 'UseNone',
      });
      const info = await infoPromise;
      expect(info.isTagged).toBe(true);
      expect(info.hasForm).toBe(false);

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getBookmarks delegates to proxy', async () => {
      const { pdfium, document } = await setupDocument();

      const bookmarksPromise = document.getBookmarks();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_BOOKMARKS');
      mockWorker.respondSuccess(msg.id, [
        { title: 'Chapter 1', pageIndex: 0, level: 0, children: [] },
        { title: 'Chapter 2', pageIndex: 1, level: 0, children: [] },
      ]);
      const bookmarks = await bookmarksPromise;
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0]?.title).toBe('Chapter 1');

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getAttachments delegates to proxy', async () => {
      const { pdfium, document } = await setupDocument();

      const attachmentsPromise = document.getAttachments();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_ATTACHMENTS');
      mockWorker.respondSuccess(msg.id, [
        { name: 'file1.txt', size: 1024, creationDate: '2024-01-01T00:00:00Z' },
        { name: 'file2.pdf', size: 2048, creationDate: '2024-01-02T00:00:00Z' },
      ]);
      const attachments = await attachmentsPromise;
      expect(attachments).toHaveLength(2);
      expect(attachments[0]?.name).toBe('file1.txt');

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getNamedDestinations delegates to proxy', async () => {
      const { pdfium, document } = await setupDocument();

      const destsPromise = document.getNamedDestinations();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_NAMED_DESTINATIONS');
      mockWorker.respondSuccess(msg.id, [
        { name: 'dest1', pageIndex: 0, zoom: 1.0 },
        { name: 'dest2', pageIndex: 2, zoom: 1.5 },
      ]);
      const dests = await destsPromise;
      expect(dests).toHaveLength(2);
      expect(dests[0]?.name).toBe('dest1');

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getNamedDestinationByName delegates to proxy with name', async () => {
      const { pdfium, document } = await setupDocument();

      const destPromise = document.getNamedDestinationByName('chapter1');
      const msg = lastPostedMsg() as { type: string; id: string; payload: { documentId: string; name: string } };
      expect(msg.type).toBe('GET_NAMED_DEST_BY_NAME');
      expect(msg.payload.name).toBe('chapter1');
      mockWorker.respondSuccess(msg.id, { name: 'chapter1', pageIndex: 0, zoom: 1.0 });
      const dest = await destPromise;
      expect(dest?.name).toBe('chapter1');

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getPageLabel delegates to proxy with pageIndex', async () => {
      const { pdfium, document } = await setupDocument();

      const labelPromise = document.getPageLabel(0);
      const msg = lastPostedMsg() as { type: string; id: string; payload: { documentId: string; pageIndex: number } };
      expect(msg.type).toBe('GET_PAGE_LABEL');
      expect(msg.payload.pageIndex).toBe(0);
      mockWorker.respondSuccess(msg.id, 'Page 1');
      const label = await labelPromise;
      expect(label).toBe('Page 1');

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('save delegates to proxy and returns Uint8Array', async () => {
      const { pdfium, document } = await setupDocument();

      const savePromise = document.save({ version: 17 });
      const msg = lastPostedMsg();
      expect(msg.type).toBe('SAVE_DOCUMENT');
      const mockBuffer = new ArrayBuffer(100);
      mockWorker.respondSuccess(msg.id, mockBuffer);
      const result = await savePromise;
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(100);

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('killFormFocus delegates to proxy', async () => {
      const { pdfium, document } = await setupDocument();

      const killPromise = document.killFormFocus();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('KILL_FORM_FOCUS');
      mockWorker.respondSuccess(msg.id, true);
      const result = await killPromise;
      expect(result).toBe(true);

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('setFormHighlight delegates to proxy', async () => {
      const { pdfium, document } = await setupDocument();

      const { FormFieldType } = await import('../../../src/core/types.js');
      const highlightPromise = document.setFormHighlight(FormFieldType.TextField, { r: 255, g: 0, b: 0, a: 128 }, 0.5);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: {
          documentId: string;
          fieldType: string;
          colour: { r: number; g: number; b: number; a: number };
          alpha: number;
        };
      };
      expect(msg.type).toBe('SET_FORM_HIGHLIGHT');
      expect(msg.payload.fieldType).toBe(FormFieldType.TextField);
      expect(msg.payload.colour).toEqual({ r: 255, g: 0, b: 0, a: 128 });
      expect(msg.payload.alpha).toBe(0.5);
      mockWorker.respondSuccess(msg.id, undefined);
      await highlightPromise;

      const closeDoc = document.dispose();
      const closeMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('importPages delegates to proxy with source document ID', async () => {
      const { pdfium, document } = await setupDocument();

      const openPromise2 = pdfium.openDocument(new Uint8Array([4, 5, 6]));
      await vi.waitFor(() => {
        expect(mockWorker.posted.length).toBeGreaterThan(2);
      });
      const openMsg2 = mockWorker.posted[2]!.data as { type: string; id: string };
      mockWorker.respondSuccess(openMsg2.id, { documentId: 'doc-2', pageCount: 3 });
      const sourceDoc = await openPromise2;

      const importPromise = document.importPages(sourceDoc, { pageRange: '1-2', insertIndex: 0 });
      const importMsg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { targetDocId: string; sourceDocId: string; options?: { pageRange?: string; insertIndex?: number } };
      };
      expect(importMsg.type).toBe('IMPORT_PAGES');
      expect(importMsg.payload.targetDocId).toBe('doc-1');
      expect(importMsg.payload.sourceDocId).toBe('doc-2');
      expect(importMsg.payload.options?.pageRange).toBe('1-2');
      mockWorker.respondSuccess(importMsg.id, undefined);
      await importPromise;

      const closeSource = sourceDoc.dispose();
      const closeSourceMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeSourceMsg.id, undefined);
      await closeSource;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('createNUp delegates to proxy and returns new document', async () => {
      const { pdfium, document } = await setupDocument();

      const nupPromise = document.createNUp({ outputWidth: 612, outputHeight: 792, pagesPerRow: 2, pagesPerColumn: 2 });
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: {
          documentId: string;
          options: { outputWidth: number; outputHeight: number; pagesPerRow: number; pagesPerColumn: number };
        };
      };
      expect(msg.type).toBe('CREATE_N_UP');
      expect(msg.payload.options.pagesPerRow).toBe(2);
      mockWorker.respondSuccess(msg.id, { documentId: 'doc-nup', pageCount: 2 });
      const nupDoc = await nupPromise;
      expect(nupDoc.pageCount).toBe(2);
      expect(nupDoc.id).toBe('doc-nup');

      const closeNup = nupDoc.dispose();
      const closeNupMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeNupMsg.id, undefined);
      await closeNup;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Page-level methods
  // ────────────────────────────────────────────────────────────

  describe('new page methods', () => {
    test('getPageInfo delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const infoPromise = page.getPageInfo();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_PAGE_INFO');
      mockWorker.respondSuccess(msg.id, {
        rotation: 0,
        hasTransparency: false,
        boundingBox: { left: 0, top: 0, right: 612, bottom: 792 },
        charCount: 100,
        pageBoxes: {
          media: { left: 0, top: 0, right: 612, bottom: 792 },
          crop: undefined,
          bleed: undefined,
          trim: undefined,
          art: undefined,
        },
      });
      const info = await infoPromise;
      expect(info.rotation).toBe(0);
      expect(info.hasTransparency).toBe(false);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getAnnotations delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const annotsPromise = page.getAnnotations();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_ANNOTATIONS');
      mockWorker.respondSuccess(msg.id, [
        { type: 'text', rect: { left: 0, top: 0, right: 100, bottom: 100 }, contents: 'Note 1' },
        { type: 'highlight', rect: { left: 10, top: 10, right: 50, bottom: 50 }, contents: 'Highlighted' },
      ]);
      const annots = await annotsPromise;
      expect(annots).toHaveLength(2);
      expect(annots[0]?.type).toBe('text');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getPageObjects delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const objectsPromise = page.getPageObjects();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_PAGE_OBJECTS');
      mockWorker.respondSuccess(msg.id, [
        { type: 'text', bounds: { left: 0, top: 0, right: 100, bottom: 20 } },
        { type: 'image', bounds: { left: 0, top: 30, right: 200, bottom: 200 } },
      ]);
      const objects = await objectsPromise;
      expect(objects).toHaveLength(2);
      expect(objects[0]?.type).toBe('text');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getLinks delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const linksPromise = page.getLinks();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_LINKS');
      mockWorker.respondSuccess(msg.id, [
        {
          index: 0,
          bounds: { left: 10, top: 10, right: 100, bottom: 30 },
          action: { type: 'uri', uri: 'https://example.com' },
          destination: undefined,
        },
      ]);
      const links = await linksPromise;
      expect(links).toHaveLength(1);
      expect(links[0]?.index).toBe(0);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getWebLinks delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const webLinksPromise = page.getWebLinks();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_WEB_LINKS');
      mockWorker.respondSuccess(msg.id, [
        { url: 'https://example.com', rects: [{ left: 10, top: 10, right: 100, bottom: 30 }] },
      ]);
      const webLinks = await webLinksPromise;
      expect(webLinks).toHaveLength(1);
      expect(webLinks[0]?.url).toBe('https://example.com');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getStructureTree delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const treePromise = page.getStructureTree();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_STRUCTURE_TREE');
      mockWorker.respondSuccess(msg.id, [
        { type: 'Document', children: [{ type: 'H1', children: [], altText: 'Title' }], altText: null },
      ]);
      const tree = await treePromise;
      expect(tree).toHaveLength(1);
      expect(tree?.[0]?.type).toBe('Document');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getCharAtPos delegates to proxy with coordinates', async () => {
      const { pdfium, document, page } = await setupPage();

      const charPromise = page.getCharAtPos(100, 200);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { pageId: string; x: number; y: number };
      };
      expect(msg.type).toBe('GET_CHAR_AT_POS');
      expect(msg.payload.x).toBe(100);
      expect(msg.payload.y).toBe(200);
      mockWorker.respondSuccess(msg.id, {
        index: 0,
        info: { char: 'A', fontSize: 12, fontName: 'Arial', flags: 0 },
        box: { left: 95, top: 195, right: 105, bottom: 205 },
      });
      const result = await charPromise;
      expect(result?.index).toBe(0);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getTextInRect delegates to proxy with rectangle', async () => {
      const { pdfium, document, page } = await setupPage();

      const textPromise = page.getTextInRect(10, 10, 100, 100);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { pageId: string; left: number; top: number; right: number; bottom: number };
      };
      expect(msg.type).toBe('GET_TEXT_IN_RECT');
      expect(msg.payload.left).toBe(10);
      expect(msg.payload.top).toBe(10);
      expect(msg.payload.right).toBe(100);
      expect(msg.payload.bottom).toBe(100);
      mockWorker.respondSuccess(msg.id, 'Selected text');
      const text = await textPromise;
      expect(text).toBe('Selected text');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('findText delegates to proxy with query and flags', async () => {
      const { pdfium, document, page } = await setupPage();

      const { TextSearchFlags } = await import('../../../src/core/types.js');
      const findPromise = page.findText('search term', TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { pageId: string; query: string; flags?: number };
      };
      expect(msg.type).toBe('FIND_TEXT');
      expect(msg.payload.query).toBe('search term');
      expect(msg.payload.flags).toBe(TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord);
      mockWorker.respondSuccess(msg.id, [
        { charIndex: 0, charCount: 11, rects: [{ left: 10, top: 10, right: 100, bottom: 30 }] },
      ]);
      const results = await findPromise;
      expect(results).toHaveLength(1);
      expect(results[0]?.charCount).toBe(11);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getCharacterInfo delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const charInfoPromise = page.getCharacterInfo(5);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { pageId: string; charIndex: number };
      };
      expect(msg.type).toBe('GET_CHARACTER_INFO');
      expect(msg.payload.charIndex).toBe(5);
      mockWorker.respondSuccess(msg.id, {
        char: 'T',
        fontSize: 12,
        fontName: 'Arial',
        flags: 0,
      });
      const charInfo = await charInfoPromise;
      expect(charInfo?.char).toBe('T');
      expect(charInfo?.fontSize).toBe(12);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getCharBox delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const charBoxPromise = page.getCharBox(3);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { pageId: string; charIndex: number };
      };
      expect(msg.type).toBe('GET_CHAR_BOX');
      expect(msg.payload.charIndex).toBe(3);
      mockWorker.respondSuccess(msg.id, {
        left: 10,
        top: 20,
        right: 30,
        bottom: 40,
      });
      const charBox = await charBoxPromise;
      expect(charBox?.left).toBe(10);
      expect(charBox?.right).toBe(30);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('flatten delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const { FlattenFlags } = await import('../../../src/core/types.js');
      const flattenPromise = page.flatten(FlattenFlags.Print);
      const msg = lastPostedMsg() as {
        type: string;
        id: string;
        payload: { pageId: string; flags?: string };
      };
      expect(msg.type).toBe('FLATTEN_PAGE');
      expect(msg.payload.flags).toBe(FlattenFlags.Print);
      mockWorker.respondSuccess(msg.id, 'Success');
      const result = await flattenPromise;
      expect(result).toBe('Success');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getFormWidgets delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const { FormFieldType } = await import('../../../src/core/types.js');
      const widgetsPromise = page.getFormWidgets();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_FORM_WIDGETS');
      mockWorker.respondSuccess(msg.id, [
        {
          annotationIndex: 0,
          fieldName: 'field1',
          fieldType: FormFieldType.TextField,
          fieldValue: 'value1',
        },
      ]);
      const widgets = await widgetsPromise;
      expect(widgets).toHaveLength(1);
      expect(widgets[0]?.fieldName).toBe('field1');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('getFormSelectedText delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const selectedTextPromise = page.getFormSelectedText();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('GET_FORM_SELECTED_TEXT');
      mockWorker.respondSuccess(msg.id, 'selected text');
      const text = await selectedTextPromise;
      expect(text).toBe('selected text');

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('canFormUndo delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const canUndoPromise = page.canFormUndo();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('CAN_FORM_UNDO');
      mockWorker.respondSuccess(msg.id, true);
      const result = await canUndoPromise;
      expect(result).toBe(true);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });

    test('formUndo delegates to proxy', async () => {
      const { pdfium, document, page } = await setupPage();

      const undoPromise = page.formUndo();
      const msg = lastPostedMsg();
      expect(msg.type).toBe('FORM_UNDO');
      mockWorker.respondSuccess(msg.id, true);
      const result = await undoPromise;
      expect(result).toBe(true);

      const closePage = page.dispose();
      const closePageMsg = lastPostedMsg();
      mockWorker.respondSuccess(closePageMsg.id, undefined);
      await closePage;

      const closeDoc = document.dispose();
      const closeDocMsg = lastPostedMsg();
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
      await closeDoc;

      await teardown(pdfium);
    });
  });
});
