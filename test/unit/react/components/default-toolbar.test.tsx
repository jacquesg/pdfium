import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import type { PDFPanelState, PDFViewerState } from '../../../../src/react/components/pdf-viewer.js';
import type { UseViewerSetupResult } from '../../../../src/react/hooks/use-viewer-setup.js';

// ── Mock context to provide state without needing a real PDFViewer ──

const mockState: PDFViewerState = {
  viewer: {
    document: { id: 'mock-doc' } as PDFViewerState['viewer']['document'],
    navigation: {
      pageIndex: 2,
      setPageIndex: vi.fn(),
      pageCount: 10,
      next: vi.fn(),
      prev: vi.fn(),
      canNext: true,
      canPrev: true,
    },
    zoom: {
      scale: 1.5,
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
      fitScale: vi.fn(),
      activeFitMode: null,
    },
    scroll: {
      scrollMode: 'continuous',
      setScrollMode: vi.fn(),
    },
    container: {
      ref: { current: null },
      dimensions: Array.from({ length: 10 }, () => ({ width: 612, height: 792 })),
      zoomAnchorRef: { current: null },
    },
    rotation: {
      rotations: new Map(),
      getRotation: vi.fn(() => PageRotation.None),
      rotatePage: vi.fn(),
      rotateAllPages: vi.fn(),
      resetPageRotation: vi.fn(),
      resetAllRotations: vi.fn(),
    },
    fullscreen: {
      isFullscreen: false,
      enterFullscreen: vi.fn(async () => {}),
      exitFullscreen: vi.fn(async () => {}),
      toggleFullscreen: vi.fn(async () => {}),
    },
    spread: {
      spreadMode: 'none' as const,
      setSpreadMode: vi.fn(),
    },
    print: {
      isPrinting: false,
      progress: 0,
      print: vi.fn(),
      cancel: vi.fn(),
    },
    interaction: {
      mode: 'pointer' as const,
      setMode: vi.fn(),
      isDragging: false,
      marqueeRect: null,
    },
  },
  search: {
    totalMatches: 0,
    currentIndex: -1,
    isSearching: false,
    next: vi.fn(),
    prev: vi.fn(),
    resultsByPage: new Map(),
    matchIndexMap: [],
    currentMatchPageIndex: undefined,
  } as unknown as PDFViewerState['search'],
  searchQuery: '',
  setSearchQuery: vi.fn(),
  isSearchOpen: false,
  toggleSearch: vi.fn(),
  documentViewRef: { current: null },
};

const mockPanelState: PDFPanelState = {
  activePanel: null,
  togglePanel: vi.fn(),
  setPanelOverlay: vi.fn(),
  hasPanelBar: false,
};

let returnContext: PDFViewerState | null = mockState;
let returnPanelContext: PDFPanelState | null = mockPanelState;

vi.mock('../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => {
    if (returnContext === null) throw new Error('usePDFViewer() must be called inside a <PDFViewer> component.');
    return returnContext;
  },
  usePDFViewerOptional: () => returnContext,
  usePDFPanelOptional: () => returnPanelContext,
}));

const { DefaultToolbar } = await import('../../../../src/react/components/default-toolbar.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  returnContext = mockState;
  returnPanelContext = mockPanelState;
});

