/**
 * Unit tests for WorkerProxy.
 *
 * Uses a mock Worker to test timeout, error handling, progress, and disposal.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PDFiumErrorCode, WorkerError } from '../../src/core/errors.js';
import type { WorkerResponse } from '../../src/context/protocol.js';

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
    const transfer = Array.isArray(options) ? options : (options as { transfer?: Transferable[] })?.transfer ?? [];
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

// We need to construct WorkerProxy directly since create() would call INIT
// Use dynamic import and mock the Worker global
describe('WorkerProxy', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWorker = new MockWorker();

    // Mock the global Worker constructor
    vi.stubGlobal('Worker', class {
      constructor() {
        return mockWorker;
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('create should send INIT request and resolve on success', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8));

    // The INIT message should have been posted
    expect(mockWorker.posted.length).toBe(1);
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    expect(initMsg.type).toBe('INIT');

    // Simulate success
    mockWorker.respondSuccess(initMsg.id, undefined);

    const proxy = await createPromise;
    expect(proxy).toBeDefined();
    proxy.dispose();
  });

  test('create should reject if INIT times out', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 100 });

    // Advance past the timeout
    vi.advanceTimersByTime(150);

    await expect(createPromise).rejects.toThrow('Failed to initialise worker');
    expect(mockWorker.terminated).toBe(true);
  });

  test('request timeout should reject with WORKER_TIMEOUT', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 50 });

    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    // Make a request that will time out
    const textPromise = proxy.getText(1);
    vi.advanceTimersByTime(60);

    await expect(textPromise).rejects.toThrow(WorkerError);
    await expect(textPromise).rejects.toMatchObject({ code: PDFiumErrorCode.WORKER_TIMEOUT });

    proxy.dispose();
  });

  test('successful response should clear timeout', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 5000 });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    const textPromise = proxy.getText(1);
    const textMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondSuccess(textMsg.id, 'hello');

    const result = await textPromise;
    expect(result).toBe('hello');

    proxy.dispose();
  });

  test('error response should clear timeout and reject', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 5000 });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    const textPromise = proxy.getText(1);
    const textMsg = mockWorker.posted[1]!.data as { type: string; id: string };
    mockWorker.respondError(textMsg.id, {
      name: 'PageError',
      message: 'Page not found',
      code: PDFiumErrorCode.PAGE_ALREADY_CLOSED,
    });

    await expect(textPromise).rejects.toMatchObject({ code: PDFiumErrorCode.PAGE_ALREADY_CLOSED });

    proxy.dispose();
  });

  test('progress response should forward to callback', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 5000 });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    const progressValues: number[] = [];
    const renderPromise = proxy.renderPage(1, {}, (p) => progressValues.push(p));

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

    proxy.dispose();
  });

  test('worker error event should reject all pending requests', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 5000 });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    const textPromise = proxy.getText(1);
    mockWorker.emitError('Worker crashed');

    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });

    proxy.dispose();
  });

  test('dispose should terminate worker and reject pending requests', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 5000 });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;

    const textPromise = proxy.getText(1);
    proxy.dispose();

    expect(mockWorker.terminated).toBe(true);
    await expect(textPromise).rejects.toMatchObject({
      code: PDFiumErrorCode.WORKER_COMMUNICATION_FAILED,
    });
  });

  test('should reject requests after disposal', async () => {
    const { WorkerProxy } = await import('../../src/context/worker-proxy.js');

    const createPromise = WorkerProxy.create('worker.js', new ArrayBuffer(8), { timeout: 5000 });
    const initMsg = mockWorker.posted[0]!.data as { type: string; id: string };
    mockWorker.respondSuccess(initMsg.id, undefined);
    const proxy = await createPromise;
    proxy.dispose();

    await expect(proxy.getText(1)).rejects.toThrow('disposed');
  });
});
