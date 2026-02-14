/**
 * Coverage tests for context/worker-proxy.ts uncovered lines.
 *
 * Targets specific uncovered edge cases:
 * - Lines 492-494: DESTROY timeout handling in disposeInternalAsync
 * - Lines 502-503: Error handling in DESTROY catch block
 * - #deserialiseError with unknown error code
 * - #handleError rejecting all pending requests
 * - renderPage ArrayBuffer → Uint8Array conversion
 * - PROGRESS message dispatching
 * - Node worker transport exit branches
 * - Orphaned response handling
 * - workerFactory option
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';
import type { WorkerMessageEvent, WorkerTransport } from '../../../src/context/worker-proxy.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

/**
 * Minimal mock Worker for testing — implements WorkerTransport.
 */
class MockWorker implements WorkerTransport {
  onmessage: ((event: WorkerMessageEvent<WorkerResponse>) => void) | null = null;
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

describe('WorkerProxy - coverage for uncovered lines', () => {
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
    vi.useRealTimers();
  });

  /** Helper to create a proxy and respond to INIT */
  async function createProxy(opts?: { destroyTimeout?: number }) {
    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), {
      timeout: 5000,
      destroyTimeout: opts?.destroyTimeout ?? 50,
    });

    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    return createPromise;
  }

  /** Helper to dispose proxy — responds to DESTROY message first */
  async function disposeProxy(proxy: { dispose: () => Promise<void> }) {
    const disposePromise = proxy.dispose();
    // Respond to DESTROY so it doesn't have to timeout
    const destroyMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (destroyMsg.type === 'DESTROY') {
      mockWorker.respondSuccess(destroyMsg.id, undefined);
    }
    await disposePromise;
  }

  test('lines 492-494 - DESTROY timeout path during disposal', async () => {
    vi.useFakeTimers();
    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), {
      timeout: 5000,
      destroyTimeout: 100,
    });

    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    // Start disposal - sends DESTROY message
    const disposePromise = proxy.dispose();

    // Don't respond to DESTROY — let it timeout
    await vi.advanceTimersByTimeAsync(150);

    await disposePromise;

    expect(mockWorker.terminated).toBe(true);
  });

  test('lines 502-503 - error in DESTROY catch block with __DEV__', async () => {
    vi.stubGlobal('__DEV__', true);

    const warnSpy = vi.fn();
    vi.doMock('../../../src/core/logger.js', () => ({
      getLogger: () => ({ warn: warnSpy, info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    }));

    const proxy = await createProxy();

    const disposePromise = proxy.dispose();

    // Respond to DESTROY with error
    const destroyMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    if (destroyMsg.type === 'DESTROY') {
      mockWorker.respondError(destroyMsg.id, {
        name: 'WorkerError',
        message: 'DESTROY failed',
        code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
      });
    }

    await disposePromise;

    expect(mockWorker.terminated).toBe(true);
  });

  test('deserialiseError with unknown error code', async () => {
    const proxy = await createProxy();

    // Send request
    const textPromise = proxy.getText('page-1');

    // Respond with unknown error code (9999)
    const textMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondError(textMsg.id, {
      name: 'UnknownError',
      message: 'Unknown error',
      code: 9999,
    });

    // Should fallback to WORKER_COMMUNICATION_FAILED
    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeProxy(proxy);
  });

  test('handleError rejects all pending requests', async () => {
    const proxy = await createProxy();

    // Send multiple requests
    const request1 = proxy.getText('page-1');
    const request2 = proxy.getText('page-2');

    // Simulate worker error
    mockWorker.onerror?.({ message: 'Worker crashed' });

    // All pending requests should be rejected
    await expect(request1).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
    await expect(request2).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    await disposeProxy(proxy);
  });

  test('renderPage converts ArrayBuffer to Uint8Array', async () => {
    const proxy = await createProxy();

    // Send render request
    const renderPromise = proxy.renderPage('page-1', { width: 100, height: 100 });

    // Respond with render result containing ArrayBuffer
    const renderMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    const dataBuffer = new ArrayBuffer(100 * 100 * 4);
    mockWorker.respondSuccess(renderMsg.id, {
      width: 100,
      height: 100,
      originalWidth: 100,
      originalHeight: 100,
      data: dataBuffer,
    });

    const result = await renderPromise;

    // Should convert ArrayBuffer to Uint8Array
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.data.byteLength).toBe(100 * 100 * 4);

    await disposeProxy(proxy);
  });

  test('PROGRESS message updates onProgress callback', async () => {
    const proxy = await createProxy();

    // Track progress updates
    const progressUpdates: number[] = [];
    const onProgress = (progress: number) => {
      progressUpdates.push(progress);
    };

    // Send render request with progress callback
    const renderPromise = proxy.renderPage('page-1', { width: 100, height: 100 }, onProgress);

    const renderMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };

    // Send progress updates
    const progressResponse1: WorkerResponse = { type: 'PROGRESS', id: renderMsg.id, progress: 0.5 };
    mockWorker.onmessage?.({ data: progressResponse1 });

    const progressResponse2: WorkerResponse = { type: 'PROGRESS', id: renderMsg.id, progress: 0.8 };
    mockWorker.onmessage?.({ data: progressResponse2 });

    // Send final success
    const dataBuffer = new ArrayBuffer(100 * 100 * 4);
    mockWorker.respondSuccess(renderMsg.id, {
      width: 100,
      height: 100,
      originalWidth: 100,
      originalHeight: 100,
      data: dataBuffer,
    });

    await renderPromise;

    expect(progressUpdates).toEqual([0.5, 0.8]);

    await disposeProxy(proxy);
  });

  test('orphaned response is silently ignored', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const proxy = await createProxy();

    // Send a response with an ID that was never requested
    const orphanedResponse: WorkerResponse = { type: 'SUCCESS', id: 'nonexistent-id', payload: null };
    mockWorker.onmessage?.({ data: orphanedResponse });
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Received response for unknown request ID: nonexistent-id');

    // Should not throw, just return early
    // Verify proxy still works after orphaned response
    const textPromise = proxy.getText('page-1');
    const textMsg = mockWorker.posted[mockWorker.posted.length - 1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(textMsg.id, 'Hello');
    const result = await textPromise;
    expect(result).toBe('Hello');

    await disposeProxy(proxy);
    warnSpy.mockRestore();
  });

  test('create with workerFactory option', async () => {
    // Remove the global Worker so it doesn't get used
    vi.stubGlobal('Worker', undefined);

    const customWorker = new MockWorker();
    const factory = vi.fn().mockReturnValue(customWorker);

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), {
      timeout: 5000,
      workerFactory: factory,
    });

    // Respond to INIT on the custom worker
    const initMsg = customWorker.posted[0]!.data as { type: string; id: string };
    customWorker.respondSuccess(initMsg.id, undefined);

    const proxy = await createPromise;
    expect(factory).toHaveBeenCalledWith('worker.js');

    // Dispose
    const disposePromise = proxy.dispose();
    const destroyMsg = customWorker.posted[customWorker.posted.length - 1]!.data as { type: string; id: string };
    if (destroyMsg.type === 'DESTROY') {
      customWorker.respondSuccess(destroyMsg.id, undefined);
    }
    await disposePromise;
  });

  test('create throws InitialisationError when worker factory fails', async () => {
    vi.stubGlobal('Worker', undefined);

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(
      WorkerProxy.create('worker.js', new ArrayBuffer(8), {
        workerFactory: () => {
          throw new Error('Factory exploded');
        },
      }),
    ).rejects.toBeInstanceOf(InitialisationError);
  });

  test('create with no Worker constructor and no Node env throws', async () => {
    vi.stubGlobal('Worker', undefined);

    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => false,
    }));

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    await expect(WorkerProxy.create('worker.js', new ArrayBuffer(8))).rejects.toBeInstanceOf(InitialisationError);
  });

  test('create - INIT failure with non-Error value', async () => {
    // Mock Worker that throws a non-Error during postMessage
    const brokenWorker = new MockWorker();
    vi.stubGlobal('Worker', undefined);

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');
    const { InitialisationError } = await import('../../../src/core/errors.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), {
      timeout: 500,
      workerFactory: () => brokenWorker,
    });

    // Respond to INIT with error
    const initMsg = brokenWorker.posted[0]!.data as { type: string; id: string };
    brokenWorker.respondError(initMsg.id, {
      name: 'InitError',
      message: 'WASM init failed',
      code: PDFiumErrorCode.INIT_LIBRARY_FAILED,
    });

    await expect(createPromise).rejects.toBeInstanceOf(InitialisationError);
  });

  test('getPageCount sends GET_PAGE_COUNT and returns number', async () => {
    const proxy = await createProxy();

    const countPromise = proxy.getPageCount('doc-1');

    const msg = mockWorker.posted[mockWorker.posted.length - 1]!.data as {
      type: string;
      id: string;
      payload: { documentId: string };
    };
    expect(msg.type).toBe('GET_PAGE_COUNT');
    expect(msg.payload.documentId).toBe('doc-1');
    mockWorker.respondSuccess(msg.id, 5);

    const count = await countPromise;
    expect(count).toBe(5);

    await disposeProxy(proxy);
  });
});

