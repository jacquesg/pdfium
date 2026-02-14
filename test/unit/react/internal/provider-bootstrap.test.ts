import { describe, expect, it, vi } from 'vitest';
import {
  createWorkerPDFiumInstance,
  fetchWasmBinaryFromUrl,
} from '../../../../src/react/internal/provider-bootstrap.js';

describe('fetchWasmBinaryFromUrl', () => {
  it('returns response binary for successful fetches', async () => {
    const binary = new ArrayBuffer(16);
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => binary,
    }));

    await expect(fetchWasmBinaryFromUrl('/pdfium.wasm', fetchFn)).resolves.toBe(binary);
    expect(fetchFn).toHaveBeenCalledWith('/pdfium.wasm');
  });

  it('throws a descriptive error for non-ok responses', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 503,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));

    await expect(fetchWasmBinaryFromUrl('/pdfium.wasm', fetchFn)).rejects.toThrow('Failed to fetch WASM: HTTP 503');
  });

  it('forwards abort signal to fetch implementation', async () => {
    const signal = new AbortController().signal;
    const binary = new ArrayBuffer(4);
    const fetchFn = vi.fn(async (_input: string, init?: { signal?: AbortSignal }) => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => binary,
      seenSignal: init?.signal,
    }));

    await fetchWasmBinaryFromUrl('/pdfium.wasm', fetchFn, signal);

    expect(fetchFn).toHaveBeenCalledWith('/pdfium.wasm', { signal });
  });
});

describe('createWorkerPDFiumInstance', () => {
  it('clones wasm binary before creating worker instance', async () => {
    const sourceBinary = Uint8Array.from([1, 2, 3, 4]).buffer;
    const worker = { id: 'worker' };
    const createWorker = vi.fn(async (_options: { workerUrl: string | URL; wasmBinary: ArrayBuffer }) => worker);

    const created = await createWorkerPDFiumInstance({
      workerUrl: '/worker.js',
      wasmBinary: sourceBinary,
      createWorker,
    });

    expect(created).toBe(worker);
    expect(createWorker).toHaveBeenCalledTimes(1);
    const callOptions = createWorker.mock.calls[0]?.[0] as { workerUrl: string | URL; wasmBinary: ArrayBuffer };
    expect(callOptions.workerUrl).toBe('/worker.js');
    expect(callOptions.wasmBinary).not.toBe(sourceBinary);
    expect(Array.from(new Uint8Array(callOptions.wasmBinary))).toEqual([1, 2, 3, 4]);
  });
});
