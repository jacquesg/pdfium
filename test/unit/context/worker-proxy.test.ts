/**
 * Unit tests for WorkerProxy.
 *
 * Uses a mock Worker to test timeout, error handling, progress, and disposal.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';
import { FlattenFlags, FormFieldType, TextSearchFlags } from '../../../src/core/types.js';

/**
 * Minimal mock Worker that records posted messages and allows
 * simulating responses from the worker thread.
 */
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

  /** Simulate a success response from the worker. */
  respondSuccess(id: string, payload: unknown): void {
    const response: WorkerResponse = { type: 'SUCCESS', id, payload };
    this.onmessage?.(new MessageEvent('message', { data: response }));
  }

  /** Simulate an error response from the worker. */
  respondError(id: string, error: { name: string; message: string; code: number }): void {
    const response: WorkerResponse = { type: 'ERROR', id, error };
    this.onmessage?.(new MessageEvent('message', { data: response }));
  }

  /** Simulate a progress response from the worker. */
  respondProgress(id: string, progress: number): void {
    const response: WorkerResponse = { type: 'PROGRESS', id, progress };
    this.onmessage?.(new MessageEvent('message', { data: response }));
  }

  /** Simulate a Worker error event. */
  emitError(message: string): void {
    // ErrorEvent is not available in Node.js, create a minimal mock
    const event = { message, type: 'error' } as ErrorEvent;
    this.onerror?.(event);
  }
}

/**
 * Helper: create a proxy and respond to the INIT message.
 * Returns the proxy and the mock worker for further interaction.
 */
async function createInitialisedProxy(
  mockWorker: MockWorker,
  timeout = 5000,
): Promise<{ proxy: Awaited<ReturnType<typeof import('../../../src/context/worker-proxy.js').WorkerProxy.create>> }> {
  const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
  const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout });
  const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
  mockWorker.respondSuccess(initMsg.id, undefined);
  const proxy = await createPromise;
  return { proxy };
}

/**
 * Helper: dispose a proxy, responding to the DESTROY message that is sent
 * during async disposal.
 */
async function disposeProxy(proxy: { dispose(): Promise<void> }, mockWorker: MockWorker): Promise<void> {
  const disposePromise = proxy.dispose();
  // The proxy sends a DESTROY message during disposal — respond to it
  const lastMsg = mockWorker.posted[mockWorker.posted.length - 1]?.data as { type: string; id: string } | undefined;
  if (lastMsg?.type === 'DESTROY') {
    mockWorker.respondSuccess(lastMsg.id, undefined);
  }
  await disposePromise;
}

