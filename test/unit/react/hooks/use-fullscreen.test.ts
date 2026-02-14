import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useFullscreen } from '../../../../src/react/hooks/use-fullscreen.js';

function createMockRef(): RefObject<HTMLDivElement> {
  const el = document.createElement('div');
  el.requestFullscreen = vi.fn(() => Promise.resolve());
  return { current: el };
}

describe('useFullscreen', () => {
  it('isFullscreen starts as false', () => {
    const ref = createMockRef();
    const { result } = renderHook(() => useFullscreen(ref));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('enterFullscreen calls requestFullscreen on element', async () => {
    const ref = createMockRef();
    const { result } = renderHook(() => useFullscreen(ref));

    await act(() => result.current.enterFullscreen());

    expect(ref.current!.requestFullscreen).toHaveBeenCalledOnce();
  });

  it('enterFullscreen falls back to webkitRequestFullscreen when standard API is unavailable', async () => {
    const ref = createMockRef();
    const webkitRequestFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(ref.current!, 'requestFullscreen', { value: undefined, configurable: true });
    Object.defineProperty(ref.current!, 'webkitRequestFullscreen', {
      value: webkitRequestFullscreen,
      configurable: true,
    });
    const { result } = renderHook(() => useFullscreen(ref));

    await act(() => result.current.enterFullscreen());

    expect(webkitRequestFullscreen).toHaveBeenCalledOnce();
  });

  it('exitFullscreen calls document.exitFullscreen', async () => {
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    const ref = createMockRef();
    const { result } = renderHook(() => useFullscreen(ref));

    await act(() => result.current.exitFullscreen());

    expect(document.exitFullscreen).toHaveBeenCalledOnce();
  });

  it('exitFullscreen falls back to webkitExitFullscreen when standard API is unavailable', async () => {
    const originalExitFullscreen = document.exitFullscreen;
    const webkitExitFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'exitFullscreen', { value: undefined, configurable: true });
    Object.defineProperty(document, 'webkitExitFullscreen', { value: webkitExitFullscreen, configurable: true });

    const ref = createMockRef();
    const { result } = renderHook(() => useFullscreen(ref));

    await act(() => result.current.exitFullscreen());

    expect(webkitExitFullscreen).toHaveBeenCalledOnce();

    Object.defineProperty(document, 'exitFullscreen', { value: originalExitFullscreen, configurable: true });
    Object.defineProperty(document, 'webkitExitFullscreen', { value: undefined, configurable: true });
  });

  it('toggleFullscreen alternates between enter and exit', async () => {
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    const ref = createMockRef();
    const { result } = renderHook(() => useFullscreen(ref));

    // Not fullscreen -> should enter
    await act(() => result.current.toggleFullscreen());
    expect(ref.current!.requestFullscreen).toHaveBeenCalledOnce();

    // Simulate becoming fullscreen via event
    Object.defineProperty(document, 'fullscreenElement', { value: ref.current, configurable: true });
    await act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isFullscreen).toBe(true);

    // Now fullscreen -> should exit
    await act(() => result.current.toggleFullscreen());
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
  });

  it('fullscreenchange event updates state', async () => {
    const ref = createMockRef();
    const { result } = renderHook(() => useFullscreen(ref));

    Object.defineProperty(document, 'fullscreenElement', { value: ref.current, configurable: true });
    await act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isFullscreen).toBe(true);

    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    await act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isFullscreen).toBe(false);
  });

  it('cleanup removes listener on unmount', () => {
    const spy = vi.spyOn(document, 'removeEventListener');
    const ref = createMockRef();
    const { unmount } = renderHook(() => useFullscreen(ref));

    unmount();

    const calls = spy.mock.calls.filter(
      ([event]) => event === 'fullscreenchange' || event === 'webkitfullscreenchange',
    );
    expect(calls).toHaveLength(2);
    spy.mockRestore();
  });

  it('tracks fullscreen state per container when multiple hooks are mounted', async () => {
    const refA = createMockRef();
    const refB = createMockRef();
    const first = renderHook(() => useFullscreen(refA));
    const second = renderHook(() => useFullscreen(refB));

    try {
      Object.defineProperty(document, 'fullscreenElement', { value: refA.current, configurable: true });
      await act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      expect(first.result.current.isFullscreen).toBe(true);
      expect(second.result.current.isFullscreen).toBe(false);
    } finally {
      first.unmount();
      second.unmount();
    }
  });

  it('toggleFullscreen enters when another container is fullscreen', async () => {
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    const refA = createMockRef();
    const refB = createMockRef();
    renderHook(() => useFullscreen(refA));
    const second = renderHook(() => useFullscreen(refB));

    Object.defineProperty(document, 'fullscreenElement', { value: refA.current, configurable: true });

    await act(() => second.result.current.toggleFullscreen());

    expect(refB.current!.requestFullscreen).toHaveBeenCalledOnce();
    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it('re-syncs fullscreen state when ref.current retargets without an event', async () => {
    const first = document.createElement('div');
    first.requestFullscreen = vi.fn(() => Promise.resolve());
    const second = document.createElement('div');
    second.requestFullscreen = vi.fn(() => Promise.resolve());
    const ref: RefObject<HTMLDivElement | null> = { current: first };

    const { result, rerender } = renderHook(() => useFullscreen(ref));

    Object.defineProperty(document, 'fullscreenElement', { value: first, configurable: true });
    await act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isFullscreen).toBe(true);

    ref.current = second;
    rerender();

    expect(result.current.isFullscreen).toBe(false);
  });

  it('does not call exitFullscreen when toggled without a mounted container and no fullscreen element', async () => {
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

    const ref: RefObject<HTMLDivElement | null> = { current: null };
    const { result } = renderHook(() => useFullscreen(ref));

    await act(() => result.current.toggleFullscreen());

    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it('propagates requestFullscreen failures from toggleFullscreen', async () => {
    const ref = createMockRef();
    const requestError = new Error('request failed');
    ref.current!.requestFullscreen = vi.fn(() => Promise.reject(requestError));
    const { result } = renderHook(() => useFullscreen(ref));

    await expect(result.current.toggleFullscreen()).rejects.toBe(requestError);
  });

  it('propagates exitFullscreen failures from toggleFullscreen when already fullscreen', async () => {
    const ref = createMockRef();
    const exitError = new Error('exit failed');
    document.exitFullscreen = vi.fn(() => Promise.reject(exitError));
    Object.defineProperty(document, 'fullscreenElement', { value: ref.current, configurable: true });
    const { result } = renderHook(() => useFullscreen(ref));

    await act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    await expect(result.current.toggleFullscreen()).rejects.toBe(exitError);
  });
});
