import { describe, expect, it } from 'vitest';
import { BOOKMARK_PANEL_COPY, formatBookmarkMatchCount } from '../../../../src/react/internal/bookmark-panel-copy.js';

describe('bookmark-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(BOOKMARK_PANEL_COPY.emptyStateMessage).toBe('This document has no bookmarks.');
    expect(BOOKMARK_PANEL_COPY.treeAriaLabel).toBe('Document bookmarks');
    expect(BOOKMARK_PANEL_COPY.filterPlaceholder).toBe('Filter bookmarks...');
    expect(BOOKMARK_PANEL_COPY.filterAriaLabel).toBe('Filter bookmarks');
  });

  it('formats match-count summary text', () => {
    expect(formatBookmarkMatchCount(0, 0)).toBe('0 of 0 bookmarks');
    expect(formatBookmarkMatchCount(3, 8)).toBe('3 of 8 bookmarks');
  });
});
