'use client';

import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import type { Bookmark } from '../../core/types.js';
import type { FilteredBookmarkEntry } from './bookmark-tree.js';
import {
  collectFilteredBookmarkEntries,
  deriveEffectiveExpandedPaths,
  getBookmarkFilterCounts,
} from './bookmark-tree.js';

interface UseBookmarkFilterModelOptions {
  bookmarks: readonly Bookmark[];
  expandedPaths: ReadonlySet<string>;
}

interface UseBookmarkFilterModelResult {
  filterQuery: string;
  setFilterQuery: Dispatch<SetStateAction<string>>;
  normalizedFilter: string;
  effectiveExpanded: ReadonlySet<string>;
  totalCount: number;
  matchCount: number;
  filteredRootEntries: FilteredBookmarkEntry[];
}

function useBookmarkFilterModel({
  bookmarks,
  expandedPaths,
}: UseBookmarkFilterModelOptions): UseBookmarkFilterModelResult {
  const [filterQuery, setFilterQuery] = useState('');
  const normalizedFilter = useMemo(() => filterQuery.trim().toLowerCase(), [filterQuery]);

  const effectiveExpanded = useMemo(
    () => deriveEffectiveExpandedPaths(bookmarks, expandedPaths, normalizedFilter),
    [bookmarks, expandedPaths, normalizedFilter],
  );

  const { totalCount, matchCount } = useMemo(
    () => getBookmarkFilterCounts(bookmarks, normalizedFilter),
    [bookmarks, normalizedFilter],
  );

  const filteredRootEntries = useMemo(
    () => collectFilteredBookmarkEntries(bookmarks, normalizedFilter),
    [bookmarks, normalizedFilter],
  );

  return {
    filterQuery,
    setFilterQuery,
    normalizedFilter,
    effectiveExpanded,
    totalCount,
    matchCount,
    filteredRootEntries,
  };
}

export { useBookmarkFilterModel };
export type { UseBookmarkFilterModelOptions, UseBookmarkFilterModelResult };
