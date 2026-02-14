import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharAtPosResponse } from '../../../../src/context/protocol.js';
import type { CharacterInfo } from '../../../../src/core/types.js';
import { useCharacterInspector } from '../../../../src/react/hooks/use-character-inspector.js';
import { createMockDocument, createMockPage } from '../../../react-setup.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ documentRevision: 0 }),
}));

function mockCharInfo(
  overrides: Partial<CharacterInfo> & { index: number; unicode: number; char: string },
): CharacterInfo {
  return {
    fontSize: 12,
    fontWeight: 400,
    angle: 0,
    renderMode: 0,
    originX: 0,
    originY: 0,
    isGenerated: false,
    isHyphen: false,
    isUnmapped: false,
    ...overrides,
  } as CharacterInfo;
}

/** Creates a minimal MouseEvent-like object for testing handlers. */
function createMouseEvent(clientX: number, clientY: number): React.MouseEvent<HTMLCanvasElement> {
  return { clientX, clientY } as React.MouseEvent<HTMLCanvasElement>;
}

/** Creates a canvas element with a stubbed getBoundingClientRect. */
function createMockCanvas(): HTMLCanvasElement {
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = 612;
  canvas.height = 792;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 612,
    bottom: 792,
    width: 612,
    height: 792,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  });
  return canvas;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useCharacterInspector', () => {
  const baseDimensions = { width: 612, height: 792, originalWidth: 612, originalHeight: 792 };

  beforeEach(() => {
    // Start fake timers at a non-zero time so the first mouse move isn't throttled.
    // The hook checks `performance.now() - lastDispatchTimeRef.current < 50`
    // and lastDispatchTimeRef starts at 0, so time must be >= 50 for the first dispatch.
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.advanceTimersByTime(100);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with undefined charInfo and charBox', () => {
    const { result } = renderHook(() => useCharacterInspector(null, 0, baseDimensions));

    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
    expect(typeof result.current.onMouseMove).toBe('function');
    expect(typeof result.current.onMouseLeave).toBe('function');
    expect(result.current.overlayRef).toBeDefined();
  });

  it('does nothing on mouse move when document is null', () => {
    const { result } = renderHook(() => useCharacterInspector(null, 0, baseDimensions));

    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
    });

    expect(result.current.charInfo).toBeUndefined();
  });

  it('throttles mouse move events (50ms gap)', async () => {
    const charResult: CharAtPosResponse = {
      index: 0,
      info: mockCharInfo({ index: 0, unicode: 72, char: 'H' }),
      box: { left: 10, right: 20, top: 750, bottom: 740 },
    };
    const mockPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(charResult) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    // First move — should dispatch (time is 100, lastDispatchTime is 0 => gap=100 >= 50)
    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDoc.getPage).toHaveBeenCalledTimes(1);

    // Second move immediately — should be throttled (gap < 50)
    act(() => {
      result.current.onMouseMove(createMouseEvent(200, 200));
    });

    expect(mockDoc.getPage).toHaveBeenCalledTimes(1);

    // After 50ms, another move should be allowed
    vi.advanceTimersByTime(50);

    act(() => {
      result.current.onMouseMove(createMouseEvent(300, 300));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDoc.getPage).toHaveBeenCalledTimes(2);
  });

  it('clears state on mouse leave', async () => {
    const charResult: CharAtPosResponse = {
      index: 5,
      info: mockCharInfo({ index: 5, unicode: 65, char: 'A' }),
      box: { left: 50, right: 60, top: 700, bottom: 690 },
    };
    const mockPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(charResult) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(mockPage) });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    // Trigger a successful mouse move to populate state
    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      // Allow the promise chain to resolve
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.charInfo).toBeDefined();

    // Mouse leave should clear state
    act(() => {
      result.current.onMouseLeave();
    });

    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
  });

  it('cancels stale requests when a newer move arrives', async () => {
    let resolveFirstGetPage: (value: ReturnType<typeof createMockPage>) => void;
    const firstGetPagePromise = new Promise<ReturnType<typeof createMockPage>>((resolve) => {
      resolveFirstGetPage = resolve;
    });

    const secondCharResult: CharAtPosResponse = {
      index: 10,
      info: mockCharInfo({ index: 10, unicode: 66, fontSize: 14, char: 'B' }),
      box: { left: 100, right: 110, top: 600, bottom: 590 },
    };

    const secondPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(secondCharResult) });

    let getPageCallCount = 0;
    const mockDoc = createMockDocument({
      getPage: vi.fn().mockImplementation(() => {
        getPageCallCount++;
        // First getPage call returns a slow promise (stale request)
        if (getPageCallCount === 1) return firstGetPagePromise;
        // Second getPage call resolves immediately
        return Promise.resolve(secondPage);
      }),
    });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    // First move — dispatches request 1 (will be slow)
    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
    });

    // Wait past throttle window
    vi.advanceTimersByTime(60);

    // Second move — dispatches request 2, incrementing pendingRequestRef
    act(() => {
      result.current.onMouseMove(createMouseEvent(300, 300));
    });

    // Let the second request's promise chain resolve fully
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // State should reflect the second (newer) result
    expect(result.current.charInfo?.char).toBe('B');

    // Now resolve the first (stale) getPage — the page.dispose() should be called but state unchanged
    const stalePage = createMockPage({
      getCharAtPos: vi.fn().mockResolvedValue({
        index: 0,
        info: mockCharInfo({ index: 0, unicode: 72, char: 'H' }),
        box: { left: 10, right: 20, top: 750, bottom: 740 },
      }),
    });

    await act(async () => {
      resolveFirstGetPage!(stalePage as never);
      await vi.advanceTimersByTimeAsync(10);
    });

    // State should still be the second result — the stale first was discarded
    expect(result.current.charInfo?.char).toBe('B');
    // The stale page should have been disposed
    expect(stalePage.dispose).toHaveBeenCalled();
  });

  it('invalidates pending hover request on unmount', async () => {
    let resolveGetPage!: (value: ReturnType<typeof createMockPage>) => void;
    const getPagePromise = new Promise<ReturnType<typeof createMockPage>>((resolve) => {
      resolveGetPage = resolve;
    });

    const stalePage = createMockPage({
      getCharAtPos: vi.fn().mockResolvedValue({
        index: 1,
        info: mockCharInfo({ index: 1, unicode: 67, char: 'C' }),
        box: { left: 20, right: 30, top: 730, bottom: 720 },
      }),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockReturnValue(getPagePromise) });

    const canvas = createMockCanvas();
    const { result, unmount } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    act(() => {
      result.current.onMouseMove(createMouseEvent(120, 120));
    });

    unmount();

    await act(async () => {
      resolveGetPage(stalePage as never);
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(stalePage.getCharAtPos).not.toHaveBeenCalled();
    expect(stalePage.dispose).toHaveBeenCalled();
  });

  it('ignores pending hover result when pageIndex changes mid-request', async () => {
    let resolveGetPage!: (value: ReturnType<typeof createMockPage>) => void;
    const getPagePromise = new Promise<ReturnType<typeof createMockPage>>((resolve) => {
      resolveGetPage = resolve;
    });

    const stalePage = createMockPage({
      getCharAtPos: vi.fn().mockResolvedValue({
        index: 4,
        info: mockCharInfo({ index: 4, unicode: 68, char: 'D' }),
        box: { left: 40, right: 50, top: 710, bottom: 700 },
      }),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockReturnValue(getPagePromise) });

    const canvas = createMockCanvas();
    const { result, rerender } = renderHook(
      ({ pageIndex }) => useCharacterInspector(mockDoc as never, pageIndex, baseDimensions),
      {
        initialProps: { pageIndex: 0 },
      },
    );
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    act(() => {
      result.current.onMouseMove(createMouseEvent(140, 140));
    });

    rerender({ pageIndex: 1 });

    await act(async () => {
      resolveGetPage(stalePage as never);
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
    expect(stalePage.dispose).toHaveBeenCalled();
  });

  it('ignores pending click-pin result when document changes mid-request', async () => {
    const firstHoverResult: CharAtPosResponse = {
      index: 2,
      info: mockCharInfo({ index: 2, unicode: 80, char: 'P' }),
      box: { left: 12, right: 20, top: 760, bottom: 748 },
    };

    let resolveStaleGetPage!: (value: ReturnType<typeof createMockPage>) => void;
    const staleGetPagePromise = new Promise<ReturnType<typeof createMockPage>>((resolve) => {
      resolveStaleGetPage = resolve;
    });

    const stalePage = createMockPage({
      getCharAtPos: vi.fn().mockResolvedValue({
        index: 8,
        info: mockCharInfo({ index: 8, unicode: 90, char: 'Z' }),
        box: { left: 60, right: 70, top: 700, bottom: 690 },
      }),
    });

    const staleDoc = createMockDocument({
      getPage: vi
        .fn()
        .mockImplementationOnce(async () =>
          createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(firstHoverResult) }),
        )
        .mockReturnValue(staleGetPagePromise),
    });
    const freshDoc = createMockDocument({
      getPage: vi.fn().mockResolvedValue(createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(null) })),
    });

    const canvas = createMockCanvas();
    const { result, rerender } = renderHook(({ doc }) => useCharacterInspector(doc as never, 0, baseDimensions), {
      initialProps: { doc: staleDoc },
    });
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(120, 120));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.charInfo?.char).toBe('P');

    act(() => {
      result.current.onClick(createMouseEvent(120, 120));
    });
    expect(result.current.isPinned).toBe(true);

    // While pinned, clicking triggers an async lookup that can become stale.
    act(() => {
      result.current.onClick(createMouseEvent(122, 122));
    });

    rerender({ doc: freshDoc });

    await act(async () => {
      resolveStaleGetPage(stalePage as never);
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
    expect(result.current.isPinned).toBe(false);
    expect(stalePage.getCharAtPos).not.toHaveBeenCalled();
    expect(stalePage.dispose).toHaveBeenCalled();
  });

  it('skips hover query when overlay canvas is not attached', () => {
    const mockDoc = createMockDocument({ getPage: vi.fn() });
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));

    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
    });

    expect(mockDoc.getPage).not.toHaveBeenCalled();
    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
  });

  it('warns for non-disposed hover errors and suppresses disposed errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const mockDoc = createMockDocument({
      getPage: vi.fn().mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce(new Error('already disposed')),
    });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Character inspector error:', expect.any(Error));

    vi.advanceTimersByTime(60);
    await act(async () => {
      result.current.onMouseMove(createMouseEvent(120, 120));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('handles synchronous getPage throws from hover queries without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const syncError = new Error('sync getPage failure');
    const mockDoc = createMockDocument({
      getPage: vi.fn(() => {
        throw syncError;
      }),
    });
    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    expect(() => {
      act(() => {
        result.current.onMouseMove(createMouseEvent(100, 100));
      });
    }).not.toThrow();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Character inspector error:', syncError);
    warnSpy.mockRestore();
  });

  it('unpins when pinned click resolves to empty space', async () => {
    const hoverResult: CharAtPosResponse = {
      index: 2,
      info: mockCharInfo({ index: 2, unicode: 65, char: 'A' }),
      box: { left: 20, right: 30, top: 700, bottom: 690 },
    };
    const hoverPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) });
    const clickPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(null) });
    const mockDoc = createMockDocument({
      getPage: vi.fn().mockResolvedValueOnce(hoverPage).mockResolvedValueOnce(clickPage),
    });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(true);

    await act(async () => {
      result.current.onClick(createMouseEvent(120, 120));
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isPinned).toBe(false);
    expect(result.current.charInfo).toBeUndefined();
    expect(result.current.charBox).toBeUndefined();
  });

  it('re-pins to the clicked character when already pinned', async () => {
    const hoverResult: CharAtPosResponse = {
      index: 3,
      info: mockCharInfo({ index: 3, unicode: 66, char: 'B' }),
      box: { left: 30, right: 40, top: 680, bottom: 670 },
    };
    const repinResult: CharAtPosResponse = {
      index: 7,
      info: mockCharInfo({ index: 7, unicode: 67, char: 'C' }),
      box: { left: 40, right: 50, top: 660, bottom: 650 },
    };
    const hoverPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) });
    const repinPage = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(repinResult) });
    const mockDoc = createMockDocument({
      getPage: vi.fn().mockResolvedValueOnce(hoverPage).mockResolvedValueOnce(repinPage),
    });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(true);

    await act(async () => {
      result.current.onClick(createMouseEvent(140, 140));
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isPinned).toBe(true);
    expect(result.current.charInfo?.char).toBe('C');
    expect(result.current.charBox?.left).toBe(40);
  });

  it('does not clear pinned state on mouse leave', async () => {
    const hoverResult: CharAtPosResponse = {
      index: 5,
      info: mockCharInfo({ index: 5, unicode: 88, char: 'X' }),
      box: { left: 15, right: 25, top: 710, bottom: 700 },
    };
    const page = createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(page) });

    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });

    act(() => {
      result.current.onMouseLeave();
    });

    expect(result.current.isPinned).toBe(true);
    expect(result.current.charInfo?.char).toBe('X');
  });

  it('handles synchronous getPage throws from pinned clicks without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hoverResult: CharAtPosResponse = {
      index: 3,
      info: mockCharInfo({ index: 3, unicode: 65, char: 'A' }),
      box: { left: 10, right: 20, top: 30, bottom: 20 },
    };
    const syncError = new Error('sync pinned getPage failure');
    const doc = createMockDocument({
      getPage: vi
        .fn()
        .mockResolvedValueOnce(createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) }))
        .mockImplementationOnce(() => {
          throw syncError;
        }),
    });
    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(doc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(true);

    expect(() => {
      act(() => {
        result.current.onClick(createMouseEvent(120, 120));
      });
    }).not.toThrow();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.isPinned).toBe(true);
    expect(result.current.charInfo?.char).toBe('A');
    expect(result.current.charBox?.left).toBe(10);
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Character inspector error:', syncError);
    warnSpy.mockRestore();
  });

  it('suppresses stale pinned-click rejections after lifecycle invalidation', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hoverResult: CharAtPosResponse = {
      index: 9,
      info: mockCharInfo({ index: 9, unicode: 65, char: 'A' }),
      box: { left: 10, right: 20, top: 30, bottom: 20 },
    };
    const pendingPinned = deferred<CharAtPosResponse | null>();
    const doc = createMockDocument({
      getPage: vi
        .fn()
        .mockResolvedValueOnce(createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) }))
        .mockResolvedValueOnce(createMockPage({ getCharAtPos: vi.fn().mockReturnValue(pendingPinned.promise) })),
    });
    const canvas = createMockCanvas();
    const { result, unmount } = renderHook(() => useCharacterInspector(doc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(true);

    act(() => {
      result.current.onClick(createMouseEvent(120, 120));
    });
    unmount();

    await act(async () => {
      pendingPinned.reject(new Error('stale pinned rejection'));
      await pendingPinned.promise.catch(() => undefined);
    });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('uses unit scale fallback when original dimensions are zero', async () => {
    const getCharAtPos = vi.fn().mockResolvedValue({
      index: 0,
      info: mockCharInfo({ index: 0, unicode: 65, char: 'A' }),
      box: { left: 1, right: 2, top: 3, bottom: 0 },
    });
    const page = createMockPage({ getCharAtPos });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(page) });
    const canvas = createMockCanvas();
    const dimensions = { width: 612, height: 792, originalWidth: 0, originalHeight: 0 };
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, dimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(200, 100));
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(getCharAtPos).toHaveBeenCalled();
  });

  it('handles repeated same-index results and subsequent empty-space clears', async () => {
    const getCharAtPos = vi
      .fn()
      .mockResolvedValueOnce({
        index: 4,
        info: mockCharInfo({ index: 4, unicode: 81, char: 'Q' }),
        box: { left: 9, right: 11, top: 20, bottom: 18 },
      })
      .mockResolvedValueOnce({
        index: 4,
        info: mockCharInfo({ index: 4, unicode: 81, char: 'Q' }),
        box: { left: 9, right: 11, top: 20, bottom: 18 },
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const page = createMockPage({ getCharAtPos });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(page) });
    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.charInfo?.char).toBe('Q');

    vi.advanceTimersByTime(60);
    await act(async () => {
      result.current.onMouseMove(createMouseEvent(110, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.charInfo?.char).toBe('Q');

    vi.advanceTimersByTime(60);
    await act(async () => {
      result.current.onMouseMove(createMouseEvent(120, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.charInfo).toBeUndefined();

    vi.advanceTimersByTime(60);
    await act(async () => {
      result.current.onMouseMove(createMouseEvent(130, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.charInfo).toBeUndefined();
  });

  it('ignores click when no document or when pinned click cannot resolve canvas position', async () => {
    const { result: noDoc } = renderHook(() => useCharacterInspector(null, 0, baseDimensions));
    act(() => {
      noDoc.current.onClick(createMouseEvent(10, 10));
    });
    expect(noDoc.current.isPinned).toBe(false);

    const hoverResult: CharAtPosResponse = {
      index: 1,
      info: mockCharInfo({ index: 1, unicode: 65, char: 'A' }),
      box: { left: 10, right: 20, top: 30, bottom: 20 },
    };
    const doc = createMockDocument({
      getPage: vi.fn().mockResolvedValue(createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) })),
    });
    const { result } = renderHook(() => useCharacterInspector(doc as never, 0, baseDimensions));
    const canvas = createMockCanvas();
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(true);

    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = null;
    await act(async () => {
      result.current.onClick(createMouseEvent(120, 120));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.isPinned).toBe(true);
  });

  it('ignores stale hover rejection and does not clobber newer hover state', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const staleReject = deferred<never>();
    const page = createMockPage({
      getCharAtPos: vi.fn().mockReturnValueOnce(staleReject.promise).mockResolvedValueOnce(null),
    });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(page) });
    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
    });
    vi.advanceTimersByTime(60);
    await act(async () => {
      result.current.onMouseMove(createMouseEvent(130, 130));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.charInfo).toBeUndefined();

    await act(async () => {
      staleReject.reject('stale');
      await staleReject.promise.catch(() => undefined);
    });
    expect(result.current.charInfo).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('[PDFium] Character inspector error:', 'stale');
    warnSpy.mockRestore();
  });

  it('does nothing when clicking without pinned state and no hover selection', () => {
    const mockDoc = createMockDocument({ getPage: vi.fn() });
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(false);
    expect(mockDoc.getPage).not.toHaveBeenCalled();
  });

  it('drops hover results that resolve after mouse leave invalidates pending requests', async () => {
    const pending = deferred<CharAtPosResponse | null>();
    const page = createMockPage({ getCharAtPos: vi.fn().mockReturnValue(pending.promise) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(page) });
    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      result.current.onMouseLeave();
    });

    await act(async () => {
      pending.resolve({
        index: 1,
        info: mockCharInfo({ index: 1, unicode: 65, char: 'A' }),
        box: { left: 10, right: 12, top: 14, bottom: 13 },
      });
      await pending.promise;
    });
    expect(result.current.charInfo).toBeUndefined();
  });

  it('suppresses stale hover rejections after mouse leave and handles non-Error rejections', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const stale = deferred<never>();
    const page = createMockPage({ getCharAtPos: vi.fn().mockReturnValue(stale.promise) });
    const mockDoc = createMockDocument({ getPage: vi.fn().mockResolvedValue(page) });
    const canvas = createMockCanvas();
    const { result } = renderHook(() => useCharacterInspector(mockDoc as never, 0, baseDimensions));
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    act(() => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      result.current.onMouseLeave();
    });

    await act(async () => {
      stale.reject('stale');
      await stale.promise.catch(() => undefined);
    });

    vi.advanceTimersByTime(60);
    const rejectDoc = createMockDocument({ getPage: vi.fn().mockRejectedValue('boom') });
    const { result: second } = renderHook(() => useCharacterInspector(rejectDoc as never, 0, baseDimensions));
    (second.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;
    await act(async () => {
      second.current.onMouseMove(createMouseEvent(120, 120));
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('drops stale pinned-click results after lifecycle invalidation', async () => {
    const hoverResult: CharAtPosResponse = {
      index: 4,
      info: mockCharInfo({ index: 4, unicode: 80, char: 'P' }),
      box: { left: 10, right: 20, top: 30, bottom: 25 },
    };
    const pendingClick = deferred<CharAtPosResponse | null>();
    const mockDoc = createMockDocument({
      getPage: vi
        .fn()
        .mockResolvedValueOnce(createMockPage({ getCharAtPos: vi.fn().mockResolvedValue(hoverResult) }))
        .mockResolvedValueOnce(createMockPage({ getCharAtPos: vi.fn().mockReturnValue(pendingClick.promise) })),
    });
    const canvas = createMockCanvas();
    const { result, rerender } = renderHook(
      ({ pageIndex }) => useCharacterInspector(mockDoc as never, pageIndex, baseDimensions),
      { initialProps: { pageIndex: 0 } },
    );
    (result.current.overlayRef as { current: HTMLCanvasElement | null }).current = canvas;

    await act(async () => {
      result.current.onMouseMove(createMouseEvent(100, 100));
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => {
      result.current.onClick(createMouseEvent(100, 100));
    });
    expect(result.current.isPinned).toBe(true);

    act(() => {
      result.current.onClick(createMouseEvent(110, 110));
    });
    rerender({ pageIndex: 1 });

    await act(async () => {
      pendingClick.resolve({
        index: 9,
        info: mockCharInfo({ index: 9, unicode: 90, char: 'Z' }),
        box: { left: 50, right: 60, top: 70, bottom: 60 },
      });
      await pendingClick.promise;
    });
    expect(result.current.isPinned).toBe(false);
    expect(result.current.charInfo).toBeUndefined();
  });
});
