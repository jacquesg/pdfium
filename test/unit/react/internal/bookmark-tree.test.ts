import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import {
  collectAllParentPaths,
  collectAutoExpandedPaths,
  collectExpandableSiblingPaths,
  collectFilteredBookmarkEntries,
  collectVisiblePaths,
  countBookmarks,
  countMatches,
  deriveEffectiveExpandedPaths,
  getBookmarkFilterCounts,
  matchesFilter,
  parentPath,
  resolveBookmark,
} from '../../../../src/react/internal/bookmark-tree.js';

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

describe('bookmark-tree utilities', () => {
  it('collects parent paths recursively', () => {
    expect(Array.from(collectAllParentPaths(nestedBookmarks)).sort()).toEqual(['0', '0-1', '1']);
  });

  it('counts all bookmark nodes', () => {
    expect(countBookmarks(nestedBookmarks)).toBe(8);
  });

  it('matches direct and descendant filter queries', () => {
    expect(matchesFilter(nestedBookmarks[0]!, 'part')).toBe(true);
    expect(matchesFilter(nestedBookmarks[0]!, 'section 2.1')).toBe(true);
    expect(matchesFilter(nestedBookmarks[2]!, 'chapter')).toBe(false);
  });

  it('counts title matches recursively', () => {
    expect(countMatches(nestedBookmarks, 'chapter')).toBe(3);
    expect(countMatches(nestedBookmarks, 'section')).toBe(2);
    expect(countMatches(nestedBookmarks, 'missing')).toBe(0);
  });

  it('collects filtered entries while preserving original indices', () => {
    expect(
      collectFilteredBookmarkEntries(nestedBookmarks, 'chapter').map(({ bookmark, originalIndex }) => ({
        title: bookmark.title,
        originalIndex,
      })),
    ).toEqual([
      { title: 'Part One', originalIndex: 0 },
      { title: 'Part Two', originalIndex: 1 },
    ]);

    expect(
      collectFilteredBookmarkEntries(nestedBookmarks, '').map(({ bookmark, originalIndex }) => ({
        title: bookmark.title,
        originalIndex,
      })),
    ).toEqual([
      { title: 'Part One', originalIndex: 0 },
      { title: 'Part Two', originalIndex: 1 },
      { title: 'Appendix', originalIndex: 2 },
    ]);
  });

  it('derives total and matching counts for filtered and unfiltered views', () => {
    expect(getBookmarkFilterCounts(nestedBookmarks, '')).toEqual({ totalCount: 8, matchCount: 8 });
    expect(getBookmarkFilterCounts(nestedBookmarks, 'chapter')).toEqual({ totalCount: 8, matchCount: 3 });
  });

  it('collects visible paths based on expansion and filter', () => {
    const expanded = new Set<string>(['0', '0-1']);
    expect(collectVisiblePaths(nestedBookmarks, expanded, '')).toEqual(['0', '0-0', '0-1', '0-1-0', '0-1-1', '1', '2']);
    expect(collectVisiblePaths(nestedBookmarks, expanded, 'section')).toEqual(['0', '0-1', '0-1-0', '0-1-1']);
  });

  it('collects auto-expanded parent paths for matching filter results', () => {
    expect(Array.from(collectAutoExpandedPaths(nestedBookmarks, 'section')).sort()).toEqual(['0', '0-1']);
    expect(Array.from(collectAutoExpandedPaths(nestedBookmarks, 'chapter')).sort()).toEqual(['0', '0-1', '1']);
  });

  it('returns empty auto-expanded paths when filter query is empty', () => {
    expect(Array.from(collectAutoExpandedPaths(nestedBookmarks, ''))).toEqual([]);
  });

  it('derives effective expanded paths by merging manual and auto-expanded sets', () => {
    const manualExpanded = new Set<string>(['1']);
    expect(Array.from(deriveEffectiveExpandedPaths(nestedBookmarks, manualExpanded, 'section')).sort()).toEqual([
      '0',
      '0-1',
      '1',
    ]);
  });

  it('reuses the same expanded set reference when filter query is empty', () => {
    const manualExpanded = new Set<string>(['1']);
    const effectiveExpanded = deriveEffectiveExpandedPaths(nestedBookmarks, manualExpanded, '');
    expect(effectiveExpanded).toBe(manualExpanded);
  });

  it('resolves parent paths and bookmark paths correctly', () => {
    expect(parentPath('0')).toBeNull();
    expect(parentPath('0-1-2')).toBe('0-1');
    expect(resolveBookmark(nestedBookmarks, '0-1-0')?.title).toBe('Section 2.1');
    expect(resolveBookmark(nestedBookmarks, '9-0')).toBeUndefined();
  });

  it('collects expandable sibling paths for root and nested groups', () => {
    expect(collectExpandableSiblingPaths(nestedBookmarks, null)).toEqual(['0', '1']);
    expect(collectExpandableSiblingPaths(nestedBookmarks, '0')).toEqual(['0-1']);
    expect(collectExpandableSiblingPaths(nestedBookmarks, '0-1')).toEqual([]);
  });
});
