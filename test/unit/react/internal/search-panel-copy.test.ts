import { describe, expect, it } from 'vitest';
import {
  formatSearchingStatus,
  formatSearchProgress,
  getSearchBadgeText,
  SEARCH_PANEL_COPY,
} from '../../../../src/react/internal/search-panel-copy.js';

describe('search-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(SEARCH_PANEL_COPY.searchRegionAriaLabel).toBe('Search in document');
    expect(SEARCH_PANEL_COPY.queryPlaceholder).toBe('Search...');
    expect(SEARCH_PANEL_COPY.queryAriaLabel).toBe('Search query');
    expect(SEARCH_PANEL_COPY.previousMatchLabel).toBe('Previous match');
    expect(SEARCH_PANEL_COPY.nextMatchLabel).toBe('Next match');
    expect(SEARCH_PANEL_COPY.closeSearchLabel).toBe('Close search');
    expect(SEARCH_PANEL_COPY.noResultsLabel).toBe('No results');
  });

  it('formats search progress and searching status labels', () => {
    expect(formatSearchProgress(0, 1)).toBe('1 of 1');
    expect(formatSearchProgress(4, 12)).toBe('5 of 12');
    expect(formatSearchingStatus(0)).toBe('Searching\u2026 0 found');
    expect(formatSearchingStatus(7)).toBe('Searching\u2026 7 found');
  });

  it('derives badge text from search state', () => {
    expect(getSearchBadgeText({ isSearching: true, totalMatches: 3, currentIndex: 0, query: '' })).toBe(
      'Searching\u2026 3 found',
    );
    expect(getSearchBadgeText({ isSearching: false, totalMatches: 5, currentIndex: 2, query: '' })).toBe('3 of 5');
    expect(getSearchBadgeText({ isSearching: false, totalMatches: 0, currentIndex: 0, query: 'foo' })).toBe(
      'No results',
    );
    expect(getSearchBadgeText({ isSearching: false, totalMatches: 0, currentIndex: 0, query: ' ' })).toBe('');
  });
});
