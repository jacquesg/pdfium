import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InteractionMode } from '../../../../src/react/hooks/use-interaction-mode.js';
import type { KeyboardActions } from '../../../../src/react/hooks/use-keyboard-shortcuts.js';

// ── Mocks ───────────────────────────────────────────────────────

const mockViewerResult = {
  document: { id: 'mock-doc' },
  navigation: {
    pageIndex: 0,
    setPageIndex: vi.fn(),
    pageCount: 5,
    next: vi.fn(),
    prev: vi.fn(),
    canNext: true,
    canPrev: false,
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
    fitPage: vi.fn(),
    fitScale: vi.fn(),
    activeFitMode: null,
  },
  scroll: {
    scrollMode: 'continuous' as const,
    setScrollMode: vi.fn(),
  },
  container: {
    ref: { current: null },
    dimensions: [{ width: 612, height: 792 }],
    zoomAnchorRef: { current: null },
  },
  rotation: {
    getRotation: vi.fn().mockReturnValue(0),
    rotatePage: vi.fn(),
    resetRotation: vi.fn(),
  },
  fullscreen: {
    isFullscreen: false,
    toggleFullscreen: vi.fn(),
  },
  spread: {
    spreadMode: 'none' as const,
    setSpreadMode: vi.fn(),
  },
  print: {
    print: vi.fn(),
  },
  interaction: {
    mode: 'pointer' as InteractionMode,
    setMode: vi.fn(),
    marqueeRect: null,
  },
};

const mockUseViewerSetup = vi.fn((_options?: unknown) => mockViewerResult);

vi.mock('../../../../src/react/hooks/use-viewer-setup.js', () => ({
  useViewerSetup: (options?: unknown) => mockUseViewerSetup(options),
}));

vi.mock('../../../../src/react/hooks/use-document-search.js', () => ({
  useDocumentSearch: () => ({
    totalMatches: 0,
    currentIndex: -1,
    isSearching: false,
    next: vi.fn(),
    prev: vi.fn(),
    resultsByPage: new Map(),
    matchIndexMap: [],
    currentMatchPageIndex: undefined,
  }),
}));

vi.mock('../../../../src/react/hooks/use-keyboard-shortcuts.js', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../../../../src/react/components/default-toolbar.js', () => ({
  DefaultToolbar: (props: Record<string, unknown>) => (
    <div data-testid="default-toolbar" className={props.className as string}>
      {props.children as React.ReactNode}
    </div>
  ),
}));

vi.mock('../../../../src/react/components/pdf-document-view.js', () => ({
  PDFDocumentView: (props: Record<string, unknown>) => (
    <div data-testid="document-view" className={props.className as string} />
  ),
}));

vi.mock('../../../../src/react/components/search-panel.js', () => ({
  SearchPanel: (props: Record<string, unknown>) => (
    <div data-testid="search-panel" className={props.className as string} />
  ),
}));

vi.mock('../../../../src/react/components/thumbnail-strip.js', () => ({
  ThumbnailStrip: (props: Record<string, unknown>) => (
    <div data-testid="thumbnail-strip" className={props.className as string} />
  ),
}));

vi.mock('../../../../src/react/components/bookmark-panel.js', () => ({
  BookmarkPanel: (props: Record<string, unknown>) => (
    <div data-testid="bookmark-panel" className={props.className as string} />
  ),
}));

vi.mock('../../../../src/react/hooks/use-bookmarks.js', () => ({
  useBookmarks: () => ({ data: [] }),
}));

vi.mock('../../../../src/react/components/activity-bar.js', () => ({
  ActivityBar: () => <div data-testid="activity-bar" />,
}));

vi.mock('../../../../src/react/components/sidebar-panel.js', () => ({
  SidebarPanel: (props: Record<string, unknown>) => (
    <div data-testid="sidebar-panel">{props.children as React.ReactNode}</div>
  ),
}));

vi.mock('../../../../src/react/components/marquee-overlay.js', () => ({
  MarqueeOverlay: () => null,
}));

vi.mock('../../../../src/react/components/panels/annotations-panel.js', () => ({
  AnnotationsPanel: () => <div data-testid="annotations-panel" />,
}));

vi.mock('../../../../src/react/components/panels/objects-panel.js', () => ({
  ObjectsPanel: () => <div data-testid="objects-panel" />,
}));

vi.mock('../../../../src/react/components/panels/forms-panel.js', () => ({
  FormsPanel: () => <div data-testid="forms-panel" />,
}));

vi.mock('../../../../src/react/components/panels/text-panel.js', () => ({
  TextPanel: () => <div data-testid="text-panel" />,
}));

vi.mock('../../../../src/react/components/panels/structure-panel.js', () => ({
  StructurePanel: () => <div data-testid="structure-panel" />,
}));

vi.mock('../../../../src/react/components/panels/info-panel.js', () => ({
  InfoPanel: () => <div data-testid="info-panel" />,
}));

