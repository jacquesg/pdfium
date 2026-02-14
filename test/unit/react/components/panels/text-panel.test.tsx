import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InteractionMode } from '../../../../../src/react/hooks/use-interaction-mode.js';
import { createMockDocument, createMockPage } from '../../../../react-setup.js';

// ── Mock data ────────────────────────────────────────────────

const mockSetPanelOverlay = vi.fn();

const mockViewerResult = {
  viewer: {
    document: { id: 'mock-doc' },
    navigation: {
      pageIndex: 0,
      setPageIndex: vi.fn(),
      pageCount: 3,
      next: vi.fn(),
      prev: vi.fn(),
      canNext: true,
      canPrev: false,
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
    fit: { fitWidth: vi.fn(), fitPage: vi.fn(), fitScale: vi.fn(), activeFitMode: null },
    scroll: { scrollMode: 'continuous' as const, setScrollMode: vi.fn() },
    container: {
      ref: { current: null },
      dimensions: [{ width: 612, height: 792 }],
      zoomAnchorRef: { current: null },
    },
    rotation: { getRotation: vi.fn().mockReturnValue(0), rotatePage: vi.fn(), resetRotation: vi.fn() },
    fullscreen: { isFullscreen: false, toggleFullscreen: vi.fn() },
    spread: { spreadMode: 'none' as const, setSpreadMode: vi.fn() },
    print: { print: vi.fn() },
    interaction: { mode: 'pointer' as InteractionMode, setMode: vi.fn(), marqueeRect: null },
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
  },
  searchQuery: '',
  setSearchQuery: vi.fn(),
  isSearchOpen: false,
  toggleSearch: vi.fn(),
  documentViewRef: { current: null },
  activePanel: 'text',
  togglePanel: vi.fn(),
  setPanelOverlay: mockSetPanelOverlay,
};

let mockTextContent: { text: string; rects: Float32Array } | undefined;

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => mockViewerResult,
  usePDFPanel: () => ({
    activePanel: mockViewerResult.activePanel,
    togglePanel: mockViewerResult.togglePanel,
    setPanelOverlay: mockViewerResult.setPanelOverlay,
  }),
}));

vi.mock('../../../../../src/react/hooks/use-text-content.js', () => ({
  useTextContent: () => ({ data: mockTextContent }),
}));

vi.mock('../../../../../src/react/components/character-inspector-overlay.js', () => ({
  CharacterInspectorOverlay: ({ children }: { children: (info: null) => React.ReactNode }) => (
    <div data-testid="character-inspector">{children(null)}</div>
  ),
}));

const { TextPanel } = await import('../../../../../src/react/components/panels/text-panel.js');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockTextContent = undefined;
});

