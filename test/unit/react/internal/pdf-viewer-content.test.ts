import { describe, expect, it, vi } from 'vitest';
import type { PDFPanelState, PDFViewerState } from '../../../../src/react/components/pdf-viewer-context.js';
import { resolvePDFViewerContent } from '../../../../src/react/internal/pdf-viewer-content.js';

function createViewerState(overrides?: Partial<PDFViewerState>): PDFViewerState {
  return {
    viewer: {} as never,
    search: {} as never,
    searchQuery: 'query',
    setSearchQuery: vi.fn(),
    isSearchOpen: false,
    toggleSearch: vi.fn(),
    documentViewRef: { current: null },
    ...overrides,
  };
}

function createPanelState(overrides?: Partial<PDFPanelState>): PDFPanelState {
  return {
    activePanel: null,
    togglePanel: vi.fn(),
    setPanelOverlay: vi.fn(),
    hasPanelBar: false,
    ...overrides,
  };
}

describe('resolvePDFViewerContent', () => {
  it('uses render-function children with merged state', () => {
    const viewerState = createViewerState({ searchQuery: 'needle' });
    const panelState = createPanelState({ activePanel: 'thumbnails', hasPanelBar: true });
    const renderFn = vi.fn().mockReturnValue('render-function-content');
    const renderPanelLayout = vi.fn().mockReturnValue('panel-content');
    const renderDefaultLayout = vi.fn().mockReturnValue('default-content');

    const result = resolvePDFViewerContent({
      layoutMode: 'render-function',
      children: renderFn,
      viewerState,
      panelState,
      renderPanelLayout,
      renderDefaultLayout,
    });

    expect(result).toBe('render-function-content');
    expect(renderFn).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: 'needle', activePanel: 'thumbnails' }),
    );
    expect(renderPanelLayout).not.toHaveBeenCalled();
    expect(renderDefaultLayout).not.toHaveBeenCalled();
  });

  it('uses panel layout renderer in panel-layout mode', () => {
    const renderPanelLayout = vi.fn().mockReturnValue('panel-content');
    const renderDefaultLayout = vi.fn().mockReturnValue('default-content');

    const result = resolvePDFViewerContent({
      layoutMode: 'panel-layout',
      children: null,
      viewerState: createViewerState(),
      panelState: createPanelState(),
      renderPanelLayout,
      renderDefaultLayout,
    });

    expect(result).toBe('panel-content');
    expect(renderPanelLayout).toHaveBeenCalledTimes(1);
    expect(renderDefaultLayout).not.toHaveBeenCalled();
  });

  it('returns custom children for custom-children mode', () => {
    const renderPanelLayout = vi.fn().mockReturnValue('panel-content');
    const renderDefaultLayout = vi.fn().mockReturnValue('default-content');

    const result = resolvePDFViewerContent({
      layoutMode: 'custom-children',
      children: 'custom-children-node',
      viewerState: createViewerState(),
      panelState: createPanelState(),
      renderPanelLayout,
      renderDefaultLayout,
    });

    expect(result).toBe('custom-children-node');
    expect(renderPanelLayout).not.toHaveBeenCalled();
    expect(renderDefaultLayout).not.toHaveBeenCalled();
  });

  it('falls back to default layout renderer', () => {
    const renderPanelLayout = vi.fn().mockReturnValue('panel-content');
    const renderDefaultLayout = vi.fn().mockReturnValue('default-content');

    const result = resolvePDFViewerContent({
      layoutMode: 'default-layout',
      children: undefined,
      viewerState: createViewerState(),
      panelState: createPanelState(),
      renderPanelLayout,
      renderDefaultLayout,
    });

    expect(result).toBe('default-content');
    expect(renderPanelLayout).not.toHaveBeenCalled();
    expect(renderDefaultLayout).toHaveBeenCalledTimes(1);
  });
});
