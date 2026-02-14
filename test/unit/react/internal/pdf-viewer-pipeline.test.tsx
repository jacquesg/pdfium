import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PDFViewerProps } from '../../../../src/react/components/pdf-viewer-types.js';
import type { UsePDFViewerControllerResult } from '../../../../src/react/internal/use-pdf-viewer-controller.js';

const buildPDFViewerRootContentMock = vi.fn();
const usePDFViewerControllerMock = vi.fn();

vi.mock('../../../../src/react/internal/pdf-viewer-root-content.js', () => ({
  buildPDFViewerRootContent: (...args: unknown[]) => buildPDFViewerRootContentMock(...args),
}));

vi.mock('../../../../src/react/internal/use-pdf-viewer-controller.js', () => ({
  usePDFViewerController: (options: unknown) => usePDFViewerControllerMock(options),
}));

vi.mock('../../../../src/react/components/pdf-viewer-providers.js', () => ({
  PDFViewerProviders: (props: {
    viewerState: { searchQuery: string };
    panelState: { activePanel: string | null };
    children: ReactNode;
  }) => (
    <div
      data-testid="providers"
      data-query={props.viewerState.searchQuery}
      data-active-panel={String(props.panelState.activePanel)}
    >
      {props.children}
    </div>
  ),
}));

const { mapPDFViewerPipelineProps, renderPDFViewerPipelineRoot, usePDFViewerPipeline } = await import(
  '../../../../src/react/internal/pdf-viewer-pipeline.js'
);

function createController(): UsePDFViewerControllerResult {
  return {
    viewerState: {
      viewer: {} as never,
      search: {} as never,
      searchQuery: 'needle',
      setSearchQuery: vi.fn(),
      isSearchOpen: false,
      toggleSearch: vi.fn(),
      documentViewRef: { current: null },
    },
    panelState: {
      activePanel: 'thumbnails',
      togglePanel: vi.fn(),
      setPanelOverlay: vi.fn(),
      hasPanelBar: true,
    },
    panelOverlayRef: { current: null },
    overlayVersion: 0,
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

describe('mapPDFViewerPipelineProps', () => {
  it('applies defaults for optional booleans', () => {
    const mapped = mapPDFViewerPipelineProps({} as PDFViewerProps);

    expect(mapped.controllerOptions.showSearch).toBe(true);
    expect(mapped.controllerOptions.keyboardShortcuts).toBe(true);
    expect(mapped.contentOptions.showTextLayer).toBe(true);
    expect(mapped.contentOptions.showAnnotations).toBe(true);
    expect(mapped.contentOptions.showLinks).toBe(true);
    expect(mapped.contentOptions.renderFormFields).toBe(false);
  });

  it('maps explicit props to controller and content options', () => {
    const renderPageOverlay = () => null;
    const props: PDFViewerProps = {
      initialScale: 1.5,
      initialScrollMode: 'horizontal',
      initialSpreadMode: 'even',
      initialInteractionMode: 'pan',
      showSearch: false,
      showTextLayer: false,
      showAnnotations: false,
      showLinks: false,
      renderFormFields: true,
      gap: 24,
      bufferPages: 3,
      keyboardShortcuts: false,
      renderPageOverlay,
      panels: ['thumbnails'],
      initialPanel: 'thumbnails',
      className: 'root',
      classNames: { pages: 'pages-class' },
      style: { height: '100%' },
      children: 'child-content',
    };

    const mapped = mapPDFViewerPipelineProps(props);

    expect(mapped.controllerOptions).toEqual({
      initialScale: 1.5,
      initialScrollMode: 'horizontal',
      initialSpreadMode: 'even',
      initialInteractionMode: 'pan',
      gap: 24,
      keyboardShortcuts: false,
      showSearch: false,
      panels: ['thumbnails'],
      initialPanel: 'thumbnails',
    });

    expect(mapped.contentOptions).toEqual({
      children: 'child-content',
      panels: ['thumbnails'],
      className: 'root',
      classNames: { pages: 'pages-class' },
      style: { height: '100%' },
      gap: 24,
      bufferPages: 3,
      showTextLayer: false,
      showAnnotations: false,
      showLinks: false,
      renderFormFields: true,
      renderPageOverlay,
    });
  });
});

describe('renderPDFViewerPipelineRoot', () => {
  it('builds content from mapped options and wraps it with providers', () => {
    buildPDFViewerRootContentMock.mockReturnValue(<div data-testid="content-node" />);

    const controller = createController();
    const mappedProps = mapPDFViewerPipelineProps({
      showSearch: false,
      children: 'child',
      panels: ['thumbnails'],
    });
    const node = renderPDFViewerPipelineRoot({ controller, mappedProps });
    render(node);

    expect(buildPDFViewerRootContentMock).toHaveBeenCalledWith({
      controller,
      ...mappedProps.contentOptions,
    });

    const providers = screen.getByTestId('providers');
    expect(providers.getAttribute('data-query')).toBe('needle');
    expect(providers.getAttribute('data-active-panel')).toBe('thumbnails');
    expect(screen.getByTestId('content-node')).toBeDefined();
  });
});

describe('usePDFViewerPipeline', () => {
  it('maps props, builds controller, and returns rendered root content', () => {
    buildPDFViewerRootContentMock.mockReturnValue(<div data-testid="hook-content" />);
    const controller = createController();
    usePDFViewerControllerMock.mockReturnValue(controller);

    const props: PDFViewerProps = {
      initialScale: 2,
      showSearch: false,
      children: 'child',
      panels: ['thumbnails'],
      keyboardShortcuts: false,
    };

    const mapped = mapPDFViewerPipelineProps(props);
    const { result } = renderHook(() => usePDFViewerPipeline(props));

    expect(usePDFViewerControllerMock).toHaveBeenCalledWith(mapped.controllerOptions);

    render(result.current);
    expect(buildPDFViewerRootContentMock).toHaveBeenCalledWith({
      controller,
      ...mapped.contentOptions,
    });
    expect(screen.getByTestId('hook-content')).toBeDefined();
  });
});
