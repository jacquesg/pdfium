'use client';

import type { KeyboardEvent, MutableRefObject } from 'react';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Bookmark } from '../../core/types.js';
import { toggleExpandedPath } from './bookmark-expansion.js';
import type { BookmarkNodeClassNames } from './bookmark-node.js';
import { createRootBookmarkNodeModels, type RootBookmarkNodeModel } from './bookmark-node-model.js';
import { collectAllParentPaths, collectVisiblePaths } from './bookmark-tree.js';
import { useBookmarkFilterModel } from './use-bookmark-filter-model.js';
import { useBookmarkFocus } from './use-bookmark-focus.js';
import { useBookmarkKeyboardHandler } from './use-bookmark-keyboard-handler.js';

interface UseBookmarkPanelControllerOptions {
  bookmarks: readonly Bookmark[];
  currentPageIndex: number;
  onBookmarkSelect: (pageIndex: number) => void;
  defaultExpanded?: boolean | undefined;
  classNames?: BookmarkNodeClassNames | undefined;
}

interface UseBookmarkPanelControllerResult {
  treeRef: MutableRefObject<HTMLDivElement | null>;
  filterQuery: string;
  setFilterQuery: Dispatch<SetStateAction<string>>;
  normalizedFilter: string;
  totalCount: number;
  matchCount: number;
  rootNodeModels: RootBookmarkNodeModel[];
  handleKeyDown: (event: KeyboardEvent) => void;
}

function useBookmarkPanelController({
  bookmarks,
  currentPageIndex,
  onBookmarkSelect,
  defaultExpanded = false,
  classNames,
}: UseBookmarkPanelControllerOptions): UseBookmarkPanelControllerResult {
  const treeRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (defaultExpanded) return collectAllParentPaths(bookmarks);
    return new Set<string>();
  });

  const {
    filterQuery,
    setFilterQuery,
    normalizedFilter,
    effectiveExpanded,
    totalCount,
    matchCount,
    filteredRootEntries,
  } = useBookmarkFilterModel({
    bookmarks,
    expandedPaths: expanded,
  });

  const { focusedPath, handleFocus, focusElement, clearFocus } = useBookmarkFocus({ treeRef });
  const previousBookmarksRef = useRef(bookmarks);

  useEffect(() => {
    if (previousBookmarksRef.current === bookmarks) return;
    previousBookmarksRef.current = bookmarks;

    setExpanded(defaultExpanded ? collectAllParentPaths(bookmarks) : new Set<string>());
    setFilterQuery('');
    clearFocus();
  }, [bookmarks, defaultExpanded, setFilterQuery, clearFocus]);

  const visiblePaths = useMemo(
    () => collectVisiblePaths(bookmarks, effectiveExpanded, normalizedFilter),
    [bookmarks, effectiveExpanded, normalizedFilter],
  );

  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => toggleExpandedPath(prev, path));
  }, []);

  const rootNodeModels = useMemo(
    () =>
      createRootBookmarkNodeModels({
        filteredRootEntries,
        currentPageIndex,
        expandedPaths: effectiveExpanded,
        focusedPath,
        filterQuery: normalizedFilter,
        onToggle: handleToggle,
        onSelect: onBookmarkSelect,
        onFocus: handleFocus,
        classNames,
      }),
    [
      filteredRootEntries,
      currentPageIndex,
      effectiveExpanded,
      focusedPath,
      normalizedFilter,
      handleToggle,
      onBookmarkSelect,
      handleFocus,
      classNames,
    ],
  );

  const handleKeyDown = useBookmarkKeyboardHandler({
    focusedPath,
    visiblePaths,
    bookmarks,
    expandedPaths: effectiveExpanded,
    focusElement,
    onBookmarkSelect,
    setExpanded,
  });

  return {
    treeRef,
    filterQuery,
    setFilterQuery,
    normalizedFilter,
    totalCount,
    matchCount,
    rootNodeModels,
    handleKeyDown,
  };
}

export { useBookmarkPanelController };
export type { UseBookmarkPanelControllerOptions, UseBookmarkPanelControllerResult };
