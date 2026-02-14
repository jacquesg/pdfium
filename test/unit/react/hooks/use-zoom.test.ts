import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useZoom } from '../../../../src/react/hooks/use-zoom.js';

describe('useZoom', () => {
  it('uses default values (scale=1, min=0.25, max=5, step=0.25)', () => {
    const { result } = renderHook(() => useZoom());

    expect(result.current.scale).toBe(1);
    expect(result.current.canZoomIn).toBe(true);
    expect(result.current.canZoomOut).toBe(true);
  });

  it('zoomIn increments scale by step', () => {
    const { result } = renderHook(() => useZoom());

    act(() => result.current.zoomIn());

    expect(result.current.scale).toBe(1.25);
  });

  it('zoomOut decrements scale by step', () => {
    const { result } = renderHook(() => useZoom());

    act(() => result.current.zoomOut());

    expect(result.current.scale).toBe(0.75);
  });

  it('canZoomIn is false at maximum scale', () => {
    const { result } = renderHook(() => useZoom({ initialScale: 5 }));

    expect(result.current.canZoomIn).toBe(false);
    expect(result.current.canZoomOut).toBe(true);
  });

  it('canZoomOut is false at minimum scale', () => {
    const { result } = renderHook(() => useZoom({ initialScale: 0.25 }));

    expect(result.current.canZoomOut).toBe(false);
    expect(result.current.canZoomIn).toBe(true);
  });

  it('does not zoom in beyond max', () => {
    const { result } = renderHook(() => useZoom({ initialScale: 4.9 }));

    act(() => result.current.zoomIn());

    expect(result.current.scale).toBe(5);
    expect(result.current.canZoomIn).toBe(false);
  });

  it('does not zoom out below min', () => {
    const { result } = renderHook(() => useZoom({ initialScale: 0.4 }));

    act(() => result.current.zoomOut());

    expect(result.current.scale).toBe(0.25);
    expect(result.current.canZoomOut).toBe(false);
  });

  it('setScale sets a custom value within bounds', () => {
    const { result } = renderHook(() => useZoom());

    act(() => result.current.setScale(2.5));

    expect(result.current.scale).toBe(2.5);
  });

  it('setScale clamps to min when value is below minimum', () => {
    const { result } = renderHook(() => useZoom());

    act(() => result.current.setScale(0.1));

    expect(result.current.scale).toBe(0.25);
  });

  it('setScale clamps to max when value is above maximum', () => {
    const { result } = renderHook(() => useZoom());

    act(() => result.current.setScale(10));

    expect(result.current.scale).toBe(5);
  });

  it('accepts custom min, max, and step options', () => {
    const { result } = renderHook(() => useZoom({ min: 0.5, max: 3, step: 0.5, initialScale: 1 }));

    expect(result.current.scale).toBe(1);

    act(() => result.current.zoomIn());
    expect(result.current.scale).toBe(1.5);

    act(() => result.current.zoomOut());
    act(() => result.current.zoomOut());
    expect(result.current.scale).toBe(0.5);

    // Cannot go below custom min
    act(() => result.current.zoomOut());
    expect(result.current.scale).toBe(0.5);
    expect(result.current.canZoomOut).toBe(false);
  });

  it('uses custom initialScale', () => {
    const { result } = renderHook(() => useZoom({ initialScale: 2 }));

    expect(result.current.scale).toBe(2);
  });

  it('handles multiple zoom operations', () => {
    const { result } = renderHook(() => useZoom({ initialScale: 1, step: 0.5 }));

    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());
    act(() => result.current.zoomIn());

    expect(result.current.scale).toBe(2.5);
  });
});
