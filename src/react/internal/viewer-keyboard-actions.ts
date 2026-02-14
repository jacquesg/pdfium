'use client';

import type { UseDocumentSearchResult } from '../hooks/use-document-search.js';
import type { KeyboardActions } from '../hooks/use-keyboard-shortcuts.js';
import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';

interface CreateViewerKeyboardActionsOptions {
  viewer: UseViewerSetupResult;
  showSearch: boolean;
  isSearchOpen: boolean;
  toggleSearch: () => void;
  search: UseDocumentSearchResult;
  zoomReset: () => void;
}

function createViewerKeyboardActions({
  viewer,
  showSearch,
  isSearchOpen,
  toggleSearch,
  search,
  zoomReset,
}: CreateViewerKeyboardActionsOptions): KeyboardActions {
  return {
    nextPage: viewer.navigation.next,
    prevPage: viewer.navigation.prev,
    zoomIn: viewer.zoom.zoomIn,
    zoomOut: viewer.zoom.zoomOut,
    zoomReset,
    toggleSearch: showSearch ? toggleSearch : undefined,
    nextMatch: isSearchOpen ? search.next : undefined,
    prevMatch: isSearchOpen ? search.prev : undefined,
    rotateClockwise: () => viewer.rotation.rotatePage(viewer.navigation.pageIndex, 'cw'),
    rotateCounterClockwise: () => viewer.rotation.rotatePage(viewer.navigation.pageIndex, 'ccw'),
    toggleFullscreen: () => {
      viewer.fullscreen.toggleFullscreen();
    },
    print: () => {
      viewer.print.print();
    },
    firstPage: () => viewer.navigation.setPageIndex(0),
    lastPage: () => viewer.navigation.setPageIndex(Math.max(0, viewer.navigation.pageCount - 1)),
    escape: () => {
      if (isSearchOpen) toggleSearch();
      else if (viewer.interaction.mode !== 'pointer') viewer.interaction.setMode('pointer');
    },
    setPointerMode: () => viewer.interaction.setMode('pointer'),
    setPanMode: () => viewer.interaction.setMode('pan'),
    setMarqueeMode: () => viewer.interaction.setMode('marquee-zoom'),
  };
}

export { createViewerKeyboardActions };
export type { CreateViewerKeyboardActionsOptions };
