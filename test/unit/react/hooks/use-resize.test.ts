import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResize } from '../../../../src/react/hooks/use-resize.js';

interface ListenerTarget {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
}

function createPointerTarget(): {
  target: HTMLElement & ListenerTarget;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  listeners: Map<string, EventListenerOrEventListenerObject>;
} {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  const addEventListener = vi.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>(
    (type, listener) => {
      listeners.set(type, listener);
    },
  );
  const removeEventListener = vi.fn<(type: string, listener: EventListenerOrEventListenerObject) => void>();
  const setPointerCapture = vi.fn<(pointerId: number) => void>();
  const releasePointerCapture = vi.fn<(pointerId: number) => void>();

  const target = {
    addEventListener,
    removeEventListener,
    setPointerCapture,
    releasePointerCapture,
  } as unknown as HTMLElement & ListenerTarget;

  return { target, addEventListener, removeEventListener, listeners };
}

describe('useResize', () => {
  it('ignores non-primary pointer down', () => {
    const { target, addEventListener } = createPointerTarget();
    const { result } = renderHook(() => useResize());

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 1,
        pointerId: 1,
        clientX: 100,
        currentTarget: target,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.isResizing).toBe(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('cleans up active pointer listeners when unmounted mid-drag', () => {
    const { target, addEventListener, removeEventListener } = createPointerTarget();
    const { result, unmount } = renderHook(() => useResize());

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        pointerId: 1,
        clientX: 100,
        currentTarget: target,
      } as unknown as React.PointerEvent);
    });

    expect(addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('cleans up resize state when pointercancel fires', () => {
    const { target, addEventListener, removeEventListener, listeners } = createPointerTarget();
    const { result } = renderHook(() => useResize());

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        pointerId: 1,
        clientX: 100,
        currentTarget: target,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.isResizing).toBe(true);
    expect(addEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    const pointerCancelListener = listeners.get('pointercancel');
    expect(pointerCancelListener).toBeDefined();

    act(() => {
      if (typeof pointerCancelListener === 'function') {
        pointerCancelListener(new PointerEvent('pointercancel', { pointerId: 1 }));
      } else {
        pointerCancelListener?.handleEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
      }
    });

    expect(result.current.isResizing).toBe(false);
    expect(removeEventListener).toHaveBeenCalledWith('pointercancel', expect.any(Function));
  });

  it('ignores stale pointermove handlers from a previous resize handle target', () => {
    const first = createPointerTarget();
    const second = createPointerTarget();
    const { result } = renderHook(() => useResize());

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        pointerId: 1,
        clientX: 100,
        currentTarget: first.target,
      } as unknown as React.PointerEvent);
    });

    const stalePointerMove = first.listeners.get('pointermove');
    expect(stalePointerMove).toBeDefined();

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        pointerId: 2,
        clientX: 100,
        currentTarget: second.target,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.width).toBe(280);

    act(() => {
      if (typeof stalePointerMove === 'function') {
        stalePointerMove(new PointerEvent('pointermove', { clientX: 180 }));
      } else {
        stalePointerMove?.handleEvent(new PointerEvent('pointermove', { clientX: 180 }));
      }
    });

    expect(result.current.width).toBe(280);
  });

  it('updates width on pointer move and clamps to min/max via keyboard', () => {
    const { target, listeners } = createPointerTarget();
    const { result } = renderHook(() => useResize({ min: 200, max: 300, initial: 250 }));

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        pointerId: 5,
        clientX: 100,
        currentTarget: target,
      } as unknown as React.PointerEvent);
    });

    const pointerMoveListener = listeners.get('pointermove');
    act(() => {
      if (typeof pointerMoveListener === 'function') {
        pointerMoveListener(new PointerEvent('pointermove', { clientX: 180 }));
      } else {
        pointerMoveListener?.handleEvent(new PointerEvent('pointermove', { clientX: 180 }));
      }
    });
    expect(result.current.width).toBe(300);

    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(290);

    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(300);

    act(() => {
      result.current.handleProps.onKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.width).toBe(300);
  });

  it('handles releasePointerCapture failures without throwing', () => {
    const { target, listeners } = createPointerTarget();
    target.releasePointerCapture = vi.fn(() => {
      throw new Error('capture already released');
    });

    const { result } = renderHook(() => useResize());

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        pointerId: 9,
        clientX: 100,
        currentTarget: target,
      } as unknown as React.PointerEvent);
    });

    const pointerUpListener = listeners.get('pointerup');
    expect(() => {
      act(() => {
        if (typeof pointerUpListener === 'function') {
          pointerUpListener(new PointerEvent('pointerup', { pointerId: 9 }));
        } else {
          pointerUpListener?.handleEvent(new PointerEvent('pointerup', { pointerId: 9 }));
        }
      });
    }).not.toThrow();

    expect(result.current.isResizing).toBe(false);
  });
});
