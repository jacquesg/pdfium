import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InteractionMode } from '../../../../../src/react/hooks/use-interaction-mode.js';

// ── Mock data (mutable so individual tests can override) ─────

let mockStructureTree: { type: string; title?: string; altText?: string; lang?: string; children: never[] }[] | null =
  null;
let mockNamedDestinations: { name: string; pageIndex: number }[] = [];
const structureTreePageCalls: number[] = [];
let mockDocInfo: {
  isTagged: boolean;
  hasForm: boolean;
  formType: string;
  namedDestinationCount: number;
  pageMode: string;
} | null = null;

const mockViewerResult = {
  viewer: {
    document: { id: 'mock-doc', getNamedDestinationByName: vi.fn() },
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
      scale: 1,
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
  activePanel: 'structure',
  togglePanel: vi.fn(),
  setPanelOverlay: vi.fn(),
};

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => mockViewerResult,
  usePDFPanel: () => ({
    activePanel: mockViewerResult.activePanel,
    togglePanel: mockViewerResult.togglePanel,
    setPanelOverlay: mockViewerResult.setPanelOverlay,
  }),
}));

vi.mock('../../../../../src/react/hooks/use-structure-tree.js', () => ({
  useStructureTree: (_document: unknown, pageIndex: number) => {
    structureTreePageCalls.push(pageIndex);
    return { data: mockStructureTree };
  },
}));

vi.mock('../../../../../src/react/hooks/use-named-destinations.js', () => ({
  useNamedDestinations: () => ({ data: mockNamedDestinations }),
}));

vi.mock('../../../../../src/react/hooks/use-document-info.js', () => ({
  useDocumentInfo: () => ({ data: mockDocInfo }),
}));

const { StructurePanel } = await import('../../../../../src/react/components/panels/structure-panel.js');

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
  mockStructureTree = null;
  mockNamedDestinations = [];
  structureTreePageCalls.length = 0;
  mockDocInfo = null;
  mockViewerResult.viewer.document = { id: 'mock-doc', getNamedDestinationByName: vi.fn() };
});

