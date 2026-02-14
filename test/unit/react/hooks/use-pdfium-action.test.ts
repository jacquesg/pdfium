import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFiumError, PDFiumErrorCode } from '../../../../src/core/errors.js';
import { usePDFiumAction } from '../../../../src/react/hooks/use-pdfium-action.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('usePDFiumAction', () => {
  it('runs the action and resolves value on success', async () => {
    const action = vi.fn(async () => 'ok');
    const { result } = renderHook(() => usePDFiumAction(action));

    let value: string | undefined;
    await act(async () => {
      value = await result.current.execute();
    });

    expect(value).toBe('ok');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('allows a new execute immediately after action function changes', async () => {
    const firstCall = deferred<string>();
    const actionA = vi.fn(() => firstCall.promise);
    const actionB = vi.fn(async () => 'fresh');

    const { result, rerender } = renderHook(({ action }) => usePDFiumAction(action), {
      initialProps: { action: actionA as () => Promise<string> },
    });

    let stalePromise!: Promise<string | undefined>;
    act(() => {
      stalePromise = result.current.execute();
    });
    expect(result.current.isLoading).toBe(true);

    rerender({ action: actionB as () => Promise<string> });

    let freshValue: string | undefined;
    await act(async () => {
      freshValue = await result.current.execute();
    });

    expect(freshValue).toBe('fresh');
    expect(actionB).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstCall.resolve('stale');
      await stalePromise;
    });
  });

  it('ignores stale failures from a previous action function after swap', async () => {
    const firstCall = deferred<string>();
    const actionA = vi.fn(() => firstCall.promise);
    const actionB = vi.fn(async () => 'fresh');

    const { result, rerender } = renderHook(({ action }) => usePDFiumAction(action), {
      initialProps: { action: actionA as () => Promise<string> },
    });

    let stalePromise!: Promise<string | undefined>;
    act(() => {
      stalePromise = result.current.execute();
    });
    expect(result.current.isLoading).toBe(true);

    rerender({ action: actionB as () => Promise<string> });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      firstCall.reject(new Error('stale failure'));
      await stalePromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns undefined immediately when execute is called while a request is already in flight', async () => {
    const pending = deferred<string>();
    const action = vi.fn(() => pending.promise);
    const { result } = renderHook(() => usePDFiumAction(action));

    let firstPromise!: Promise<string | undefined>;
    act(() => {
      firstPromise = result.current.execute();
    });

    let secondValue: string | undefined;
    await act(async () => {
      secondValue = await result.current.execute();
    });

    expect(secondValue).toBeUndefined();
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve('done');
      await firstPromise;
    });
  });

  it('reports PDFiumError messages', async () => {
    const action = vi.fn(async () => {
      throw new PDFiumError(PDFiumErrorCode.DOC_PASSWORD_REQUIRED, 'Password required');
    });
    const { result } = renderHook(() => usePDFiumAction(action));

    let value: undefined;
    await act(async () => {
      value = await result.current.execute();
    });

    expect(value).toBeUndefined();
    expect(result.current.error).toBe('Password required');
    expect(result.current.isLoading).toBe(false);
  });

  it('reports stringified non-Error failures and supports reset', async () => {
    const action = vi.fn(async () => {
      throw 'string failure';
    });
    const { result } = renderHook(() => usePDFiumAction(action));

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBe('string failure');

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBeNull();
  });

  it('does not write loading or error state after unmount', async () => {
    const pending = deferred<string>();
    const action = vi.fn(() => pending.promise);
    const { result, unmount } = renderHook(() => usePDFiumAction(action));

    act(() => {
      void result.current.execute();
    });
    unmount();

    await act(async () => {
      pending.reject(new Error('late failure'));
      await pending.promise.catch(() => undefined);
    });

    expect(action).toHaveBeenCalledTimes(1);
  });
});
