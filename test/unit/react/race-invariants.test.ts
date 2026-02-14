import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../src/context/worker-client.js';
import { useDocumentBytes } from '../../../src/react/hooks/use-document-bytes.js';
import { usePDFiumAction } from '../../../src/react/hooks/use-pdfium-action.js';

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

describe('race invariants', () => {
  it('useDocumentBytes keeps latest-document invariants across rapid context switches', async () => {
    const staleRuns = Array.from({ length: 8 }, () => deferred<Uint8Array>());
    const staleDocs = staleRuns.map((run, _index) => makeDocument(vi.fn().mockReturnValue(run.promise)));
    const latestDoc = makeDocument(vi.fn().mockResolvedValue(new Uint8Array([9, 9, 9])));

    const { result, rerender } = renderHook(({ doc }) => useDocumentBytes(doc), {
      initialProps: { doc: staleDocs[0] as WorkerPDFiumDocument | null },
    });

    const stalePromises: Array<Promise<Uint8Array | undefined>> = [];
    for (let i = 0; i < staleDocs.length; i++) {
      const doc = staleDocs[i];
      if (!doc) continue;
      rerender({ doc });
      act(() => {
        stalePromises.push(result.current.save());
      });
    }

    rerender({ doc: latestDoc });

    let latestBytes: Uint8Array | undefined;
    await act(async () => {
      latestBytes = await result.current.save();
    });
    expect(latestBytes).toEqual(new Uint8Array([9, 9, 9]));

    for (let i = staleRuns.length - 1; i >= 0; i--) {
      const run = staleRuns[i];
      if (!run) continue;
      await act(async () => {
        if (i % 2 === 0) run.reject(new Error(`stale-${i}`));
        else run.resolve(new Uint8Array([i]));
        await stalePromises[i];
      });
    }

    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it('usePDFiumAction ignores stale completions and stale errors across rapid action swaps', async () => {
    const staleRuns = Array.from({ length: 8 }, () => deferred<string>());
    const staleActions = staleRuns.map((run) => vi.fn(() => run.promise));
    const latestAction = vi.fn(async () => 'latest');

    const { result, rerender } = renderHook(({ action }) => usePDFiumAction(action), {
      initialProps: { action: staleActions[0] as () => Promise<string> },
    });

    const stalePromises: Array<Promise<string | undefined>> = [];
    for (let i = 0; i < staleActions.length; i++) {
      const action = staleActions[i];
      if (!action) continue;
      rerender({ action: action as () => Promise<string> });
      act(() => {
        stalePromises.push(result.current.execute());
      });
    }

    rerender({ action: latestAction as () => Promise<string> });

    let latestValue: string | undefined;
    await act(async () => {
      latestValue = await result.current.execute();
    });
    expect(latestValue).toBe('latest');

    for (let i = staleRuns.length - 1; i >= 0; i--) {
      const run = staleRuns[i];
      if (!run) continue;
      await act(async () => {
        if (i % 2 === 0) run.reject(new Error(`stale-${i}`));
        else run.resolve(`stale-${i}`);
        await stalePromises[i];
      });
    }

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