describe('DefaultToolbar', () => {
  it('renders all toolbar controls', () => {
    render(<DefaultToolbar />);

    // Navigation group
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeDefined();

    // Navigation buttons
    expect(screen.getByLabelText('Previous page')).toBeDefined();
    expect(screen.getByLabelText('Next page')).toBeDefined();
    expect(screen.getByLabelText('Page number')).toBeDefined();

    // Zoom buttons
    expect(screen.getByLabelText('Zoom in')).toBeDefined();
    expect(screen.getByLabelText('Zoom out')).toBeDefined();

    // Fit buttons
    expect(screen.getByLabelText('Fit to width')).toBeDefined();
    expect(screen.getByLabelText('Fit to page')).toBeDefined();

    // Scroll mode select
    expect(screen.getByLabelText('Scroll mode')).toBeDefined();

    // Search toggle (only rendered when inside PDFViewer context)
    expect(screen.getByLabelText('Open search')).toBeDefined();
  });

  it('appends children after default controls', () => {
    render(
      <DefaultToolbar>
        <button type="button" data-testid="custom-button">
          Download
        </button>
      </DefaultToolbar>,
    );

    const toolbar = screen.getByRole('toolbar');
    const customButton = screen.getByTestId('custom-button');
    expect(toolbar.contains(customButton)).toBe(true);
  });

  it('className and style pass through', () => {
    render(<DefaultToolbar className="my-toolbar" style={{ padding: 8 }} />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.className).toContain('my-toolbar');
    expect((toolbar as HTMLElement).style.padding).toBe('8px');
  });

  it('works outside PDFViewer when viewer prop is provided', () => {
    returnContext = null;

    const standaloneViewer: UseViewerSetupResult = {
      ...mockState.viewer,
    };

    render(<DefaultToolbar viewer={standaloneViewer} />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeDefined();

    // Standard controls still render
    expect(screen.getByLabelText('Previous page')).toBeDefined();
    expect(screen.getByLabelText('Zoom in')).toBeDefined();
    expect(screen.getByLabelText('Scroll mode')).toBeDefined();

    // Search toggle is omitted — no PDFViewer context provides search state
    expect(screen.queryByLabelText('Open search')).toBeNull();
  });

  it('throws when neither context nor viewer prop is available', () => {
    returnContext = null;

    expect(() => render(<DefaultToolbar />)).toThrow(
      'DefaultToolbar requires a <PDFViewer> parent or an explicit `viewer` prop.',
    );
  });

  describe('interaction mode toggle group', () => {
    it('calls setMode("pointer") when the pointer button is clicked', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Pointer tool'));
      expect(mockState.viewer.interaction.setMode).toHaveBeenCalledWith('pointer');
    });

    it('calls setMode("pan") when the hand button is clicked', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Hand tool'));
      expect(mockState.viewer.interaction.setMode).toHaveBeenCalledWith('pan');
    });

    it('calls setMode("marquee-zoom") when the marquee button is clicked', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Marquee zoom'));
      expect(mockState.viewer.interaction.setMode).toHaveBeenCalledWith('marquee-zoom');
    });

    it('marks the active mode button as pressed', () => {
      returnContext = {
        ...mockState,
        viewer: { ...mockState.viewer, interaction: { ...mockState.viewer.interaction, mode: 'pan' } },
      };
      render(<DefaultToolbar />);
      expect(screen.getByLabelText('Hand tool').getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByLabelText('Pointer tool').getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('editable zoom input', () => {
    it('switches to edit mode when the zoom percentage button is clicked', () => {
      render(<DefaultToolbar />);

      // scale=1.5 → 150%
      const zoomButton = screen.getByLabelText('Zoom percentage');
      expect(zoomButton.tagName).toBe('BUTTON');
      fireEvent.click(zoomButton);

      const input = screen.getByLabelText('Zoom percentage');
      expect(input.tagName).toBe('INPUT');
    });

    it('calls setScale with parsed value divided by 100 when Enter is pressed', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Zoom percentage'));

      const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '200' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockState.viewer.zoom.setScale).toHaveBeenCalledWith(2);
    });

    it('clamps out-of-range values to the valid range', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Zoom percentage'));

      const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // 5% is below minimum (10%), so it clamps to 10% → setScale(0.1)
      expect(mockState.viewer.zoom.setScale).toHaveBeenCalledWith(0.1);
    });

    it('cancels edit mode without calling setScale when Escape is pressed', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Zoom percentage'));

      const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '300' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockState.viewer.zoom.setScale).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Zoom percentage').tagName).toBe('BUTTON');
    });
  });

  describe('editable page input', () => {
    it('switches to edit mode when the page number button is clicked', () => {
      render(<DefaultToolbar />);

      const pageButton = screen.getByLabelText('Page number');
      expect(pageButton.tagName).toBe('BUTTON');
      fireEvent.click(pageButton);

      const input = screen.getByLabelText('Page number');
      expect(input.tagName).toBe('INPUT');
    });

    it('calls setPageIndex with clamped, zero-based value when Enter is pressed', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Page number'));

      const input = screen.getByLabelText('Page number') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockState.viewer.navigation.setPageIndex).toHaveBeenCalledWith(9);
    });

    it('cancels edit mode without calling setPageIndex when Escape is pressed', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Page number'));

      const input = screen.getByLabelText('Page number') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '3' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockState.viewer.navigation.setPageIndex).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Page number').tagName).toBe('BUTTON');
    });
  });

  describe('print progress indicator', () => {
    it('shows the Printer icon when isPrinting is false', () => {
      render(<DefaultToolbar />);
      const printButton = screen.getByLabelText('Print');
      // The SVG for the Printer icon should be present; no progress circle
      const svg = printButton.querySelector('svg');
      expect(svg).not.toBeNull();
      // Progress SVG uses aria-hidden and has exactly two circles — confirm absence
      const circles = svg?.querySelectorAll('circle');
      expect(circles?.length ?? 0).toBe(0);
    });

    it('shows a progress SVG circle when isPrinting is true', () => {
      returnContext = {
        ...mockState,
        viewer: { ...mockState.viewer, print: { ...mockState.viewer.print, isPrinting: true, progress: 0.4 } },
      };
      render(<DefaultToolbar />);

      const printButton = screen.getByLabelText('Cancel print');
      const circles = printButton.querySelectorAll('circle');
      // PrintProgress renders two circles (track + indicator)
      expect(circles.length).toBe(2);
    });
  });

  describe('first/last page buttons disabled at boundaries', () => {
    it('disables the first page button when on the first page', () => {
      returnContext = {
        ...mockState,
        viewer: {
          ...mockState.viewer,
          navigation: { ...mockState.viewer.navigation, pageIndex: 0, canPrev: false },
        },
      };
      render(<DefaultToolbar />);
      expect((screen.getByLabelText('First page') as HTMLButtonElement).disabled).toBe(true);
    });

    it('enables the last page button when not on the last page', () => {
      returnContext = {
        ...mockState,
        viewer: {
          ...mockState.viewer,
          navigation: { ...mockState.viewer.navigation, pageIndex: 0, canPrev: false },
        },
      };
      render(<DefaultToolbar />);
      expect((screen.getByLabelText('Last page') as HTMLButtonElement).disabled).toBe(false);
    });

    it('disables the last page button when on the last page', () => {
      returnContext = {
        ...mockState,
        viewer: {
          ...mockState.viewer,
          navigation: { ...mockState.viewer.navigation, pageIndex: 9, canNext: false },
        },
      };
      render(<DefaultToolbar />);
      expect((screen.getByLabelText('Last page') as HTMLButtonElement).disabled).toBe(true);
    });

    it('enables the first page button when not on the first page', () => {
      returnContext = {
        ...mockState,
        viewer: {
          ...mockState.viewer,
          navigation: { ...mockState.viewer.navigation, pageIndex: 9, canNext: false },
        },
      };
      render(<DefaultToolbar />);
      expect((screen.getByLabelText('First page') as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('sidebar toggle buttons', () => {
    it('renders thumbnail toggle button when inside PDFViewer context', () => {
      render(<DefaultToolbar />);
      expect(screen.getByLabelText('Show thumbnails')).toBeDefined();
    });

    it('renders bookmark toggle button when inside PDFViewer context', () => {
      render(<DefaultToolbar />);
      expect(screen.getByLabelText('Show bookmarks')).toBeDefined();
    });

    it('calls togglePanel("thumbnails") when thumbnail button is clicked', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Show thumbnails'));
      expect(mockPanelState.togglePanel).toHaveBeenCalledWith('thumbnails');
    });

    it('calls togglePanel("bookmarks") when bookmark button is clicked', () => {
      render(<DefaultToolbar />);
      fireEvent.click(screen.getByLabelText('Show bookmarks'));
      expect(mockPanelState.togglePanel).toHaveBeenCalledWith('bookmarks');
    });

    it('shows "Hide thumbnails" label when thumbnails panel is active', () => {
      returnPanelContext = { ...mockPanelState, activePanel: 'thumbnails' };
      render(<DefaultToolbar />);
      expect(screen.getByLabelText('Hide thumbnails')).toBeDefined();
    });

    it('shows "Hide bookmarks" label when bookmarks panel is active', () => {
      returnPanelContext = { ...mockPanelState, activePanel: 'bookmarks' };
      render(<DefaultToolbar />);
      expect(screen.getByLabelText('Hide bookmarks')).toBeDefined();
    });

    it('marks thumbnail button as pressed when thumbnails panel is active', () => {
      returnPanelContext = { ...mockPanelState, activePanel: 'thumbnails' };
      render(<DefaultToolbar />);
      expect(screen.getByLabelText('Hide thumbnails').getAttribute('aria-pressed')).toBe('true');
    });

    it('does not render sidebar toggles when outside PDFViewer context', () => {
      returnContext = null;
      returnPanelContext = null;
      render(<DefaultToolbar viewer={mockState.viewer} />);
      expect(screen.queryByLabelText('Show thumbnails')).toBeNull();
      expect(screen.queryByLabelText('Show bookmarks')).toBeNull();
    });
  });

  describe('responsive breakpoints', () => {
    let observerCallback: ResizeObserverCallback | null = null;
    let observedElement: Element | null = null;

    beforeEach(() => {
      observerCallback = null;
      observedElement = null;

      vi.stubGlobal(
        'ResizeObserver',
        class MockResizeObserver {
          constructor(cb: ResizeObserverCallback) {
            observerCallback = cb;
          }
          observe(el: Element) {
            observedElement = el;
          }
          disconnect() {}
        },
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function triggerResize(width: number, target: Element | null = observedElement) {
      if (!observerCallback || !target) return;
      observerCallback(
        [
          {
            target,
            contentRect: { width, height: 48 } as DOMRectReadOnly,
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          },
        ],
        // biome-ignore lint/suspicious/noExplicitAny: mock instance — type not needed
        {} as any,
      );
    }

    it('hides interaction mode group when toolbar width is below 480px', async () => {
      const { rerender } = render(<DefaultToolbar />);

      triggerResize(479);
      rerender(<DefaultToolbar />);

      expect(screen.queryByLabelText('Pointer tool')).toBeNull();
      expect(screen.queryByLabelText('Hand tool')).toBeNull();
      expect(screen.queryByLabelText('Marquee zoom')).toBeNull();
    });

    it('hides scroll and spread mode selects when toolbar width is below 480px', () => {
      const { rerender } = render(<DefaultToolbar />);

      triggerResize(479);
      rerender(<DefaultToolbar />);

      expect(screen.queryByLabelText('Scroll mode')).toBeNull();
      expect(screen.queryByLabelText('Spread mode')).toBeNull();
    });

    it('shows interaction mode group when toolbar width is 480px or above', () => {
      const { rerender } = render(<DefaultToolbar />);

      triggerResize(480);
      rerender(<DefaultToolbar />);

      expect(screen.getByLabelText('Pointer tool')).toBeDefined();
    });

    it('ignores stale ResizeObserver entries from a different target element', () => {
      const { rerender } = render(<DefaultToolbar />);

      triggerResize(479);
      rerender(<DefaultToolbar />);
      expect(screen.queryByLabelText('Pointer tool')).toBeNull();

      const staleTarget = document.createElement('div');
      triggerResize(900, staleTarget);
      rerender(<DefaultToolbar />);

      expect(screen.queryByLabelText('Pointer tool')).toBeNull();
    });
  });
});
