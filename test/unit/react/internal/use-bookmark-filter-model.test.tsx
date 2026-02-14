import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { useBookmarkFilterModel } from '../../../../src/react/internal/use-bookmark-filter-model.js';

const nestedBookmarks: Bookmark[] = [
  {
    title: 'Part One',
    pageIndex: 0,
    children: [
      { title: 'Chapter 1', pageIndex: 1, children: [] },
      {
        title: 'Chapter 2',
        pageIndex: 3,
        children: [
          { title: 'Section 2.1', pageIndex: 4, children: [] },
          { title: 'Section 2.2', pageIndex: 5, children: [] },
        ],
      },
    ],
  },
  {
    title: 'Part Two',
    pageIndex: 6,
    children: [{ title: 'Chapter 3', pageIndex: 7, children: [] }],
  },
  { title: 'Appendix', pageIndex: 10, children: [] },
];

describe('useBookmarkFilterModel', () => {
  it('initializes with empty filter and unfiltered metadata', () => {
    const expandedPaths = new Set<string>(['1']);
    const { result } = renderHook(() => useBookmarkFilterModel({ bookmarks: nestedBookmarks, expandedPaths }));

    expect(result.current.filterQuery).toBe('');
    expect(result.current.normalizedFilter).toBe('');
    expect(result.current.totalCount).toBe(8);
    expect(result.current.matchCount).toBe(8);
    expect(result.current.filteredRootEntries.map(({ bookmark }) => bookmark.title)).toEqual([
      'Part One',
      'Part Two',
      'Appendix',
    ]);
    expect(result.current.effectiveExpanded).toBe(expandedPaths);
  });

  it('normalizes filter query and updates counts and filtered root entries', () => {
    const expandedPaths = new Set<string>(['1']);
    const { result } = renderHook(() => useBookmarkFilterModel({ bookmarks: nestedBookmarks, expandedPaths }));

    act(() => {
      result.current.setFilterQuery('  ChApTeR ');
    });

    expect(result.current.normalizedFilter).toBe('chapter');
    expect(result.current.totalCount).toBe(8);
    expect(result.current.matchCount).toBe(3);
    expect(
      result.current.filteredRootEntries.map(({ bookmark, originalIndex }) => ({
        title: bookmark.title,
        originalIndex,
      })),
    ).toEqual([
      { title: 'Part One', originalIndex: 0 },
      { title: 'Part Two', originalIndex: 1 },
    ]);
  });

  it('merges manual and auto-expanded paths for active filters', () => {
    const expandedPaths = new Set<string>(['1']);
    const { result } = renderHook(() => useBookmarkFilterModel({ bookmarks: nestedBookmarks, expandedPaths }));

    act(() => {
      result.current.setFilterQuery('section');
    });

    expect(Array.from(result.current.effectiveExpanded).sort()).toEqual(['0', '0-1', '1']);
    expect(result.current.effectiveExpanded).not.toBe(expandedPaths);
  });

  it('recomputes derived metadata when bookmarks input changes', () => {
    const expandedPaths = new Set<string>(['0']);
    const bookmarksWithExtras: Bookmark[] = [
      ...nestedBookmarks,
      { title: 'Chapter Summary', pageIndex: 11, children: [] },
    ];

    const { result, rerender } = renderHook(({ bookmarks }) => useBookmarkFilterModel({ bookmarks, expandedPaths }), {
      initialProps: { bookmarks: nestedBookmarks },
    });

    act(() => {
      result.current.setFilterQuery('chapter');
    });
    expect(result.current.matchCount).toBe(3);

    rerender({ bookmarks: bookmarksWithExtras });

    expect(result.current.totalCount).toBe(9);
    expect(result.current.matchCount).toBe(4);
  });
});
