import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerRequest, WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

describe('WorkerPDFium (Full Coverage)', () => {
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

    respondError(id: string, error: { name: string; message: string; code: number }): void {
      const response: WorkerResponse = { type: 'ERROR', id, error };
      this.onmessage?.(new MessageEvent('message', { data: response }));
    }
  }

  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockWorker = new MockWorker();

    const MockWorkerConstructor = class {
      constructor() {
        // biome-ignore lint/correctness/noConstructorReturn: Mocking global class
        return mockWorker;
      }
    };
    vi.stubGlobal('Worker', MockWorkerConstructor);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function createInitialisedClient(): Promise<
    Awaited<ReturnType<typeof import('../../../src/context/worker-client.js').WorkerPDFium.create>>
  > {
    const { WorkerPDFium } = await import('../../../src/context/worker-client.js');
    const createPromise = WorkerPDFium.create({
      workerUrl: 'worker.js',
      wasmBinary: new ArrayBuffer(8),
    });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    return createPromise;
  }

  async function disposeClient(
    client: Awaited<ReturnType<typeof import('../../../src/context/worker-client.js').WorkerPDFium.create>>,
  ): Promise<void> {
    const beforeCount = mockWorker.posted.length;
    const disposePromise = client.dispose();

    // Client.dispose() calls document.dispose() for each document, which posts CLOSE_DOCUMENT
    // Then it posts DESTROY
    // Find all messages posted after we called dispose() and respond to them
    const newMessages = mockWorker.posted.slice(beforeCount);
    for (const posted of newMessages) {
      const msg = posted.data as { type: string; id: string };
      mockWorker.respondSuccess(msg.id, undefined);
    }

    await disposePromise;
  }

  it('toOwnedArrayBuffer should handle ArrayBuffer input', async () => {
    const client = await createInitialisedClient();

    const arrayBuffer = new ArrayBuffer(100);
    const openPromise = client.openDocument(arrayBuffer);

    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    expect(openMsg.type).toBe('OPEN_DOCUMENT');

    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;
    expect(document.pageCount).toBe(5);

    // Dispose document
    const docDisposePromise = document.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(closeMsg.id, undefined);
    await docDisposePromise;

    await disposeClient(client);
  });

  it('should call onProgress callbacks for openDocument', async () => {
    const client = await createInitialisedClient();

    const progressValues: number[] = [];
    const openPromise = client.openDocument(new Uint8Array(100), {
      onProgress: (p) => progressValues.push(p),
    });

    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });

    const document = await openPromise;
    expect(progressValues).toEqual([0, 1]);

    // Dispose document before disposing client
    const docDisposePromise = document.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(closeMsg.id, undefined);
    await docDisposePromise;

    await disposeClient(client);
  });

  it('WorkerPDFiumDocument.dispose should suppress DOC_ALREADY_CLOSED error', async () => {
    const client = await createInitialisedClient();

    const openPromise = client.openDocument(new Uint8Array(100));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    const disposePromise = document.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    expect(closeMsg.type).toBe('CLOSE_DOCUMENT');

    // Respond with DOC_ALREADY_CLOSED error
    mockWorker.respondError(closeMsg.id, {
      name: 'DocumentError',
      message: 'Document already closed',
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });

    // Should not throw
    await expect(disposePromise).resolves.toBeUndefined();

    await disposeClient(client);
  });

  it('WorkerPDFiumDocument.dispose should re-throw non-DOC_ALREADY_CLOSED errors', async () => {
    const client = await createInitialisedClient();

    const openPromise = client.openDocument(new Uint8Array(100));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    const disposePromise = document.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;

    // Respond with a different error code
    mockWorker.respondError(closeMsg.id, {
      name: 'WorkerError',
      message: 'Communication failed',
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    // Should re-throw
    await expect(disposePromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeClient(client);
  });

  it('WorkerPDFiumPage.dispose should suppress PAGE_ALREADY_CLOSED', async () => {
    const client = await createInitialisedClient();

    const openPromise = client.openDocument(new Uint8Array(100));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    const pagePromise = document.getPage(0);
    const loadMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(loadMsg.id, {
      pageId: 'page-1',
      index: 0,
      width: 612,
      height: 792,
    });
    const page = await pagePromise;

    const disposePromise = page.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    expect(closeMsg.type).toBe('CLOSE_PAGE');

    mockWorker.respondError(closeMsg.id, {
      name: 'PageError',
      message: 'Page already closed',
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });

    await expect(disposePromise).resolves.toBeUndefined();

    // Dispose document (will also try to dispose page again)
    const docDisposePromise = document.dispose();
    const docCloseMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(docCloseMsg.id, undefined);
    await docDisposePromise;

    await disposeClient(client);
  });

  it('WorkerPDFiumPage.dispose should suppress DOC_ALREADY_CLOSED', async () => {
    const client = await createInitialisedClient();

    const openPromise = client.openDocument(new Uint8Array(100));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    const pagePromise = document.getPage(0);
    const loadMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(loadMsg.id, {
      pageId: 'page-1',
      index: 0,
      width: 612,
      height: 792,
    });
    const page = await pagePromise;

    const disposePromise = page.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;

    mockWorker.respondError(closeMsg.id, {
      name: 'DocumentError',
      message: 'Document already closed',
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });

    await expect(disposePromise).resolves.toBeUndefined();

    // Document should also report as closed when we try to dispose it
    const docDisposePromise = document.dispose();
    const docCloseMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondError(docCloseMsg.id, {
      name: 'DocumentError',
      message: 'Document already closed',
      code: PDFiumErrorCode.DOC_ALREADY_CLOSED,
    });
    await docDisposePromise;

    await disposeClient(client);
  });

  it('WorkerPDFiumPage.dispose should re-throw other errors', async () => {
    const client = await createInitialisedClient();

    const openPromise = client.openDocument(new Uint8Array(100));
    const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(openMsg.id, { documentId: 'doc-1', pageCount: 5 });
    const document = await openPromise;

    const pagePromise = document.getPage(0);
    const loadMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(loadMsg.id, {
      pageId: 'page-1',
      index: 0,
      width: 612,
      height: 792,
    });
    const page = await pagePromise;

    const disposePromise = page.dispose();
    const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;

    mockWorker.respondError(closeMsg.id, {
      name: 'WorkerError',
      message: 'Communication failed',
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await expect(disposePromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    // Even though page disposal failed, we should attempt to dispose the document
    const docDisposePromise = document.dispose();
    const docCloseMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    mockWorker.respondSuccess(docCloseMsg.id, undefined);
    await docDisposePromise;

    await disposeClient(client);
  });

  it('WorkerPDFium.ping should send PING and return true on success', async () => {
    const client = await createInitialisedClient();

    const pingPromise = client.ping();
    const pingMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as WorkerRequest;
    expect(pingMsg.type).toBe('PING');

    mockWorker.respondSuccess(pingMsg.id, undefined);

    const result = await pingPromise;
    expect(result).toBe(true);

    await disposeClient(client);
  });
});
