import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { BookmarkNode } from '../../../../src/react/internal/bookmark-node.js';

vi.mock('lucide-react', () => ({
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
}));

const nestedBookmark: Bookmark = {
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
};

function renderNode(overrides?: {
  bookmark?: Bookmark;
  path?: string;
  depth?: number;
  siblingCount?: number;
  posInSet?: number;
  currentPageIndex?: number;
  expanded?: ReadonlySet<string>;
  focusedPath?: string | null;
  filterQuery?: string;
  onToggle?: (path: string) => void;
  onSelect?: (pageIndex: number) => void;
  onFocus?: (path: string) => void;
  classNames?: { item?: string; active?: string; toggle?: string; title?: string };
}) {
  const onToggle = overrides?.onToggle ?? vi.fn();
  const onSelect = overrides?.onSelect ?? vi.fn();
  const onFocus = overrides?.onFocus ?? vi.fn();

  render(
    <BookmarkNode
      bookmark={overrides?.bookmark ?? nestedBookmark}
      path={overrides?.path ?? '0'}
      depth={overrides?.depth ?? 0}
      siblingCount={overrides?.siblingCount ?? 1}
      posInSet={overrides?.posInSet ?? 0}
      currentPageIndex={overrides?.currentPageIndex ?? -1}
      expanded={overrides?.expanded ?? new Set<string>()}
      focusedPath={overrides?.focusedPath ?? null}
      filterQuery={overrides?.filterQuery ?? ''}
      onToggle={onToggle}
      onSelect={onSelect}
      onFocus={onFocus}
      classNames={overrides?.classNames}
    />,
  );

  return { onToggle, onSelect, onFocus };
}

describe('BookmarkNode', () => {
  it('activates parent node on click by focusing, selecting, and toggling', () => {
    const { onToggle, onSelect, onFocus } = renderNode();

    fireEvent.click(screen.getByRole('treeitem'));

    expect(onFocus).toHaveBeenCalledWith('0');
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(onToggle).toHaveBeenCalledWith('0');
  });

  it('activates on Enter key with the same behavior as click', () => {
    const { onToggle, onSelect, onFocus } = renderNode();

    fireEvent.keyDown(screen.getByRole('treeitem'), { key: 'Enter' });

    expect(onFocus).toHaveBeenCalledWith('0');
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(onToggle).toHaveBeenCalledWith('0');
  });

  it('does not select or toggle when node has no destination and no children', () => {
    const { onToggle, onSelect, onFocus } = renderNode({
      bookmark: { title: 'External Link', pageIndex: undefined, children: [] },
    });

    fireEvent.click(screen.getByRole('treeitem'));

    expect(onFocus).toHaveBeenCalledWith('0');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('renders only matching expanded descendants when filter is active', () => {
    renderNode({
      expanded: new Set<string>(['0', '0-1']),
      filterQuery: 'section',
    });

    expect(screen.queryByText('Chapter 1')).toBeNull();
    expect(screen.getByText('Chapter 2')).toBeDefined();
    expect(screen.getByText('Section 2.1')).toBeDefined();
  });

  it('applies active class and active aria attributes for current page', () => {
    renderNode({
      currentPageIndex: 0,
      classNames: { item: 'bm-item', active: 'bm-active' },
    });

    const item = screen.getByRole('treeitem');
    expect(item.className).toContain('bm-active');
    expect(item.getAttribute('aria-selected')).toBe('true');
    expect(item.getAttribute('aria-current')).toBe('page');
  });
});
