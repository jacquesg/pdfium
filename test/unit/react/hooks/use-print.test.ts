import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkerPDFiumDocument } from '../../../../src/context/worker-client.js';

// ---------------------------------------------------------------------------
// The hook is imported once. DOM spies are installed fresh per-test.
// ---------------------------------------------------------------------------

const { usePrint } = await import('../../../../src/react/hooks/use-print.js');

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

type MockRenderResult = { data: Uint8ClampedArray; width: number; height: number };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeMockDocument(pageCount: number, renderPage?: ReturnType<typeof vi.fn>): WorkerPDFiumDocument {
  return {
    pageCount,
    renderPage:
      renderPage ??
      vi.fn().mockImplementation(
        async (): Promise<MockRenderResult> => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        }),
      ),
  } as unknown as WorkerPDFiumDocument;
}

// ---------------------------------------------------------------------------
// DOM infrastructure
//
// The hook uses globalThis.document.createElement('canvas') and
// globalThis.document.createElement('iframe'). We intercept both via
// vi.spyOn on the document instance. The crucial detail: we capture the
// original reference BEFORE calling vi.spyOn so the fallthrough path can
// delegate without recursing back through the spy.
//
// @testing-library/react creates a <div> container — we must let 'div'
// through unchanged, or renderHook will throw "Target container is not a
// DOM element".
// ---------------------------------------------------------------------------

type MockIframeWindow = { print: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> };

type MockIframe = {
  style: { cssText: string };
  srcdoc: string;
  contentDocument: { querySelectorAll: ReturnType<typeof vi.fn> } | null;
  contentWindow: MockIframeWindow | null;
  remove: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function makeIframeWindow(): MockIframeWindow {
  return {
    print: vi.fn(),
    addEventListener: vi.fn(),
  };
}

function makeIframe(): MockIframe {
  const iframeWindow = makeIframeWindow();
  const iframeDoc = { querySelectorAll: vi.fn().mockReturnValue([]) };
  return {
    style: { cssText: '' },
    srcdoc: '',
    contentDocument: iframeDoc,
    contentWindow: iframeWindow,
    remove: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'load') {
        // Resolve asynchronously so the hook's await can settle
        Promise.resolve().then(handler);
      }
    }),
    removeEventListener: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Per-test state
// ---------------------------------------------------------------------------

let mockIframe: MockIframe;
let appendChildSpy: ReturnType<typeof vi.spyOn>;
let createObjectUrlSpy: ReturnType<typeof vi.spyOn>;
let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>;
let canvasToBlobSpy: ReturnType<typeof vi.spyOn>;

// Capture the original BEFORE any test spy replaces it.
// This reference is used inside the spy's fallthrough path so we don't recurse.
const realCreateElement = globalThis.document.createElement.bind(globalThis.document);

beforeEach(() => {
  mockIframe = makeIframe();

  // Spy on the instance method. Only intercept 'canvas' and 'iframe'.
  // For all other tags (e.g. 'div' used by @testing-library/react) we delegate
  // to realCreateElement which points to the pre-spy implementation.
  vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') return realCreateElement('canvas');
    if (tag === 'iframe') return mockIframe as unknown as HTMLIFrameElement;
    return realCreateElement(tag);
  });

  // Canvas prototype stubs — toBlob resolves with a real Blob-like object
  canvasToBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
    cb(new Blob(['x'], { type: 'image/png' }));
  });

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);

  appendChildSpy = vi.spyOn(globalThis.document.body, 'appendChild').mockImplementation((node) => node);

  createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helper: drive the hook through a complete print cycle, including afterprint
// ---------------------------------------------------------------------------

