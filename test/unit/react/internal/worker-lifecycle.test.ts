import { describe, expect, it, vi } from 'vitest';
import { startWorkerInitialisation } from '../../../../src/react/internal/worker-lifecycle.js';

function flushMicrotasks(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('startWorkerInitialisation', () => {
  it('exposes null instance while worker creation is pending', () => {
    const existingWorker = { dispose: vi.fn() };
    const instanceRef = { current: existingWorker };
    const createWorker = vi.fn(
      () =>
        new Promise<{ dispose: ReturnType<typeof vi.fn> }>(() => {
          // keep pending
        }),
    );
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    const cleanup = startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    expect(setInstance).toHaveBeenCalledWith(null);
    expect(setIsInitialising).toHaveBeenCalledWith(true);
    expect(setError).not.toHaveBeenCalled();

    cleanup();
  });

  it('publishes worker instance on successful creation', async () => {
    const worker = { dispose: vi.fn() };
    const instanceRef = { current: null as typeof worker | null };
    const createWorker = vi.fn(async () => worker);
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    await flushMicrotasks();

    expect(instanceRef.current).toBe(worker);
    expect(setInstance).toHaveBeenNthCalledWith(1, null);
    expect(setInstance).toHaveBeenNthCalledWith(2, worker);
    expect(setIsInitialising).toHaveBeenNthCalledWith(1, true);
    expect(setIsInitialising).toHaveBeenNthCalledWith(2, false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('disposes stale worker if creation resolves after cleanup', async () => {
    const staleWorker = { dispose: vi.fn() };
    let resolveWorker!: (worker: typeof staleWorker) => void;
    const pendingWorker = new Promise<typeof staleWorker>((resolve) => {
      resolveWorker = resolve;
    });
    const instanceRef = { current: null as typeof staleWorker | null };
    const createWorker = vi.fn(async () => pendingWorker);
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    const cleanup = startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    cleanup();
    resolveWorker(staleWorker);
    await flushMicrotasks();

    expect(staleWorker.dispose).toHaveBeenCalledTimes(1);
    expect(instanceRef.current).toBeNull();
    expect(setInstance).toHaveBeenCalledTimes(1);
    expect(setInstance).toHaveBeenCalledWith(null);
  });

  it('disposes active worker and clears ref during cleanup', async () => {
    const worker = { dispose: vi.fn() };
    const instanceRef = { current: null as typeof worker | null };
    const createWorker = vi.fn(async () => worker);
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    const cleanup = startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    await flushMicrotasks();
    cleanup();

    expect(worker.dispose).toHaveBeenCalledTimes(1);
    expect(instanceRef.current).toBeNull();
  });

  it('does not throw when active worker disposal throws during cleanup', async () => {
    const disposeError = new Error('dispose failed');
    const worker = {
      dispose: vi.fn(() => {
        throw disposeError;
      }),
    };
    const instanceRef = { current: null as typeof worker | null };
    const createWorker = vi.fn(async () => worker);
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    const cleanup = startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    await flushMicrotasks();

    expect(() => cleanup()).not.toThrow();
    expect(setError).toHaveBeenCalledWith(disposeError);
    expect(instanceRef.current).toBeNull();
  });

  it('reports async disposal failures during cleanup without throwing', async () => {
    const disposeError = new Error('async dispose failed');
    const worker = {
      dispose: vi.fn().mockRejectedValue(disposeError),
    };
    const instanceRef = { current: null as typeof worker | null };
    const createWorker = vi.fn(async () => worker);
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    const cleanup = startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    await flushMicrotasks();

    expect(() => cleanup()).not.toThrow();
    await flushMicrotasks();

    expect(setError).toHaveBeenCalledWith(disposeError);
    expect(instanceRef.current).toBeNull();
  });

  it('maps non-error creation failures to Error instances', async () => {
    const instanceRef = { current: null as { dispose: ReturnType<typeof vi.fn> } | null };
    const createWorker = vi.fn(async () => {
      throw 'boom';
    });
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    await flushMicrotasks();

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((setError.mock.calls[0]?.[0] as Error).message).toContain('boom');
    expect(setIsInitialising).toHaveBeenLastCalledWith(false);
  });

  it('handles synchronous createWorker throws by reporting an error and stopping initialisation', () => {
    const instanceRef = { current: null as { dispose: ReturnType<typeof vi.fn> } | null };
    const createWorker = vi.fn(() => {
      throw 'sync-boom';
    });
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    expect(() =>
      startWorkerInitialisation({
        workerUrl: '/worker.js',
        wasmBinary: new ArrayBuffer(0),
        createWorker,
        instanceRef,
        setInstance,
        setIsInitialising,
        setError,
      }),
    ).not.toThrow();

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((setError.mock.calls[0]?.[0] as Error).message).toContain('sync-boom');
    expect(setIsInitialising).toHaveBeenNthCalledWith(1, true);
    expect(setIsInitialising).toHaveBeenNthCalledWith(2, false);
  });

  it('does not report stale disposal errors after cleanup when late worker creation resolves', async () => {
    const disposeError = new Error('stale dispose failed');
    const staleWorker = {
      dispose: vi.fn(() => {
        throw disposeError;
      }),
    };
    let resolveWorker!: (worker: typeof staleWorker) => void;
    const pendingWorker = new Promise<typeof staleWorker>((resolve) => {
      resolveWorker = resolve;
    });

    const instanceRef = { current: null as typeof staleWorker | null };
    const createWorker = vi.fn(async () => pendingWorker);
    const setInstance = vi.fn();
    const setIsInitialising = vi.fn();
    const setError = vi.fn();

    const cleanup = startWorkerInitialisation({
      workerUrl: '/worker.js',
      wasmBinary: new ArrayBuffer(0),
      createWorker,
      instanceRef,
      setInstance,
      setIsInitialising,
      setError,
    });

    cleanup();
    resolveWorker(staleWorker);
    await flushMicrotasks();

    expect(setError).not.toHaveBeenCalled();
  });
});
