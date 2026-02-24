interface FetchResponseLike {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

interface FetchRequestInitLike {
  signal?: AbortSignal;
}

type FetchLike = (input: string, init?: FetchRequestInitLike) => Promise<FetchResponseLike>;

interface CreateWorkerPDFiumInstanceOptions<TWorker> {
  workerUrl: string | URL;
  wasmBinary: ArrayBuffer;
  createWorker: (options: { workerUrl: string | URL; wasmBinary: ArrayBuffer }) => Promise<TWorker>;
}

async function fetchWasmBinaryFromUrl(wasmUrl: string, fetchFn: FetchLike, signal?: AbortSignal): Promise<ArrayBuffer> {
  const response = signal ? await fetchFn(wasmUrl, { signal }) : await fetchFn(wasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM: HTTP ${response.status}`);
  }
  return response.arrayBuffer();
}

async function createWorkerPDFiumInstance<TWorker>({
  workerUrl,
  wasmBinary,
  createWorker,
}: CreateWorkerPDFiumInstanceOptions<TWorker>): Promise<TWorker> {
  return createWorker({
    workerUrl,
    wasmBinary: wasmBinary.slice(0),
  });
}

export { createWorkerPDFiumInstance, fetchWasmBinaryFromUrl };
export type { CreateWorkerPDFiumInstanceOptions, FetchLike, FetchRequestInitLike, FetchResponseLike };
