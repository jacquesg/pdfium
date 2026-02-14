import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { useBookmarkPanelController } from '../../../../src/react/internal/use-bookmark-panel-controller.js';

const nestedBookmarks: Bookmark[] = [
  {
    title: 'Part One',
    pageIndex: 0,
    children: [
      { title: 'Chapter 1', pageIndex: 1, children: [] },
      {
        title: 'Chapter 2',
        pageIndex: 2,
        children: [{ title: 'Section 2.1', pageIndex: 3, children: [] }],
      },
    ],
  },
  { title: 'Part Two', pageIndex: 4, children: [] },
  { title: 'Appendix', pageIndex: 5, children: [] },
];

function keyboardEvent(key: string, target: EventTarget = document.createElement('div')) {
  return {
    key,
    target,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe('useBookmarkPanelController', () => {
  it('initializes filter metadata and root models', () => {
    const { result } = renderHook(() =>
      useBookmarkPanelController({
        bookmarks: nestedBookmarks,
        currentPageIndex: 0,
        onBookmarkSelect: vi.fn(),
      }),
    );

    expect(result.current.filterQuery).toBe('');
    expect(result.current.normalizedFilter).toBe('');
    expect(result.current.totalCount).toBe(6);
    expect(result.current.matchCount).toBe(6);
    expect(result.current.rootNodeModels.map(({ key, path }) => ({ key, path }))).toEqual([
      { key: '0', path: '0' },
      { key: '1', path: '1' },
      { key: '2', path: '2' },
    ]);
  });

  it('applies defaultExpanded to initial expansion state', () => {
    const { result } = renderHook(() =>
      useBookmarkPanelController({
        bookmarks: nestedBookmarks,
        currentPageIndex: 0,
        onBookmarkSelect: vi.fn(),
        defaultExpanded: true,
      }),
    );

    const expanded = result.current.rootNodeModels[0]?.expanded;
    expect(expanded?.has('0')).toBe(true);
  });

  it('updates normalized filter, counts, and filtered root models when query changes', () => {
    const { result } = renderHook(() =>
      useBookmarkPanelController({
        bookmarks: nestedBookmarks,
        currentPageIndex: 0,
        onBookmarkSelect: vi.fn(),
      }),
    );

    act(() => {
      result.current.setFilterQuery('  appendix ');
    });

    expect(result.current.normalizedFilter).toBe('appendix');
    expect(result.current.matchCount).toBe(1);
    expect(result.current.rootNodeModels.map(({ key }) => key)).toEqual(['2']);
  });

  it('wires root model callbacks and keyboard handler to selection and expansion updates', () => {
    const onBookmarkSelect = vi.fn();
    const { result } = renderHook(() =>
      useBookmarkPanelController({
        bookmarks: nestedBookmarks,
        currentPageIndex: 0,
        onBookmarkSelect,
      }),
    );

    act(() => {
      result.current.rootNodeModels[0]?.onToggle('0');
    });
    expect(result.current.rootNodeModels[0]?.expanded.has('0')).toBe(true);

    act(() => {
      result.current.rootNodeModels[0]?.onFocus('0');
    });

    const enter = keyboardEvent('Enter');
    act(() => {
      result.current.handleKeyDown(enter);
    });
    expect(enter.preventDefault).toHaveBeenCalledTimes(1);
    expect(onBookmarkSelect).toHaveBeenCalledWith(0);

    act(() => {
      result.current.rootNodeModels[0]?.onToggle('0');
    });
    expect(result.current.rootNodeModels[0]?.expanded.has('0')).toBe(false);

    const right = keyboardEvent('ArrowRight');
    act(() => {
      result.current.handleKeyDown(right);
    });
    expect(right.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.rootNodeModels[0]?.expanded.has('0')).toBe(true);
  });

  it('resets filter and expansion state when bookmark source changes', () => {
    const alternateBookmarks: Bookmark[] = [
      {
        title: 'New Root',
        pageIndex: 0,
        children: [{ title: 'Child', pageIndex: 1, children: [] }],
      },
      { title: 'Tail', pageIndex: 2, children: [] },
    ];

    const { result, rerender } = renderHook(
      ({ bookmarks }) =>
        useBookmarkPanelController({
          bookmarks,
          currentPageIndex: 0,
          onBookmarkSelect: vi.fn(),
        }),
      { initialProps: { bookmarks: nestedBookmarks } },
    );

    act(() => {
      result.current.setFilterQuery('appendix');
      result.current.rootNodeModels[0]?.onToggle('0');
    });

    expect(result.current.normalizedFilter).toBe('appendix');
    expect(result.current.rootNodeModels[0]?.expanded.has('0')).toBe(true);

    rerender({ bookmarks: alternateBookmarks });

    expect(result.current.filterQuery).toBe('');
    expect(result.current.normalizedFilter).toBe('');
    expect(result.current.rootNodeModels[0]?.expanded.has('0')).toBe(false);
  });
});
