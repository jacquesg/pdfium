import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const panelOverlaySpy = vi.fn();
const usePanelSelectionOverlaySpy = vi.fn();
const useTextContentSpy = vi.fn();

const viewerState = {
  viewer: {
    document: null as null | { getPage: (pageIndex: number) => Promise<unknown> },
    navigation: { pageIndex: 0 },
    zoom: { scale: 1 },
    container: { dimensions: [{ width: 612, height: 792 }] },
  },
};

vi.mock('../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => viewerState,
  usePDFPanel: () => ({ setPanelOverlay: panelOverlaySpy }),
}));

vi.mock('../../../../src/react/hooks/use-text-content.js', () => ({
  useTextContent: (...args: unknown[]) => useTextContentSpy(...args),
}));

vi.mock('../../../../src/react/internal/use-panel-selection-overlay.js', () => ({
  usePanelSelectionOverlay: (...args: unknown[]) => usePanelSelectionOverlaySpy(...args),
}));

vi.mock('../../../../src/react/internal/empty-panel-state.js', () => ({
  EmptyPanelState: ({ message }: { message: string }) => <div data-testid="empty-state">{message}</div>,
}));

vi.mock('../../../../src/react/components/character-inspector-overlay.js', () => ({
  CharacterInspectorOverlay: ({ pageIndex }: { pageIndex: number }) => <div data-testid={`overlay-${pageIndex}`} />,
}));

