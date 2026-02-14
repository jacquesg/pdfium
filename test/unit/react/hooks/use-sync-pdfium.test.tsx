import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFiumBinaryContext } from '../../../../src/react/context.js';
import { useSyncPDFium } from '../../../../src/react/hooks/use-sync-pdfium.js';

const initMock = vi.fn();

vi.mock('../../../../src/pdfium.js', () => ({
  PDFium: {
    init: (...args: unknown[]) => initMock(...args),
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSyncPDFium', () => {
  beforeEach(() => {
    initMock.mockReset();
  });

  it('does not dispose a shared instance while another consumer is still active', async () => {
    const deferred = createDeferred<{ dispose: ReturnType<typeof vi.fn> }>();
    const instance = { dispose: vi.fn() };
    initMock.mockReturnValueOnce(deferred.promise);
    const sharedBinary = new ArrayBuffer(8);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <PDFiumBinaryContext.Provider value={sharedBinary}>{children}</PDFiumBinaryContext.Provider>
    );

    const first = renderHook(() => useSyncPDFium(), { wrapper });
    const second = renderHook(() => useSyncPDFium(), { wrapper });

    try {
      // Simulate one subscriber unmounting before init resolves.
      first.unmount();

      await act(async () => {
        deferred.resolve(instance);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(second.result.current.instance).toBe(instance);
        expect(second.result.current.isInitialising).toBe(false);
      });

      // The remaining active subscriber must not observe a prematurely disposed instance.
      expect(instance.dispose).not.toHaveBeenCalled();
    } finally {
      second.unmount();
      // Final unmount should release the shared instance exactly once.
      expect(instance.dispose).toHaveBeenCalledTimes(1);
    }
  });

  it('sets isInitialising=true when binary becomes available after mount', async () => {
    const deferred = createDeferred<{ dispose: ReturnType<typeof vi.fn> }>();
    const instance = { dispose: vi.fn() };
    initMock.mockReturnValueOnce(deferred.promise);

    let latestIsInitialising = false;
    let latestInstance: { dispose: ReturnType<typeof vi.fn> } | null = null;
    function Probe() {
      const state = useSyncPDFium();
      latestIsInitialising = state.isInitialising;
      latestInstance = state.instance as { dispose: ReturnType<typeof vi.fn> } | null;
      return null;
    }

    const { rerender, unmount } = render(
      <PDFiumBinaryContext.Provider value={null}>
        <Probe />
      </PDFiumBinaryContext.Provider>,
    );
    try {
      expect(latestIsInitialising).toBe(false);

      rerender(
        <PDFiumBinaryContext.Provider value={new ArrayBuffer(16)}>
          <Probe />
        </PDFiumBinaryContext.Provider>,
      );

      await waitFor(() => {
        expect(initMock).toHaveBeenCalledTimes(1);
        expect(latestIsInitialising).toBe(true);
      });

      await act(async () => {
        deferred.resolve(instance);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(latestInstance).toBe(instance);
        expect(latestIsInitialising).toBe(false);
      });
    } finally {
      unmount();
    }
  });

  it('restarts initialisation when binary changes while a previous init is still pending', async () => {
    const first = createDeferred<{ dispose: ReturnType<typeof vi.fn> }>();
    const second = createDeferred<{ dispose: ReturnType<typeof vi.fn> }>();
    const staleInstance = { dispose: vi.fn() };
    const freshInstance = { dispose: vi.fn() };
    initMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    let latestInstance: { dispose: ReturnType<typeof vi.fn> } | null = null;
    function Probe() {
      const state = useSyncPDFium();
      latestInstance = state.instance as { dispose: ReturnType<typeof vi.fn> } | null;
      return null;
    }

    const binaryA = new ArrayBuffer(4);
    const binaryB = new ArrayBuffer(8);
    const { rerender, unmount } = render(
      <PDFiumBinaryContext.Provider value={binaryA}>
        <Probe />
      </PDFiumBinaryContext.Provider>,
    );

    try {
      await waitFor(() => {
        expect(initMock).toHaveBeenCalledTimes(1);
      });

      // Switch to a different binary before the first initialisation resolves.
      rerender(
        <PDFiumBinaryContext.Provider value={binaryB}>
          <Probe />
        </PDFiumBinaryContext.Provider>,
      );

      await waitFor(() => {
        expect(initMock).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        second.resolve(freshInstance);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(latestInstance).toBe(freshInstance);
      });

      await act(async () => {
        first.resolve(staleInstance);
        await Promise.resolve();
      });

      // Stale initialisation result should be disposed and never adopted.
      expect(staleInstance.dispose).toHaveBeenCalledTimes(1);
      expect(latestInstance).toBe(freshInstance);
    } finally {
      unmount();
    }
  });

  it('does not throw during unmount when dispose throws', async () => {
    const disposeError = new Error('dispose failed');
    const instance = {
      dispose: vi.fn(() => {
        throw disposeError;
      }),
    };
    initMock.mockResolvedValueOnce(instance);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const binary = new ArrayBuffer(8);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PDFiumBinaryContext.Provider value={binary}>{children}</PDFiumBinaryContext.Provider>
    );

    const hook = renderHook(() => useSyncPDFium(), { wrapper });

    await waitFor(() => {
      expect(hook.result.current.instance).toBe(instance);
      expect(hook.result.current.isInitialising).toBe(false);
    });

    expect(() => hook.unmount()).not.toThrow();
    expect(instance.dispose).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Failed to dispose sync PDFium instance:', disposeError);
    warnSpy.mockRestore();
  });

  it('clears stale error when binary becomes null', async () => {
    const initError = new Error('init failed');
    initMock.mockRejectedValueOnce(initError);

    let latestError: Error | null = null;
    function Probe() {
      const state = useSyncPDFium();
      latestError = state.error;
      return null;
    }

    const binary = new ArrayBuffer(8);
    const { rerender } = render(
      <PDFiumBinaryContext.Provider value={binary}>
        <Probe />
      </PDFiumBinaryContext.Provider>,
    );

    await waitFor(() => {
      expect(latestError).toBe(initError);
    });

    rerender(
      <PDFiumBinaryContext.Provider value={null}>
        <Probe />
      </PDFiumBinaryContext.Provider>,
    );

    await waitFor(() => {
      expect(latestError).toBeNull();
    });
  });

  it('does not throw during unmount when dispose rejects asynchronously', async () => {
    const disposeError = new Error('async dispose failed');
    const instance = {
      dispose: vi.fn().mockRejectedValue(disposeError),
    };
    initMock.mockResolvedValueOnce(instance);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const binary = new ArrayBuffer(8);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PDFiumBinaryContext.Provider value={binary}>{children}</PDFiumBinaryContext.Provider>
    );

    const hook = renderHook(() => useSyncPDFium(), { wrapper });

    await waitFor(() => {
      expect(hook.result.current.instance).toBe(instance);
      expect(hook.result.current.isInitialising).toBe(false);
    });

    expect(() => hook.unmount()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(instance.dispose).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Failed to dispose sync PDFium instance:', disposeError);
    warnSpy.mockRestore();
  });
});