const { PDFViewer, usePDFViewer } = await import('../../../../src/react/components/pdf-viewer.js');
const { useKeyboardShortcuts } = await import('../../../../src/react/hooks/use-keyboard-shortcuts.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockUseViewerSetup.mockReturnValue(mockViewerResult);
});

describe('PDFViewer', () => {
  it('renders default layout with toolbar and pages', () => {
    render(<PDFViewer />);

    expect(screen.getByTestId('default-toolbar')).toBeDefined();
    expect(screen.getByTestId('document-view')).toBeDefined();
  });

  it('classNames targets sub-elements', () => {
    render(
      <PDFViewer
        classNames={{
          toolbar: 'custom-toolbar',
          pages: 'custom-pages',
          content: 'custom-content',
        }}
      />,
    );

    expect(screen.getByTestId('default-toolbar').className).toBe('custom-toolbar');
    // classNames.pages is applied to the Pages wrapper div, not directly to PDFDocumentView
    const documentView = screen.getByTestId('document-view');
    const pagesWrapper = documentView.parentElement as HTMLElement;
    expect(pagesWrapper.className).toBe('custom-pages');
  });

  it('passes state to render function', () => {
    const renderFn = vi.fn().mockReturnValue(<div data-testid="custom-content" />);
    render(<PDFViewer>{renderFn}</PDFViewer>);

    expect(renderFn).toHaveBeenCalledTimes(1);
    const state = renderFn.mock.calls[0]![0];
    expect(state).toHaveProperty('viewer');
    expect(state).toHaveProperty('search');
    expect(state).toHaveProperty('searchQuery');
    expect(state).toHaveProperty('toggleSearch');
    expect(state).toHaveProperty('activePanel');
    expect(state).toHaveProperty('togglePanel');
    expect(state).toHaveProperty('setPanelOverlay');
    expect(state).toHaveProperty('documentViewRef');
    expect(screen.getByTestId('custom-content')).toBeDefined();
  });

  it('custom children replace default layout', () => {
    render(
      <PDFViewer>
        <div data-testid="custom-child">Custom</div>
      </PDFViewer>,
    );

    expect(screen.getByTestId('custom-child')).toBeDefined();
    expect(screen.queryByTestId('default-toolbar')).toBeNull();
    expect(screen.queryByTestId('document-view')).toBeNull();
  });

  it('root has structural styles only', () => {
    const { container } = render(<PDFViewer />);

    // Default layout root div has structural flex styles, zero visual styles
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.display).toBe('flex');
    expect(root.style.flexDirection).toBe('column');
    expect(root.style.height).toBe('100%');
    // No colours, borders, shadows, etc.
    expect(root.style.backgroundColor).toBe('');
    expect(root.style.border).toBe('');
  });

  it('forwards custom page gap to useViewerSetup for fit calculations', () => {
    render(<PDFViewer gap={40} />);
    expect(mockUseViewerSetup).toHaveBeenCalledWith(expect.objectContaining({ pageGap: 40 }));
  });
});

describe('usePDFViewer', () => {
  it('throws outside PDFViewer context', () => {
    expect(() => {
      renderHook(() => usePDFViewer());
    }).toThrow('usePDFViewer() must be called inside a <PDFViewer> component.');
  });
});

describe('PDFViewerState', () => {
  it('includes rotation, fullscreen, spread, print, and interaction properties on viewer', () => {
    const renderFn = vi.fn().mockReturnValue(<div data-testid="custom" />);
    render(<PDFViewer>{renderFn}</PDFViewer>);

    const state = renderFn.mock.calls[0]![0];
    const { viewer } = state;

    // rotation
    expect(viewer).toHaveProperty('rotation');

    // fullscreen
    expect(viewer).toHaveProperty('fullscreen');

    // spread
    expect(viewer).toHaveProperty('spread');

    // print
    expect(viewer).toHaveProperty('print');

    // interaction
    expect(viewer).toHaveProperty('interaction');
  });
});