describe('StructurePanel', () => {
  it('renders sub-tabs', () => {
    render(<StructurePanel />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.textContent).toBe('Structure');
    expect(tabs[1]!.textContent).toBe('Named Dests');
  });

  it('shows structure tree in structure tab', () => {
    mockDocInfo = {
      isTagged: true,
      hasForm: false,
      formType: 'none',
      namedDestinationCount: 0,
      pageMode: 'UseNone',
    };

    mockStructureTree = [
      { type: 'Document', title: 'My Doc', children: [] },
      { type: 'P', children: [] },
    ];

    render(<StructurePanel />);

    // Switch to Structure tab
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));

    expect(screen.getByText('Tagged')).toBeDefined();
    expect(screen.getByText(/Document/)).toBeDefined();
  });

  it('shows named destinations', () => {
    mockNamedDestinations = [
      { name: 'chapter1', pageIndex: 0 },
      { name: 'appendix', pageIndex: 5 },
    ];

    render(<StructurePanel />);

    // Switch to Named Dests tab
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    expect(screen.getByText('chapter1')).toBeDefined();
    expect(screen.getByText('appendix')).toBeDefined();
  });

  it('switching tabs works', () => {
    render(<StructurePanel />);

    // Default is Structure
    const structureTab = screen.getByRole('tab', { name: 'Structure' });
    expect(structureTab.getAttribute('aria-selected')).toBe('true');

    // Switch to Named Dests
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));
    expect(screen.getByRole('tab', { name: 'Named Dests' }).getAttribute('aria-selected')).toBe('true');
    expect(structureTab.getAttribute('aria-selected')).toBe('false');

    // Switch back to Structure
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    expect(screen.getByRole('tab', { name: 'Structure' }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows empty states per tab when no data', () => {
    render(<StructurePanel />);

    // Structure — not tagged (default tab)
    expect(screen.getByText('Not Tagged')).toBeDefined();
    expect(screen.getByText(/Structure information is unavailable/)).toBeDefined();

    // Named Dests empty
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));
    expect(screen.getByText('No named destinations found.')).toBeDefined();
  });

  it('uses unique structure page selector ids across multiple instances', () => {
    mockDocInfo = {
      isTagged: true,
      hasForm: false,
      formType: 'none',
      namedDestinationCount: 0,
      pageMode: 'UseNone',
    };

    const { container } = render(
      <>
        <StructurePanel />
        <StructurePanel />
      </>,
    );

    const selects = Array.from(container.querySelectorAll<HTMLSelectElement>('select'));
    expect(selects.length).toBeGreaterThanOrEqual(2);
    const ids = selects.map((select) => select.id).filter((id) => id.length > 0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses unique named-destination search ids across multiple instances', () => {
    const { container } = render(
      <>
        <StructurePanel />
        <StructurePanel />
      </>,
    );

    for (const tab of screen.getAllByRole('tab', { name: 'Named Dests' })) {
      fireEvent.click(tab);
    }

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]'));
    expect(inputs).toHaveLength(2);
    const ids = inputs.map((input) => input.id);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores stale named-destination search completion after a newer search starts', async () => {
    const stale = deferred<{ name: string; pageIndex: number } | null>();
    const getNamedDestinationByName = vi.fn((name: string) => {
      if (name === 'old') return stale.promise;
      if (name === 'new') return Promise.resolve({ name: 'new', pageIndex: 2 });
      return Promise.resolve(null);
    });
    mockViewerResult.viewer.document = { id: 'doc-1', getNamedDestinationByName };

    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'old' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('new')).toBeDefined();
    });

    await act(async () => {
      stale.resolve({ name: 'old', pageIndex: 0 });
      await stale.promise;
    });

    expect(screen.getByText('new')).toBeDefined();
    expect(screen.queryByText('old')).toBeNull();
  });

  it('ignores stale named-destination completion after document switch', async () => {
    const stale = deferred<{ name: string; pageIndex: number } | null>();
    const staleDoc = {
      id: 'stale-doc',
      getNamedDestinationByName: vi.fn().mockReturnValue(stale.promise),
    };
    const freshDoc = {
      id: 'fresh-doc',
      getNamedDestinationByName: vi.fn().mockResolvedValue(null),
    };
    mockViewerResult.viewer.document = staleDoc;

    const { rerender } = render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'legacy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    mockViewerResult.viewer.document = freshDoc;
    rerender(<StructurePanel />);

    await act(async () => {
      stale.resolve({ name: 'legacy-result', pageIndex: 9 });
      await stale.promise;
    });

    expect(screen.queryByText('legacy-result')).toBeNull();
  });

  it('clamps structure page selection on document switch when pageCount shrinks', () => {
    mockDocInfo = {
      isTagged: true,
      hasForm: false,
      formType: 'none',
      namedDestinationCount: 0,
      pageMode: 'UseNone',
    };

    mockViewerResult.viewer.navigation.pageCount = 4;
    const { rerender } = render(<StructurePanel />);
    const pageSelect = screen.getByLabelText('Page:') as HTMLSelectElement;

    fireEvent.change(pageSelect, { target: { value: '3' } });
    expect(structureTreePageCalls.at(-1)).toBe(3);

    mockViewerResult.viewer.document = { id: 'doc-2', getNamedDestinationByName: vi.fn() };
    mockViewerResult.viewer.navigation.pageCount = 1;
    rerender(<StructurePanel />);

    expect(structureTreePageCalls.at(-1)).toBe(0);
    expect(pageSelect.value).toBe('0');
  });

  it('resets structure page selection to current viewer page on document switch', () => {
    mockDocInfo = {
      isTagged: true,
      hasForm: false,
      formType: 'none',
      namedDestinationCount: 0,
      pageMode: 'UseNone',
    };

    mockViewerResult.viewer.navigation.pageCount = 6;
    mockViewerResult.viewer.navigation.pageIndex = 0;
    const { rerender } = render(<StructurePanel />);
    const pageSelect = screen.getByLabelText('Page:') as HTMLSelectElement;

    fireEvent.change(pageSelect, { target: { value: '4' } });
    expect(structureTreePageCalls.at(-1)).toBe(4);

    mockViewerResult.viewer.document = { id: 'doc-3', getNamedDestinationByName: vi.fn() };
    mockViewerResult.viewer.navigation.pageIndex = 1;
    rerender(<StructurePanel />);

    expect(structureTreePageCalls.at(-1)).toBe(1);
    expect(pageSelect.value).toBe('1');
  });

  it('does not execute named destination search for whitespace query or non-Enter keydown', async () => {
    const getNamedDestinationByName = vi.fn().mockResolvedValue({ name: 'never', pageIndex: 0 });
    mockViewerResult.viewer.document = { id: 'doc-search', getNamedDestinationByName };

    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'x' });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(getNamedDestinationByName).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('never')).toBeNull();
  });

  it('shows not-found message when named destination lookup throws', async () => {
    mockViewerResult.viewer.document = {
      id: 'doc-error',
      getNamedDestinationByName: vi.fn().mockRejectedValue(new Error('lookup failed')),
    };

    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'chapter-x' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('No destination found for “chapter-x”')).toBeDefined();
    });
  });

  it('does not search when viewer document is null', async () => {
    mockViewerResult.viewer.document = null as never;
    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'chapter1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.queryByText(/No destination found/)).toBeNull();
    });
  });

  it('handles null named-destination list payloads as empty', () => {
    mockNamedDestinations = null as never;
    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));
    expect(screen.getByText('No named destinations found.')).toBeDefined();
  });

  it('treats undefined named destination search responses as not found', async () => {
    mockViewerResult.viewer.document = {
      id: 'doc-undefined',
      getNamedDestinationByName: vi.fn().mockResolvedValue(undefined),
    };
    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('No destination found for “missing”')).toBeDefined();
    });
  });

  it('ignores stale rejected search result after a newer successful search', async () => {
    const staleReject = deferred<never>();
    const getNamedDestinationByName = vi.fn((name: string) => {
      if (name === 'old') return staleReject.promise;
      if (name === 'new') return Promise.resolve({ name: 'new', pageIndex: 2 });
      return Promise.resolve(null);
    });
    mockViewerResult.viewer.document = { id: 'doc-race', getNamedDestinationByName };

    render(<StructurePanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Named Dests' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'old' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('new')).toBeDefined();
    });

    await act(async () => {
      staleReject.reject(new Error('stale failure'));
      await staleReject.promise.catch(() => undefined);
    });
    expect(screen.getByText('new')).toBeDefined();
    expect(screen.queryByText('No destination found for “new”')).toBeNull();
  });
});
