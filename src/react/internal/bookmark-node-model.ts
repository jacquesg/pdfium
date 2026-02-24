import type { BookmarkNodeClassNames, BookmarkNodeProps } from './bookmark-node.js';
import type { FilteredBookmarkEntry } from './bookmark-tree.js';

interface CreateRootBookmarkNodeModelsInput {
  filteredRootEntries: readonly FilteredBookmarkEntry[];
  currentPageIndex: number;
  expandedPaths: ReadonlySet<string>;
  focusedPath: string | null;
  filterQuery: string;
  onToggle: (path: string) => void;
  onSelect: (pageIndex: number) => void;
  onFocus: (path: string) => void;
  classNames?: BookmarkNodeClassNames | undefined;
}

type RootBookmarkNodeModel = BookmarkNodeProps & {
  key: string;
};

function createRootBookmarkNodeModels({
  filteredRootEntries,
  currentPageIndex,
  expandedPaths,
  focusedPath,
  filterQuery,
  onToggle,
  onSelect,
  onFocus,
  classNames,
}: CreateRootBookmarkNodeModelsInput): RootBookmarkNodeModel[] {
  const siblingCount = filteredRootEntries.length;

  return filteredRootEntries.map(({ bookmark, originalIndex }, pos) => {
    const path = `${originalIndex}`;
    return {
      key: path,
      bookmark,
      path,
      depth: 0,
      siblingCount,
      posInSet: pos,
      currentPageIndex,
      expanded: expandedPaths,
      focusedPath,
      filterQuery,
      onToggle,
      onSelect,
      onFocus,
      classNames,
    };
  });
}

export { createRootBookmarkNodeModels };
export type { CreateRootBookmarkNodeModelsInput, RootBookmarkNodeModel };
