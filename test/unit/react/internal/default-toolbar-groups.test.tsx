import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type ButtonFactory = () => {
  type: 'button';
  disabled: boolean;
  onClick: () => void;
  'aria-label': string;
};

const noopButton =
  (label: string): ButtonFactory =>
  () => ({
    type: 'button',
    disabled: false,
    onClick: vi.fn(),
    'aria-label': label,
  });

const setScrollMode = vi.fn();
const setSpreadMode = vi.fn();
const togglePanel = vi.fn();
const toggleSearch = vi.fn();
const toggleFullscreen = vi.fn();

const toolbarContext = {
  scrollMode: { scrollMode: 'continuous' as 'continuous' | 'single' | 'horizontal', setScrollMode },
  fit: {
    activeFitMode: null as null | 'page-width' | 'page-height' | 'page-fit',
    getFitWidthProps: noopButton('Fit to width'),
    getFitHeightProps: noopButton('Fit to height'),
    getFitPageProps: noopButton('Fit to page'),
  },
  spread: { spreadMode: 'none' as 'none' | 'odd' | 'even', setSpreadMode },
  interaction: {
    mode: 'pointer' as 'pointer' | 'pan' | 'marquee-zoom',
    getPointerProps: noopButton('Pointer tool'),
    getPanProps: noopButton('Hand tool'),
    getMarqueeProps: noopButton('Marquee zoom'),
  },
  rotation: {
    getRotateCwProps: noopButton('Rotate clockwise'),
    getRotateCcwProps: noopButton('Rotate counter-clockwise'),
  },
  search: {
    isOpen: false,
    getToggleProps: noopButton('Open search'),
  },
  fullscreen: {
    isFullscreen: false,
    getToggleProps: () => ({
      type: 'button' as const,
      disabled: false,
      onClick: toggleFullscreen,
      'aria-label': 'Enter fullscreen',
      'aria-pressed': false,
    }),
  },
};

let panelContext: { activePanel: string | null; hasPanelBar: boolean; togglePanel: (panel: string) => void } | null = {
  activePanel: null,
  hasPanelBar: false,
  togglePanel,
};
let viewerContext: object | null = {};

vi.mock('../../../../src/react/components/pdf-toolbar.js', () => ({
  useToolbarContext: () => toolbarContext,
}));

vi.mock('../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFPanelOptional: () => panelContext,
  usePDFViewerOptional: () => viewerContext,
}));

const { FitGroup, FullscreenButton, PanelToggles, PrintProgress, ScrollAndSpreadGroup, SearchButton } = await import(
  '../../../../src/react/internal/default-toolbar-groups.js'
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  toolbarContext.scrollMode.scrollMode = 'continuous';
  toolbarContext.search = { isOpen: false, getToggleProps: noopButton('Open search') };
  panelContext = { activePanel: null, hasPanelBar: false, togglePanel };
  viewerContext = {};
});

describe('default-toolbar-groups', () => {
  it('renders fit-height button in horizontal mode', () => {
    toolbarContext.scrollMode.scrollMode = 'horizontal';
    render(<FitGroup />);
    expect(screen.getByRole('button', { name: 'Fit to height' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Fit to width' })).toBeNull();
  });

  it('updates scroll mode and disables spread actions in horizontal mode', () => {
    toolbarContext.scrollMode.scrollMode = 'horizontal';
    render(<ScrollAndSpreadGroup />);

    fireEvent.click(screen.getByRole('button', { name: 'Continuous scroll' }));
    expect(setScrollMode).toHaveBeenCalledWith('continuous');

    const spreadButton = screen.getByRole('button', { name: 'No spreads (unavailable in horizontal mode)' });
    expect((spreadButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(spreadButton);
    expect(setSpreadMode).not.toHaveBeenCalled();
  });

  it('renders panel toggles only when viewer and panel contexts are present', () => {
    render(<PanelToggles />);
    fireEvent.click(screen.getByRole('button', { name: 'Show thumbnails' }));
    expect(togglePanel).toHaveBeenCalledWith('thumbnails');

    cleanup();
    panelContext = null;
    render(<PanelToggles />);
    expect(screen.queryByRole('button', { name: 'Show thumbnails' })).toBeNull();
  });

  it('renders print progress circles', () => {
    const { container } = render(<PrintProgress progress={0.5} />);
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('renders search and fullscreen buttons from toolbar context', () => {
    toolbarContext.search = {
      isOpen: true,
      getToggleProps: () => ({
        type: 'button' as const,
        disabled: false,
        onClick: toggleSearch,
        'aria-label': 'Close search',
      }),
    };

    render(
      <div>
        <SearchButton />
        <FullscreenButton />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
    expect(toggleSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
