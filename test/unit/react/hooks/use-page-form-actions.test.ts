import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlattenFlags } from '../../../../src/core/types.js';
import { usePageFormActions } from '../../../../src/react/hooks/use-page-form-actions.js';
import { createMockDocument, createMockPage } from '../../../react-setup.js';

const { mockBumpDocumentRevision } = vi.hoisted(() => ({
  mockBumpDocumentRevision: vi.fn(),
}));

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({
    documentRevision: 0,
    bumpDocumentRevision: mockBumpDocumentRevision,
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('usePageFormActions', () => {
  it('returns flatten, undo, canUndo, and getSelectedText', () => {
    const { result } = renderHook(() => usePageFormActions(null, 0));

    expect(typeof result.current.flatten).toBe('function');
    expect(typeof result.current.undo).toBe('function');
    expect(typeof result.current.canUndo).toBe('function');
    expect(typeof result.current.getSelectedText).toBe('function');
  });

  // ── null document guard ──

  it('flatten returns null when document is null', async () => {
    const { result } = renderHook(() => usePageFormActions(null, 0));

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.flatten();
    });

    expect(returnValue).toBeNull();
  });

  it('undo returns false when document is null', async () => {
    const { result } = renderHook(() => usePageFormActions(null, 0));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.undo();
    });

    expect(returnValue!).toBe(false);
  });

  it('canUndo returns false when document is null', async () => {
    const { result } = renderHook(() => usePageFormActions(null, 0));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.canUndo();
    });

    expect(returnValue!).toBe(false);
  });

  it('getSelectedText returns null when document is null', async () => {
    const { result } = renderHook(() => usePageFormActions(null, 0));

    let returnValue: string | null;
    await act(async () => {
      returnValue = await result.current.getSelectedText();
    });

    expect(returnValue!).toBeNull();
  });

  // ── flatten ──

  it('flatten acquires page, calls flatten, bumps revision, then disposes', async () => {
    const mockPage = createMockPage({ flatten: vi.fn().mockResolvedValue('success') });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 2));

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.flatten(FlattenFlags.NormalDisplay);
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(2);
    expect(mockPage.flatten).toHaveBeenCalledWith(FlattenFlags.NormalDisplay);
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(returnValue).toBe('success');
  });

  it('flatten disposes page even when flatten throws', async () => {
    const mockPage = createMockPage({ flatten: vi.fn().mockRejectedValue(new Error('flatten failed')) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 0));

    let caughtError: Error | undefined;
    await act(async () => {
      try {
        await result.current.flatten();
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toBe('flatten failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('flatten preserves success when page disposal rejects after flatten resolves', async () => {
    mockBumpDocumentRevision.mockClear();
    const mockPage = createMockPage({
      flatten: vi.fn().mockResolvedValue('success'),
      dispose: vi.fn().mockRejectedValue(new Error('dispose failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 0));

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.flatten();
    });

    expect(returnValue).toBe('success');
    expect(mockBumpDocumentRevision).toHaveBeenCalledTimes(1);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  // ── undo ──

  it('undo acquires page, calls formUndo, bumps revision, then disposes', async () => {
    const mockPage = createMockPage({ formUndo: vi.fn().mockResolvedValue(true) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 1));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.undo();
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    expect(mockPage.formUndo).toHaveBeenCalledOnce();
    expect(mockBumpDocumentRevision).toHaveBeenCalled();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(returnValue!).toBe(true);
  });

  it('undo does not bump revision when formUndo returns false', async () => {
    mockBumpDocumentRevision.mockClear();
    const mockPage = createMockPage({ formUndo: vi.fn().mockResolvedValue(false) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 1));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.undo();
    });

    expect(returnValue!).toBe(false);
    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  // ── canUndo ──

  it('canUndo acquires page, checks canFormUndo, then disposes', async () => {
    const mockPage = createMockPage({ canFormUndo: vi.fn().mockResolvedValue(true) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 0));

    let returnValue: boolean;
    await act(async () => {
      returnValue = await result.current.canUndo();
    });

    expect(mockPage.canFormUndo).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(returnValue!).toBe(true);
  });

  it('canUndo preserves success when page disposal rejects after canFormUndo resolves', async () => {
    const mockPage = createMockPage({
      canFormUndo: vi.fn().mockResolvedValue(true),
      dispose: vi.fn().mockRejectedValue(new Error('dispose failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 0));

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.canUndo();
    });

    expect(returnValue).toBe(true);
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  // ── getSelectedText ──

  it('getSelectedText acquires page, reads text, then disposes', async () => {
    const mockPage = createMockPage({ getFormSelectedText: vi.fn().mockResolvedValue('selected text') });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 3));

    let returnValue: string | null;
    await act(async () => {
      returnValue = await result.current.getSelectedText();
    });

    expect(mockDoc.getPage).toHaveBeenCalledWith(3);
    expect(mockPage.getFormSelectedText).toHaveBeenCalledOnce();
    expect(mockPage.dispose).toHaveBeenCalledOnce();
    expect(returnValue!).toBe('selected text');
  });

  it('getSelectedText disposes page even when it throws', async () => {
    const mockPage = createMockPage({
      getFormSelectedText: vi.fn().mockRejectedValue(new Error('text read failed')),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result } = renderHook(() => usePageFormActions(mockDoc as never, 0));

    let caughtError: Error | undefined;
    await act(async () => {
      try {
        await result.current.getSelectedText();
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError?.message).toBe('text read failed');
    expect(mockPage.dispose).toHaveBeenCalledOnce();
  });

  it('does not bump revision when a stale flatten resolves after document switch', async () => {
    mockBumpDocumentRevision.mockClear();
    const staleFlatten = deferred<'stale-ok'>();
    const stalePage = createMockPage({ flatten: vi.fn().mockReturnValue(staleFlatten.promise) });
    const staleDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(stalePage) });
    const freshPage = createMockPage({ flatten: vi.fn().mockResolvedValue('fresh-ok') });
    const freshDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(freshPage) });

    const { result, rerender } = renderHook(({ doc }) => usePageFormActions(doc, 0), {
      initialProps: { doc: staleDoc as never },
    });

    let stalePromise!: Promise<unknown>;
    act(() => {
      stalePromise = result.current.flatten();
    });

    rerender({ doc: freshDoc as never });

    await act(async () => {
      staleFlatten.resolve('stale-ok');
      await stalePromise;
    });

    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flatten();
    });
    expect(mockBumpDocumentRevision).toHaveBeenCalledTimes(1);
  });

  it('does not bump revision when a stale undo resolves after document switch', async () => {
    mockBumpDocumentRevision.mockClear();
    const staleUndo = deferred<boolean>();
    const stalePage = createMockPage({ formUndo: vi.fn().mockReturnValue(staleUndo.promise) });
    const staleDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(stalePage) });
    const freshPage = createMockPage({ formUndo: vi.fn().mockResolvedValue(true) });
    const freshDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(freshPage) });

    const { result, rerender } = renderHook(({ doc }) => usePageFormActions(doc, 0), {
      initialProps: { doc: staleDoc as never },
    });

    let stalePromise!: Promise<boolean>;
    act(() => {
      stalePromise = result.current.undo();
    });

    rerender({ doc: freshDoc as never });

    await act(async () => {
      staleUndo.resolve(true);
      await stalePromise;
    });

    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.undo();
    });
    expect(mockBumpDocumentRevision).toHaveBeenCalledTimes(1);
  });

  it('no-ops stale callbacks invoked after unmount', async () => {
    mockBumpDocumentRevision.mockClear();
    const mockPage = createMockPage({
      flatten: vi.fn().mockResolvedValue('success'),
      formUndo: vi.fn().mockResolvedValue(true),
      canFormUndo: vi.fn().mockResolvedValue(true),
      getFormSelectedText: vi.fn().mockResolvedValue('selected'),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });
    const { result, unmount } = renderHook(() => usePageFormActions(mockDoc as never, 0));

    const { flatten, undo, canUndo, getSelectedText } = result.current;
    unmount();

    let flattenResult: unknown;
    let undoResult: boolean | undefined;
    let canUndoResult: boolean | undefined;
    let selectedText: string | null | undefined;
    await act(async () => {
      flattenResult = await flatten();
      undoResult = await undo();
      canUndoResult = await canUndo();
      selectedText = await getSelectedText();
    });

    expect(flattenResult).toBeNull();
    expect(undoResult).toBe(false);
    expect(canUndoResult).toBe(false);
    expect(selectedText).toBeNull();
    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(mockBumpDocumentRevision).not.toHaveBeenCalled();
  });
});
