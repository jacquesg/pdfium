import type { CSSProperties, KeyboardEvent, MutableRefObject } from 'react';
import { BookmarkNode, type BookmarkNodeClassNames } from './bookmark-node.js';
import type { RootBookmarkNodeModel } from './bookmark-node-model.js';
import { BOOKMARK_PANEL_COPY, formatBookmarkMatchCount } from './bookmark-panel-copy.js';
import {
  BOOKMARK_PANEL_CONTAINER_STYLE,
  BOOKMARK_PANEL_FILTER_COUNT_STYLE,
  BOOKMARK_PANEL_FILTER_INPUT_STYLE,
  BOOKMARK_PANEL_ROOT_GROUP_STYLE,
  BOOKMARK_PANEL_TREE_STYLE,
} from './bookmark-panel-view-styles.js';
import { mergeClassNames } from './component-api.js';

interface BookmarkPanelViewClassNames extends BookmarkNodeClassNames {
  container?: string | undefined;
  filter?: string | undefined;
}

interface BookmarkPanelViewProps {
  classNames?: BookmarkPanelViewClassNames | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  showFilter: boolean;
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
  normalizedFilter: string;
  matchCount: number;
  totalCount: number;
  treeRef: MutableRefObject<HTMLDivElement | null>;
  onTreeKeyDown: (event: KeyboardEvent) => void;
  rootNodeModels: readonly RootBookmarkNodeModel[];
}

function BookmarkPanelView({
  classNames,
  className,
  style,
  showFilter,
  filterQuery,
  onFilterQueryChange,
  normalizedFilter,
  matchCount,
  totalCount,
  treeRef,
  onTreeKeyDown,
  rootNodeModels,
}: BookmarkPanelViewProps) {
  const containerClassName = mergeClassNames(className, classNames?.container);

  return (
    <div className={containerClassName} style={{ ...BOOKMARK_PANEL_CONTAINER_STYLE, ...style }}>
      {showFilter && (
        <>
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => onFilterQueryChange(e.target.value)}
            placeholder={BOOKMARK_PANEL_COPY.filterPlaceholder}
            aria-label={BOOKMARK_PANEL_COPY.filterAriaLabel}
            className={classNames?.filter}
            style={BOOKMARK_PANEL_FILTER_INPUT_STYLE}
          />
          {normalizedFilter && (
            <div aria-live="polite" aria-atomic="true" style={BOOKMARK_PANEL_FILTER_COUNT_STYLE}>
              {formatBookmarkMatchCount(matchCount, totalCount)}
            </div>
          )}
        </>
      )}
      <div
        ref={treeRef}
        role="tree"
        aria-label={BOOKMARK_PANEL_COPY.treeAriaLabel}
        onKeyDown={onTreeKeyDown}
        style={BOOKMARK_PANEL_TREE_STYLE}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: WAI-ARIA TreeView pattern requires role="group" — no semantic HTML equivalent. */}
        <div role="group" style={BOOKMARK_PANEL_ROOT_GROUP_STYLE}>
          {rootNodeModels.map(({ key, ...nodeProps }) => (
            <BookmarkNode key={key} {...nodeProps} />
          ))}
        </div>
      </div>
    </div>
  );
}

export { BookmarkPanelView };
export type { BookmarkPanelViewClassNames, BookmarkPanelViewProps };
