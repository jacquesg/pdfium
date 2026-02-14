import { describe, expect, it, vi } from 'vitest';
import type { PDFViewerState } from '../../../../src/react/components/pdf-viewer.js';
import {
  createToolbarSearchState,
  getDefaultToolbarBreakpoint,
  getDefaultToolbarVisibility,
} from '../../../../src/react/internal/default-toolbar-state.js';

describe('default-toolbar-state', () => {
  it('computes toolbar breakpoints from width', () => {
    expect(getDefaultToolbarBreakpoint(359)).toBe('minimal');
    expect(getDefaultToolbarBreakpoint(360)).toBe('narrow');
    expect(getDefaultToolbarBreakpoint(479)).toBe('narrow');
    expect(getDefaultToolbarBreakpoint(480)).toBe('compact');
    expect(getDefaultToolbarBreakpoint(639)).toBe('compact');
    expect(getDefaultToolbarBreakpoint(640)).toBe('full');
  });

  it('maps breakpoints to visibility flags', () => {
    expect(getDefaultToolbarVisibility('minimal')).toEqual({
      hideInteraction: true,
      hideModes: true,
      hideRotation: true,
    });
    expect(getDefaultToolbarVisibility('narrow')).toEqual({
      hideInteraction: true,
      hideModes: true,
      hideRotation: false,
    });
    expect(getDefaultToolbarVisibility('compact')).toEqual({
      hideInteraction: false,
      hideModes: false,
      hideRotation: false,
    });
  });

  it('returns undefined search state outside PDFViewer context', () => {
    expect(createToolbarSearchState(null)).toBeUndefined();
  });

  it('maps PDFViewer search state into toolbar search state', () => {
    const next = vi.fn();
    const prev = vi.fn();
    const setSearchQuery = vi.fn();
    const toggleSearch = vi.fn();
    const viewerState = {
      searchQuery: 'abc',
      setSearchQuery,
      search: {
        totalMatches: 4,
        currentIndex: 1,
        isSearching: true,
        next,
        prev,
      },
      isSearchOpen: true,
      toggleSearch,
    } as unknown as PDFViewerState;

    const searchState = createToolbarSearchState(viewerState);
    expect(searchState).toBeDefined();
    expect(searchState?.query).toBe('abc');
    expect(searchState?.setQuery).toBe(setSearchQuery);
    expect(searchState?.totalMatches).toBe(4);
    expect(searchState?.currentIndex).toBe(1);
    expect(searchState?.isSearching).toBe(true);
    expect(searchState?.next).toBe(next);
    expect(searchState?.prev).toBe(prev);
    expect(searchState?.isOpen).toBe(true);
    expect(searchState?.toggle).toBe(toggleSearch);
  });
});
