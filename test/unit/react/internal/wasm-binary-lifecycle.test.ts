import { describe, expect, it, vi } from 'vitest';
import {
  startWasmBinaryFetch,
  syncResolvedBinaryFromProp,
} from '../../../../src/react/internal/wasm-binary-lifecycle.js';

function flushMicrotasks(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('syncResolvedBinaryFromProp', () => {
  it('updates resolved binary when wasmBinary prop is provided', () => {
    const setResolvedBinary = vi.fn();
    const wasmBinary = Uint8Array.from([1, 2, 3]).buffer;

    syncResolvedBinaryFromProp({ wasmBinary, setResolvedBinary });

    expect(setResolvedBinary).toHaveBeenCalledWith(wasmBinary);
  });

  it('no-ops when wasmBinary is undefined', () => {
    const setResolvedBinary = vi.fn();

    syncResolvedBinaryFromProp({ wasmBinary: undefined, setResolvedBinary });

    expect(setResolvedBinary).not.toHaveBeenCalled();
  });
});

describe('startWasmBinaryFetch', () => {
  it('no-ops when wasmBinary already exists', () => {
    const fetchBinaryFromUrl = vi.fn();
    const setResolvedBinary = vi.fn();
    const setError = vi.fn();
    const setIsInitialising = vi.fn();

    const cleanup = startWasmBinaryFetch({
      wasmBinary: new ArrayBuffer(0),
      wasmUrl: '/pdfium.wasm',
      fetchBinaryFromUrl,
      setResolvedBinary,
      setError,
      setIsInitialising,
    });

    expect(fetchBinaryFromUrl).not.toHaveBeenCalled();
    expect(setResolvedBinary).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
    cleanup();
  });

  it('fetches binary and resolves while active', async () => {
    const wasmBinary = new ArrayBuffer(8);
    const fetchBinaryFromUrl = vi.fn(async () => wasmBinary);
    const setResolvedBinary = vi.fn();
    const setError = vi.fn();
    const setIsInitialising = vi.fn();

    startWasmBinaryFetch({
      wasmBinary: undefined,
      wasmUrl: '/pdfium.wasm',
      fetchBinaryFromUrl,
      setResolvedBinary,
      setError,
      setIsInitialising,
    });

    await flushMicrotasks();

    expect(fetchBinaryFromUrl).toHaveBeenCalledWith('/pdfium.wasm', expect.any(AbortSignal));
    expect(setResolvedBinary).toHaveBeenCalledWith(wasmBinary);
    expect(setError).not.toHaveBeenCalled();
  });

  it('does not publish fetched binary after cleanup', async () => {
    let resolveBinary!: (binary: ArrayBuffer) => void;
    const pendingBinary = new Promise<ArrayBuffer>((resolve) => {
      resolveBinary = resolve;
    });
    const fetchBinaryFromUrl = vi.fn(async () => pendingBinary);
    const setResolvedBinary = vi.fn();
    const setError = vi.fn();
    const setIsInitialising = vi.fn();

    const cleanup = startWasmBinaryFetch({
      wasmBinary: undefined,
      wasmUrl: '/pdfium.wasm',
      fetchBinaryFromUrl,
      setResolvedBinary,
      setError,
      setIsInitialising,
    });

    cleanup();
    resolveBinary(new ArrayBuffer(4));
    await flushMicrotasks();

    expect(setResolvedBinary).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
  });

  it('reports async fetch failures and stops initialisation', async () => {
    const fetchBinaryFromUrl = vi.fn(async () => {
      throw 'fetch-failed';
    });
    const setResolvedBinary = vi.fn();
    const setError = vi.fn();
    const setIsInitialising = vi.fn();

    startWasmBinaryFetch({
      wasmBinary: undefined,
      wasmUrl: '/pdfium.wasm',
      fetchBinaryFromUrl,
      setResolvedBinary,
      setError,
      setIsInitialising,
    });

    await flushMicrotasks();

    expect(setResolvedBinary).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((setError.mock.calls[0]?.[0] as Error).message).toContain('fetch-failed');
    expect(setIsInitialising).toHaveBeenCalledWith(false);
  });

  it('reports synchronous fetch setup failures and stops initialisation', () => {
    const fetchBinaryFromUrl = vi.fn(() => {
      throw 'sync-fetch-failed';
    });
    const setResolvedBinary = vi.fn();
    const setError = vi.fn();
    const setIsInitialising = vi.fn();

    expect(() =>
      startWasmBinaryFetch({
        wasmBinary: undefined,
        wasmUrl: '/pdfium.wasm',
        fetchBinaryFromUrl,
        setResolvedBinary,
        setError,
        setIsInitialising,
      }),
    ).not.toThrow();

    expect(setResolvedBinary).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledTimes(1);
    expect((setError.mock.calls[0]?.[0] as Error).message).toContain('sync-fetch-failed');
    expect(setIsInitialising).toHaveBeenCalledWith(false);
  });

  it('aborts in-flight fetch on cleanup and suppresses abort errors', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchBinaryFromUrl = vi.fn((_url: string, signal?: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<ArrayBuffer>((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => {
            reject(new DOMException('aborted', 'AbortError'));
          },
          { once: true },
        );
      });
    });
    const setResolvedBinary = vi.fn();
    const setError = vi.fn();
    const setIsInitialising = vi.fn();

    const cleanup = startWasmBinaryFetch({
      wasmBinary: undefined,
      wasmUrl: '/pdfium.wasm',
      fetchBinaryFromUrl,
      setResolvedBinary,
      setError,
      setIsInitialising,
    });

    cleanup();
    await flushMicrotasks();

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(true);
    expect(setResolvedBinary).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
    expect(setIsInitialising).not.toHaveBeenCalledWith(false);
  });
});
