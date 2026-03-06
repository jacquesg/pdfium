import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useInkDrawing } from '../../../../../src/react/editor/hooks/use-ink-drawing.js';

describe('useInkDrawing', () => {
  it('starts not drawing with empty points', () => {
    const { result } = renderHook(() => useInkDrawing());

    expect(result.current.isDrawing).toBe(false);
    expect(result.current.points).toEqual([]);
  });

  it('startStroke sets isDrawing and first point', () => {
    const { result } = renderHook(() => useInkDrawing());

    act(() => {
      result.current.startStroke({ x: 10, y: 20 });
    });

    expect(result.current.isDrawing).toBe(true);
    expect(result.current.points).toEqual([{ x: 10, y: 20 }]);
  });

  it('addPoint accumulates points', () => {
    const { result } = renderHook(() => useInkDrawing());

    act(() => {
      result.current.startStroke({ x: 0, y: 0 });
    });

    act(() => {
      result.current.addPoint({ x: 5, y: 5 });
      result.current.addPoint({ x: 10, y: 10 });
    });

    expect(result.current.points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 },
    ]);
  });

  it('finishStroke returns points and resets', () => {
    const { result } = renderHook(() => useInkDrawing());

    act(() => {
      result.current.startStroke({ x: 1, y: 2 });
      result.current.addPoint({ x: 3, y: 4 });
    });

    let returned: readonly { x: number; y: number }[] = [];
    act(() => {
      returned = result.current.finishStroke();
    });

    expect(returned).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(result.current.isDrawing).toBe(false);
    expect(result.current.points).toEqual([]);
  });

  it('cancelStroke resets without returning', () => {
    const { result } = renderHook(() => useInkDrawing());

    act(() => {
      result.current.startStroke({ x: 5, y: 5 });
      result.current.addPoint({ x: 10, y: 10 });
    });

    act(() => {
      result.current.cancelStroke();
    });

    expect(result.current.isDrawing).toBe(false);
    expect(result.current.points).toEqual([]);
  });
});
