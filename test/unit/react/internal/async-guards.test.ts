import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLatestRef, useMountedRef, useRequestCounter } from '../../../../src/react/internal/async-guards.js';

describe('async-guards', () => {
  it('useLatestRef always reflects the latest value', () => {
    const { result, rerender } = renderHook(({ value }) => useLatestRef(value), {
      initialProps: { value: 'first' },
    });

    expect(result.current.current).toBe('first');

    rerender({ value: 'second' });
    expect(result.current.current).toBe('second');
  });

  it('useMountedRef flips to false on unmount', () => {
    let mountedRef!: ReturnType<typeof useMountedRef>;
    const { unmount } = renderHook(() => {
      mountedRef = useMountedRef();
      return mountedRef;
    });

    expect(mountedRef.current).toBe(true);
    unmount();
    expect(mountedRef.current).toBe(false);
  });

  it('useRequestCounter invalidates stale request ids', () => {
    const { result } = renderHook(() => useRequestCounter());

    let firstRequest = 0;
    let secondRequest = 0;
    act(() => {
      firstRequest = result.current.next();
      secondRequest = result.current.next();
    });

    expect(result.current.isCurrent(firstRequest)).toBe(false);
    expect(result.current.isCurrent(secondRequest)).toBe(true);

    act(() => {
      result.current.invalidate();
    });

    expect(result.current.isCurrent(secondRequest)).toBe(false);
    expect(result.current.getCurrent()).toBe(3);
  });

  it('useRequestCounter keeps stable helper identity across rerenders', () => {
    const { result, rerender } = renderHook(({ initialValue }) => useRequestCounter(initialValue), {
      initialProps: { initialValue: 10 },
    });
    const firstApi = result.current;

    let requestId = 0;
    act(() => {
      requestId = result.current.next();
    });
    expect(requestId).toBe(11);

    rerender({ initialValue: 999 });

    expect(result.current).toBe(firstApi);
    expect(result.current.getCurrent()).toBe(11);
    expect(result.current.isCurrent(requestId)).toBe(true);
  });
});