async function runFullPrint(doc: WorkerPDFiumDocument, options?: Parameters<typeof usePrint>[1]) {
  const hook = renderHook(() => usePrint(doc, options));

  await act(async () => {
    hook.result.current.print();
    await new Promise<void>((r) => setTimeout(r, 80));
  });

  // Fire afterprint so cleanup() runs inside the hook
  const iframeWindow = mockIframe.contentWindow;
  if (iframeWindow) {
    const calls = (iframeWindow.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [string, () => void][];
    const afterprintEntry = calls.find(([event]) => event === 'afterprint');
    if (afterprintEntry) {
      await act(async () => {
        afterprintEntry[1]();
      });
    }
  }

  return hook;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePrint', () => {
  describe('initial state', () => {
    it('starts with isPrinting false and progress 0', () => {
      const { result } = renderHook(() => usePrint(null));
      expect(result.current.isPrinting).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('exposes print and cancel as functions', () => {
      const { result } = renderHook(() => usePrint(null));
      expect(typeof result.current.print).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });
  });

  describe('null document guard', () => {
    it('print() with null document does not set isPrinting and remains idle', async () => {
      const { result } = renderHook(() => usePrint(null));

      await act(async () => {
        result.current.print();
      });

      expect(result.current.isPrinting).toBe(false);
      expect(result.current.progress).toBe(0);
      // No canvas or iframe should be created
      expect(canvasToBlobSpy).not.toHaveBeenCalled();
    });
  });

  describe('print lifecycle', () => {
    it('sets isPrinting to true immediately when print() is called', () => {
      const doc = makeMockDocument(1);
      const { result } = renderHook(() => usePrint(doc));

      act(() => {
        void result.current.print();
      });

      expect(result.current.isPrinting).toBe(true);
    });

    it('starts with progress 0 when print() is called', () => {
      const doc = makeMockDocument(1);
      const { result } = renderHook(() => usePrint(doc));

      act(() => {
        void result.current.print();
      });

      expect(result.current.progress).toBe(0);
    });

    it('updates progress after each page renders and reaches 1 for all pages', async () => {
      const renderFn = vi.fn().mockImplementation(
        async (): Promise<MockRenderResult> => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        }),
      );

      const doc = makeMockDocument(3, renderFn);
      const { result } = renderHook(() => usePrint(doc, { pageRange: [0, 1, 2] }));

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 80));
      });

      expect(result.current.progress).toBe(1);
      expect(renderFn).toHaveBeenCalledTimes(3);
      expect(renderFn).toHaveBeenNthCalledWith(1, 0, { scale: 2 });
      expect(renderFn).toHaveBeenNthCalledWith(2, 1, { scale: 2 });
      expect(renderFn).toHaveBeenNthCalledWith(3, 2, { scale: 2 });
    });

    it('progress values never decrease as pages are rendered sequentially', async () => {
      const progressHistory: number[] = [];
      const renderFn = vi.fn().mockImplementation(
        async (): Promise<MockRenderResult> => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        }),
      );

      const doc = makeMockDocument(4, renderFn);
      const { result } = renderHook(() => usePrint(doc, { pageRange: [0, 1, 2, 3] }));

      const captureId = setInterval(() => {
        progressHistory.push(result.current.progress);
      }, 5);

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 100));
      });

      clearInterval(captureId);

      expect(result.current.progress).toBe(1);

      for (let i = 1; i < progressHistory.length; i++) {
        expect(progressHistory[i]).toBeGreaterThanOrEqual(progressHistory[i - 1] ?? 0);
      }
    });

    it('creates an iframe and appends it to document.body', async () => {
      const doc = makeMockDocument(1);
      const { result } = renderHook(() => usePrint(doc));

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 80));
      });

      expect(appendChildSpy).toHaveBeenCalledWith(mockIframe);
    });

    it('uses scale option when rendering pages', async () => {
      const renderFn = vi.fn().mockResolvedValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      const doc = makeMockDocument(1, renderFn);
      const { result } = renderHook(() => usePrint(doc, { scale: 3 }));

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 60));
      });

      expect(renderFn).toHaveBeenCalledWith(0, { scale: 3 });
    });

    it('renders only the specified pageRange', async () => {
      const renderFn = vi.fn().mockResolvedValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      const doc = makeMockDocument(5, renderFn);
      const { result } = renderHook(() => usePrint(doc, { pageRange: [1, 3] }));

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 60));
      });

      expect(renderFn).toHaveBeenCalledTimes(2);
      expect(renderFn).toHaveBeenCalledWith(1, { scale: 2 });
      expect(renderFn).toHaveBeenCalledWith(3, { scale: 2 });
    });

    it('ignores invalid pageRange indexes', async () => {
      const renderFn = vi.fn().mockResolvedValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      const doc = makeMockDocument(4, renderFn);
      const { result } = renderHook(() => usePrint(doc, { pageRange: [-1, 2, 4, 1.5] }));

      await act(async () => {
        result.current.print();
        await new Promise<void>((resolve) => setTimeout(resolve, 60));
      });

      expect(renderFn).toHaveBeenCalledTimes(1);
      expect(renderFn).toHaveBeenCalledWith(2, { scale: 2 });
    });

    it('creates one blob URL per rendered page', async () => {
      const doc = makeMockDocument(3);
      const { result } = renderHook(() => usePrint(doc));

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 80));
      });

      expect(createObjectUrlSpy).toHaveBeenCalledTimes(3);
    });

    it('calls iframeWindow.print() to trigger the browser print dialog', async () => {
      const doc = makeMockDocument(1);
      const { result } = renderHook(() => usePrint(doc));

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 80));
      });

      expect((mockIframe.contentWindow as MockIframeWindow).print).toHaveBeenCalledOnce();
    });

    it('does not stall when iframe content is already loaded before load listener attachment', async () => {
      const doc = makeMockDocument(1);
      mockIframe.addEventListener.mockImplementation(() => {
        // Simulate browsers where load event has already fired before listener registration.
      });
      if (mockIframe.contentDocument) {
        (mockIframe.contentDocument as { readyState?: string }).readyState = 'complete';
      }

      const { result } = renderHook(() => usePrint(doc));

      await act(async () => {
        result.current.print();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });

      expect((mockIframe.contentWindow as MockIframeWindow).print).toHaveBeenCalledOnce();
    });

    it('returns isPrinting to false after afterprint fires', async () => {
      const hook = await runFullPrint(makeMockDocument(1));
      expect(hook.result.current.isPrinting).toBe(false);
    });

    it('resets progress to 0 after afterprint fires', async () => {
      const hook = await runFullPrint(makeMockDocument(1));
      expect(hook.result.current.progress).toBe(0);
    });
  });

  describe('cancel()', () => {
    it('cancel() without printing does not throw and state remains idle', () => {
      const { result } = renderHook(() => usePrint(null));

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isPrinting).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('cancel() mid-render sets isPrinting to false and progress to 0', () => {
      const renderFn = vi.fn().mockReturnValue(new Promise<MockRenderResult>(() => {}));
      const doc = makeMockDocument(3, renderFn);
      const { result } = renderHook(() => usePrint(doc));

      act(() => {
        void result.current.print();
      });

      expect(result.current.isPrinting).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isPrinting).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('cancel() revokes all blob URLs already created before cancellation', async () => {
      let resolveSecondPage!: (value: MockRenderResult) => void;

      const renderFn = vi
        .fn()
        .mockResolvedValueOnce({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
        .mockImplementationOnce(
          () =>
            new Promise<MockRenderResult>((resolve) => {
              resolveSecondPage = resolve;
            }),
        );

      const doc = makeMockDocument(2, renderFn);
      const { result } = renderHook(() => usePrint(doc, { pageRange: [0, 1] }));

      act(() => {
        void result.current.print();
      });

      // Allow first page to complete so one blob URL is created
      await act(async () => {
        await new Promise<void>((r) => setTimeout(r, 30));
      });

      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.cancel();
      });

      // Resolve the hanging page — abort signal is already set, so it should be ignored
      resolveSecondPage({ data: new Uint8ClampedArray(4), width: 1, height: 1 });

      await act(async () => {
        await new Promise<void>((r) => setTimeout(r, 20));
      });

      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url');
      // No additional URL should have been created after abort
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    });

    it('cancel() removes the iframe if it was already appended', async () => {
      let resolveRender!: (value: MockRenderResult) => void;
      const renderFn = vi.fn().mockImplementation(
        () =>
          new Promise<MockRenderResult>((resolve) => {
            resolveRender = resolve;
          }),
      );

      const doc = makeMockDocument(1, renderFn);
      const { result } = renderHook(() => usePrint(doc));

      act(() => {
        void result.current.print();
      });

      // Complete the render so the iframe gets created and appended
      await act(async () => {
        resolveRender({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
        await new Promise<void>((r) => setTimeout(r, 40));
      });

      const iframeWasAppended = appendChildSpy.mock.calls.length > 0;

      act(() => {
        result.current.cancel();
      });

      if (iframeWasAppended) {
        expect(mockIframe.remove).toHaveBeenCalled();
      }
    });

    it('cancel() resolves an in-flight print waiting for iframe load', async () => {
      const doc = makeMockDocument(1);
      mockIframe.addEventListener.mockImplementation(() => {
        // Simulate a browser path where iframe load never fires.
      });
      const { result } = renderHook(() => usePrint(doc));

      let settled = false;
      let printPromise!: Promise<void>;

      await act(async () => {
        printPromise = result.current.print() as unknown as Promise<void>;
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        await Promise.race([
          printPromise.then(() => {
            settled = true;
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 25)),
        ]);
      });

      expect(settled).toBe(true);
      expect(result.current.isPrinting).toBe(false);
    });
  });

  describe('double-print guard', () => {
    it('calling print() while already printing is a no-op', async () => {
      const renderFn = vi.fn().mockReturnValue(new Promise<MockRenderResult>(() => {}));
      const doc = makeMockDocument(1, renderFn);
      const { result } = renderHook(() => usePrint(doc));

      // First print — hangs on renderPage
      act(() => {
        void result.current.print();
      });

      expect(result.current.isPrinting).toBe(true);

      // Second print() call while first is still in progress
      await act(async () => {
        await result.current.print();
      });

      // renderPage should only have been called once — second print was ignored
      expect(renderFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('document swap during active print', () => {
    it('cancels active print when document changes, then allows printing the new document', async () => {
      const firstRender = deferred<MockRenderResult>();
      const docA = makeMockDocument(1, vi.fn().mockReturnValue(firstRender.promise));
      const docBRender = vi.fn().mockResolvedValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      const docB = makeMockDocument(1, docBRender);

      const { result, rerender } = renderHook(({ doc }) => usePrint(doc), {
        initialProps: { doc: docA },
      });

      act(() => {
        void result.current.print();
      });
      expect(result.current.isPrinting).toBe(true);

      rerender({ doc: docB });

      await waitFor(() => {
        expect(result.current.isPrinting).toBe(false);
      });
      expect(result.current.progress).toBe(0);

      await act(async () => {
        result.current.print();
        await new Promise<void>((r) => setTimeout(r, 80));
      });

      expect(docBRender).toHaveBeenCalledTimes(1);
      expect(result.current.progress).toBe(1);

      firstRender.resolve({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      await act(async () => {
        await Promise.resolve();
      });
    });

    it('cancels active print when document becomes null', async () => {
      const renderFn = vi.fn().mockReturnValue(new Promise<MockRenderResult>(() => {}));
      const doc = makeMockDocument(1, renderFn);
      const { result, rerender } = renderHook(({ currentDoc }) => usePrint(currentDoc), {
        initialProps: { currentDoc: doc as WorkerPDFiumDocument | null },
      });

      act(() => {
        void result.current.print();
      });
      expect(result.current.isPrinting).toBe(true);

      rerender({ currentDoc: null });

      await waitFor(() => {
        expect(result.current.isPrinting).toBe(false);
      });
      expect(result.current.progress).toBe(0);
    });
  });

  describe('unmount cleanup', () => {
    it('unmounting during active print revokes all blob URLs that were created', async () => {
      let resolveFirstPage!: (value: MockRenderResult) => void;

      const renderFn = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<MockRenderResult>((resolve) => {
              resolveFirstPage = resolve;
            }),
        )
        // Second page hangs forever
        .mockReturnValue(new Promise<MockRenderResult>(() => {}));

      const doc = makeMockDocument(2, renderFn);
      const { result, unmount } = renderHook(() => usePrint(doc, { pageRange: [0, 1] }));

      act(() => {
        void result.current.print();
      });

      // Let first page complete so one blob URL is created
      await act(async () => {
        resolveFirstPage({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
        await new Promise<void>((r) => setTimeout(r, 20));
      });

      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

      // Unmount while second page is still pending
      unmount();

      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('fallback cleanup timer', () => {
    it('cleans up after 60 seconds when afterprint never fires', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });

      const doc = makeMockDocument(1);
      const { result } = renderHook(() => usePrint(doc));

      // Kick off print and flush all microtasks so the async loop (renderPage,
      // canvasToBlob, iframe load) can complete before we advance timers.
      await act(async () => {
        result.current.print();
        // Flush microtasks — the print loop has ~6 async steps for 1 page
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });

      // Advance past the 60_000 ms fallback without firing afterprint
      await act(async () => {
        vi.advanceTimersByTime(60_000);
        for (let i = 0; i < 10; i++) await Promise.resolve();
      });

      expect(revokeObjectUrlSpy).toHaveBeenCalled();
      expect(result.current.isPrinting).toBe(false);
    });

    it('does not let a cancelled print fallback timer cancel a later print', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });

      const secondRender = deferred<MockRenderResult>();
      const renderFn = vi
        .fn()
        .mockResolvedValueOnce({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
        .mockReturnValueOnce(secondRender.promise);
      const doc = makeMockDocument(1, renderFn);
      const { result } = renderHook(() => usePrint(doc));

      // First print reaches iframe/afterprint stage and registers fallback timer.
      await act(async () => {
        result.current.print();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });
      expect(result.current.isPrinting).toBe(true);

      // Cancel first print; its timer should no longer be able to affect future runs.
      act(() => {
        result.current.cancel();
      });
      expect(result.current.isPrinting).toBe(false);

      // Start second print and keep it in-flight (render promise unresolved).
      act(() => {
        void result.current.print();
      });
      expect(result.current.isPrinting).toBe(true);

      // Advance to old timer deadline; stale timer must not cancel the new print.
      await act(async () => {
        vi.advanceTimersByTime(60_000);
        for (let i = 0; i < 10; i++) await Promise.resolve();
      });
      expect(result.current.isPrinting).toBe(true);

      // Cleanup test state
      act(() => {
        result.current.cancel();
      });
      secondRender.resolve({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      await act(async () => {
        await Promise.resolve();
      });
    });

    it('ignores stale afterprint callbacks from cancelled runs', async () => {
      const secondRender = deferred<MockRenderResult>();
      const renderFn = vi
        .fn()
        .mockResolvedValueOnce({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
        .mockReturnValueOnce(secondRender.promise);
      const doc = makeMockDocument(1, renderFn);
      const { result } = renderHook(() => usePrint(doc));

      await act(async () => {
        result.current.print();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });

      const afterprintCalls = (mockIframe.contentWindow?.addEventListener as ReturnType<typeof vi.fn>).mock
        .calls as Array<[string, () => void]>;
      const staleAfterprint = afterprintCalls.find(([event]) => event === 'afterprint')?.[1];
      expect(staleAfterprint).toBeDefined();

      act(() => {
        result.current.cancel();
      });
      expect(result.current.isPrinting).toBe(false);

      act(() => {
        void result.current.print();
      });
      expect(result.current.isPrinting).toBe(true);

      // Old callback should not affect the newer print run.
      act(() => {
        staleAfterprint?.();
      });
      expect(result.current.isPrinting).toBe(true);

      act(() => {
        result.current.cancel();
      });
      secondRender.resolve({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      await act(async () => {
        await Promise.resolve();
      });
    });

    it('does not let repeated cancelled runs leak fallback cleanup into a later run', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });

      const pendingFinalPage = deferred<MockRenderResult>();
      const renderFn = vi
        .fn()
        .mockResolvedValueOnce({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
        .mockResolvedValueOnce({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
        .mockReturnValueOnce(pendingFinalPage.promise);
      const doc = makeMockDocument(1, renderFn);
      const { result } = renderHook(() => usePrint(doc));

      // Run/cancel twice after fallback timers are armed.
      await act(async () => {
        result.current.print();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });
      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        result.current.print();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      });
      act(() => {
        result.current.cancel();
      });

      // Third run remains in-flight (no afterprint yet).
      act(() => {
        void result.current.print();
      });
      expect(result.current.isPrinting).toBe(true);

      // Any stale fallback timer from cancelled runs must not cancel this run.
      await act(async () => {
        vi.advanceTimersByTime(60_000);
        for (let i = 0; i < 10; i++) await Promise.resolve();
      });
      expect(result.current.isPrinting).toBe(true);

      // Cleanup
      act(() => {
        result.current.cancel();
      });
      pendingFinalPage.resolve({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      await act(async () => {
        await Promise.resolve();
      });
    });
  });
});
