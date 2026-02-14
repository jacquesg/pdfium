'use client';

import { ChevronRight } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import type { Bookmark } from '../../core/types.js';
import {
  BOOKMARK_NODE_LEAF_PLACEHOLDER_STYLE,
  BOOKMARK_NODE_PAGE_BADGE_STYLE,
  BOOKMARK_NODE_TITLE_STYLE,
  getBookmarkNodeItemStyle,
  getBookmarkNodeToggleStyle,
} from './bookmark-node-styles.js';
import { collectFilteredBookmarkEntries } from './bookmark-tree.js';

interface BookmarkNodeClassNames {
  item?: string | undefined;
  active?: string | undefined;
  toggle?: string | undefined;
  title?: string | undefined;
}

interface BookmarkNodeProps {
  bookmark: Bookmark;
  path: string;
  depth: number;
  siblingCount: number;
  posInSet: number;
  currentPageIndex: number;
  expanded: ReadonlySet<string>;
  focusedPath: string | null;
  filterQuery: string;
  onToggle: (path: string) => void;
  onSelect: (pageIndex: number) => void;
  onFocus: (path: string) => void;
  classNames?: BookmarkNodeClassNames | undefined;
}

const BookmarkNode = memo(function BookmarkNode({
  bookmark,
  path,
  depth,
  siblingCount,
  posInSet,
  currentPageIndex,
  expanded,
  focusedPath,
  filterQuery,
  onToggle,
  onSelect,
  onFocus,
  classNames,
}: BookmarkNodeProps) {
  const hasChildren = bookmark.children.length > 0;
  const isExpanded = expanded.has(path);
  const isActive = bookmark.pageIndex !== undefined && bookmark.pageIndex === currentPageIndex;
  const isFocused = path === focusedPath;

  const handleActivate = useCallback(() => {
    onFocus(path);
    if (bookmark.pageIndex !== undefined) {
      onSelect(bookmark.pageIndex);
    }
    if (hasChildren) {
      onToggle(path);
    }
  }, [path, bookmark.pageIndex, hasChildren, onSelect, onToggle, onFocus]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleActivate();
      }
    },
    [handleActivate],
  );

  const itemClassName = isActive ? (classNames?.active ?? classNames?.item) : classNames?.item;

  const filteredChildEntries = useMemo(
    () => collectFilteredBookmarkEntries(bookmark.children, filterQuery),
    [bookmark.children, filterQuery],
  );

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-setsize={siblingCount}
        aria-posinset={posInSet + 1}
        aria-selected={isActive}
        aria-current={isActive ? 'page' : undefined}
        tabIndex={isFocused ? 0 : -1}
        data-path={path}
        data-active={isActive || undefined}
        className={itemClassName}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        style={getBookmarkNodeItemStyle({
          depth,
          isActive,
          isInteractive: bookmark.pageIndex !== undefined || hasChildren,
        })}
      >
        {hasChildren && (
          <span className={classNames?.toggle} aria-hidden="true" style={getBookmarkNodeToggleStyle(isExpanded)}>
            <ChevronRight size={12} strokeWidth={1.5} />
          </span>
        )}
        {!hasChildren && <span aria-hidden="true" style={BOOKMARK_NODE_LEAF_PLACEHOLDER_STYLE} />}
        <span className={classNames?.title} style={BOOKMARK_NODE_TITLE_STYLE}>
          {bookmark.title}
        </span>
        {bookmark.pageIndex !== undefined && (
          <span style={BOOKMARK_NODE_PAGE_BADGE_STYLE}>{bookmark.pageIndex + 1}</span>
        )}
      </div>
      {hasChildren && isExpanded && (
        // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA TreeView pattern requires role="group" for nested tree containers — no semantic HTML equivalent exists.
        <div role="group">
          {filteredChildEntries.map(({ bookmark: childBookmark, originalIndex }, pos) => (
            <BookmarkNode
              key={`${path}-${originalIndex}`}
              bookmark={childBookmark}
              path={`${path}-${originalIndex}`}
              depth={depth + 1}
              siblingCount={filteredChildEntries.length}
              posInSet={pos}
              currentPageIndex={currentPageIndex}
              expanded={expanded}
              focusedPath={focusedPath}
              filterQuery={filterQuery}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
              classNames={classNames}
            />
          ))}
        </div>
      )}
    </>
  );
});

export { BookmarkNode };
export type { BookmarkNodeClassNames, BookmarkNodeProps };
