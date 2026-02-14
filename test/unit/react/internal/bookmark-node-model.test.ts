import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';
import { createRootBookmarkNodeModels } from '../../../../src/react/internal/bookmark-node-model.js';

const bookmarks: Bookmark[] = [
  { title: 'Part One', pageIndex: 0, children: [] },
  { title: 'Part Two', pageIndex: 3, children: [] },
  { title: 'Appendix', pageIndex: 8, children: [] },
];

describe('createRootBookmarkNodeModels', () => {
  it('returns an empty list when no root entries are provided', () => {
    const models = createRootBookmarkNodeModels({
      filteredRootEntries: [],
      currentPageIndex: 0,
      expandedPaths: new Set<string>(),
      focusedPath: null,
      filterQuery: '',
      onToggle: vi.fn(),
      onSelect: vi.fn(),
      onFocus: vi.fn(),
      classNames: undefined,
    });

    expect(models).toEqual([]);
  });

  it('maps root entries to BookmarkNode render models with stable key/path from original indices', () => {
    const models = createRootBookmarkNodeModels({
      filteredRootEntries: [
        { bookmark: bookmarks[0]!, originalIndex: 0 },
        { bookmark: bookmarks[2]!, originalIndex: 2 },
      ],
      currentPageIndex: 3,
      expandedPaths: new Set<string>(['0']),
      focusedPath: '2',
      filterQuery: 'app',
      onToggle: vi.fn(),
      onSelect: vi.fn(),
      onFocus: vi.fn(),
      classNames: { item: 'bm-item' },
    });

    expect(
      models.map(({ key, path, posInSet, siblingCount, depth, bookmark }) => ({
        key,
        path,
        posInSet,
        siblingCount,
        depth,
        title: bookmark.title,
      })),
    ).toEqual([
      { key: '0', path: '0', posInSet: 0, siblingCount: 2, depth: 0, title: 'Part One' },
      { key: '2', path: '2', posInSet: 1, siblingCount: 2, depth: 0, title: 'Appendix' },
    ]);
  });

  it('passes through shared render context references and callbacks', () => {
    const expandedPaths = new Set<string>(['1']);
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    const onFocus = vi.fn();
    const classNames = { item: 'bm-item', active: 'bm-active' };

    const [model] = createRootBookmarkNodeModels({
      filteredRootEntries: [{ bookmark: bookmarks[1]!, originalIndex: 1 }],
      currentPageIndex: 3,
      expandedPaths,
      focusedPath: '1',
      filterQuery: 'part',
      onToggle,
      onSelect,
      onFocus,
      classNames,
    });

    expect(model?.expanded).toBe(expandedPaths);
    expect(model?.onToggle).toBe(onToggle);
    expect(model?.onSelect).toBe(onSelect);
    expect(model?.onFocus).toBe(onFocus);
    expect(model?.classNames).toBe(classNames);
    expect(model?.focusedPath).toBe('1');
    expect(model?.filterQuery).toBe('part');
    expect(model?.currentPageIndex).toBe(3);
  });
});
