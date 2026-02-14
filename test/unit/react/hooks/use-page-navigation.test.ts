import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageNavigation } from '../../../../src/react/hooks/use-page-navigation.js';

describe('usePageNavigation', () => {
  it('starts at page index 0', () => {
    const { result } = renderHook(() => usePageNavigation(5));

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);
  });

  it('navigates forward with next()', () => {
    const { result } = renderHook(() => usePageNavigation(5));

    act(() => result.current.next());

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.canPrev).toBe(true);
    expect(result.current.canNext).toBe(true);
  });

  it('navigates backward with prev()', () => {
    const { result } = renderHook(() => usePageNavigation(5));

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.prev());

    expect(result.current.pageIndex).toBe(1);
  });

  it('does not go below 0 with prev()', () => {
    const { result } = renderHook(() => usePageNavigation(5));

    act(() => result.current.prev());

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.canPrev).toBe(false);
  });

  it('does not go above pageCount - 1 with next()', () => {
    const { result } = renderHook(() => usePageNavigation(3));

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());

    expect(result.current.pageIndex).toBe(2);
    expect(result.current.canNext).toBe(false);
  });

  it('canNext is false when on last page', () => {
    const { result } = renderHook(() => usePageNavigation(2));

    act(() => result.current.next());

    expect(result.current.pageIndex).toBe(1);
    expect(result.current.canNext).toBe(false);
    expect(result.current.canPrev).toBe(true);
  });

  it('canPrev is false when on first page', () => {
    const { result } = renderHook(() => usePageNavigation(3));

    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);
  });

  it('setPageIndex navigates to a valid index', () => {
    const { result } = renderHook(() => usePageNavigation(10));

    act(() => result.current.setPageIndex(5));

    expect(result.current.pageIndex).toBe(5);
  });

  it('setPageIndex clamps negative indices to 0', () => {
    const { result } = renderHook(() => usePageNavigation(5));

    act(() => result.current.setPageIndex(-3));

    expect(result.current.pageIndex).toBe(0);
  });

  it('setPageIndex clamps indices above pageCount - 1', () => {
    const { result } = renderHook(() => usePageNavigation(5));

    act(() => result.current.setPageIndex(100));

    expect(result.current.pageIndex).toBe(4);
  });

  it('clamps page index when pageCount decreases', () => {
    const { result, rerender } = renderHook(({ pageCount }) => usePageNavigation(pageCount), {
      initialProps: { pageCount: 10 },
    });

    act(() => result.current.setPageIndex(8));
    expect(result.current.pageIndex).toBe(8);

    rerender({ pageCount: 5 });

    expect(result.current.pageIndex).toBe(4);
  });

  it('preserves page index when pageCount increases', () => {
    const { result, rerender } = renderHook(({ pageCount }) => usePageNavigation(pageCount), {
      initialProps: { pageCount: 5 },
    });

    act(() => result.current.setPageIndex(3));
    expect(result.current.pageIndex).toBe(3);

    rerender({ pageCount: 20 });

    expect(result.current.pageIndex).toBe(3);
  });

  it('handles single-page document', () => {
    const { result } = renderHook(() => usePageNavigation(1));

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(false);

    act(() => result.current.next());
    expect(result.current.pageIndex).toBe(0);

    act(() => result.current.prev());
    expect(result.current.pageIndex).toBe(0);
  });

  it('never goes negative when pageCount is 0', () => {
    const { result } = renderHook(() => usePageNavigation(0));

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(false);

    act(() => result.current.next());
    expect(result.current.pageIndex).toBe(0);

    act(() => result.current.prev());
    expect(result.current.pageIndex).toBe(0);

    act(() => result.current.setPageIndex(10));
    expect(result.current.pageIndex).toBe(0);
  });

  it('clamps to 0 when pageCount drops from positive to 0', () => {
    const { result, rerender } = renderHook(({ pageCount }) => usePageNavigation(pageCount), {
      initialProps: { pageCount: 3 },
    });

    act(() => result.current.setPageIndex(2));
    expect(result.current.pageIndex).toBe(2);

    rerender({ pageCount: 0 });

    expect(result.current.pageIndex).toBe(0);
    expect(result.current.canNext).toBe(false);
  });
});