describe('TextPanel', () => {
  it('renders two sub-tabs (Characters and Extraction)', () => {
    render(<TextPanel />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.textContent).toBe('Characters');
    expect(tabs[1]!.textContent).toBe('Extraction');
  });

  it('default tab is Characters on mount', () => {
    render(<TextPanel />);

    const charactersTab = screen.getByRole('tab', { name: 'Characters' });
    expect(charactersTab.getAttribute('aria-selected')).toBe('true');

    const extractionTab = screen.getByRole('tab', { name: 'Extraction' });
    expect(extractionTab.getAttribute('aria-selected')).toBe('false');
  });

  it('switching tabs changes visible content', () => {
    render(<TextPanel />);

    // Characters tab is active — should show hover instruction text
    expect(screen.getByText(/Hover over a character/)).toBeDefined();
    expect(screen.queryByText('Full Page Text')).toBeNull();

    // Switch to Extraction tab
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));

    expect(screen.queryByText(/Hover over a character/)).toBeNull();
    expect(screen.getByText('Full Page Text')).toBeDefined();
  });

  it('calls setPanelOverlay when characters tab is active', () => {
    render(<TextPanel />);

    // On mount with characters tab active, setPanelOverlay should be called with a function
    expect(mockSetPanelOverlay).toHaveBeenCalled();
    const lastCall = mockSetPanelOverlay.mock.calls[mockSetPanelOverlay.mock.calls.length - 1];
    expect(typeof lastCall![0]).toBe('function');
  });

  it('clears panel overlay when switching away from characters tab', () => {
    render(<TextPanel />);

    mockSetPanelOverlay.mockClear();

    // Switch to Extraction tab
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));

    // setPanelOverlay should be called with null to clear the overlay
    const nullCalls = mockSetPanelOverlay.mock.calls.filter((call: unknown[]) => call[0] === null);
    expect(nullCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('extraction area shows text content', () => {
    mockTextContent = { text: 'Hello World from PDF', rects: new Float32Array(0) };

    render(<TextPanel />);

    // Switch to Extraction tab
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));

    const textarea = screen.getByLabelText('Full page text content') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Hello World from PDF');
    expect(screen.getByText('20 characters')).toBeDefined();
  });

  it('shows empty state when no document is loaded', () => {
    const originalDoc = mockViewerResult.viewer.document;
    (mockViewerResult.viewer as Record<string, unknown>).document = null;

    render(<TextPanel />);

    expect(screen.getByText('Load a document to inspect text.')).toBeDefined();

    (mockViewerResult.viewer as Record<string, unknown>).document = originalDoc;
  });

  it('extraction tab shows 0 characters when text content is empty', () => {
    mockTextContent = { text: '', rects: new Float32Array(0) };

    render(<TextPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));

    expect(screen.getByText('0 characters')).toBeDefined();
    const textarea = screen.getByLabelText('Full page text content') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('keeps coordinate input stable when an invalid numeric value is entered', () => {
    render(<TextPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));

    const leftInput = screen.getByLabelText('Left coordinate') as HTMLInputElement;
    expect(leftInput.value).toBe('0');

    fireEvent.change(leftInput, { target: { value: 'invalid' } });
    expect(leftInput.value).toBe('0');
  });

  it('ignores stale extraction completion after page navigation', async () => {
    const pendingExtract = deferred<string>();
    const asyncDisposeSymbol =
      (Symbol as typeof Symbol & { asyncDispose?: symbol }).asyncDispose ?? Symbol.for('Symbol.asyncDispose');
    const disposeSymbol = (Symbol as typeof Symbol & { dispose?: symbol }).dispose ?? Symbol.for('Symbol.dispose');
    const getTextInRect = vi.fn().mockReturnValue(pendingExtract.promise);
    const page = createMockPage({
      getTextInRect,
      [asyncDisposeSymbol]: vi.fn().mockResolvedValue(undefined),
      [disposeSymbol]: vi.fn(),
    });
    const doc = createMockDocument({
      getPage: vi.fn().mockResolvedValue(page),
    });
    (mockViewerResult.viewer as Record<string, unknown>).document = doc;

    const { rerender } = render(<TextPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));
    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));

    mockViewerResult.viewer.navigation.pageIndex = 1;
    rerender(<TextPanel />);

    await act(async () => {
      pendingExtract.resolve('stale extracted text');
      await Promise.resolve();
    });

    expect(getTextInRect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('stale extracted text')).toBeNull();
    });
  });

  it('keeps latest extraction result when rapid extractions resolve out of order', async () => {
    const firstExtract = deferred<string>();
    const secondExtract = deferred<string>();
    const asyncDisposeSymbol =
      (Symbol as typeof Symbol & { asyncDispose?: symbol }).asyncDispose ?? Symbol.for('Symbol.asyncDispose');
    const disposeSymbol = (Symbol as typeof Symbol & { dispose?: symbol }).dispose ?? Symbol.for('Symbol.dispose');
    const getTextInRect = vi.fn().mockReturnValueOnce(firstExtract.promise).mockReturnValueOnce(secondExtract.promise);
    const page = createMockPage({
      getTextInRect,
      [asyncDisposeSymbol]: vi.fn().mockResolvedValue(undefined),
      [disposeSymbol]: vi.fn(),
    });
    const doc = createMockDocument({
      getPage: vi.fn().mockResolvedValue(page),
    });
    (mockViewerResult.viewer as Record<string, unknown>).document = doc;

    render(<TextPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Extraction' }));

    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
    fireEvent.change(screen.getByLabelText('Left coordinate'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));

    await act(async () => {
      secondExtract.resolve('latest extracted text');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('latest extracted text')).toBeDefined();
    });

    await act(async () => {
      firstExtract.resolve('stale extracted text');
      await Promise.resolve();
    });

    expect(getTextInRect).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.queryByText('stale extracted text')).toBeNull();
      expect(screen.getByText('latest extracted text')).toBeDefined();
    });
  });
});
