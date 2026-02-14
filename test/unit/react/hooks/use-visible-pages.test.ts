import { act, renderHook, waitFor } from '@testing-library/react';
import type { RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PageDimension } from '../../../../src/react/hooks/use-page-dimensions.js';
import { useVisiblePages } from '../../../../src/react/hooks/use-visible-pages.js';

function makeContainerRef(
  scrollTop = 0,
  clientHeight = 600,
  scrollLeft = 0,
  clientWidth = 800,
): RefObject<HTMLDivElement | null> {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true });
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, writable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, writable: true });
  return { current: el };
}

const uniformDimensions: PageDimension[] = [
  { width: 612, height: 792 },
  { width: 612, height: 792 },
  { width: 612, height: 792 },
  { width: 612, height: 792 },
  { width: 612, height: 792 },
];

describe('useVisiblePages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns empty results when dimensions are undefined', () => {
    const containerRef = makeContainerRef();
    const { result } = renderHook(() => useVisiblePages(containerRef, undefined, 1));

    expect(result.current.visiblePages).toEqual([]);
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.currentPageIndex).toBe(0);
  });

  it('returns empty results when dimensions are empty', () => {
    const containerRef = makeContainerRef();
    const { result } = renderHook(() => useVisiblePages(containerRef, [], 1));

    expect(result.current.visiblePages).toEqual([]);
    expect(result.current.totalHeight).toBe(0);
  });

  it('calculates total height for single page', () => {
    const containerRef = makeContainerRef();
    const dims: PageDimension[] = [{ width: 612, height: 792 }];
    const { result } = renderHook(() => useVisiblePages(containerRef, dims, 1));

    // Single page: height = 792 * 1 = 792 (no gaps)
    expect(result.current.totalHeight).toBe(792);
  });

  it('calculates total height with gaps between pages', () => {
    const containerRef = makeContainerRef();
    const { result } = renderHook(() => useVisiblePages(containerRef, uniformDimensions, 1, { gap: 10 }));

    // 5 pages * 792 + 4 gaps * 10 = 3960 + 40 = 4000
    expect(result.current.totalHeight).toBe(4000);
  });

  it('scales dimensions correctly', () => {
    const containerRef = makeContainerRef();
    const dims: PageDimension[] = [{ width: 612, height: 792 }];
    const { result } = renderHook(() => useVisiblePages(containerRef, dims, 2));

    // 792 * 2 = 1584
    expect(result.current.totalHeight).toBe(1584);
  });

  it('returns visible pages with offsets at scroll position 0', () => {
    const containerRef = makeContainerRef(0, 1000);
    const { result } = renderHook(() =>
      useVisiblePages(containerRef, uniformDimensions, 1, { gap: 8, bufferPages: 0 }),
    );

    // At scrollTop=0, viewport=1000, pages are 792px each with 8px gaps
    // Page 0: 0-792, Page 1: 800-1592
    // Both overlap viewport [0, 1000]
    expect(result.current.visiblePages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.visiblePages[0]?.pageIndex).toBe(0);
    expect(result.current.visiblePages[0]?.offsetY).toBe(0);
  });

  it('includes buffer pages', () => {
    const containerRef = makeContainerRef(0, 100);
    const dims: PageDimension[] = Array.from({ length: 10 }, () => ({ width: 612, height: 200 }));
    const { result } = renderHook(() => useVisiblePages(containerRef, dims, 1, { gap: 0, bufferPages: 2 }));

    // Viewport 0-100, only page 0 is visible (0-200)
    // With bufferPages=2, should include pages 0, 1, 2
    const pageIndices = result.current.visiblePages.map((p) => p.pageIndex);
    expect(pageIndices).toContain(0);
    // Buffer adds pages after the visible ones
    expect(pageIndices.length).toBeGreaterThan(1);
  });

  it('currentPageIndex defaults to 0 with no scroll', () => {
    const containerRef = makeContainerRef(0, 600);
    const { result } = renderHook(() => useVisiblePages(containerRef, uniformDimensions, 1));

    expect(result.current.currentPageIndex).toBe(0);
  });

  it('uses default gap of 16 and buffer of 1', () => {
    const containerRef = makeContainerRef();
    const dims: PageDimension[] = [
      { width: 612, height: 100 },
      { width: 612, height: 100 },
    ];
    const { result } = renderHook(() => useVisiblePages(containerRef, dims, 1));

    // Default gap=16: total = 100 + 16 + 100 = 216
    expect(result.current.totalHeight).toBe(216);
  });

  it('computes horizontal spread geometry and page X offsets', () => {
    const containerRef = makeContainerRef(0, 600, 0, 140);
    const dimensions: PageDimension[] = [
      { width: 100, height: 200 },
      { width: 120, height: 200 },
      { width: 80, height: 200 },
    ];

    const { result } = renderHook(() =>
      useVisiblePages(containerRef, dimensions, 1, {
        gap: 10,
        bufferPages: 0,
        scrollMode: 'horizontal',
        spreadMode: 'even',
      }),
    );

    expect(result.current.totalHeight).toBe(0);
    expect(result.current.totalWidth).toBe(320);
    expect(result.current.maxContentWidth).toBe(0);
    expect(result.current.visiblePages).toEqual([
      { pageIndex: 0, offsetY: 0, offsetX: 0, rowIndex: 0 },
      { pageIndex: 1, offsetY: 0, offsetX: 110, rowIndex: 0 },
    ]);
  });

  it('rebinds scroll tracking when containerRef.current changes', async () => {
    const firstContainer = makeContainerRef(0, 600).current as HTMLDivElement;
    const secondContainer = makeContainerRef(0, 600).current as HTMLDivElement;
    const containerRef: RefObject<HTMLDivElement | null> = { current: firstContainer };

    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => {
        void tick;
        return useVisiblePages(containerRef, uniformDimensions, 1, { gap: 8, bufferPages: 0 });
      },
      { initialProps: { tick: 0 } },
    );

    expect(result.current.currentPageIndex).toBe(0);

    containerRef.current = secondContainer;
    rerender({ tick: 1 });

    act(() => {
      secondContainer.scrollTop = 1700;
      secondContainer.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(result.current.currentPageIndex).toBeGreaterThan(0);
    });
  });

  it('attaches scroll tracking when container ref is mounted after the initial render pass', async () => {
    const lateContainer = document.createElement('div');
    Object.defineProperty(lateContainer, 'scrollTop', { value: 0, writable: true, configurable: true });
    Object.defineProperty(lateContainer, 'scrollLeft', { value: 0, writable: true, configurable: true });
    Object.defineProperty(lateContainer, 'clientHeight', { value: 600, writable: true, configurable: true });
    Object.defineProperty(lateContainer, 'clientWidth', { value: 800, writable: true, configurable: true });

    const { result } = renderHook(() => {
      const containerRef = useRef<HTMLDivElement | null>(null);
      // Simulates ref assignment happening after render but before downstream
      // layout effects that need the mounted element.
      useLayoutEffect(() => {
        containerRef.current = lateContainer;
      }, []);
      return useVisiblePages(containerRef, uniformDimensions, 1, { gap: 8, bufferPages: 0 });
    });

    expect(result.current.currentPageIndex).toBe(0);

    act(() => {
      lateContainer.scrollTop = 1700;
      lateContainer.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(result.current.currentPageIndex).toBeGreaterThan(0);
    });
  });

  it('ignores scroll events from the previous container after ref switch', async () => {
    const firstContainer = makeContainerRef(0, 600).current as HTMLDivElement;
    const secondContainer = makeContainerRef(0, 600).current as HTMLDivElement;
    const containerRef: RefObject<HTMLDivElement | null> = { current: firstContainer };

    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => {
        void tick;
        return useVisiblePages(containerRef, uniformDimensions, 1, { gap: 8, bufferPages: 0 });
      },
      { initialProps: { tick: 0 } },
    );

    expect(result.current.currentPageIndex).toBe(0);

    containerRef.current = secondContainer;
    rerender({ tick: 1 });

    act(() => {
      firstContainer.scrollTop = 1700;
      firstContainer.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(result.current.currentPageIndex).toBe(0);
    });

    act(() => {
      secondContainer.scrollTop = 1700;
      secondContainer.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(result.current.currentPageIndex).toBeGreaterThan(0);
    });
  });

  it('ignores ResizeObserver callbacks from the previous container after ref switch', async () => {
    const observers: Array<{ callback: ResizeObserverCallback }> = [];

    class MockResizeObserver {
      callback: ResizeObserverCallback;
      observe = vi.fn();
      disconnect = vi.fn();

      constructor(cb: ResizeObserverCallback) {
        this.callback = cb;
        observers.push({ callback: cb });
      }
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    const firstContainer = makeContainerRef(0, 600, 0, 140).current as HTMLDivElement;
    const secondContainer = makeContainerRef(0, 600, 0, 320).current as HTMLDivElement;
    const containerRef: RefObject<HTMLDivElement | null> = { current: firstContainer };
    const horizontalDims: PageDimension[] = [
      { width: 100, height: 200 },
      { width: 100, height: 200 },
      { width: 100, height: 200 },
      { width: 100, height: 200 },
    ];

    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => {
        void tick;
        return useVisiblePages(containerRef, horizontalDims, 1, {
          gap: 10,
          bufferPages: 0,
          scrollMode: 'horizontal',
          spreadMode: 'none',
        });
      },
      { initialProps: { tick: 0 } },
    );

    await waitFor(() => {
      expect(result.current.visiblePages.length).toBe(2);
    });

    containerRef.current = secondContainer;
    rerender({ tick: 1 });

    await waitFor(() => {
      expect(observers.length).toBeGreaterThanOrEqual(2);
      expect(result.current.visiblePages.length).toBe(3);
    });

    act(() => {
      observers[0]?.callback([], {} as ResizeObserver);
    });

    await waitFor(() => {
      expect(result.current.visiblePages.length).toBe(3);
    });
  });
});
