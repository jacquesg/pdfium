const SEARCH_PANEL_COPY = {
  searchRegionAriaLabel: 'Search in document',
  queryPlaceholder: 'Search...',
  queryAriaLabel: 'Search query',
  previousMatchLabel: 'Previous match',
  nextMatchLabel: 'Next match',
  closeSearchLabel: 'Close search',
  noResultsLabel: 'No results',
} as const;

interface SearchBadgeTextOptions {
  readonly isSearching: boolean;
  readonly totalMatches: number;
  readonly currentIndex: number;
  readonly query: string;
}

function formatSearchProgress(currentIndex: number, totalMatches: number): string {
  return `${currentIndex + 1} of ${totalMatches}`;
}

function formatSearchingStatus(totalMatches: number): string {
  return `Searching\u2026 ${totalMatches} found`;
}

function getSearchBadgeText({ isSearching, totalMatches, currentIndex, query }: SearchBadgeTextOptions): string {
  if (isSearching) {
    return formatSearchingStatus(totalMatches);
  }
  if (totalMatches > 0) {
    return formatSearchProgress(currentIndex, totalMatches);
  }
  return query.trim() ? SEARCH_PANEL_COPY.noResultsLabel : '';
}

export { SEARCH_PANEL_COPY, formatSearchProgress, formatSearchingStatus, getSearchBadgeText };
