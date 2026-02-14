import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  PDFPanelContext,
  type PDFPanelState,
  PDFViewerContext,
  type PDFViewerState,
  usePDFPanel,
  usePDFPanelOptional,
  usePDFViewer,
  usePDFViewerOptional,
} from '../../../../src/react/components/pdf-viewer-context.js';

function createWrapper(viewerValue: PDFViewerState | null, panelValue: PDFPanelState | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PDFViewerContext.Provider value={viewerValue}>
        <PDFPanelContext.Provider value={panelValue}>{children}</PDFPanelContext.Provider>
      </PDFViewerContext.Provider>
    );
  };
}

describe('pdf-viewer context hooks', () => {
  it('usePDFViewer throws outside provider', () => {
    expect(() => renderHook(() => usePDFViewer())).toThrow(
      'usePDFViewer() must be called inside a <PDFViewer> component.',
    );
  });

  it('usePDFPanel throws outside provider', () => {
    expect(() => renderHook(() => usePDFPanel())).toThrow(
      'usePDFPanel() must be called inside a <PDFViewer> component.',
    );
  });

  it('optional hooks return null outside provider', () => {
    const viewerOptional = renderHook(() => usePDFViewerOptional());
    expect(viewerOptional.result.current).toBeNull();

    const panelOptional = renderHook(() => usePDFPanelOptional());
    expect(panelOptional.result.current).toBeNull();
  });

  it('usePDFViewer returns merged viewer and panel state inside providers', () => {
    const viewerState: PDFViewerState = {
      viewer: {} as never,
      search: {} as never,
      searchQuery: 'query',
      setSearchQuery: vi.fn(),
      isSearchOpen: true,
      toggleSearch: vi.fn(),
      documentViewRef: { current: null },
    };

    const panelState: PDFPanelState = {
      activePanel: 'thumbnails',
      togglePanel: vi.fn(),
      setPanelOverlay: vi.fn(),
      hasPanelBar: true,
    };

    const { result } = renderHook(() => usePDFViewer(), {
      wrapper: createWrapper(viewerState, panelState),
    });

    expect(result.current.viewer).toBe(viewerState.viewer);
    expect(result.current.search).toBe(viewerState.search);
    expect(result.current.searchQuery).toBe('query');
    expect(result.current.activePanel).toBe('thumbnails');
    expect(result.current.hasPanelBar).toBe(true);
  });
});
