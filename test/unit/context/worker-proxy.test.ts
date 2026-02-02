/**
 * Unit tests for WorkerProxy.
 *
 * Uses a mock Worker to test timeout, error handling, progress, and disposal.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkerResponse } from '../../../src/context/protocol.js';
import { PDFiumErrorCode } from '../../../src/core/errors.js';

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
    const { proxy } = await createInitialisedProxy(mockWorker);

    // Send a response for a non-existent request ID — should not throw
    expect(() => mockWorker.respondSuccess('non-existent-id', 'hello')).not.toThrow();

    await disposeProxy(proxy, mockWorker);
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
});
