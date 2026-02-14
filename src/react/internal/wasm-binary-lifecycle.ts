'use client';

import { toError } from './error-normalization.js';

interface StartWasmBinaryFetchOptions {
  wasmBinary: ArrayBuffer | undefined;
  wasmUrl: string | undefined;
  fetchBinaryFromUrl: (url: string, signal: AbortSignal) => Promise<ArrayBuffer>;
  setResolvedBinary: (binary: ArrayBuffer) => void;
  setError: (error: Error) => void;
  setIsInitialising: (value: boolean) => void;
}

interface SyncResolvedBinaryFromPropOptions {
  wasmBinary: ArrayBuffer | undefined;
  setResolvedBinary: (binary: ArrayBuffer) => void;
}

function syncResolvedBinaryFromProp({ wasmBinary, setResolvedBinary }: SyncResolvedBinaryFromPropOptions): void {
  if (!wasmBinary) return;
  setResolvedBinary(wasmBinary);
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return 'name' in error && (error as { name?: unknown }).name === 'AbortError';
}

function startWasmBinaryFetch({
  wasmBinary,
  wasmUrl,
  fetchBinaryFromUrl,
  setResolvedBinary,
  setError,
  setIsInitialising,
}: StartWasmBinaryFetchOptions): () => void {
  if (wasmBinary || !wasmUrl) {
    return () => {};
  }

  let active = true;
  const controller = new AbortController();
  let fetchPromise: Promise<ArrayBuffer>;
  try {
    fetchPromise = fetchBinaryFromUrl(wasmUrl, controller.signal);
  } catch (error) {
    setError(toError(error));
    setIsInitialising(false);
    return () => {};
  }

  fetchPromise.then(
    (binary) => {
      if (active) {
        setResolvedBinary(binary);
      }
    },
    (error: unknown) => {
      if (!active) return;
      if (isAbortError(error)) return;
      setError(toError(error));
      setIsInitialising(false);
    },
  );

  return () => {
    active = false;
    controller.abort();
  };
}

export { startWasmBinaryFetch, syncResolvedBinaryFromProp };
export type { StartWasmBinaryFetchOptions, SyncResolvedBinaryFromPropOptions };
