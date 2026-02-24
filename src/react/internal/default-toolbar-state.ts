import type { ToolbarSearchState } from '../components/pdf-toolbar.js';
import type { PDFViewerState } from '../components/pdf-viewer-context.js';

type ToolbarBreakpoint = 'full' | 'compact' | 'narrow' | 'minimal';

interface DefaultToolbarVisibility {
  hideInteraction: boolean;
  hideModes: boolean;
  hideRotation: boolean;
}

function getDefaultToolbarBreakpoint(width: number): ToolbarBreakpoint {
  if (width < 360) return 'minimal';
  if (width < 480) return 'narrow';
  if (width < 640) return 'compact';
  return 'full';
}

function getDefaultToolbarVisibility(breakpoint: ToolbarBreakpoint): DefaultToolbarVisibility {
  return {
    hideInteraction: breakpoint === 'narrow' || breakpoint === 'minimal',
    hideModes: breakpoint === 'narrow' || breakpoint === 'minimal',
    hideRotation: breakpoint === 'minimal',
  };
}

function createToolbarSearchState(viewerState: PDFViewerState | null): ToolbarSearchState | undefined {
  if (viewerState === null) return undefined;

  return {
    query: viewerState.searchQuery,
    setQuery: viewerState.setSearchQuery,
    totalMatches: viewerState.search.totalMatches,
    currentIndex: viewerState.search.currentIndex,
    isSearching: viewerState.search.isSearching,
    next: viewerState.search.next,
    prev: viewerState.search.prev,
    isOpen: viewerState.isSearchOpen,
    toggle: viewerState.toggleSearch,
  };
}

export { createToolbarSearchState, getDefaultToolbarBreakpoint, getDefaultToolbarVisibility };
export type { DefaultToolbarVisibility, ToolbarBreakpoint };
