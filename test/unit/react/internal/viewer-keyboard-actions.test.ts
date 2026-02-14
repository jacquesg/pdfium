import { describe, expect, it, vi } from 'vitest';
import type { UseDocumentSearchResult } from '../../../../src/react/hooks/use-document-search.js';
import type { UseViewerSetupResult } from '../../../../src/react/hooks/use-viewer-setup.js';
import { createViewerKeyboardActions } from '../../../../src/react/internal/viewer-keyboard-actions.js';

function createSearchResult(): UseDocumentSearchResult {
  return {
    matches: [],
    totalMatches: 0,
    currentIndex: -1,
    resultsByPage: new Map(),
    matchIndexMap: [],
    currentMatchPageIndex: undefined,
    isSearching: false,
    next: vi.fn(),
    prev: vi.fn(),
    goToMatch: vi.fn(),
  };
}

function createViewer(overrides?: {
  mode?: 'pointer' | 'pan';
  pageCount?: number;
  pageIndex?: number;
}): UseViewerSetupResult {
  const setPageIndex = vi.fn();
  const setMode = vi.fn();
  const rotatePage = vi.fn();
  const toggleFullscreen = vi.fn();
  const print = vi.fn();

  return {
    document: null,
    navigation: {
      pageIndex: overrides?.pageIndex ?? 2,
      setPageIndex,
      next: vi.fn(),
      prev: vi.fn(),
      canNext: true,
      canPrev: true,
      pageCount: overrides?.pageCount ?? 10,
    },
    zoom: {
      scale: 1,
      setScale: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      canZoomIn: true,
      canZoomOut: true,
    },
    fit: {
      fitWidth: vi.fn(),
      fitHeight: vi.fn(),
      fitPage: vi.fn(),
      fitScale: vi.fn().mockReturnValue(1),
      activeFitMode: null,
    },
    scroll: {
      scrollMode: 'continuous',
      setScrollMode: vi.fn(),
    },
    container: {
      ref: { current: null },
      fullscreenRef: { current: null },
      dimensions: undefined,
      zoomAnchorRef: { current: null },
    },
    rotation: {
      rotations: new Map(),
      getRotation: vi.fn().mockReturnValue(0),
      rotatePage,
      rotateAllPages: vi.fn(),
      resetPageRotation: vi.fn(),
      resetAllRotations: vi.fn(),
    },
    fullscreen: {
      isFullscreen: false,
      enterFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      toggleFullscreen,
    },
    spread: {
      spreadMode: 'none',
      setSpreadMode: vi.fn(),
    },
    print: {
      isPrinting: false,
      progress: 0,
      print,
      cancel: vi.fn(),
    },
    interaction: {
      mode: overrides?.mode ?? 'pointer',
      setMode,
      isDragging: false,
      marqueeRect: null,
    },
  };
}

describe('createViewerKeyboardActions', () => {
  it('wires search shortcuts based on visibility flags', () => {
    const viewer = createViewer();
    const search = createSearchResult();
    const toggleSearch = vi.fn();
    const zoomReset = vi.fn();

    const closedSearch = createViewerKeyboardActions({
      viewer,
      showSearch: true,
      isSearchOpen: false,
      toggleSearch,
      search,
      zoomReset,
    });

    expect(closedSearch.toggleSearch).toBe(toggleSearch);
    expect(closedSearch.nextMatch).toBeUndefined();
    expect(closedSearch.prevMatch).toBeUndefined();

    const openSearch = createViewerKeyboardActions({
      viewer,
      showSearch: true,
      isSearchOpen: true,
      toggleSearch,
      search,
      zoomReset,
    });

    expect(openSearch.nextMatch).toBe(search.next);
    expect(openSearch.prevMatch).toBe(search.prev);

    const hiddenSearch = createViewerKeyboardActions({
      viewer,
      showSearch: false,
      isSearchOpen: true,
      toggleSearch,
      search,
      zoomReset,
    });

    expect(hiddenSearch.toggleSearch).toBeUndefined();
  });

  it('escape closes search when open and does not force pointer mode', () => {
    const viewer = createViewer({ mode: 'pan' });
    const toggleSearch = vi.fn();
    const actions = createViewerKeyboardActions({
      viewer,
      showSearch: true,
      isSearchOpen: true,
      toggleSearch,
      search: createSearchResult(),
      zoomReset: vi.fn(),
    });

    actions.escape?.();

    expect(toggleSearch).toHaveBeenCalledTimes(1);
    expect(viewer.interaction.setMode).not.toHaveBeenCalled();
  });

  it('escape resets interaction mode to pointer when search is closed and mode is not pointer', () => {
    const viewer = createViewer({ mode: 'pan' });
    const actions = createViewerKeyboardActions({
      viewer,
      showSearch: true,
      isSearchOpen: false,
      toggleSearch: vi.fn(),
      search: createSearchResult(),
      zoomReset: vi.fn(),
    });

    actions.escape?.();

    expect(viewer.interaction.setMode).toHaveBeenCalledWith('pointer');
  });

  it('lastPage action clamps to zero for empty documents', () => {
    const viewer = createViewer({ pageCount: 0 });
    const actions = createViewerKeyboardActions({
      viewer,
      showSearch: true,
      isSearchOpen: false,
      toggleSearch: vi.fn(),
      search: createSearchResult(),
      zoomReset: vi.fn(),
    });

    actions.lastPage?.();

    expect(viewer.navigation.setPageIndex).toHaveBeenCalledWith(0);
  });
});
