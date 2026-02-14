import { describe, expect, it } from 'vitest';
import {
  formatLinkBounds,
  formatLinkDestinationPage,
  formatLinksTabEmptyState,
  formatWebLinksSummary,
  formatWebLinkTextRange,
  LINKS_PANEL_COPY,
} from '../../../../src/react/internal/links-panel-copy.js';

describe('links-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(LINKS_PANEL_COPY.linksTabLabel).toBe('Links');
    expect(LINKS_PANEL_COPY.webLinksTabLabel).toBe('Web Links');
    expect(LINKS_PANEL_COPY.pageLabel).toBe('Page:');
    expect(LINKS_PANEL_COPY.noWebLinksMessage).toBe('No web links detected on this page.');
    expect(LINKS_PANEL_COPY.urlColumnHeader).toBe('URL');
    expect(LINKS_PANEL_COPY.rectsColumnHeader).toBe('Rects');
    expect(LINKS_PANEL_COPY.textRangeColumnHeader).toBe('Text Range');
    expect(LINKS_PANEL_COPY.blockedUnsafeUrlTitle).toBe('Blocked: unsafe URL scheme');
    expect(LINKS_PANEL_COPY.emptyTextRangeLabel).toBe('\u2014');
  });

  it('formats links panel dynamic labels', () => {
    expect(formatLinksTabEmptyState(0)).toBe('No link annotations on page 1.');
    expect(formatLinksTabEmptyState(4)).toBe('No link annotations on page 5.');
    expect(formatWebLinksSummary(1)).toBe('1 web link found');
    expect(formatWebLinksSummary(3)).toBe('3 web links found');
    expect(formatLinkDestinationPage(0)).toBe('GoTo Page 1');
    expect(formatLinkDestinationPage(9)).toBe('GoTo Page 10');
  });

  it('formats bounds and text-range values', () => {
    expect(formatLinkBounds({ left: 10.4, top: 20.7, right: 30.2, bottom: 40.9 })).toBe('Bounds: [10, 21, 30, 41]');
    expect(formatWebLinkTextRange(undefined)).toBe('\u2014');
    expect(formatWebLinkTextRange({ startCharIndex: 12, charCount: 5 })).toBe('start: 12, count: 5');
  });
});
