import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../../../../src/core/types.js';

vi.mock('lucide-react', () => ({
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
}));

const { BookmarkPanel } = await import('../../../../src/react/components/bookmark-panel.js');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const flatBookmarks: Bookmark[] = [
  { title: 'Introduction', pageIndex: 0, children: [] },
  { title: 'Chapter 1', pageIndex: 2, children: [] },
  { title: 'Chapter 2', pageIndex: 5, children: [] },
];

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

const externalBookmark: Bookmark[] = [
  { title: 'External Link', pageIndex: undefined, children: [] },
  { title: 'Normal', pageIndex: 1, children: [] },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookmarkPanel', () => {
  it('shows empty state for empty bookmarks', () => {
    render(<BookmarkPanel bookmarks={[]} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);
    expect(screen.getByText('This document has no bookmarks.')).toBeDefined();
  });

  it('renders tree role container', () => {
    render(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);
    const tree = screen.getByRole('tree');
    expect(tree).toBeDefined();
    expect(tree.getAttribute('aria-label')).toBe('Document bookmarks');
  });

  it('renders flat bookmarks as treeitems', () => {
    render(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(3);
  });

  it('calls onBookmarkSelect on click', () => {
    const onSelect = vi.fn();
    render(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={onSelect} />);
    const items = screen.getAllByRole('treeitem');
    fireEvent.click(items[1]!); // Chapter 1 → pageIndex 2
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('skips navigation for undefined pageIndex', () => {
    const onSelect = vi.fn();
    render(<BookmarkPanel bookmarks={externalBookmark} currentPageIndex={0} onBookmarkSelect={onSelect} />);
    const items = screen.getAllByRole('treeitem');
    fireEvent.click(items[0]!); // External Link → pageIndex undefined
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders children when expanded', () => {
    render(<BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

    // Initially only root items visible (3 roots)
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);

    // Click Part One to expand
    fireEvent.click(screen.getByText('Part One').closest('[role="treeitem"]')!);

    // Now Part One's 2 children are visible → 3 + 2 = 5
    expect(screen.getAllByRole('treeitem')).toHaveLength(5);
  });

  it('sets aria-expanded on nodes with children', () => {
    render(<BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

    const partOne = screen.getByText('Part One').closest('[role="treeitem"]')!;
    expect(partOne.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not set aria-expanded on leaf nodes', () => {
    render(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);
    const items = screen.getAllByRole('treeitem');
    for (const item of items) {
      expect(item.hasAttribute('aria-expanded')).toBe(false);
    }
  });

  it('highlights active bookmark', () => {
    render(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={2} onBookmarkSelect={vi.fn()} />);
    const items = screen.getAllByRole('treeitem');
    // Chapter 1 is at pageIndex 2 → should be active
    expect(items[1]!.getAttribute('aria-selected')).toBe('true');
    expect(items[1]!.getAttribute('aria-current')).toBe('page');
    // Others should not be active
    expect(items[0]!.getAttribute('aria-selected')).toBe('false');
  });

  it('applies className and style', () => {
    render(
      <BookmarkPanel
        bookmarks={flatBookmarks}
        currentPageIndex={0}
        onBookmarkSelect={vi.fn()}
        className="my-bookmarks"
        style={{ maxHeight: 400 }}
      />,
    );
    const tree = screen.getByRole('tree');
    // className and style are on the outer wrapper, not the tree itself
    const wrapper = tree.parentElement;
    expect(wrapper?.className).toContain('my-bookmarks');
    expect((wrapper as HTMLElement).style.maxHeight).toBe('400px');
  });

  it('applies classNames.container to outer wrapper', () => {
    render(
      <BookmarkPanel
        bookmarks={flatBookmarks}
        currentPageIndex={0}
        onBookmarkSelect={vi.fn()}
        classNames={{ container: 'custom-container' }}
      />,
    );
    const tree = screen.getByRole('tree');
    // classNames.container is on the wrapper div that contains both the filter and the tree
    expect(tree.parentElement?.className).toContain('custom-container');
  });

  it('merges className with classNames.container on outer wrapper', () => {
    render(
      <BookmarkPanel
        bookmarks={flatBookmarks}
        currentPageIndex={0}
        onBookmarkSelect={vi.fn()}
        className="outer"
        classNames={{ container: 'custom-container' }}
      />,
    );

    const tree = screen.getByRole('tree');
    const wrapperClass = tree.parentElement?.className ?? '';
    expect(wrapperClass).toContain('outer');
    expect(wrapperClass).toContain('custom-container');
  });

  it('applies classNames.item to items', () => {
    render(
      <BookmarkPanel
        bookmarks={flatBookmarks}
        currentPageIndex={0}
        onBookmarkSelect={vi.fn()}
        classNames={{ item: 'bm-item' }}
      />,
    );
    const items = screen.getAllByRole('treeitem');
    for (const item of items) {
      expect(item.className).toContain('bm-item');
    }
  });

  it('defaultExpanded=true expands all parent nodes', () => {
    render(
      <BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} defaultExpanded />,
    );
    // All nodes should be visible: 3 roots + 2 children of Part One + 2 children of Chapter 2 + 1 child of Part Two = 8
    expect(screen.getAllByRole('treeitem')).toHaveLength(8);
  });

  describe('filter', () => {
    it('narrows visible items', () => {
      render(<BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

      const filterInput = screen.getByLabelText('Filter bookmarks');
      fireEvent.change(filterInput, { target: { value: 'Appendix' } });

      // Only Appendix should match
      const items = screen.getAllByRole('treeitem');
      expect(items).toHaveLength(1);
      expect(screen.getByText('Appendix')).toBeDefined();
    });

    it('auto-expands matching branches', () => {
      render(<BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

      const filterInput = screen.getByLabelText('Filter bookmarks');
      fireEvent.change(filterInput, { target: { value: 'Section' } });

      // Part One and Chapter 2 should auto-expand to show Section 2.1 and Section 2.2
      expect(screen.getByText('Section 2.1')).toBeDefined();
      expect(screen.getByText('Section 2.2')).toBeDefined();
    });

    it('shows match count', () => {
      render(<BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

      const filterInput = screen.getByLabelText('Filter bookmarks');
      fireEvent.change(filterInput, { target: { value: 'chapter' } });

      // 3 chapters match: Chapter 1, Chapter 2, Chapter 3
      expect(screen.getByText(/3 of 8 bookmarks/)).toBeDefined();
    });

    it('showFilter=false hides filter input', () => {
      render(
        <BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} showFilter={false} />,
      );
      expect(screen.queryByLabelText('Filter bookmarks')).toBeNull();
    });

    it('resets filter input when bookmarks prop switches to a different document tree', () => {
      const { rerender } = render(
        <BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />,
      );

      const filterInput = screen.getByLabelText('Filter bookmarks') as HTMLInputElement;
      fireEvent.change(filterInput, { target: { value: 'Appendix' } });
      expect(filterInput.value).toBe('Appendix');

      rerender(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

      expect((screen.getByLabelText('Filter bookmarks') as HTMLInputElement).value).toBe('');
    });
  });

  it('resets expansion state when bookmarks prop switches', () => {
    const alternateBookmarks: Bookmark[] = [
      {
        title: 'New Root',
        pageIndex: 0,
        children: [{ title: 'Child', pageIndex: 1, children: [] }],
      },
      { title: 'Tail', pageIndex: 2, children: [] },
    ];
    const { rerender } = render(
      <BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('Part One').closest('[role="treeitem"]')!);
    expect(screen.getAllByRole('treeitem').length).toBeGreaterThan(3);

    rerender(<BookmarkPanel bookmarks={alternateBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);

    // New Root remains collapsed by default after bookmark source change.
    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
  });

  describe('keyboard navigation', () => {
    function renderWithFocus() {
      const onSelect = vi.fn();
      render(
        <BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={onSelect} defaultExpanded />,
      );
      // Focus the first item to initialise roving tabindex
      const firstItem = screen.getAllByRole('treeitem')[0]!;
      fireEvent.click(firstItem);
      return { onSelect, tree: screen.getByRole('tree') };
    }

    it('ArrowDown moves focus to next item', () => {
      const { tree } = renderWithFocus();
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      // Focus should be on the second visible item (Chapter 1, child of Part One)
      const items = screen.getAllByRole('treeitem');
      expect(items[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowUp moves focus to previous item', () => {
      const { tree } = renderWithFocus();
      // Move down first, then back up
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      fireEvent.keyDown(tree, { key: 'ArrowUp' });
      const items = screen.getAllByRole('treeitem');
      expect(items[0]!.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowLeft collapses expanded parent', () => {
      const { tree } = renderWithFocus();
      // Part One is expanded and focused — ArrowLeft should collapse it
      fireEvent.keyDown(tree, { key: 'ArrowLeft' });
      // Children of Part One should no longer be visible
      // Before: 8 items. After collapse: 8 - 4 = 4 (Part One's 2 direct + Chapter 2's 2 children hidden)
      expect(screen.getAllByRole('treeitem')).toHaveLength(4);
    });

    it('ArrowRight expands collapsed parent', () => {
      render(<BookmarkPanel bookmarks={nestedBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);
      // Start with all collapsed — click Part One to focus
      const partOne = screen.getByText('Part One').closest('[role="treeitem"]')!;
      fireEvent.click(partOne);
      // Part One is already expanded after click (toggle). Let's re-collapse it.
      fireEvent.click(partOne);
      // Now only 3 root items
      expect(screen.getAllByRole('treeitem')).toHaveLength(3);
      // ArrowRight should expand it
      const tree = screen.getByRole('tree');
      fireEvent.keyDown(tree, { key: 'ArrowRight' });
      expect(screen.getAllByRole('treeitem')).toHaveLength(5);
    });

    it('Enter navigates to bookmark page', () => {
      const { onSelect, tree } = renderWithFocus();
      // Part One (pageIndex 0) is focused
      fireEvent.keyDown(tree, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledWith(0);
    });

    it('Space navigates to bookmark page', () => {
      const { onSelect, tree } = renderWithFocus();
      fireEvent.keyDown(tree, { key: ' ' });
      expect(onSelect).toHaveBeenCalledWith(0);
    });

    it('Home moves focus to first item', () => {
      const { tree } = renderWithFocus();
      // Move down a few times
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      // Home should go back to first
      fireEvent.keyDown(tree, { key: 'Home' });
      const items = screen.getAllByRole('treeitem');
      expect(items[0]!.getAttribute('tabindex')).toBe('0');
    });

    it('End moves focus to last visible item', () => {
      const { tree } = renderWithFocus();
      fireEvent.keyDown(tree, { key: 'End' });
      const items = screen.getAllByRole('treeitem');
      const lastItem = items[items.length - 1]!;
      expect(lastItem.getAttribute('tabindex')).toBe('0');
    });
  });

  it('displays page number badge', () => {
    render(<BookmarkPanel bookmarks={flatBookmarks} currentPageIndex={0} onBookmarkSelect={vi.fn()} />);
    // Chapter 1 has pageIndex 2 → badge shows "3" (1-indexed)
    expect(screen.getByText('3')).toBeDefined();
    // Chapter 2 has pageIndex 5 → badge shows "6"
    expect(screen.getByText('6')).toBeDefined();
  });
});