// We need to construct WorkerProxy directly since create() would call INIT
// Use dynamic import and mock the Worker global
describe('WorkerProxy', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockWorker = new MockWorker();

    // Mock the global Worker constructor
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          // biome-ignore lint/correctness/noConstructorReturn: intentional mock — return substitutes the constructed instance
          return mockWorker;
        }
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('create should send INIT request and resolve on success', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    expect(mockWorker.posted.length).toBe(1);
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    expect(initMsg.type).toBe('INIT');
    expect(proxy).toBeDefined();

    await disposeProxy(proxy, mockWorker);
  });

  test('create should reject if INIT times out', async () => {
    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 100 });

    // Advance past the timeout
    vi.advanceTimersByTime(150);

    await expect(createPromise).rejects.toThrow('Failed to initialise worker');
    expect(mockWorker.terminated).toBe(true);
  });

  test('request timeout should reject with WORKER_TIMEOUT', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker, 50);

    // Make a request that will time out
    const textPromise = proxy.getText('page-1');
    vi.advanceTimersByTime(60);

    await expect(textPromise).rejects.toThrow(/timed out/);
    await expect(textPromise).rejects.toMatchObject({ code: PDFiumErrorCode.WORKER_TIMEOUT });

    await disposeProxy(proxy, mockWorker);
  });

  test('successful response should clear timeout', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const textPromise = proxy.getText('page-1');
    const textMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(textMsg.id, 'hello');

    const result = await textPromise;
    expect(result).toBe('hello');

    await disposeProxy(proxy, mockWorker);
  });

  test('error response should clear timeout and reject', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const textPromise = proxy.getText('page-1');
    const textMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondError(textMsg.id, {
      name: 'PageError',
      message: 'Page not found',
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });

    await expect(textPromise).rejects.toMatchObject({ code: PDFiumErrorCode.PAGE_ALREADY_CLOSED });

    await disposeProxy(proxy, mockWorker);
  });

  test('progress response should forward to callback', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const progressValues: number[] = [];
    const renderPromise = proxy.renderPage('page-1', {}, (p) => progressValues.push(p));

    const renderMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondProgress(renderMsg.id, 0.5);
    mockWorker.respondProgress(renderMsg.id, 0.8);
    mockWorker.respondSuccess(renderMsg.id, {
      width: 100,
      height: 200,
      originalWidth: 595,
      originalHeight: 842,
      data: new ArrayBuffer(80000),
    });

    await renderPromise;
    expect(progressValues).toEqual([0.5, 0.8]);

    await disposeProxy(proxy, mockWorker);
  });

  test('renderPageStandalone sends RENDER_PAGE_STANDALONE with documentId and pageIndex', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const renderPromise = proxy.renderPageStandalone('doc-1', 0, { scale: 2 });

    const renderMsg = mockWorker.posted[1]!.data as { type: string; id: string; payload: Record<string, unknown> };
    expect(renderMsg.type).toBe('RENDER_PAGE_STANDALONE');
    expect(renderMsg.payload).toMatchObject({ documentId: 'doc-1', pageIndex: 0, options: { scale: 2 } });
    mockWorker.respondSuccess(renderMsg.id, {
      width: 1190,
      height: 1684,
      originalWidth: 595,
      originalHeight: 842,
      data: new ArrayBuffer(80000),
    });

    const result = await renderPromise;
    expect(result.width).toBe(1190);
    expect(result.height).toBe(1684);
    expect(result.data).toBeInstanceOf(Uint8Array);

    await disposeProxy(proxy, mockWorker);
  });

  test('worker error event should reject all pending requests', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const textPromise = proxy.getText('page-1');
    mockWorker.emitError('Worker crashed');

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeProxy(proxy, mockWorker);
  });

  test('dispose should send DESTROY, terminate worker, and reject pending requests', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const textPromise = proxy.getText('page-1');

    // Start disposal — this sends DESTROY and waits for response
    const disposePromise = proxy.dispose();

    // Find the DESTROY message
    const destroyMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    expect(destroyMsg.type).toBe('DESTROY');

    // Respond to DESTROY
    mockWorker.respondSuccess(destroyMsg.id, undefined);
    await disposePromise;

    expect(mockWorker.terminated).toBe(true);
    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
  });

  test('dispose should terminate even if DESTROY times out', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    // Start disposal without responding to DESTROY
    const disposePromise = proxy.dispose();

    // Advance past the DESTROY timeout (5000ms)
    vi.advanceTimersByTime(6000);
    await disposePromise;

    expect(mockWorker.terminated).toBe(true);
  });

  test('should reject requests after disposal', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);
    await disposeProxy(proxy, mockWorker);

    await expect(proxy.getText('page-1')).rejects.toThrow('disposed');
  });

  test('error with unknown code should fallback to WORKER_COMMUNICATION_FAILED', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const textPromise = proxy.getText('page-1');
    const textMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondError(textMsg.id, {
      name: 'PDFiumError',
      message: 'Unknown error',
      code: 99999, // Not a known PDFiumErrorCode
    });

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeProxy(proxy, mockWorker);
  });

  test('response for unknown request ID should be silently ignored', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { proxy } = await createInitialisedProxy(mockWorker);

    // Send a response for a non-existent request ID — should not throw
    expect(() => mockWorker.respondSuccess('non-existent-id', 'hello')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Received response for unknown request ID: non-existent-id');

    await disposeProxy(proxy, mockWorker);
    warnSpy.mockRestore();
  });

  test('multiple pending requests should all be rejected on worker error', async () => {
    const { proxy } = await createInitialisedProxy(mockWorker);

    const promise1 = proxy.getText('page-1');
    const promise2 = proxy.getText('page-2');

    mockWorker.emitError('Worker crashed');

    await expect(promise1).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
    await expect(promise2).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeProxy(proxy, mockWorker);
  });

  describe('ping', () => {
    test('should return true when worker responds', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const pingPromise = proxy.ping();
      const pingMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
      expect(pingMsg.type).toBe('PING');
      mockWorker.respondSuccess(pingMsg.id, undefined);

      const result = await pingPromise;
      expect(result).toBe(true);

      await disposeProxy(proxy, mockWorker);
    });

    test('should return false when ping times out', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const pingPromise = proxy.ping(100);
      // Do not respond — let it time out
      vi.advanceTimersByTime(150);

      const result = await pingPromise;
      expect(result).toBe(false);

      await disposeProxy(proxy, mockWorker);
    });

    test('should return false when worker has errored', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      // Trigger a worker error first
      mockWorker.emitError('Worker crashed');

      const pingPromise = proxy.ping(100);
      vi.advanceTimersByTime(150);

      const result = await pingPromise;
      expect(result).toBe(false);

      await disposeProxy(proxy, mockWorker);
    });
  });

  describe('workerUrl validation', () => {
    test('should throw InitialisationError when Worker constructor fails', async () => {
      // Override the global Worker mock to throw
      vi.stubGlobal(
        'Worker',
        class {
          constructor() {
            throw new TypeError('Invalid URL');
          }
        },
      );

      const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
      await expect(WorkerProxy.create('not://valid', new ArrayBuffer(8))).rejects.toMatchObject({
        code: PDFiumErrorCode.INIT_INVALID_OPTIONS,
        message: expect.stringContaining('Failed to create worker from URL'),
      });
    });
  });

  test('node worker fallback should use worker_threads with isolated execArgv', async () => {
    vi.unstubAllGlobals();
    vi.resetModules();

    let capturedOptions: { execArgv?: string[] } | undefined;
    let terminated = false;

    vi.doMock('node:worker_threads', () => {
      class MockNodeWorker {
        readonly #listeners = new Map<string, (payload: unknown) => void>();

        constructor(_: string | URL, options?: { execArgv?: string[] }) {
          capturedOptions = options;
        }

        on(event: string, listener: (payload: unknown) => void): this {
          this.#listeners.set(event, listener);
          return this;
        }

        postMessage(data: { type: string; id: string }): void {
          if (data.type === 'INIT') {
            this.#listeners.get('message')?.({
              type: 'SUCCESS',
              id: data.id,
              payload: undefined,
            });
          }
          if (data.type === 'DESTROY') {
            this.#listeners.get('message')?.({
              type: 'SUCCESS',
              id: data.id,
              payload: undefined,
            });
          }
        }

        terminate(): Promise<number> {
          terminated = true;
          return Promise.resolve(0);
        }
      }

      return { Worker: MockNodeWorker };
    });

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const proxy = await WorkerProxy.create(new URL('file:///tmp/pdfium-worker.mjs'), new ArrayBuffer(8));
    await proxy.dispose();

    expect(capturedOptions).toEqual({ execArgv: [] });
    expect(terminated).toBe(true);
  });

  describe('additional methods', () => {
    test('openDocument should transfer buffer', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const buffer = new ArrayBuffer(100);
      const docPromise = proxy.openDocument(buffer);

      const openMsg = mockWorker.posted[mockWorker.posted.length - 1]!;
      expect(openMsg.data).toMatchObject({ type: 'OPEN_DOCUMENT' });
      expect(openMsg.transfer).toContain(buffer);

      const msgData = openMsg.data as { id: string };
      mockWorker.respondSuccess(msgData.id, { documentId: 'doc-1', pageCount: 5 });

      const doc = await docPromise;
      expect(doc.documentId).toBe('doc-1');

      await disposeProxy(proxy, mockWorker);
    });

    test('closeDocument should send CLOSE_DOCUMENT', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const closePromise = proxy.closeDocument('doc-1');
      const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
      expect(closeMsg.type).toBe('CLOSE_DOCUMENT');

      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closePromise;

      await disposeProxy(proxy, mockWorker);
    });

    test('loadPage should return page info', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const pagePromise = proxy.loadPage('doc-1', 0);
      const loadMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
      expect(loadMsg.type).toBe('LOAD_PAGE');

      mockWorker.respondSuccess(loadMsg.id, {
        pageId: 'page-1',
        index: 0,
        width: 612,
        height: 792,
      });

      const page = await pagePromise;
      expect(page.pageId).toBe('page-1');
      expect(page.width).toBe(612);

      await disposeProxy(proxy, mockWorker);
    });

    test('closePage should send CLOSE_PAGE', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const closePromise = proxy.closePage('page-1');
      const closeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
      expect(closeMsg.type).toBe('CLOSE_PAGE');

      mockWorker.respondSuccess(closeMsg.id, undefined);
      await closePromise;

      await disposeProxy(proxy, mockWorker);
    });

    test('getPageSize should return size', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const sizePromise = proxy.getPageSize('page-1');
      const sizeMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
      expect(sizeMsg.type).toBe('GET_PAGE_SIZE');

      mockWorker.respondSuccess(sizeMsg.id, { width: 612, height: 792 });

      const size = await sizePromise;
      expect(size.width).toBe(612);
      expect(size.height).toBe(792);

      await disposeProxy(proxy, mockWorker);
    });

    test('getTextLayout should return text and rects', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker);

      const layoutPromise = proxy.getTextLayout('page-1');
      const layoutMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
      expect(layoutMsg.type).toBe('GET_TEXT_LAYOUT');

      const rects = new Float32Array([0, 1, 2, 3]);
      mockWorker.respondSuccess(layoutMsg.id, { text: 'Hello', rects });

      const layout = await layoutPromise;
      expect(layout.text).toBe('Hello');
      expect(layout.rects).toBeInstanceOf(Float32Array);

      await disposeProxy(proxy, mockWorker);
    });
  });

  describe('options handling', () => {
    test('workerFactory option should be used when provided', async () => {
      vi.unstubAllGlobals();
      vi.resetModules();

      let factoryCalled = false;
      const customWorker = new MockWorker();

      const factory = (_url: string | URL) => {
        factoryCalled = true;
        return customWorker;
      };

      const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
      // @ts-expect-error - MockWorker uses MessageEvent instead of WorkerMessageEvent
      const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { workerFactory: factory });

      const initMsg = customWorker.posted[0]!.data as { type: string; id: string };
      customWorker.respondSuccess(initMsg.id, undefined);

      const proxy = await createPromise;

      expect(factoryCalled).toBe(true);

      const disposePromise = proxy.dispose();
      const destroyMsg = customWorker.posted[customWorker.posted.length - 1]!.data as { type: string; id: string };
      customWorker.respondSuccess(destroyMsg.id, undefined);
      await disposePromise;
    });

    test('destroyTimeout option should be respected', async () => {
      const { proxy } = await createInitialisedProxy(mockWorker, 5000);

      const disposePromise = proxy.dispose();
      vi.advanceTimersByTime(6000);
      await disposePromise;

      expect(mockWorker.terminated).toBe(true);
    });
  });

  describe('new protocol methods', () => {
    describe('document-level operations', () => {
      test('getDocumentInfo should send GET_DOCUMENT_INFO and return info', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getDocumentInfo('doc-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_DOCUMENT_INFO');

        mockWorker.respondSuccess(msg.id, {
          isTagged: true,
          hasForm: false,
          formType: 0,
          namedDestinationCount: 2,
          pageMode: 'useNone',
        });

        const result = await promise;
        expect(result.isTagged).toBe(true);
        expect(result.hasForm).toBe(false);
        expect(result.namedDestinationCount).toBe(2);

        await disposeProxy(proxy, mockWorker);
      });

      test('getBookmarks should send GET_BOOKMARKS and return bookmark array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getBookmarks('doc-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_BOOKMARKS');

        mockWorker.respondSuccess(msg.id, [
          { title: 'Chapter 1', pageIndex: 0, children: [] },
          { title: 'Chapter 2', pageIndex: 5, children: [] },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.title).toBe('Chapter 1');

        await disposeProxy(proxy, mockWorker);
      });

      test('getAttachments should send GET_ATTACHMENTS and return attachment array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getAttachments('doc-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_ATTACHMENTS');

        mockWorker.respondSuccess(msg.id, [
          { name: 'document.pdf', buffer: new ArrayBuffer(1024) },
          { name: 'image.png', buffer: new ArrayBuffer(2048) },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.name).toBe('document.pdf');

        await disposeProxy(proxy, mockWorker);
      });

      test('getNamedDestinations should send GET_NAMED_DESTINATIONS and return destination array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getNamedDestinations('doc-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_NAMED_DESTINATIONS');

        mockWorker.respondSuccess(msg.id, [
          { name: 'Introduction', pageIndex: 0, view: { type: 'XYZ', left: 0, top: 0, zoom: 1 } },
          { name: 'Conclusion', pageIndex: 10, view: { type: 'Fit' } },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.name).toBe('Introduction');

        await disposeProxy(proxy, mockWorker);
      });

      test('getNamedDestinationByName should send GET_NAMED_DEST_BY_NAME with name and return result', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getNamedDestinationByName('doc-1', 'Introduction');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: { documentId: string; name: string };
        };
        expect(msg.type).toBe('GET_NAMED_DEST_BY_NAME');
        expect(msg.payload.name).toBe('Introduction');

        mockWorker.respondSuccess(msg.id, { name: 'Introduction', pageIndex: 0, view: { type: 'Fit' } });

        const result = await promise;
        expect(result?.name).toBe('Introduction');
        expect(result?.pageIndex).toBe(0);

        await disposeProxy(proxy, mockWorker);
      });

      test('getPageLabel should send GET_PAGE_LABEL with pageIndex and return label', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getPageLabel('doc-1', 0);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: { documentId: string; pageIndex: number };
        };
        expect(msg.type).toBe('GET_PAGE_LABEL');
        expect(msg.payload.pageIndex).toBe(0);

        mockWorker.respondSuccess(msg.id, 'i');

        const result = await promise;
        expect(result).toBe('i');

        await disposeProxy(proxy, mockWorker);
      });

      test('saveDocument should send SAVE_DOCUMENT and return ArrayBuffer', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.saveDocument('doc-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('SAVE_DOCUMENT');

        const buffer = new ArrayBuffer(1024);
        mockWorker.respondSuccess(msg.id, buffer);

        const result = await promise;
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBe(1024);

        await disposeProxy(proxy, mockWorker);
      });
    });

    describe('page-level read operations', () => {
      test('getPageInfo should send GET_PAGE_INFO and return page info', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getPageInfo('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_PAGE_INFO');

        mockWorker.respondSuccess(msg.id, {
          rotation: 0,
          hasTransparency: false,
          boundingBox: { left: 0, top: 0, right: 612, bottom: 792 },
          charCount: 1000,
          pageBoxes: {
            media: { left: 0, top: 0, right: 612, bottom: 792 },
            crop: undefined,
            bleed: undefined,
            trim: undefined,
            art: undefined,
          },
        });

        const result = await promise;
        expect(result.rotation).toBe(0);
        expect(result.charCount).toBe(1000);

        await disposeProxy(proxy, mockWorker);
      });

      test('getAnnotations should send GET_ANNOTATIONS and return annotation array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getAnnotations('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_ANNOTATIONS');

        mockWorker.respondSuccess(msg.id, [
          {
            index: 0,
            type: 'Text',
            bounds: { left: 10, top: 20, right: 30, bottom: 40 },
            colour: { stroke: undefined, interior: undefined },
            flags: 0,
            contents: 'Important note',
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
          },
          {
            index: 1,
            type: 'Highlight',
            bounds: { left: 50, top: 60, right: 70, bottom: 80 },
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
          },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.type).toBe('Text');

        await disposeProxy(proxy, mockWorker);
      });

      test('getPageObjects should send GET_PAGE_OBJECTS and return page object array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getPageObjects('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_PAGE_OBJECTS');

        mockWorker.respondSuccess(msg.id, [
          { type: 'text', bounds: { left: 10, top: 20, right: 100, bottom: 40 } },
          { type: 'image', bounds: { left: 50, top: 60, right: 200, bottom: 150 } },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.type).toBe('text');

        await disposeProxy(proxy, mockWorker);
      });

      test('getLinks should send GET_LINKS and return link array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getLinks('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_LINKS');

        mockWorker.respondSuccess(msg.id, [
          {
            index: 0,
            bounds: { left: 10, top: 20, right: 100, bottom: 40 },
            action: { type: 'Uri', uri: 'https://example.com', filePath: undefined },
            destination: undefined,
          },
          {
            index: 1,
            bounds: { left: 50, top: 60, right: 150, bottom: 80 },
            action: undefined,
            destination: { pageIndex: 5, fitType: 'Fit', x: undefined, y: undefined, zoom: undefined },
          },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.action?.type).toBe('Uri');

        await disposeProxy(proxy, mockWorker);
      });

      test('getWebLinks should send GET_WEB_LINKS and return web link array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getWebLinks('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_WEB_LINKS');

        mockWorker.respondSuccess(msg.id, [
          { url: 'https://example.com', rects: [{ left: 10, top: 20, right: 100, bottom: 40 }] },
          { url: 'mailto:test@example.com', rects: [{ left: 50, top: 60, right: 200, bottom: 80 }] },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.url).toBe('https://example.com');

        await disposeProxy(proxy, mockWorker);
      });

      test('getStructureTree should send GET_STRUCTURE_TREE and return structure elements', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getStructureTree('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_STRUCTURE_TREE');

        mockWorker.respondSuccess(msg.id, [
          { type: 'Document', children: [{ type: 'H1', children: [], altText: 'Heading' }], altText: null },
        ]);

        const result = await promise;
        expect(result).toHaveLength(1);
        expect(result![0]!.type).toBe('Document');

        await disposeProxy(proxy, mockWorker);
      });

      test('getCharAtPos should send GET_CHAR_AT_POS with coordinates and return result', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getCharAtPos('page-1', 100, 200);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: { pageId: string; x: number; y: number };
        };
        expect(msg.type).toBe('GET_CHAR_AT_POS');
        expect(msg.payload.x).toBe(100);
        expect(msg.payload.y).toBe(200);

        mockWorker.respondSuccess(msg.id, {
          index: 42,
          info: { char: 'a', fontSize: 12, fontName: 'Times', flags: 0 },
          box: { left: 100, top: 200, right: 110, bottom: 212 },
        });

        const result = await promise;
        expect(result?.index).toBe(42);
        expect(result?.info?.char).toBe('a');

        await disposeProxy(proxy, mockWorker);
      });

      test('getTextInRect should send GET_TEXT_IN_RECT with bounds and return text', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getTextInRect('page-1', 10, 20, 100, 200);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: {
            pageId: string;
            left: number;
            top: number;
            right: number;
            bottom: number;
          };
        };
        expect(msg.type).toBe('GET_TEXT_IN_RECT');
        expect(msg.payload.left).toBe(10);
        expect(msg.payload.top).toBe(20);
        expect(msg.payload.right).toBe(100);
        expect(msg.payload.bottom).toBe(200);

        mockWorker.respondSuccess(msg.id, 'Selected text content');

        const result = await promise;
        expect(result).toBe('Selected text content');

        await disposeProxy(proxy, mockWorker);
      });

      test('findText should send FIND_TEXT with query and flags and return results', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.findText(
          'page-1',
          'search term',
          TextSearchFlags.MatchCase | TextSearchFlags.MatchWholeWord,
        );
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: {
            pageId: string;
            query: string;
            flags: number;
          };
        };
        expect(msg.type).toBe('FIND_TEXT');
        expect(msg.payload.query).toBe('search term');
        expect(msg.payload.flags).toBe(0x0003);

        mockWorker.respondSuccess(msg.id, [
          { charIndex: 10, charCount: 11, rects: [{ left: 50, top: 60, right: 150, bottom: 80 }] },
          { charIndex: 100, charCount: 11, rects: [{ left: 50, top: 160, right: 150, bottom: 180 }] },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.charIndex).toBe(10);

        await disposeProxy(proxy, mockWorker);
      });

      test('getCharacterInfo should send GET_CHARACTER_INFO with charIndex and return info', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getCharacterInfo('page-1', 42);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: { pageId: string; charIndex: number };
        };
        expect(msg.type).toBe('GET_CHARACTER_INFO');
        expect(msg.payload.charIndex).toBe(42);

        mockWorker.respondSuccess(msg.id, {
          char: 'a',
          fontSize: 12,
          fontName: 'Times New Roman',
          flags: 0,
        });

        const result = await promise;
        expect(result?.char).toBe('a');
        expect(result?.fontSize).toBe(12);

        await disposeProxy(proxy, mockWorker);
      });

      test('getCharBox should send GET_CHAR_BOX with charIndex and return box', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getCharBox('page-1', 42);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: { pageId: string; charIndex: number };
        };
        expect(msg.type).toBe('GET_CHAR_BOX');
        expect(msg.payload.charIndex).toBe(42);

        mockWorker.respondSuccess(msg.id, {
          left: 10,
          top: 20,
          right: 30,
          bottom: 40,
        });

        const result = await promise;
        expect(result?.left).toBe(10);
        expect(result?.right).toBe(30);

        await disposeProxy(proxy, mockWorker);
      });
    });

    describe('mutation operations', () => {
      test('flattenPage should send FLATTEN_PAGE with optional flags and return result', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.flattenPage('page-1', FlattenFlags.Print);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: {
            pageId: string;
            flags: string;
          };
        };
        expect(msg.type).toBe('FLATTEN_PAGE');
        expect(msg.payload.flags).toBe(FlattenFlags.Print);

        mockWorker.respondSuccess(msg.id, 'Success');

        const result = await promise;
        expect(result).toBe('Success');

        await disposeProxy(proxy, mockWorker);
      });

      test('getFormWidgets should send GET_FORM_WIDGETS and return widget array', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getFormWidgets('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_FORM_WIDGETS');

        mockWorker.respondSuccess(msg.id, [
          { annotationIndex: 0, fieldName: 'firstName', fieldType: 'TextField', fieldValue: 'John' },
          { annotationIndex: 1, fieldName: 'agree', fieldType: 'CheckBox', fieldValue: 'true' },
        ]);

        const result = await promise;
        expect(result).toHaveLength(2);
        expect(result[0]!.fieldType).toBe('TextField');

        await disposeProxy(proxy, mockWorker);
      });
    });

    describe('form operations', () => {
      test('getFormSelectedText should send GET_FORM_SELECTED_TEXT and return text', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.getFormSelectedText('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('GET_FORM_SELECTED_TEXT');

        mockWorker.respondSuccess(msg.id, 'Selected form text');

        const result = await promise;
        expect(result).toBe('Selected form text');

        await disposeProxy(proxy, mockWorker);
      });

      test('canFormUndo should send CAN_FORM_UNDO and return boolean', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.canFormUndo('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('CAN_FORM_UNDO');

        mockWorker.respondSuccess(msg.id, true);

        const result = await promise;
        expect(result).toBe(true);

        await disposeProxy(proxy, mockWorker);
      });

      test('formUndo should send FORM_UNDO and return boolean', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.formUndo('page-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
        expect(msg.type).toBe('FORM_UNDO');

        mockWorker.respondSuccess(msg.id, true);

        const result = await promise;
        expect(result).toBe(true);

        await disposeProxy(proxy, mockWorker);
      });

      test('killFormFocus should send KILL_FORM_FOCUS with documentId and return boolean', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.killFormFocus('doc-1');
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: { documentId: string };
        };
        expect(msg.type).toBe('KILL_FORM_FOCUS');
        expect(msg.payload.documentId).toBe('doc-1');

        mockWorker.respondSuccess(msg.id, true);

        const result = await promise;
        expect(result).toBe(true);

        await disposeProxy(proxy, mockWorker);
      });
    });

    describe('document operations', () => {
      test('setFormHighlight should send SET_FORM_HIGHLIGHT with parameters', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const colour = { r: 0, g: 0, b: 255, a: 128 };
        const promise = proxy.setFormHighlight('doc-1', FormFieldType.TextField, colour, 128);
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
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
        expect(msg.payload.documentId).toBe('doc-1');
        expect(msg.payload.fieldType).toBe(FormFieldType.TextField);
        expect(msg.payload.colour).toEqual(colour);
        expect(msg.payload.alpha).toBe(128);

        mockWorker.respondSuccess(msg.id, undefined);

        await promise;

        await disposeProxy(proxy, mockWorker);
      });

      test('importPages should send IMPORT_PAGES with target, source and options', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.importPages('doc-1', 'doc-2', { pageRange: '1,3,5', insertIndex: 1 });
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: {
            targetDocId: string;
            sourceDocId: string;
            options: { pageRange: string; insertIndex: number };
          };
        };
        expect(msg.type).toBe('IMPORT_PAGES');
        expect(msg.payload.targetDocId).toBe('doc-1');
        expect(msg.payload.sourceDocId).toBe('doc-2');
        expect(msg.payload.options?.pageRange).toBe('1,3,5');

        mockWorker.respondSuccess(msg.id, undefined);

        await promise;

        await disposeProxy(proxy, mockWorker);
      });

      test('createNUp should send CREATE_N_UP with documentId and options and return result', async () => {
        const { proxy } = await createInitialisedProxy(mockWorker);

        const promise = proxy.createNUp('doc-1', {
          outputWidth: 595,
          outputHeight: 842,
          pagesPerRow: 2,
          pagesPerColumn: 2,
        });
        const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
          type: string;
          id: string;
          payload: {
            documentId: string;
            options: { outputWidth: number; outputHeight: number; pagesPerRow: number; pagesPerColumn: number };
          };
        };
        expect(msg.type).toBe('CREATE_N_UP');
        expect(msg.payload.documentId).toBe('doc-1');
        expect(msg.payload.options?.pagesPerRow).toBe(2);

        mockWorker.respondSuccess(msg.id, { documentId: 'doc-nup', pageCount: 3 });

        const result = await promise;
        expect(result.documentId).toBe('doc-nup');
        expect(result.pageCount).toBe(3);

        await disposeProxy(proxy, mockWorker);
      });
    });
  });
});
