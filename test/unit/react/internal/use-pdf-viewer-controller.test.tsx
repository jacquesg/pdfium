import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { KeyboardActions } from '../../../../src/react/hooks/use-keyboard-shortcuts.js';

const mockViewer = {
  document: null,
  zoom: {
    setScale: vi.fn(),
  },
  scroll: {
    scrollMode: 'continuous' as const,
  },
} as never;

const mockSearchResult = {
  totalMatches: 0,
  currentIndex: -1,
  isSearching: false,
  next: vi.fn(),
  prev: vi.fn(),
  resultsByPage: new Map<number, unknown>(),
  matchIndexMap: [],
  currentMatchPageIndex: undefined,
};

const mockUseViewerSetup = vi.fn((_options?: unknown) => mockViewer);
const mockUseDocumentSearch = vi.fn((_document?: unknown, _query?: string) => mockSearchResult);
const mockUseResize = vi.fn(() => ({
  width: 280,
  handleProps: {
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
    style: { cursor: 'col-resize' },
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-label': 'Resize sidebar',
    'aria-valuenow': 280,
    'aria-valuemin': 200,
    'aria-valuemax': 500,
    tabIndex: 0,
    'data-pdfium-resize-handle': '',
  },
  isResizing: false,
}));

const togglePanelSpy = vi.fn();
const setPanelOverlaySpy = vi.fn();
const mockUseViewerPanels = vi.fn((options?: { initialPanel?: string }) => ({
  activePanel: options?.initialPanel ?? null,
  togglePanel: togglePanelSpy,
  setPanelOverlay: setPanelOverlaySpy,
  panelOverlayRef: { current: null },
  overlayVersion: 1,
  lastFocusedButtonRef: { current: null },
  panelContainerRef: { current: null },
}));

const mockKeyboardActions: KeyboardActions = { nextPage: vi.fn() };
const mockCreateViewerKeyboardActions = vi.fn((_options?: unknown) => mockKeyboardActions);

vi.mock('../../../../src/react/hooks/use-viewer-setup.js', () => ({
  useViewerSetup: (options?: unknown) => mockUseViewerSetup(options),
}));

vi.mock('../../../../src/react/hooks/use-document-search.js', () => ({
  useDocumentSearch: (document?: unknown, query?: string) => mockUseDocumentSearch(document, query),
}));

vi.mock('../../../../src/react/hooks/use-resize.js', () => ({
  useResize: () => mockUseResize(),
}));

vi.mock('../../../../src/react/internal/use-viewer-panels.js', () => ({
  useViewerPanels: (options?: { initialPanel?: string }) => mockUseViewerPanels(options),
}));

vi.mock('../../../../src/react/hooks/use-keyboard-shortcuts.js', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../../../../src/react/internal/viewer-keyboard-actions.js', () => ({
  createViewerKeyboardActions: (options?: unknown) => mockCreateViewerKeyboardActions(options),
}));

const { usePDFViewerController } = await import('../../../../src/react/internal/use-pdf-viewer-controller.js');
const { useKeyboardShortcuts } = await import('../../../../src/react/hooks/use-keyboard-shortcuts.js');

describe('usePDFViewerController', () => {
  it('wires viewer options and keyboard shortcuts', () => {
    const { result } = renderHook(() =>
      usePDFViewerController({
        initialScale: 1.5,
        initialScrollMode: 'horizontal',
        initialSpreadMode: 'even',
        initialInteractionMode: 'pan',
        gap: 32,
        keyboardShortcuts: true,
        showSearch: true,
        panels: ['thumbnails'],
        initialPanel: 'thumbnails',
      }),
    );

    expect(mockUseViewerSetup).toHaveBeenCalledWith({
      initialScale: 1.5,
      initialScrollMode: 'horizontal',
      initialSpreadMode: 'even',
      initialInteractionMode: 'pan',
      pageGap: 32,
    });
    expect(result.current.viewerState.viewer).toBe(mockViewer);
    expect(result.current.panelState.activePanel).toBe('thumbnails');
    expect(result.current.panelState.hasPanelBar).toBe(true);

    expect(mockCreateViewerKeyboardActions).toHaveBeenCalledWith(
      expect.objectContaining({
        viewer: mockViewer,
        showSearch: true,
        isSearchOpen: false,
      }),
    );
    expect(useKeyboardShortcuts).toHaveBeenCalledWith(mockKeyboardActions, {
      enabled: true,
      scrollMode: 'continuous',
    });
  });

  it('toggles search and clears query when closing', () => {
    const { result } = renderHook(() =>
      usePDFViewerController({
        keyboardShortcuts: false,
        showSearch: true,
      }),
    );

    act(() => {
      result.current.viewerState.setSearchQuery('needle');
    });
    expect(result.current.viewerState.searchQuery).toBe('needle');
    expect(result.current.viewerState.isSearchOpen).toBe(false);

    act(() => {
      result.current.viewerState.toggleSearch();
    });
    expect(result.current.viewerState.isSearchOpen).toBe(true);
    expect(result.current.viewerState.searchQuery).toBe('needle');

    act(() => {
      result.current.viewerState.toggleSearch();
    });
    expect(result.current.viewerState.isSearchOpen).toBe(false);
    expect(result.current.viewerState.searchQuery).toBe('');
  });

  it('sets hasPanelBar based on configured panels', () => {
    const { result: withoutPanels } = renderHook(() =>
      usePDFViewerController({
        keyboardShortcuts: false,
        showSearch: false,
        panels: undefined,
      }),
    );
    expect(withoutPanels.current.panelState.hasPanelBar).toBe(false);

    const { result: withPanels } = renderHook(() =>
      usePDFViewerController({
        keyboardShortcuts: false,
        showSearch: false,
        panels: ['bookmarks'],
      }),
    );
    expect(withPanels.current.panelState.hasPanelBar).toBe(true);
  });

  it('binds panel overlay writes to the active panel identity for stale-writer protection', () => {
    let activePanel: string | null = 'thumbnails';
    mockUseViewerPanels.mockImplementation(() => ({
      activePanel,
      togglePanel: togglePanelSpy,
      setPanelOverlay: setPanelOverlaySpy,
      panelOverlayRef: { current: null },
      overlayVersion: 1,
      lastFocusedButtonRef: { current: null },
      panelContainerRef: { current: null },
    }));

    const { result, rerender } = renderHook(
      ({ revision }: { revision: number }) =>
        usePDFViewerController({
          keyboardShortcuts: false,
          showSearch: false,
          panels: ['thumbnails', 'bookmarks'],
          initialPanel: 'thumbnails',
          gap: revision,
        }),
      {
        initialProps: { revision: 10 },
      },
    );

    const staleWriter = result.current.panelState.setPanelOverlay;

    activePanel = 'bookmarks';
    rerender({ revision: 20 });

    act(() => {
      staleWriter(() => null);
    });
    expect(setPanelOverlaySpy).toHaveBeenCalledWith(expect.any(Function), 'thumbnails');

    act(() => {
      result.current.panelState.setPanelOverlay(() => null);
    });
    expect(setPanelOverlaySpy).toHaveBeenLastCalledWith(expect.any(Function), 'bookmarks');
  });
});
