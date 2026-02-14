import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevicePixelRatio } from '../../../../src/react/hooks/use-device-pixel-ratio.js';

describe('useDevicePixelRatio', () => {
  let originalDpr: number;
  let originalMatchMedia: typeof window.matchMedia;
  let mockMql: { addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    originalDpr = window.devicePixelRatio;
    originalMatchMedia = window.matchMedia;
    mockMql = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));
  });

  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: originalDpr, writable: true, configurable: true });
    vi.stubGlobal('matchMedia', originalMatchMedia);
  });

  it('returns current devicePixelRatio', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true, configurable: true });
    const { result } = renderHook(() => useDevicePixelRatio());
    expect(result.current).toBe(2);
  });

  it('defaults to 1 when devicePixelRatio is undefined', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true, configurable: true });
    const { result } = renderHook(() => useDevicePixelRatio());
    expect(result.current).toBe(1);
  });

  it('subscribes to matchMedia change events', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true, configurable: true });
    renderHook(() => useDevicePixelRatio());
    expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('cleans up listener on unmount', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true, configurable: true });
    const { unmount } = renderHook(() => useDevicePixelRatio());
    unmount();
    expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('ignores stale media-query listener callbacks after dpr re-subscribe', () => {
    const firstMql = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const secondMql = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    let callCount = 0;
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? firstMql : secondMql;
      }),
    );

    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true, configurable: true });
    const { result } = renderHook(() => useDevicePixelRatio());

    const firstUpdate = firstMql.addEventListener.mock.calls[0]?.[1] as EventListener;
    expect(firstUpdate).toBeTypeOf('function');

    act(() => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true, configurable: true });
      firstUpdate(new Event('change'));
    });
    expect(result.current).toBe(2);

    const secondUpdate = secondMql.addEventListener.mock.calls[0]?.[1] as EventListener;
    expect(secondUpdate).toBeTypeOf('function');

    act(() => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 3, writable: true, configurable: true });
      firstUpdate(new Event('change'));
    });
    expect(result.current).toBe(2);

    act(() => {
      secondUpdate(new Event('change'));
    });
    expect(result.current).toBe(3);
  });
});
