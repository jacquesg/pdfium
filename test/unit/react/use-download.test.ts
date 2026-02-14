import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDownload } from '../../../src/react/use-download.js';
import { createMockDocument } from '../../react-setup.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useDownload', () => {
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAnchor = { href: '', download: '', click: vi.fn() };

    // Spy on createElement to intercept anchor creation whilst preserving the real document
    const originalCreateElement = globalThis.document.createElement.bind(globalThis.document);
    vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement;
      return originalCreateElement(tag);
    });

    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useDownload());

    expect(result.current.isDownloading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.download).toBe('function');
  });

  it('creates a Blob, sets href, and triggers a click', async () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDownload());

    await act(async () => {
      await result.current.download(mockDoc as never, 'test.pdf');
    });

    expect(mockDoc.save).toHaveBeenCalledOnce();
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.click).toHaveBeenCalledOnce();
  });

  it('defaults filename to document.pdf', async () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDownload());

    await act(async () => {
      await result.current.download(mockDoc as never);
    });

    expect(mockAnchor.download).toBe('document.pdf');
  });

  it('uses a custom filename when provided', async () => {
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDownload());

    await act(async () => {
      await result.current.download(mockDoc as never, 'custom-report.pdf');
    });

    expect(mockAnchor.download).toBe('custom-report.pdf');
  });

  it('revokes the object URL after timeout', async () => {
    vi.useFakeTimers();
    const mockDoc = createMockDocument();
    const { result } = renderHook(() => useDownload());

    await act(async () => {
      await result.current.download(mockDoc as never);
    });

    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    vi.useRealTimers();
  });

  it('sets error state on failure', async () => {
    const mockDoc = createMockDocument({
      save: vi.fn().mockRejectedValue(new Error('Save failed')),
    });
    const { result } = renderHook(() => useDownload());

    await act(async () => {
      await result.current.download(mockDoc as never);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Save failed');
    expect(result.current.isDownloading).toBe(false);
  });

  it('clears pending revoke timers on unmount', async () => {
    vi.useFakeTimers();
    const mockDoc = createMockDocument();
    const { result, unmount } = renderHook(() => useDownload());

    await act(async () => {
      await result.current.download(mockDoc as never);
    });

    unmount();
    vi.runAllTimers();
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('transitions isDownloading during the operation', async () => {
    let resolveSave: (value: Uint8Array) => void;
    const savePromise = new Promise<Uint8Array>((resolve) => {
      resolveSave = resolve;
    });
    const mockDoc = createMockDocument({ save: vi.fn().mockReturnValue(savePromise) });
    const { result } = renderHook(() => useDownload());

    // Start download — do not await
    let downloadPromise: Promise<void>;
    act(() => {
      downloadPromise = result.current.download(mockDoc as never);
    });

    // isDownloading should be true while save is pending
    expect(result.current.isDownloading).toBe(true);

    // Resolve the save
    await act(async () => {
      resolveSave!(new Uint8Array([37, 80, 68, 70]));
      await downloadPromise!;
    });

    expect(result.current.isDownloading).toBe(false);
  });

  it('keeps isDownloading true until all concurrent downloads finish', async () => {
    const first = deferred<Uint8Array>();
    const second = deferred<Uint8Array>();
    const firstDoc = createMockDocument({ save: vi.fn().mockReturnValue(first.promise) });
    const secondDoc = createMockDocument({ save: vi.fn().mockReturnValue(second.promise) });
    const { result } = renderHook(() => useDownload());

    let firstDownload!: Promise<void>;
    let secondDownload!: Promise<void>;

    act(() => {
      firstDownload = result.current.download(firstDoc as never, 'first.pdf');
      secondDownload = result.current.download(secondDoc as never, 'second.pdf');
    });

    expect(result.current.isDownloading).toBe(true);

    await act(async () => {
      first.resolve(new Uint8Array([1]));
      await firstDownload;
    });

    expect(result.current.isDownloading).toBe(true);

    await act(async () => {
      second.resolve(new Uint8Array([2]));
      await secondDownload;
    });

    expect(result.current.isDownloading).toBe(false);
  });

  it('does not let stale failure overwrite latest successful download state', async () => {
    const stale = deferred<Uint8Array>();
    const staleDoc = createMockDocument({ save: vi.fn().mockReturnValue(stale.promise) });
    const latestDoc = createMockDocument({ save: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])) });
    const { result } = renderHook(() => useDownload());

    let staleDownload!: Promise<void>;
    act(() => {
      staleDownload = result.current.download(staleDoc as never, 'stale.pdf');
    });

    await act(async () => {
      await result.current.download(latestDoc as never, 'latest.pdf');
    });

    expect(result.current.error).toBeNull();

    await act(async () => {
      stale.reject(new Error('stale failure'));
      await staleDownload;
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('does not trigger download side effects when an in-flight save resolves after unmount', async () => {
    const pending = deferred<Uint8Array>();
    const mockDoc = createMockDocument({ save: vi.fn().mockReturnValue(pending.promise) });
    const { result, unmount } = renderHook(() => useDownload());

    let downloadPromise!: Promise<void>;
    act(() => {
      downloadPromise = result.current.download(mockDoc as never, 'late.pdf');
    });

    unmount();

    await act(async () => {
      pending.resolve(new Uint8Array([37, 80, 68, 70]));
      await downloadPromise;
    });

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(mockAnchor.click).not.toHaveBeenCalled();
  });
});