vi.mock('../../../../src/react/internal/panel-tabs.js', () => ({
  PanelTabs: ({
    tabs,
    onChange,
    children,
  }: {
    tabs: Array<{ id: string; label: string }>;
    onChange: (id: string) => void;
    children: ReactNode;
  }) => (
    <div>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" onClick={() => onChange(tab.id)}>
          tab:{tab.id}
        </button>
      ))}
      <button type="button" onClick={() => onChange('invalid-tab')}>
        tab:invalid
      </button>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('../../../../src/react/internal/text-panel-view.js', () => ({
  TEXT_PANEL_TABS: [
    { id: 'characters', label: 'Characters' },
    { id: 'extraction', label: 'Extraction' },
  ],
  TextCharactersPane: ({ charDetail }: { charDetail: unknown }) => (
    <div data-testid="characters-pane">{charDetail ? 'has-char' : 'no-char'}</div>
  ),
  TextExtractionPane: ({
    onExtract,
    onCoordKeyDown,
    extractError,
    extractedRect,
  }: {
    onExtract: () => Promise<void>;
    onCoordKeyDown: (event: { key: string }) => void;
    extractError: string | null;
    extractedRect: string | null;
  }) => (
    <div data-testid="extraction-pane">
      <button type="button" onClick={() => void onExtract()}>
        run-extract
      </button>
      <button type="button" onClick={() => onCoordKeyDown({ key: 'Enter' })}>
        coord-enter
      </button>
      <button type="button" onClick={() => onCoordKeyDown({ key: 'x' })}>
        coord-other
      </button>
      <div data-testid="extract-error">{extractError ?? ''}</div>
      <div data-testid="extract-rect">{extractedRect ?? ''}</div>
    </div>
  ),
}));

const { TextPanelRootView } = await import('../../../../src/react/internal/text-panel-root-view.js');

function createPage(getTextInRect: () => Promise<string>): {
  getTextInRect: () => Promise<string>;
  [Symbol.asyncDispose]: () => Promise<void>;
} {
  return {
    getTextInRect,
    [Symbol.asyncDispose]: async () => {},
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('text-panel-root-view', () => {
  beforeEach(() => {
    panelOverlaySpy.mockReset();
    usePanelSelectionOverlaySpy.mockReset();
    useTextContentSpy.mockReset();
    useTextContentSpy.mockReturnValue({ data: { text: 'Full text content' } });
    viewerState.viewer.navigation.pageIndex = 0;
    viewerState.viewer.zoom.scale = 1;
    viewerState.viewer.container.dimensions = [{ width: 612, height: 792 }];
  });

  it('renders empty state when document is missing and overlay renderer returns null', () => {
    viewerState.viewer.document = null;
    render(<TextPanelRootView />);

    expect(screen.getByTestId('empty-state').textContent).toContain('Load a document');
    const overlayArgs = usePanelSelectionOverlaySpy.mock.calls.at(-1)?.[0] as {
      selectedItem: unknown;
      createOverlayRenderer: (
        enabled: true,
        pageIndex: number,
      ) => (info: {
        pageIndex: number;
        width: number;
        height: number;
        originalWidth: number;
        originalHeight: number;
      }) => unknown;
    };
    expect(overlayArgs.selectedItem).toBeNull();
    const renderer = overlayArgs.createOverlayRenderer(true, 0);
    expect(renderer({ pageIndex: 0, width: 100, height: 100, originalWidth: 100, originalHeight: 100 })).toBeNull();
  });

  it('ignores invalid tab ids and switches to extraction on valid tab change', () => {
    viewerState.viewer.document = {
      getPage: async () => createPage(async () => 'ok'),
    };
    render(<TextPanelRootView />);

    expect(screen.getByTestId('characters-pane').textContent).toBe('no-char');
    fireEvent.click(screen.getByRole('button', { name: 'tab:invalid' }));
    expect(screen.getByTestId('characters-pane').textContent).toBe('no-char');

    fireEvent.click(screen.getByRole('button', { name: 'tab:extraction' }));
    expect(screen.getByTestId('extraction-pane')).toBeDefined();
  });

  it('creates overlay renderer that only renders on matching page', () => {
    viewerState.viewer.document = {
      getPage: async () => createPage(async () => 'ok'),
    };
    render(<TextPanelRootView />);

    const overlayArgs = usePanelSelectionOverlaySpy.mock.calls.at(-1)?.[0] as {
      createOverlayRenderer: (
        enabled: true,
        pageIndex: number,
      ) => (info: {
        pageIndex: number;
        width: number;
        height: number;
        originalWidth: number;
        originalHeight: number;
      }) => unknown;
    };
    const renderer = overlayArgs.createOverlayRenderer(true, 2);
    expect(renderer({ pageIndex: 1, width: 100, height: 100, originalWidth: 100, originalHeight: 100 })).toBeNull();

    const overlayNode = renderer({
      pageIndex: 2,
      width: 100,
      height: 100,
      originalWidth: 100,
      originalHeight: 100,
    }) as {
      props: { pageIndex: number };
    };
    expect(overlayNode).toBeDefined();
    expect(overlayNode.props.pageIndex).toBe(2);
  });

  it('runs extraction when Enter is pressed in coordinate input handler', async () => {
    const getTextInRect = vi.fn().mockResolvedValue('rect text');
    viewerState.viewer.document = {
      getPage: async () => createPage(getTextInRect),
    };
    render(<TextPanelRootView />);

    fireEvent.click(screen.getByRole('button', { name: 'tab:extraction' }));
    fireEvent.click(screen.getByRole('button', { name: 'coord-enter' }));

    await waitFor(() => {
      expect(screen.getByTestId('extract-rect').textContent).toBe('rect text');
    });
    expect(getTextInRect).toHaveBeenCalledTimes(1);
  });

  it('does not run extraction for non-Enter coordinate keys', async () => {
    const getTextInRect = vi.fn().mockResolvedValue('rect text');
    viewerState.viewer.document = {
      getPage: async () => createPage(getTextInRect),
    };
    render(<TextPanelRootView />);

    fireEvent.click(screen.getByRole('button', { name: 'tab:extraction' }));
    fireEvent.click(screen.getByRole('button', { name: 'coord-other' }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(getTextInRect).not.toHaveBeenCalled();
  });

  it('sets extraction error messages for Error and non-Error failures', async () => {
    const errorDoc = {
      getPage: vi.fn().mockRejectedValueOnce(new Error('extract failed')).mockRejectedValueOnce('raw-failure'),
    };
    viewerState.viewer.document = errorDoc;
    render(<TextPanelRootView />);

    fireEvent.click(screen.getByRole('button', { name: 'tab:extraction' }));
    fireEvent.click(screen.getByRole('button', { name: 'run-extract' }));
    await waitFor(() => {
      expect(screen.getByTestId('extract-error').textContent).toBe('extract failed');
    });

    fireEvent.click(screen.getByRole('button', { name: 'run-extract' }));
    await waitFor(() => {
      expect(screen.getByTestId('extract-error').textContent).toBe('Extraction failed');
    });
  });

  it('ignores stale extraction failures after a newer request starts', async () => {
    const staleError = deferred<string>();
    const getPage = vi
      .fn()
      .mockResolvedValueOnce(createPage(() => staleError.promise.then((value) => Promise.reject(new Error(value)))))
      .mockResolvedValueOnce(createPage(async () => Promise.reject(new Error('fresh failure'))));
    viewerState.viewer.document = { getPage };
    render(<TextPanelRootView />);

    fireEvent.click(screen.getByRole('button', { name: 'tab:extraction' }));
    fireEvent.click(screen.getByRole('button', { name: 'run-extract' }));
    fireEvent.click(screen.getByRole('button', { name: 'run-extract' }));

    await waitFor(() => {
      expect(screen.getByTestId('extract-error').textContent).toBe('fresh failure');
    });

    await act(async () => {
      staleError.resolve('stale failure');
      await staleError.promise;
    });
    expect(screen.getByTestId('extract-error').textContent).toBe('fresh failure');
  });
});
