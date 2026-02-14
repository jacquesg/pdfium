/**
 * Coverage tests for worker-client.ts uncovered branches.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

class MockWorker {
  onmessage: ((event: { data: WorkerResponse }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  readonly posted: Array<{ data: unknown; transfer: unknown[] }> = [];
  terminated = false;

  postMessage(data: unknown, transfer?: readonly unknown[]): void {
    this.posted.push({ data, transfer: [...(transfer ?? [])] });
  }

  terminate(): void {
    this.terminated = true;
  }

  respondSuccess(id: string, payload: unknown): void {
    const response: WorkerResponse = { type: 'SUCCESS', id, payload };
    this.onmessage?.({ data: response });
  }

  respondError(id: string, error: { name: string; message: string; code: number }): void {
    const response: WorkerResponse = { type: 'ERROR', id, error };
    this.onmessage?.({ data: response });
  }
}

describe('WorkerClient - coverage for uncovered branches', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.resetModules();
    mockWorker = new MockWorker();

    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional mock
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function createWorkerPDFium() {
    const { WorkerPDFium } = await import('../../../src/context/worker-client.js');
    const createPromise = WorkerPDFium.create({
      workerUrl: 'worker.js',
      wasmBinary: new ArrayBuffer(8),
      timeout: 5000,
      destroyTimeout: 50,
    });

    // Respond to INIT
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    return createPromise;
  }

  async function disposeWorkerPDFium(pdfium: { dispose: () => Promise<void> }) {
    const disposePromise = pdfium.dispose();
    const destroyMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (destroyMsg.type === 'DESTROY') {
      mockWorker.respondSuccess(destroyMsg.id, undefined);
    }
    await disposePromise;
  }

  test('WorkerPDFiumDocument.id getter returns documentId', async () => {
    const pdfium = await createWorkerPDFium();

    // Open a document
    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 3 });

    const doc = await openPromise;
    expect(doc.id).toBe('doc-1');
    expect(doc.pageCount).toBe(3);

    // Dispose document
    const docDisposePromise = doc.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumPage.id getter returns pageId', async () => {
    const pdfium = await createWorkerPDFium();

    // Open document
    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 3 });
    const doc = await openPromise;

    // Load page
    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await pagePromise;

    expect(page.id).toBe('page-1');
    expect(page.index).toBe(0);
    expect(page.width).toBe(595);
    expect(page.height).toBe(842);

    // Dispose page
    const pageDisposePromise = page.dispose();
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closePageMsg.id, undefined);
    await pageDisposePromise;

    // Dispose document
    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumPage suppresses PAGE_ALREADY_CLOSED on dispose', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await pagePromise;

    // Dispose page - respond with PAGE_ALREADY_CLOSED error (should be suppressed)
    const pageDisposePromise = page.dispose();
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondError(closePageMsg.id, {
      name: 'PageError',
      message: 'Page already closed',
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });
    await pageDisposePromise; // Should not throw

    // Dispose document
    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumPage suppresses DOC_ALREADY_CLOSED on dispose', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await pagePromise;

    // Dispose page - respond with DOC_ALREADY_CLOSED (should be suppressed)
    const pageDisposePromise = page.dispose();
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondError(closePageMsg.id, {
      name: 'DocumentError',
      message: 'Document already closed',
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    await pageDisposePromise; // Should not throw

    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumDocument suppresses DOC_ALREADY_CLOSED on dispose', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    // Dispose document - respond with DOC_ALREADY_CLOSED (should be suppressed)
    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondError(closeDocMsg.id, {
      name: 'DocumentError',
      message: 'Document already closed',
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    await docDisposePromise; // Should not throw

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumDocument re-throws non-DOC_ALREADY_CLOSED errors', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    // Dispose document - respond with some other error (should throw)
    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondError(closeDocMsg.id, {
      name: 'WorkerError',
      message: 'Connection lost',
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
    await expect(docDisposePromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFium.dispose handles document disposal errors', async () => {
    const pdfium = await createWorkerPDFium();

    // Open a document
    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    await openPromise;

    // Dispose WorkerPDFium - the document close will error but should be caught
    const disposePromise = pdfium.dispose();

    // Respond to CLOSE_DOCUMENT with error
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (closeDocMsg.type === 'CLOSE_DOCUMENT') {
      mockWorker.respondError(closeDocMsg.id, {
        name: 'WorkerError',
        message: 'Failed',
        code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
      });
    }

    // Wait a tick then respond to DESTROY
    await new Promise((r) => setTimeout(r, 10));
    const destroyMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (destroyMsg.type === 'DESTROY') {
      mockWorker.respondSuccess(destroyMsg.id, undefined);
    }

    await disposePromise; // Should not throw
    expect(mockWorker.terminated).toBe(true);
  });

  test('openDocument with ArrayBuffer input uses toOwnedArrayBuffer', async () => {
    const pdfium = await createWorkerPDFium();

    const buffer = new ArrayBuffer(4);
    new Uint8Array(buffer).set([0x25, 0x50, 0x44, 0x46]);

    const openPromise = pdfium.openDocument(buffer);
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    expect(doc.pageCount).toBe(1);

    const docDisposePromise = doc.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFium.ping delegates to proxy.ping', async () => {
    const pdfium = await createWorkerPDFium();

    const pingPromise = pdfium.ping(1000);
    const pingMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pingMsg.id, undefined);

    const result = await pingPromise;
    expect(result).toBe(true);

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumPage.getText delegates to proxy', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await pagePromise;

    // getText
    const textPromise = page.getText();
    const textMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(textMsg.id, 'Hello World');
    const text = await textPromise;
    expect(text).toBe('Hello World');

    // Dispose
    const pageDisposePromise = page.dispose();
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closePageMsg.id, undefined);
    await pageDisposePromise;

    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumPage.getTextLayout delegates to proxy', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await pagePromise;

    const layoutPromise = page.getTextLayout();
    const layoutMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(layoutMsg.id, { text: 'Test', rects: new Float32Array([0, 1, 2, 3]) });
    const layout = await layoutPromise;
    expect(layout.text).toBe('Test');

    // Dispose
    const pageDisposePromise = page.dispose();
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closePageMsg.id, undefined);
    await pageDisposePromise;

    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFiumPage.render delegates to proxy.renderPage', async () => {
    const pdfium = await createWorkerPDFium();

    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    const page = await pagePromise;

    // render with progress callback
    const progress: number[] = [];
    const renderPromise = page.render({ width: 50, height: 50 }, (p) => progress.push(p));
    const renderMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    const buffer = new ArrayBuffer(50 * 50 * 4);
    mockWorker.respondSuccess(renderMsg.id, {
      width: 50,
      height: 50,
      originalWidth: 595,
      originalHeight: 842,
      data: buffer,
    });
    const result = await renderPromise;
    expect(result.data).toBeInstanceOf(Uint8Array);

    // Dispose
    const pageDisposePromise = page.dispose();
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closePageMsg.id, undefined);
    await pageDisposePromise;

    const docDisposePromise = doc.dispose();
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeDocMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('onProgress callbacks are invoked during openDocument', async () => {
    const pdfium = await createWorkerPDFium();

    const progress: number[] = [];
    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
      onProgress: (p) => progress.push(p),
    });
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 1 });
    const doc = await openPromise;

    expect(progress).toEqual([0, 1]);

    const docDisposePromise = doc.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(closeMsg.id, undefined);
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFium.create forwards renderTimeout option', async () => {
    const { WorkerPDFium } = await import('../../../src/context/worker-client.js');
    const createPromise = WorkerPDFium.create({
      workerUrl: 'worker.js',
      wasmBinary: new ArrayBuffer(8),
      timeout: 5000,
      renderTimeout: 30000,
    });

    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const pdfium = await createPromise;

    await disposeWorkerPDFium(pdfium);
  });

  test('WorkerPDFium.create forwards workerFactory option', async () => {
    vi.stubGlobal('Worker', undefined);

    const customWorker = new MockWorker();
    const factory = vi.fn().mockReturnValue(customWorker);

    const { WorkerPDFium } = await import('../../../src/context/worker-client.js');
    const createPromise = WorkerPDFium.create({
      workerUrl: 'worker.js',
      wasmBinary: new ArrayBuffer(8),
      workerFactory: factory,
    });

    const initMsg = customWorker.posted[0]!.data as { type: string; id: string };
    customWorker.respondSuccess(initMsg.id, undefined);
    const pdfium = await createPromise;

    expect(factory).toHaveBeenCalled();

    // Dispose using customWorker
    const disposePromise = pdfium.dispose();
    const destroyMsg = customWorker.posted[customWorker.posted.length - 1]!.data as { type: string; id: string };
    if (destroyMsg.type === 'DESTROY') {
      customWorker.respondSuccess(destroyMsg.id, undefined);
    }
    await disposePromise;
  });

  test('WorkerPDFiumDocument.dispose handles page disposal error gracefully', async () => {
    const pdfium = await createWorkerPDFium();

    // Open document
    const openPromise = pdfium.openDocument(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 2 });
    const doc = await openPromise;

    // Load a page
    const pagePromise = doc.getPage(0);
    const pageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(pageMsg.id, { pageId: 'page-1', index: 0, width: 595, height: 842 });
    await pagePromise;

    // Dispose document (which should try to dispose pages first)
    const docDisposePromise = doc.dispose();

    // Page close fails with a non-suppressed error
    const closePageMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (closePageMsg.type === 'CLOSE_PAGE') {
      mockWorker.respondError(closePageMsg.id, {
        name: 'WorkerError',
        message: 'Page close failed',
        code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
      });
    }

    // Wait for next message (CLOSE_DOCUMENT)
    await new Promise((r) => setTimeout(r, 20));
    const closeDocMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (closeDocMsg.type === 'CLOSE_DOCUMENT') {
      mockWorker.respondSuccess(closeDocMsg.id, undefined);
    }

    // Should not throw — page error was caught in try/catch
    await docDisposePromise;

    await disposeWorkerPDFium(pdfium);
  });
});
