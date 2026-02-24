import { createContext, type ReactNode, type RefObject, useContext, useMemo } from 'react';
import type { UseDocumentSearchResult } from '../hooks/use-document-search.js';
import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import { getMissingContextMessage, requireContextValue } from '../internal/component-api.js';
import type { PDFDocumentViewHandle } from './pdf-document-view.js';
import type { PageOverlayInfo } from './pdf-page-view.js';

interface PDFViewerState {
  viewer: UseViewerSetupResult;
  search: UseDocumentSearchResult;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  toggleSearch: () => void;
  documentViewRef: RefObject<PDFDocumentViewHandle | null>;
}

interface PDFPanelState {
  activePanel: string | null;
  togglePanel: (id: string) => void;
  /** Sets the panel overlay renderer (ref-based, no context churn). */
  setPanelOverlay: (renderer: ((info: PageOverlayInfo) => ReactNode) | null) => void;
  /** Whether an activity bar with panel buttons is rendered. */
  hasPanelBar: boolean;
}

const PDFViewerContext = createContext<PDFViewerState | null>(null);
const PDFPanelContext = createContext<PDFPanelState | null>(null);

/**
 * Access the PDFViewer compound state. Must be called inside `<PDFViewer>`.
 */
function usePDFViewer(): PDFViewerState & PDFPanelState {
  const viewer = requireContextValue(
    useContext(PDFViewerContext),
    getMissingContextMessage('usePDFViewer', 'PDFViewer'),
  );
  const panel = requireContextValue(useContext(PDFPanelContext), getMissingContextMessage('usePDFViewer', 'PDFViewer'));
  return useMemo(() => ({ ...viewer, ...panel }), [viewer, panel]);
}

/**
 * Non-throwing variant — returns `null` when called outside a `<PDFViewer>`.
 * Used internally by DefaultToolbar to support standalone usage with an explicit `viewer` prop.
 */
function usePDFViewerOptional(): PDFViewerState | null {
  return useContext(PDFViewerContext);
}

/**
 * Access only the panel state. Narrower than `usePDFViewer()` — only re-renders
 * when the active panel changes.
 */
function usePDFPanel(): PDFPanelState {
  return requireContextValue(useContext(PDFPanelContext), getMissingContextMessage('usePDFPanel', 'PDFViewer'));
}

/**
 * Non-throwing variant for conditional panel access.
 */
function usePDFPanelOptional(): PDFPanelState | null {
  return useContext(PDFPanelContext);
}

export { PDFPanelContext, PDFViewerContext, usePDFPanel, usePDFPanelOptional, usePDFViewer, usePDFViewerOptional };
export type { PDFPanelState, PDFViewerState };
