'use client';

import type { Rect } from '../../core/types.js';

const LINKS_PANEL_COPY = {
  linksTabLabel: 'Links',
  webLinksTabLabel: 'Web Links',
  pageLabel: 'Page:',
  noWebLinksMessage: 'No web links detected on this page.',
  urlColumnHeader: 'URL',
  rectsColumnHeader: 'Rects',
  textRangeColumnHeader: 'Text Range',
  blockedUnsafeUrlTitle: 'Blocked: unsafe URL scheme',
  emptyTextRangeLabel: '\u2014',
} as const;

function formatLinksTabEmptyState(pageIndex: number): string {
  return `No link annotations on page ${pageIndex + 1}.`;
}

function formatWebLinksSummary(count: number): string {
  return `${count} web link${count !== 1 ? 's' : ''} found`;
}

function formatLinkDestinationPage(pageIndex: number): string {
  return `GoTo Page ${pageIndex + 1}`;
}

function formatLinkBounds(bounds: Rect): string {
  return `Bounds: [${bounds.left.toFixed(0)}, ${bounds.top.toFixed(0)}, ${bounds.right.toFixed(0)}, ${bounds.bottom.toFixed(0)}]`;
}

function formatWebLinkTextRange(range: { startCharIndex: number; charCount: number } | undefined): string {
  return range ? `start: ${range.startCharIndex}, count: ${range.charCount}` : LINKS_PANEL_COPY.emptyTextRangeLabel;
}

export {
  LINKS_PANEL_COPY,
  formatLinkBounds,
  formatLinkDestinationPage,
  formatLinksTabEmptyState,
  formatWebLinkTextRange,
  formatWebLinksSummary,
};
