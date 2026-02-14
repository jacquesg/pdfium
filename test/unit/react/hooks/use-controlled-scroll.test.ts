import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControlledScroll } from '../../../../src/react/hooks/use-controlled-scroll.js';

describe('useControlledScroll', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;
  let origScrollTo: typeof HTMLElement.prototype.scrollTo;
  let container: HTMLDivElement;

  beforeEach(() => {
    scrollToSpy = vi.fn();
    origScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollToSpy as typeof HTMLElement.prototype.scrollTo;

    container = document.createElement('div');
    // clientHeight is read-only — stub it via defineProperty
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    HTMLElement.prototype.scrollTo = origScrollTo;
    container.remove();
  });

  const dimensions = [
    { width: 612, height: 792 },
    { width: 612, height: 792 },
    { width: 612, height: 792 },
  ];

  function makeRef(): { current: HTMLDivElement | null } {
    return { current: container };
  }

  it('does not scroll when controlled page matches visible page', () => {
    renderHook(() =>
      useControlledScroll({
        containerRef: makeRef(),
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'continuous',
        currentPageIndex: 1,
        controlledPageIndex: 1,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls when controlled page differs from visible page', () => {
    renderHook(() =>
      useControlledScroll({
        containerRef: makeRef(),
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'continuous',
        currentPageIndex: 0,
        controlledPageIndex: 2,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('scrolls when scrollGeneration bumps even if page matches', () => {
    const ref = makeRef();

    const { rerender } = renderHook(
      ({ controlledPageIndex, scrollGeneration }: { controlledPageIndex: number; scrollGeneration: number }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex: 1,
          controlledPageIndex,
          scrollGeneration,
          onCurrentPageChange: undefined,
        }),
      { initialProps: { controlledPageIndex: 1, scrollGeneration: 0 } },
    );

    // First render: page matches, no scroll
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Bump generation — should force scroll even though page is the same
    rerender({ controlledPageIndex: 1, scrollGeneration: 1 });

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('suppresses scroll when parent mirrors back reported page', () => {
    const onCurrentPageChange = vi.fn();
    const ref = makeRef();

    const { rerender } = renderHook(
      ({ currentPageIndex, controlledPageIndex }: { currentPageIndex: number; controlledPageIndex: number }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      { initialProps: { currentPageIndex: 0, controlledPageIndex: 0 } },
    );

    expect(scrollToSpy).not.toHaveBeenCalled();

    // Simulate user scroll: currentPageIndex changes to 1 (scroll-driven)
    rerender({ currentPageIndex: 1, controlledPageIndex: 0 });
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Parent mirrors back the reported page — should NOT trigger a scroll
    rerender({ currentPageIndex: 1, controlledPageIndex: 1 });
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not suppress a later controlled jump to an older page from uncontrolled history', () => {
    const onCurrentPageChange = vi.fn();
    const ref = makeRef();

    const { rerender } = renderHook(
      ({
        currentPageIndex,
        controlledPageIndex,
      }: {
        currentPageIndex: number;
        controlledPageIndex: number | undefined;
      }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      {
        initialProps: {
          currentPageIndex: 0,
          controlledPageIndex: undefined,
        } as { currentPageIndex: number; controlledPageIndex: number | undefined },
      },
    );

    // Uncontrolled user scroll history
    rerender({ currentPageIndex: 1, controlledPageIndex: undefined });
    rerender({ currentPageIndex: 2, controlledPageIndex: undefined });

    expect(onCurrentPageChange).toHaveBeenCalledWith(1);
    expect(onCurrentPageChange).toHaveBeenCalledWith(2);
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Parent now enters controlled mode and requests an older page (1).
    // This should trigger a real scroll, not be suppressed by stale history.
    rerender({ currentPageIndex: 2, controlledPageIndex: 1 });

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('handles rapid controlled/uncontrolled flips without stale suppression', () => {
    const onCurrentPageChange = vi.fn();
    const ref = makeRef();

    const { rerender } = renderHook(
      ({
        currentPageIndex,
        controlledPageIndex,
      }: {
        currentPageIndex: number;
        controlledPageIndex: number | undefined;
      }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      {
        initialProps: {
          currentPageIndex: 0,
          controlledPageIndex: 0,
        } as { currentPageIndex: number; controlledPageIndex: number | undefined },
      },
    );

    expect(scrollToSpy).not.toHaveBeenCalled();

    rerender({ currentPageIndex: 0, controlledPageIndex: 2 });
    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    rerender({ currentPageIndex: 1, controlledPageIndex: undefined });
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);

    rerender({ currentPageIndex: 1, controlledPageIndex: 2 });
    expect(scrollToSpy).toHaveBeenCalledTimes(2);
  });

  it('uses the latest onCurrentPageChange callback identity', () => {
    const ref = makeRef();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cb3 = vi.fn();

    const { rerender } = renderHook(
      ({
        currentPageIndex,
        onCurrentPageChange,
      }: {
        currentPageIndex: number;
        onCurrentPageChange: (index: number) => void;
      }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex: undefined,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      { initialProps: { currentPageIndex: 0, onCurrentPageChange: cb1 } },
    );

    rerender({ currentPageIndex: 0, onCurrentPageChange: cb2 });
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();

    rerender({ currentPageIndex: 1, onCurrentPageChange: cb3 });
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
    expect(cb3).toHaveBeenCalledWith(1);
  });

  it('cancels in-flight smooth-scroll suppression when controlled mode is released', () => {
    const onCurrentPageChange = vi.fn();
    const ref = makeRef();

    const { rerender } = renderHook(
      ({
        currentPageIndex,
        controlledPageIndex,
      }: {
        currentPageIndex: number;
        controlledPageIndex: number | undefined;
      }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      {
        initialProps: {
          currentPageIndex: 0,
          controlledPageIndex: 2,
        } as { currentPageIndex: number; controlledPageIndex: number | undefined },
      },
    );

    // Initial render starts a smooth controlled scroll.
    expect(scrollToSpy).toHaveBeenCalled();

    // Releasing controlled mode should cancel suppression immediately.
    rerender({ currentPageIndex: 1, controlledPageIndex: undefined });
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);
  });

  it('cancels stale smooth-scroll suppression when container element changes', () => {
    const onCurrentPageChange = vi.fn();
    const ref: { current: HTMLDivElement | null } = { current: container };
    const secondContainer = document.createElement('div');
    Object.defineProperty(secondContainer, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(secondContainer);

    const { rerender } = renderHook(
      ({ currentPageIndex }: { currentPageIndex: number }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex: 2,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      { initialProps: { currentPageIndex: 0 } },
    );

    // Initial controlled scroll starts smooth-scroll suppression.
    expect(scrollToSpy).toHaveBeenCalled();

    // Swap the underlying scroll container (e.g. document/viewer remount).
    ref.current = secondContainer;
    rerender({ currentPageIndex: 1 });

    // Page changes in the new container should no longer be suppressed by stale state.
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);

    secondContainer.remove();
  });

  it('does not let stale reported-page history suppress first controlled jump after container swap', () => {
    const onCurrentPageChange = vi.fn();
    const firstContainer = container;
    const secondContainer = document.createElement('div');
    Object.defineProperty(secondContainer, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(secondContainer);
    const ref: { current: HTMLDivElement | null } = { current: firstContainer };

    const { rerender } = renderHook(
      ({
        currentPageIndex,
        controlledPageIndex,
      }: {
        currentPageIndex: number;
        controlledPageIndex: number | undefined;
      }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      {
        initialProps: {
          currentPageIndex: 0,
          controlledPageIndex: undefined,
        } as { currentPageIndex: number; controlledPageIndex: number | undefined },
      },
    );

    // Build up uncontrolled history in the first container.
    rerender({ currentPageIndex: 1, controlledPageIndex: undefined });
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);

    // Swap container and request a controlled jump to page 1 from current page 0.
    // Stale history from the old container must not suppress this jump.
    ref.current = secondContainer;
    rerender({ currentPageIndex: 0, controlledPageIndex: 1 });

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    secondContainer.remove();
  });

  it('cleans up timer on unmount during smooth scroll', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const ref = makeRef();

    const { unmount } = renderHook(() =>
      useControlledScroll({
        containerRef: ref,
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'continuous',
        currentPageIndex: 0,
        controlledPageIndex: 2,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    // A smooth scroll was triggered — timer and scrollend listener are active
    expect(scrollToSpy).toHaveBeenCalled();

    // Unmount should clean up the timer without errors
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('removes scrollend listener when smooth-scroll fallback timer elapses', () => {
    vi.useFakeTimers();
    const removeListenerSpy = vi.spyOn(container, 'removeEventListener');

    renderHook(() =>
      useControlledScroll({
        containerRef: makeRef(),
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'continuous',
        currentPageIndex: 0,
        controlledPageIndex: 2,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    vi.advanceTimersByTime(701);

    expect(removeListenerSpy).toHaveBeenCalledWith('scrollend', expect.any(Function));

    removeListenerSpy.mockRestore();
    vi.useRealTimers();
  });

  it('does not scroll in single page mode', () => {
    renderHook(() =>
      useControlledScroll({
        containerRef: makeRef(),
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'single',
        currentPageIndex: 0,
        controlledPageIndex: 2,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when containerRef.current is null', () => {
    const nullRef: { current: HTMLDivElement | null } = { current: null };

    renderHook(() =>
      useControlledScroll({
        containerRef: nullRef,
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'continuous',
        currentPageIndex: 0,
        controlledPageIndex: 2,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls horizontally in horizontal scroll mode', () => {
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    const ref = makeRef();

    renderHook(() =>
      useControlledScroll({
        containerRef: ref,
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'horizontal',
        currentPageIndex: 0,
        controlledPageIndex: 2,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number), behavior: 'smooth' }));
    // Should NOT have a `top` property
    const callArg = scrollToSpy.mock.calls[0]?.[0] as ScrollToOptions;
    expect(callArg.top).toBeUndefined();
  });

  it('does not scroll when targetPage is out of bounds', () => {
    const ref = makeRef();

    const { result } = renderHook(() =>
      useControlledScroll({
        containerRef: ref,
        dimensions,
        scale: 1,
        gap: 16,
        scrollMode: 'continuous',
        currentPageIndex: 0,
        controlledPageIndex: 0,
        scrollGeneration: undefined,
        onCurrentPageChange: undefined,
      }),
    );

    // Manually call scrollToPage with out-of-bounds index
    result.current.scrollToPage(99, 'smooth');
    expect(scrollToSpy).not.toHaveBeenCalled();

    result.current.scrollToPage(-1, 'smooth');
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not let stale smooth-scroll fallback timers suppress later uncontrolled updates', () => {
    vi.useFakeTimers();
    const onCurrentPageChange = vi.fn();
    const ref = makeRef();

    const { rerender } = renderHook(
      ({
        currentPageIndex,
        controlledPageIndex,
      }: {
        currentPageIndex: number;
        controlledPageIndex: number | undefined;
      }) =>
        useControlledScroll({
          containerRef: ref,
          dimensions,
          scale: 1,
          gap: 16,
          scrollMode: 'continuous',
          currentPageIndex,
          controlledPageIndex,
          scrollGeneration: undefined,
          onCurrentPageChange,
        }),
      {
        initialProps: {
          currentPageIndex: 0,
          controlledPageIndex: 2,
        } as { currentPageIndex: number; controlledPageIndex: number | undefined },
      },
    );

    // Replace an in-flight smooth scroll with another one.
    rerender({ currentPageIndex: 0, controlledPageIndex: 1 });

    // Expire old/new fallback timers; stale cleanup must not poison next uncontrolled updates.
    act(() => {
      vi.advanceTimersByTime(701);
    });

    rerender({ currentPageIndex: 1, controlledPageIndex: undefined });
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);

    vi.useRealTimers();
  });
});
