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

    const loadPageMessage = mockWorker.posted[2]!.data as { type: string; id: string };
    expect(loadPageMessage.type).toBe('LOAD_PAGE');
    mockWorker.respondSuccess(loadPageMessage.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });

    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(3);
    });
    const renderPageMessage = mockWorker.posted[3]!.data as { type: string; id: string };
    expect(renderPageMessage.type).toBe('RENDER_PAGE');
    mockWorker.respondSuccess(renderPageMessage.id, {
      width: 1190,
      height: 1684,
      originalWidth: 595,
      originalHeight: 842,
      data: new ArrayBuffer(8),
    });

    await vi.waitFor(() => {
      expect(mockWorker.posted.length).toBeGreaterThan(4);
    });
    const closePageMessage = mockWorker.posted[4]!.data as { type: string; id: string };
    expect(closePageMessage.type).toBe('CLOSE_PAGE');
    mockWorker.respondSuccess(closePageMessage.id, undefined);

    const result = await renderPromise;
    expect(result.width).toBe(1190);
    expect(result.height).toBe(1684);

    const closeDocumentPromise = document.dispose();
    const closeDocumentMessage = mockWorker.posted[5]!.data as { type: string; id: string };
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
});
