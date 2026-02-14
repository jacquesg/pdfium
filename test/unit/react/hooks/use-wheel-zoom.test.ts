import { act, renderHook, waitFor } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ZoomAnchor } from '../../../../src/react/hooks/use-visible-pages.js';
import { useWheelZoom } from '../../../../src/react/hooks/use-wheel-zoom.js';

function makeContainer(): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', { value: 120, writable: true, configurable: true });
  Object.defineProperty(el, 'scrollLeft', { value: 45, writable: true, configurable: true });
  el.getBoundingClientRect = () =>
    ({
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('useWheelZoom', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('zooms on Ctrl/Cmd wheel and writes zoom anchor', async () => {
    const container = makeContainer();
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const containerRef: RefObject<HTMLDivElement | null> = { current: container };
    const zoomAnchorRef: RefObject<ZoomAnchor | null> = { current: null };
    const setScale = vi.fn();
    const onManualZoom = vi.fn();

    renderHook(() =>
      useWheelZoom(containerRef, {
        scale: 1,
        setScale,
        zoomAnchorRef,
        onManualZoom,
      }),
    );

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });

    const wheelEntry = addEventListenerSpy.mock.calls.find(([type]) => type === 'wheel');
    const wheelListener = wheelEntry?.[1] as EventListener;
    const preventDefault = vi.fn();

    act(() => {
      wheelListener({
        ctrlKey: true,
        metaKey: false,
        deltaY: -100,
        clientX: 40,
        clientY: 55,
        preventDefault,
      } as unknown as WheelEvent);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onManualZoom).toHaveBeenCalledTimes(1);
    expect(setScale).toHaveBeenCalledWith(1.1);
    expect(zoomAnchorRef.current).toEqual({
      cursorX: 30,
      cursorY: 35,
      scrollTop: 120,
      scrollLeft: 45,
      ratio: 1.1,
    });
  });

  it('ignores wheel without Ctrl/Cmd modifier', async () => {
    const container = makeContainer();
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const containerRef: RefObject<HTMLDivElement | null> = { current: container };
    const setScale = vi.fn();

    renderHook(() =>
      useWheelZoom(containerRef, {
        scale: 1,
        setScale,
      }),
    );

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });

    const wheelEntry = addEventListenerSpy.mock.calls.find(([type]) => type === 'wheel');
    const wheelListener = wheelEntry?.[1] as EventListener;
    const preventDefault = vi.fn();

    act(() => {
      wheelListener({
        ctrlKey: false,
        metaKey: false,
        deltaY: -100,
        clientX: 40,
        clientY: 55,
        preventDefault,
      } as unknown as WheelEvent);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(setScale).not.toHaveBeenCalled();
  });

  it('compounds rapid wheel zoom events using latest requested scale', async () => {
    const container = makeContainer();
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const containerRef: RefObject<HTMLDivElement | null> = { current: container };
    const setScale = vi.fn();

    renderHook(() =>
      useWheelZoom(containerRef, {
        scale: 1,
        setScale,
      }),
    );

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });

    const wheelEntry = addEventListenerSpy.mock.calls.find(([type]) => type === 'wheel');
    const wheelListener = wheelEntry?.[1] as EventListener;

    act(() => {
      wheelListener({
        ctrlKey: true,
        metaKey: false,
        deltaY: -100,
        clientX: 40,
        clientY: 55,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent);
      wheelListener({
        ctrlKey: true,
        metaKey: false,
        deltaY: -100,
        clientX: 40,
        clientY: 55,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent);
    });

    expect(setScale).toHaveBeenNthCalledWith(1, 1.1);
    expect((setScale.mock.calls[1] as [number] | undefined)?.[0]).toBeCloseTo(1.21, 10);
  });

  it('ignores wheel events from a stale container after ref retarget', async () => {
    const first = makeContainer();
    const second = makeContainer();
    const addEventListenerSpy = vi.spyOn(first, 'addEventListener');
    const containerRef: RefObject<HTMLDivElement | null> = { current: first };
    const setScale = vi.fn();

    const { rerender } = renderHook(
      ({ scale }: { scale: number }) =>
        useWheelZoom(containerRef, {
          scale,
          setScale,
        }),
      { initialProps: { scale: 1 } },
    );

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    });

    const wheelEntry = addEventListenerSpy.mock.calls.find(([type]) => type === 'wheel');
    const wheelListener = wheelEntry?.[1] as EventListener;
    const preventDefault = vi.fn();

    containerRef.current = second;
    rerender({ scale: 1 });

    act(() => {
      wheelListener({
        ctrlKey: true,
        metaKey: false,
        deltaY: -100,
        clientX: 40,
        clientY: 55,
        preventDefault,
      } as unknown as WheelEvent);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(setScale).not.toHaveBeenCalled();
  });
});