describe('Panel system', () => {
  it('exposes hasPanelBar on panel state', () => {
    const renderFn = vi
      .fn()
      .mockImplementation((s: { hasPanelBar: boolean }) => (
        <div data-testid="spy" data-has-panel-bar={String(s.hasPanelBar)} />
      ));
    // PDFViewer with panels prop provides hasPanelBar: true
    render(<PDFViewer panels={['thumbnails', 'bookmarks']}>{renderFn}</PDFViewer>);

    expect(screen.getByTestId('spy').getAttribute('data-has-panel-bar')).toBe('true');
  });

  it('hasPanelBar is false when no panels configured', () => {
    const renderFn = vi
      .fn()
      .mockImplementation((s: { hasPanelBar: boolean }) => (
        <div data-testid="spy" data-has-panel-bar={String(s.hasPanelBar)} />
      ));
    render(<PDFViewer>{renderFn}</PDFViewer>);

    expect(screen.getByTestId('spy').getAttribute('data-has-panel-bar')).toBe('false');
  });

  it('togglePanel opens a panel', () => {
    let capturedToggle: ((id: string) => void) | undefined;
    const renderFn = vi
      .fn()
      .mockImplementation((s: { togglePanel: (id: string) => void; activePanel: string | null }) => {
        capturedToggle = s.togglePanel;
        return <div data-testid="spy" data-active={String(s.activePanel)} />;
      });
    render(<PDFViewer>{renderFn}</PDFViewer>);

    expect(screen.getByTestId('spy').getAttribute('data-active')).toBe('null');

    act(() => capturedToggle!('thumbnails'));
    expect(screen.getByTestId('spy').getAttribute('data-active')).toBe('thumbnails');
  });

  it('togglePanel switches between panels', () => {
    let capturedToggle: ((id: string) => void) | undefined;
    const renderFn = vi
      .fn()
      .mockImplementation((s: { togglePanel: (id: string) => void; activePanel: string | null }) => {
        capturedToggle = s.togglePanel;
        return <div data-testid="spy" data-active={String(s.activePanel)} />;
      });
    render(<PDFViewer>{renderFn}</PDFViewer>);

    act(() => capturedToggle!('thumbnails'));
    expect(screen.getByTestId('spy').getAttribute('data-active')).toBe('thumbnails');

    act(() => capturedToggle!('bookmarks'));
    expect(screen.getByTestId('spy').getAttribute('data-active')).toBe('bookmarks');
  });

  it('togglePanel closes active panel when toggled again', () => {
    let capturedToggle: ((id: string) => void) | undefined;
    const renderFn = vi
      .fn()
      .mockImplementation((s: { togglePanel: (id: string) => void; activePanel: string | null }) => {
        capturedToggle = s.togglePanel;
        return <div data-testid="spy" data-active={String(s.activePanel)} />;
      });
    render(<PDFViewer>{renderFn}</PDFViewer>);

    act(() => capturedToggle!('thumbnails'));
    expect(screen.getByTestId('spy').getAttribute('data-active')).toBe('thumbnails');

    act(() => capturedToggle!('thumbnails'));
    expect(screen.getByTestId('spy').getAttribute('data-active')).toBe('null');
  });
});

// ---------------------------------------------------------------------------
// Helper — extracts the escape callback from the most recent useKeyboardShortcuts call
// ---------------------------------------------------------------------------

function getEscapeCallback(): (() => void) | undefined {
  const mockFn = useKeyboardShortcuts as ReturnType<typeof vi.fn>;
  const lastCall = mockFn.mock.calls.at(-1);
  if (!lastCall) return undefined;
  const actions = lastCall[0] as KeyboardActions;
  return actions.escape;
}

describe('Escape key — keyboard shortcut handler', () => {
  it('closes the search panel when search is open', () => {
    let capturedToggleSearch: (() => void) | undefined;
    const renderFn = vi.fn().mockImplementation((s: { toggleSearch: () => void; isSearchOpen: boolean }) => {
      capturedToggleSearch = s.toggleSearch;
      return <div data-testid="spy" data-open={String(s.isSearchOpen)} />;
    });
    render(<PDFViewer>{renderFn}</PDFViewer>);

    // Initially closed
    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('false');

    // Open search — must wrap in act so React flushes state
    act(() => {
      capturedToggleSearch!();
    });
    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('true');

    // Trigger escape — should close search
    act(() => {
      getEscapeCallback()!();
    });
    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('false');
  });

  it('resets interaction mode to pointer when search is closed and mode is not pointer', () => {
    mockViewerResult.interaction.mode = 'pan';

    const renderFn = vi
      .fn()
      .mockImplementation((s: { isSearchOpen: boolean }) => (
        <div data-testid="spy" data-open={String(s.isSearchOpen)} />
      ));
    render(<PDFViewer>{renderFn}</PDFViewer>);

    // Search is closed, interaction mode is 'pan'
    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('false');

    // Trigger escape — should call setMode('pointer'), not toggle search
    act(() => {
      getEscapeCallback()!();
    });

    expect(mockViewerResult.interaction.setMode).toHaveBeenCalledWith('pointer');
    // Search remains closed
    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('false');

    // Restore
    mockViewerResult.interaction.mode = 'pointer';
  });

  it('does not reset interaction mode when search is open — escape closes search first', () => {
    mockViewerResult.interaction.mode = 'pan';

    let capturedToggleSearch: (() => void) | undefined;
    const renderFn = vi.fn().mockImplementation((s: { toggleSearch: () => void; isSearchOpen: boolean }) => {
      capturedToggleSearch = s.toggleSearch;
      return <div data-testid="spy" data-open={String(s.isSearchOpen)} />;
    });
    render(<PDFViewer>{renderFn}</PDFViewer>);

    // Open search first
    act(() => {
      capturedToggleSearch!();
    });
    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('true');

    // Trigger escape — should close search, NOT reset interaction mode
    act(() => {
      getEscapeCallback()!();
    });

    expect(screen.getByTestId('spy').getAttribute('data-open')).toBe('false');
    expect(mockViewerResult.interaction.setMode).not.toHaveBeenCalledWith('pointer');

    // Restore
    mockViewerResult.interaction.mode = 'pointer';
  });
});
