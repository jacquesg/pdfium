import type { CSSProperties } from 'react';
import type { Bookmark } from '../../core/types.js';
import { BOOKMARK_PANEL_COPY } from './bookmark-panel-copy.js';
import { BookmarkPanelView, type BookmarkPanelViewClassNames } from './bookmark-panel-view.js';
import { EmptyPanelState } from './empty-panel-state.js';
import { useBookmarkPanelController } from './use-bookmark-panel-controller.js';

type BookmarkPanelClassNames = BookmarkPanelViewClassNames;

interface BookmarkPanelProps {
  bookmarks: readonly Bookmark[];
  currentPageIndex: number;
  onBookmarkSelect: (pageIndex: number) => void;
  defaultExpanded?: boolean | undefined;
  showFilter?: boolean | undefined;
  classNames?: BookmarkPanelClassNames | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function BookmarkPanelRootView({
  bookmarks,
  currentPageIndex,
  onBookmarkSelect,
  defaultExpanded = false,
  showFilter = true,
  classNames,
  className,
  style,
}: BookmarkPanelProps) {
  const {
    treeRef,
    filterQuery,
    setFilterQuery,
    normalizedFilter,
    totalCount,
    matchCount,
    rootNodeModels,
    handleKeyDown,
  } = useBookmarkPanelController({
    bookmarks,
    currentPageIndex,
    onBookmarkSelect,
    defaultExpanded,
    classNames,
  });

  if (bookmarks.length === 0) return <EmptyPanelState message={BOOKMARK_PANEL_COPY.emptyStateMessage} />;

  return (
    <BookmarkPanelView
      classNames={classNames}
      className={className}
      style={style}
      showFilter={showFilter}
      filterQuery={filterQuery}
      onFilterQueryChange={setFilterQuery}
      normalizedFilter={normalizedFilter}
      matchCount={matchCount}
      totalCount={totalCount}
      treeRef={treeRef}
      onTreeKeyDown={handleKeyDown}
      rootNodeModels={rootNodeModels}
    />
  );
}

export { BookmarkPanelRootView };
export type { BookmarkPanelClassNames, BookmarkPanelProps };
