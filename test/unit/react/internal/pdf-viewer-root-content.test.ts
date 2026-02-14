import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PageOverlayInfo } from '../../../../src/react/components/pdf-page-view.js';
import type { UsePDFViewerControllerResult } from '../../../../src/react/internal/use-pdf-viewer-controller.js';

const buildPanelLayoutMock = vi.fn();
const buildDefaultLayoutMock = vi.fn();

vi.mock('../../../../src/react/components/pdf-viewer-layout-builders.js', () => ({
  buildPanelLayout: (...args: unknown[]) => buildPanelLayoutMock(...args),
  buildDefaultLayout: (...args: unknown[]) => buildDefaultLayoutMock(...args),
}));

const { buildPDFViewerRootContent } = await import('../../../../src/react/internal/pdf-viewer-root-content.js');

function createController(overrides?: {
  hasPanelBar?: boolean;
  activePanel?: string | null;
  isSearchOpen?: boolean;
  panelOverlay?: ((info: PageOverlayInfo) => ReactNode) | null;
}): UsePDFViewerControllerResult {
  return {
    viewerState: {
      viewer: {
        container: {
          fullscreenRef: { current: null },
        },
      } as never,
      search: {} as never,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      isSearchOpen: overrides?.isSearchOpen ?? false,
      toggleSearch: vi.fn(),
      documentViewRef: { current: null },
    },
    panelState: {
      activePanel: overrides?.activePanel ?? null,
      togglePanel: vi.fn(),
      setPanelOverlay: vi.fn(),
      hasPanelBar: overrides?.hasPanelBar ?? false,
    },
    panelOverlayRef: { current: overrides?.panelOverlay ?? null },
    overlayVersion: 3,
    lastFocusedButtonRef: { current: null },
    panelContainerRef: { current: null },
    sidebarWidth: 280,
    resizeHandleProps: {
      onPointerDown: vi.fn(),
      onKeyDown: vi.fn(),
      style: { cursor: 'col-resize' },
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': 'Resize sidebar',
      'aria-valuenow': 280,
      'aria-valuemin': 200,
      'aria-valuemax': 500,
      tabIndex: 0,
      'data-pdfium-resize-handle': '',
    },
    isResizing: false,
  };
}

describe('buildPDFViewerRootContent', () => {
  it('uses panel layout builder when panel bar is present', () => {
    buildPanelLayoutMock.mockReturnValueOnce('panel-layout-content');
    const panelOverlay = vi.fn();
    const controller = createController({ hasPanelBar: true, activePanel: 'forms', panelOverlay });

    const result = buildPDFViewerRootContent({
      controller,
      children: undefined,
      panels: ['forms'],
      className: 'root',
      classNames: { pages: 'pages-class' },
      style: undefined,
      gap: 24,
      bufferPages: 2,
      showTextLayer: true,
      showAnnotations: true,
      showLinks: true,
      renderFormFields: false,
      renderPageOverlay: vi.fn(),
    });

    expect(result).toBe('panel-layout-content');
    expect(buildPanelLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activePanel: 'forms',
        panelOverlay,
        showTextLayer: true,
        showAnnotations: true,
      }),
    );
    expect(buildDefaultLayoutMock).not.toHaveBeenCalled();
  });

  it('uses default layout builder when no panel bar and no custom children', () => {
    buildDefaultLayoutMock.mockReturnValueOnce('default-layout-content');
    const controller = createController({ hasPanelBar: false });

    const result = buildPDFViewerRootContent({
      controller,
      children: undefined,
      panels: undefined,
      className: 'root',
      classNames: undefined,
      style: undefined,
      gap: 16,
      bufferPages: 1,
      showTextLayer: false,
      showAnnotations: false,
      showLinks: true,
      renderFormFields: true,
      renderPageOverlay: undefined,
    });

    expect(result).toBe('default-layout-content');
    expect(buildDefaultLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showTextLayer: false,
        showAnnotations: false,
        renderFormFields: true,
      }),
    );
    expect(buildPanelLayoutMock).not.toHaveBeenCalled();
  });

  it('returns custom children directly in custom-children mode', () => {
    const controller = createController({ hasPanelBar: false });

    const result = buildPDFViewerRootContent({
      controller,
      children: 'custom-node',
      panels: undefined,
      className: 'root',
      classNames: undefined,
      style: undefined,
      gap: undefined,
      bufferPages: undefined,
      showTextLayer: true,
      showAnnotations: true,
      showLinks: true,
      renderFormFields: false,
      renderPageOverlay: undefined,
    });

    expect(result).toBe('custom-node');
    expect(buildDefaultLayoutMock).not.toHaveBeenCalled();
    expect(buildPanelLayoutMock).not.toHaveBeenCalled();
  });

  it('uses render-function children with merged viewer and panel state', () => {
    const controller = createController({ hasPanelBar: true, activePanel: 'thumbnails' });
    const renderFn = vi.fn().mockReturnValue('render-function-content');

    const result = buildPDFViewerRootContent({
      controller,
      children: renderFn,
      panels: ['thumbnails'],
      className: 'root',
      classNames: undefined,
      style: undefined,
      gap: undefined,
      bufferPages: undefined,
      showTextLayer: true,
      showAnnotations: true,
      showLinks: true,
      renderFormFields: false,
      renderPageOverlay: undefined,
    });

    expect(result).toBe('render-function-content');
    expect(renderFn).toHaveBeenCalledWith(
      expect.objectContaining({ activePanel: 'thumbnails', viewer: expect.any(Object) }),
    );
    expect(buildDefaultLayoutMock).not.toHaveBeenCalled();
    expect(buildPanelLayoutMock).not.toHaveBeenCalled();
  });
});