describe('WorkerProxy - Node worker transport event handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('Worker', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Create a mock node:worker_threads.Worker that captures event handlers. */
  function createMockNodeWorker() {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    let postMessageFn: (data: unknown, transfer?: unknown[]) => void = vi.fn();
    let terminateFn: () => void = vi.fn();

    vi.doMock('node:worker_threads', () => ({
      Worker: class {
        postMessage = (data: unknown, transfer?: unknown[]) => postMessageFn(data, transfer);
        terminate = () => terminateFn();
        on(event: string, handler: (...args: unknown[]) => void) {
          handlers.set(event, handler);
        }
      },
    }));

    vi.doMock('../../../src/core/env.js', () => ({
      isNodeEnvironment: () => true,
    }));

    return {
      handlers,
      setPostMessage(fn: typeof postMessageFn) {
        postMessageFn = fn;
      },
      setTerminate(fn: typeof terminateFn) {
        terminateFn = fn;
      },
    };
  }

  test('line 131 - messageerror event triggers onerror', async () => {
    const mockNode = createMockNodeWorker();
    const posted: Array<{ data: unknown }> = [];

    mockNode.setPostMessage((data: unknown) => {
      posted.push({ data });
    });

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 2000 });

    // Wait for transport creation
    await new Promise((r) => setTimeout(r, 10));

    // Respond to INIT via the message handler
    const messageHandler = mockNode.handlers.get('message')!;
    const initData = posted[0]!.data as { type: string; id: string };
    messageHandler({ type: 'SUCCESS', id: initData.id, payload: undefined });

    const proxy = await createPromise;

    // Now trigger messageerror — should invoke onerror which rejects pending requests
    const textPromise = proxy.getText('page-1');
    await new Promise((r) => setTimeout(r, 10));

    const messageerrorHandler = mockNode.handlers.get('messageerror')!;
    messageerrorHandler();

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
  });

  test('line 138 - exit with non-zero code includes code in message', async () => {
    const mockNode = createMockNodeWorker();
    const posted: Array<{ data: unknown }> = [];

    mockNode.setPostMessage((data: unknown) => {
      posted.push({ data });
    });

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 2000 });

    await new Promise((r) => setTimeout(r, 10));

    // Respond to INIT
    const messageHandler = mockNode.handlers.get('message')!;
    const initData = posted[0]!.data as { type: string; id: string };
    messageHandler({ type: 'SUCCESS', id: initData.id, payload: undefined });

    const proxy = await createPromise;

    // Send a request then trigger exit with non-zero code
    const textPromise = proxy.getText('page-1');
    await new Promise((r) => setTimeout(r, 10));

    const exitHandler = mockNode.handlers.get('exit')!;
    exitHandler(1); // non-zero exit code

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
  });

  test('line 138 - exit with code 0 reports unexpected exit', async () => {
    const mockNode = createMockNodeWorker();
    const posted: Array<{ data: unknown }> = [];

    mockNode.setPostMessage((data: unknown) => {
      posted.push({ data });
    });

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 2000 });

    await new Promise((r) => setTimeout(r, 10));

    const messageHandler = mockNode.handlers.get('message')!;
    const initData = posted[0]!.data as { type: string; id: string };
    messageHandler({ type: 'SUCCESS', id: initData.id, payload: undefined });

    const proxy = await createPromise;

    const textPromise = proxy.getText('page-1');
    await new Promise((r) => setTimeout(r, 10));

    const exitHandler = mockNode.handlers.get('exit')!;
    exitHandler(0); // zero exit code — "Worker exited unexpectedly"

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
  });

  test('line 127 - error event triggers onerror with message', async () => {
    const mockNode = createMockNodeWorker();
    const posted: Array<{ data: unknown }> = [];

    mockNode.setPostMessage((data: unknown) => {
      posted.push({ data });
    });

    const { WorkerProxy } = await import('../../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 2000 });

    await new Promise((r) => setTimeout(r, 10));

    const messageHandler = mockNode.handlers.get('message')!;
    const initData = posted[0]!.data as { type: string; id: string };
    messageHandler({ type: 'SUCCESS', id: initData.id, payload: undefined });

    const proxy = await createPromise;

    const textPromise = proxy.getText('page-1');
    await new Promise((r) => setTimeout(r, 10));

    const errorHandler = mockNode.handlers.get('error')!;
    errorHandler(new Error('Worker crashed hard'));

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
  });
});
