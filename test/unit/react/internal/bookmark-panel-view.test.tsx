import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { createRootBookmarkNodeModels } from '../../../../src/react/internal/bookmark-node-model.js';
import { BookmarkPanelView } from '../../../../src/react/internal/bookmark-panel-view.js';

vi.mock('lucide-react', () => ({
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
}));

const bookmarks: Bookmark[] = [
  { title: 'Part One', pageIndex: 0, children: [] },
  { title: 'Part Two', pageIndex: 2, children: [] },
];

function createModels() {
  return createRootBookmarkNodeModels({
    filteredRootEntries: [
      { bookmark: bookmarks[0]!, originalIndex: 0 },
      { bookmark: bookmarks[1]!, originalIndex: 1 },
    ],
    currentPageIndex: 0,
    expandedPaths: new Set<string>(),
    focusedPath: null,
    filterQuery: '',
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    onFocus: vi.fn(),
    classNames: { item: 'bm-item' },
  });
}

function renderView(overrides?: {
  showFilter?: boolean;
  filterQuery?: string;
  normalizedFilter?: string;
  matchCount?: number;
  totalCount?: number;
  onFilterQueryChange?: (query: string) => void;
  onTreeKeyDown?: (event: React.KeyboardEvent) => void;
  className?: string;
}) {
  const treeRef = { current: null } as MutableRefObject<HTMLDivElement | null>;
  const onFilterQueryChange = overrides?.onFilterQueryChange ?? vi.fn();
  const onTreeKeyDown = overrides?.onTreeKeyDown ?? vi.fn();

  render(
    <BookmarkPanelView
      classNames={{ item: 'bm-item', container: 'bm-container', filter: 'bm-filter' }}
      className={overrides?.className}
      style={{ maxHeight: 320 }}
      showFilter={overrides?.showFilter ?? true}
      filterQuery={overrides?.filterQuery ?? ''}
      onFilterQueryChange={onFilterQueryChange}
      normalizedFilter={overrides?.normalizedFilter ?? ''}
      matchCount={overrides?.matchCount ?? 0}
      totalCount={overrides?.totalCount ?? 2}
      treeRef={treeRef}
      onTreeKeyDown={onTreeKeyDown}
      rootNodeModels={createModels()}
    />,
  );

  return { onFilterQueryChange, onTreeKeyDown };
}

describe('BookmarkPanelView', () => {
  it('renders tree and mapped root nodes', () => {
    renderView();

    expect(screen.getByRole('tree')).toBeDefined();
    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    expect(screen.getByText('Part One')).toBeDefined();
    expect(screen.getByText('Part Two')).toBeDefined();
  });

  it('forwards filter input changes', () => {
    const { onFilterQueryChange } = renderView({ filterQuery: 'part' });
    const input = screen.getByLabelText('Filter bookmarks');

    fireEvent.change(input, { target: { value: 'chapter' } });

    expect(onFilterQueryChange).toHaveBeenCalledWith('chapter');
  });

  it('shows match count only when normalizedFilter is non-empty', () => {
    renderView({ normalizedFilter: '', matchCount: 1, totalCount: 2 });
    expect(screen.queryByText(/1 of 2 bookmarks/)).toBeNull();
    cleanup();

    renderView({ normalizedFilter: 'part', matchCount: 1, totalCount: 2 });
    expect(screen.getByText('1 of 2 bookmarks')).toBeDefined();
  });

  it('hides filter UI when showFilter is false', () => {
    renderView({ showFilter: false });

    expect(screen.queryByLabelText('Filter bookmarks')).toBeNull();
  });

  it('forwards tree keyboard events', () => {
    const { onTreeKeyDown } = renderView();
    fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' });
    expect(onTreeKeyDown).toHaveBeenCalledTimes(1);
  });
});
