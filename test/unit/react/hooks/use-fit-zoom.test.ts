import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFitZoom } from '../../../../src/react/hooks/use-fit-zoom.js';

function makeContainerRef(width: number, height: number): RefObject<HTMLDivElement | null> {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: width, writable: true });
  Object.defineProperty(el, 'clientHeight', { value: height, writable: true });
  return { current: el };
}

describe('useFitZoom', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 1 when container dimensions are 0', () => {
    const ref = makeContainerRef(0, 0);
    const { result } = renderHook(() => useFitZoom(ref, 612, 792));

    expect(result.current.fitScale('page-width')).toBe(1);
    expect(result.current.fitScale('page-height')).toBe(1);
    expect(result.current.fitScale('page-fit')).toBe(1);
  });

  it('returns 1 when page dimensions are 0', () => {
    const ref = makeContainerRef(800, 600);
    const { result } = renderHook(() => useFitZoom(ref, 0, 0));

    expect(result.current.fitScale('page-width')).toBe(1);
  });

  it('returns 1 when ref is null', () => {
    const ref: RefObject<HTMLDivElement | null> = { current: null };
    const { result } = renderHook(() => useFitZoom(ref, 612, 792));

    expect(result.current.fitScale('page-width')).toBe(1);
  });

  it('calculates page-width fit scale', () => {
    // Container: 800x600, available width = 800 - 32 = 768
    // Page: 612x792
    const ref = makeContainerRef(800, 600);
    const { result } = renderHook(() => useFitZoom(ref, 612, 792));

    const scale = result.current.fitScale('page-width');
    expect(scale).toBeCloseTo(768 / 612, 5);
  });

  it('calculates page-height fit scale', () => {
    // Container: 800x600, available height = 600 - 32 = 568
    // Page: 612x792
    const ref = makeContainerRef(800, 600);
    const { result } = renderHook(() => useFitZoom(ref, 612, 792));

    const scale = result.current.fitScale('page-height');
    expect(scale).toBeCloseTo(568 / 792, 5);
  });

  it('calculates page-fit as minimum of width and height scales', () => {
    // Container: 800x600
    // Available: 768x568
    // Page: 612x792
    // Width scale: 768/612 ≈ 1.255
    // Height scale: 568/792 ≈ 0.717
    // Fit: min(1.255, 0.717) ≈ 0.717
    const ref = makeContainerRef(800, 600);
    const { result } = renderHook(() => useFitZoom(ref, 612, 792));

    const widthScale = 768 / 612;
    const heightScale = 568 / 792;
    const expected = Math.min(widthScale, heightScale);

    const scale = result.current.fitScale('page-fit');
    expect(scale).toBeCloseTo(expected, 5);
  });

  it('handles landscape page dimensions', () => {
    // Container: 800x600, available: 768x568
    // Landscape page: 1024x768
    const ref = makeContainerRef(800, 600);
    const { result } = renderHook(() => useFitZoom(ref, 1024, 768));

    const scale = result.current.fitScale('page-width');
    expect(scale).toBeCloseTo(768 / 1024, 5);
  });

  it('resets to scale 1 when the container ref becomes null after mount', () => {
    const ref = makeContainerRef(800, 600);
    const { result, rerender } = renderHook(() => useFitZoom(ref, 612, 792));

    expect(result.current.fitScale('page-width')).toBeCloseTo(768 / 612, 5);

    ref.current = null;
    rerender();

    expect(result.current.fitScale('page-width')).toBe(1);
    expect(result.current.fitScale('page-height')).toBe(1);
    expect(result.current.fitScale('page-fit')).toBe(1);
  });

  it('ignores stale ResizeObserver updates from a previously tracked container', () => {
    const observers: Array<{
      callback: ResizeObserverCallback;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class MockResizeObserver {
      callback: ResizeObserverCallback;
      disconnect: ReturnType<typeof vi.fn>;
      observe = vi.fn();

      constructor(cb: ResizeObserverCallback) {
        this.callback = cb;
        this.disconnect = vi.fn();
        observers.push({ callback: cb, disconnect: this.disconnect });
      }
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    const first = document.createElement('div');
    Object.defineProperty(first, 'clientWidth', { value: 800, writable: true, configurable: true });
    Object.defineProperty(first, 'clientHeight', { value: 600, writable: true, configurable: true });

    const second = document.createElement('div');
    Object.defineProperty(second, 'clientWidth', { value: 1200, writable: true, configurable: true });
    Object.defineProperty(second, 'clientHeight', { value: 900, writable: true, configurable: true });

    const ref: RefObject<HTMLDivElement | null> = { current: first };
    const { result, rerender } = renderHook(() => useFitZoom(ref, 612, 792));

    expect(result.current.fitScale('page-width')).toBeCloseTo(768 / 612, 5);
    expect(observers.length).toBe(1);

    ref.current = second;
    rerender();

    expect(result.current.fitScale('page-width')).toBeCloseTo(1168 / 612, 5);
    expect(observers.length).toBe(2);

    act(() => {
      observers[0]?.callback(
        [
          {
            target: first,
            contentRect: { width: 320, height: 240 } as DOMRectReadOnly,
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      );
    });

    expect(result.current.fitScale('page-width')).toBeCloseTo(1168 / 612, 5);
  });
});
