import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';
import { useDocumentBytes } from '../../../../src/react/hooks/use-document-bytes.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeDocument(save: () => Promise<Uint8Array>): WorkerPDFiumDocument {
  return { save } as unknown as WorkerPDFiumDocument;
}

describe('useDocumentBytes', () => {
  it('returns undefined when save is called without a document', async () => {
    const { result } = renderHook(() => useDocumentBytes(null));

    await act(async () => {
      const bytes = await result.current.save();
      expect(bytes).toBeUndefined();
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('ignores stale save failures after the document instance changes', async () => {
    const stale = deferred<Uint8Array>();
    const staleDoc = makeDocument(vi.fn().mockReturnValue(stale.promise));
    const freshDoc = makeDocument(vi.fn().mockResolvedValue(new Uint8Array([9, 9, 9])));

    const { result, rerender } = renderHook(({ doc }) => useDocumentBytes(doc), {
      initialProps: { doc: staleDoc as WorkerPDFiumDocument | null },
    });

    let staleSavePromise!: Promise<Uint8Array | undefined>;
    act(() => {
      staleSavePromise = result.current.save();
    });
    expect(result.current.isSaving).toBe(true);

    // Switch documents while the first save is still pending.
    rerender({ doc: freshDoc });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => {
      stale.reject(new Error('stale failure'));
      await staleSavePromise;
    });

    // Stale completion must not overwrite state for the new document.
    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(false);

    await act(async () => {
      const bytes = await result.current.save();
      expect(bytes).toEqual(new Uint8Array([9, 9, 9]));
    });
  });

  it('does not let a stale in-flight save block immediate save on a new document', async () => {
    const stale = deferred<Uint8Array>();
    const staleDoc = makeDocument(vi.fn().mockReturnValue(stale.promise));
    const freshSave = vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6]));
    const freshDoc = makeDocument(freshSave);

    const { result, rerender } = renderHook(({ doc }) => useDocumentBytes(doc), {
      initialProps: { doc: staleDoc as WorkerPDFiumDocument | null },
    });

    let stalePromise!: Promise<Uint8Array | undefined>;
    act(() => {
      stalePromise = result.current.save();
    });
    expect(result.current.isSaving).toBe(true);

    rerender({ doc: freshDoc });

    let freshBytes: Uint8Array | undefined;
    await act(async () => {
      freshBytes = await result.current.save();
    });

    expect(freshSave).toHaveBeenCalledTimes(1);
    expect(freshBytes).toEqual(new Uint8Array([4, 5, 6]));

    await act(async () => {
      stale.resolve(new Uint8Array([1, 2, 3]));
      await stalePromise;
    });
  });

  it('returns undefined for a save that resolves after unmount', async () => {
    const pending = deferred<Uint8Array>();
    const doc = makeDocument(vi.fn().mockReturnValue(pending.promise));
    const { result, unmount } = renderHook(() => useDocumentBytes(doc));

    let savePromise!: Promise<Uint8Array | undefined>;
    act(() => {
      savePromise = result.current.save();
    });

    unmount();

    await act(async () => {
      pending.resolve(new Uint8Array([8, 8, 8]));
      await pending.promise;
    });

    await expect(savePromise).resolves.toBeUndefined();
  });

  it('uses deterministic timer scheduling to ignore stale save completion after document swap', async () => {
    vi.useFakeTimers();

    const staleDoc = makeDocument(
      vi.fn(
        () =>
          new Promise<Uint8Array>((resolve) => {
            setTimeout(() => resolve(new Uint8Array([1, 2, 3])), 50);
          }),
      ),
    );
    const freshDoc = makeDocument(
      vi.fn(
        () =>
          new Promise<Uint8Array>((resolve) => {
            setTimeout(() => resolve(new Uint8Array([7, 8, 9])), 10);
          }),
      ),
    );

    const { result, rerender } = renderHook(({ doc }) => useDocumentBytes(doc), {
      initialProps: { doc: staleDoc as WorkerPDFiumDocument | null },
    });

    let stalePromise!: Promise<Uint8Array | undefined>;
    act(() => {
      stalePromise = result.current.save();
    });

    rerender({ doc: freshDoc });

    let freshPromise!: Promise<Uint8Array | undefined>;
    act(() => {
      freshPromise = result.current.save();
    });

    await act(async () => {
      vi.advanceTimersByTime(10);
      await Promise.resolve();
    });

    await expect(freshPromise).resolves.toEqual(new Uint8Array([7, 8, 9]));
    expect(result.current.error).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(40);
      await Promise.resolve();
    });

    await expect(stalePromise).resolves.toBeUndefined();
    expect(result.current.error).toBeNull();

    vi.useRealTimers();
  });
});
