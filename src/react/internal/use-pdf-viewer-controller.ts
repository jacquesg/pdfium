'use client';

import type { MutableRefObject, ReactNode, RefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { PanelEntry, PanelId } from '../components/panels/types.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import type { UseDocumentSearchResult } from '../hooks/use-document-search.js';
import { useDocumentSearch } from '../hooks/use-document-search.js';
import type { InteractionMode } from '../hooks/use-interaction-mode.js';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts.js';
import type { UseResizeHandleProps } from '../hooks/use-resize.js';
import { useResize } from '../hooks/use-resize.js';
import type { UseViewerSetupOptions, UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import { useViewerSetup } from '../hooks/use-viewer-setup.js';
import type { SpreadMode } from '../hooks/use-visible-pages.js';
import type { PDFDocumentViewHandle } from './pdf-document-view-root.js';
import type { PanelOverlayRenderer } from './use-viewer-panels.js';
import { useViewerPanels } from './use-viewer-panels.js';
import { createViewerKeyboardActions } from './viewer-keyboard-actions.js';

interface UsePDFViewerControllerOptions {
  initialScale?: number | undefined;
  initialScrollMode?: 'continuous' | 'single' | 'horizontal' | undefined;
  initialSpreadMode?: SpreadMode | undefined;
  initialInteractionMode?: InteractionMode | undefined;
  gap?: number | undefined;
  keyboardShortcuts: boolean;
  showSearch: boolean;
  panels?: readonly PanelEntry[] | undefined;
  initialPanel?: PanelId | string | undefined;
}

interface PDFViewerControllerState {
  viewer: UseViewerSetupResult;
  search: UseDocumentSearchResult;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  toggleSearch: () => void;
  documentViewRef: RefObject<PDFDocumentViewHandle | null>;
}

interface PDFPanelControllerState {
  activePanel: string | null;
  togglePanel: (id: string) => void;
  setPanelOverlay: (renderer: ((info: PageOverlayInfo) => ReactNode) | null) => void;
  hasPanelBar: boolean;
}

interface UsePDFViewerControllerResult {
  viewerState: PDFViewerControllerState;
  panelState: PDFPanelControllerState;
  panelOverlayRef: MutableRefObject<PanelOverlayRenderer>;
  overlayVersion: number;
  lastFocusedButtonRef: MutableRefObject<HTMLButtonElement | null>;
  panelContainerRef: MutableRefObject<HTMLDivElement | null>;
  sidebarWidth: number;
  resizeHandleProps: UseResizeHandleProps;
  isResizing: boolean;
}

function usePDFViewerController({
  initialScale,
  initialScrollMode,
  initialSpreadMode,
  initialInteractionMode,
  gap,
  keyboardShortcuts,
  showSearch,
  panels,
  initialPanel,
}: UsePDFViewerControllerOptions): UsePDFViewerControllerResult {
  const viewerOptions = useMemo(() => {
    const options: UseViewerSetupOptions = {};
    if (initialScale !== undefined) options.initialScale = initialScale;
    if (initialScrollMode !== undefined) options.initialScrollMode = initialScrollMode;
    if (initialSpreadMode !== undefined) options.initialSpreadMode = initialSpreadMode;
    if (initialInteractionMode !== undefined) options.initialInteractionMode = initialInteractionMode;
    if (gap !== undefined) options.pageGap = gap;
    return options;
  }, [initialScale, initialScrollMode, initialSpreadMode, initialInteractionMode, gap]);

  const viewer = useViewerSetup(viewerOptions);
  const { width: sidebarWidth, handleProps: resizeHandleProps, isResizing } = useResize();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const toggleSearch = useCallback(() => {
    setIsSearchOpen((open) => {
      if (open) setSearchQuery('');
      return !open;
    });
  }, []);

  const search = useDocumentSearch(viewer.document, searchQuery);

  const {
    activePanel,
    togglePanel,
    setPanelOverlay: setPanelOverlayInternal,
    panelOverlayRef,
    overlayVersion,
    lastFocusedButtonRef,
    panelContainerRef,
  } = useViewerPanels({ initialPanel });

  const documentViewRef = useRef<PDFDocumentViewHandle>(null);
  const hasPanelBar = panels !== undefined && panels.length > 0;

  const zoomReset = useCallback(() => viewer.zoom.setScale(1), [viewer.zoom]);
  useKeyboardShortcuts(
    useMemo(
      () =>
        createViewerKeyboardActions({
          viewer,
          showSearch,
          isSearchOpen,
          toggleSearch,
          search,
          zoomReset,
        }),
      [viewer, showSearch, isSearchOpen, toggleSearch, search, zoomReset],
    ),
    useMemo(
      () => ({ enabled: keyboardShortcuts, scrollMode: viewer.scroll.scrollMode }),
      [keyboardShortcuts, viewer.scroll.scrollMode],
    ),
  );

  const viewerState = useMemo<PDFViewerControllerState>(
    () => ({
      viewer,
      search,
      searchQuery,
      setSearchQuery,
      isSearchOpen,
      toggleSearch,
      documentViewRef,
    }),
    [viewer, search, searchQuery, isSearchOpen, toggleSearch],
  );

  const setPanelOverlay = useCallback(
    (renderer: ((info: PageOverlayInfo) => ReactNode) | null) => {
      setPanelOverlayInternal(renderer, activePanel);
    },
    [activePanel, setPanelOverlayInternal],
  );

  const panelState = useMemo<PDFPanelControllerState>(
    () => ({
      activePanel,
      togglePanel,
      setPanelOverlay,
      hasPanelBar,
    }),
    [activePanel, togglePanel, setPanelOverlay, hasPanelBar],
  );

  return {
    viewerState,
    panelState,
    panelOverlayRef,
    overlayVersion,
    lastFocusedButtonRef,
    panelContainerRef,
    sidebarWidth,
    resizeHandleProps,
    isResizing,
  };
}

export { usePDFViewerController };
export type {
  PDFPanelControllerState,
  PDFViewerControllerState,
  UsePDFViewerControllerOptions,
  UsePDFViewerControllerResult,
};
