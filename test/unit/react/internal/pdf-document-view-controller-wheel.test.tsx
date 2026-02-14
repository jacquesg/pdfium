import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';

const scrollToPage = vi.fn();

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => ({ document: null, documentRevision: 0 }),
}));

vi.mock('../../../../src/react/hooks/use-page-dimensions.js', () => ({
  usePageDimensions: () => ({ data: null, isLoading: false }),
}));

vi.mock('../../../../src/react/hooks/use-visible-pages.js', () => ({
  useVisiblePages: () => ({
    visiblePages: [],
    totalHeight: 0,
    totalWidth: 0,
    maxContentWidth: 0,
    currentPageIndex: 0,
  }),
}));

vi.mock('../../../../src/react/hooks/use-controlled-scroll.js', () => ({
  useControlledScroll: () => ({ scrollToPage }),
}));

vi.mock('../../../../src/react/internal/stores-context.js', () => ({
  usePDFiumStores: () => ({}),
}));

vi.mock('../../../../src/react/prefetch.js', () => ({
  prefetchPageData: vi.fn(),
}));

const { usePDFDocumentViewController } = await import('../../../../src/react/internal/pdf-document-view-controller.js');

function makeContainer(): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollLeft', { value: 0, writable: true, configurable: true });
  return container;
}

describe('usePDFDocumentViewController wheel binding', () => {
  it('rebinds horizontal wheel handler when containerRef.current changes', () => {
    const first = makeContainer();
    const second = makeContainer();
    const containerRef: RefObject<HTMLDivElement | null> = { current: first };

    const { rerender } = renderHook(() =>
      usePDFDocumentViewController({
        scrollMode: 'horizontal',
        scale: 1,
        gap: 16,
        bufferPages: 1,
        search: undefined,
        controlledPageIndex: undefined,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
        containerRef,
        zoomAnchorRef: undefined,
        getRotation: undefined,
        spreadMode: 'none',
      }),
    );

    act(() => {
      first.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }));
    });
    expect(first.scrollLeft).toBe(40);

    containerRef.current = second;
    rerender();

    act(() => {
      second.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, bubbles: true, cancelable: true }));
    });
    expect(second.scrollLeft).toBe(30);
  });

  it('ignores stale wheel callbacks bound to a previous container', () => {
    const first = makeContainer();
    const second = makeContainer();
    const addSpy = vi.spyOn(first, 'addEventListener');
    const containerRef: RefObject<HTMLDivElement | null> = { current: first };

    const { rerender } = renderHook(() =>
      usePDFDocumentViewController({
        scrollMode: 'horizontal',
        scale: 1,
        gap: 16,
        bufferPages: 1,
        search: undefined,
        controlledPageIndex: undefined,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
        containerRef,
        zoomAnchorRef: undefined,
        getRotation: undefined,
        spreadMode: 'none',
      }),
    );

    const wheelListener = addSpy.mock.calls.find(([event]) => event === 'wheel')?.[1] as EventListener;
    expect(wheelListener).toBeTypeOf('function');

    containerRef.current = second;
    rerender();

    const preventDefault = vi.fn();
    act(() => {
      wheelListener({
        ctrlKey: false,
        metaKey: false,
        deltaY: 50,
        preventDefault,
      } as unknown as WheelEvent);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(first.scrollLeft).toBe(0);
    expect(second.scrollLeft).toBe(0);
  });
});
