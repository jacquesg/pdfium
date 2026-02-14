'use client';

const BOOKMARK_PANEL_COPY = {
  emptyStateMessage: 'This document has no bookmarks.',
  treeAriaLabel: 'Document bookmarks',
  filterPlaceholder: 'Filter bookmarks...',
  filterAriaLabel: 'Filter bookmarks',
} as const;

function formatBookmarkMatchCount(matchCount: number, totalCount: number): string {
  return `${matchCount} of ${totalCount} bookmarks`;
}

export { BOOKMARK_PANEL_COPY, formatBookmarkMatchCount };
