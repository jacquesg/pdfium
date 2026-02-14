import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import type { ToolbarSearchState } from '../../../../src/react/components/pdf-toolbar.js';
import { PDFToolbar } from '../../../../src/react/components/pdf-toolbar.js';
import type { UseViewerSetupResult } from '../../../../src/react/hooks/use-viewer-setup.js';

const mockViewer: UseViewerSetupResult = {
  document: null,
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
    dimensions: undefined,
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
};

describe('PDFToolbar.Search', () => {
  it('provides render props when search state is passed', () => {
    const searchState: ToolbarSearchState = {
      query: 'hello',
      setQuery: vi.fn(),
      totalMatches: 5,
      currentIndex: 2,
      isSearching: false,
      next: vi.fn(),
      prev: vi.fn(),
      isOpen: true,
      toggle: vi.fn(),
    };

    render(
      <PDFToolbar viewer={mockViewer} search={searchState}>
        <PDFToolbar.Search>
          {(props) => (
            <div data-testid="search-slot">
              <span data-testid="query">{props.query}</span>
              <span data-testid="total">{props.totalMatches}</span>
              <span data-testid="index">{props.currentIndex}</span>
              <span data-testid="open">{String(props.isOpen)}</span>
              <button {...props.getToggleProps()} data-testid="toggle">
                Toggle
              </button>
              <input {...props.getInputProps()} data-testid="search-input" />
              <button {...props.getNextProps()} data-testid="next">
                Next
              </button>
              <button {...props.getPrevProps()} data-testid="prev">
                Prev
              </button>
            </div>
          )}
        </PDFToolbar.Search>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('search-slot')).toBeDefined();
    expect(screen.getByTestId('query').textContent).toBe('hello');
    expect(screen.getByTestId('total').textContent).toBe('5');
    expect(screen.getByTestId('index').textContent).toBe('2');
    expect(screen.getByTestId('open').textContent).toBe('true');

    // Verify prop-getters return correct attributes
    const toggle = screen.getByTestId('toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Close search');
    expect(toggle.getAttribute('type')).toBe('button');

    const input = screen.getByTestId('search-input');
    expect(input.getAttribute('type')).toBe('search');
    expect(input.getAttribute('aria-label')).toBe('Search in document');
    expect((input as HTMLInputElement).value).toBe('hello');

    const nextBtn = screen.getByTestId('next');
    expect(nextBtn.getAttribute('aria-label')).toBe('Next match');
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    const prevBtn = screen.getByTestId('prev');
    expect(prevBtn.getAttribute('aria-label')).toBe('Previous match');
    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('renders nothing when search state is not provided', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Search>{() => <div data-testid="search-slot">Should not appear</div>}</PDFToolbar.Search>
      </PDFToolbar>,
    );

    expect(screen.queryByTestId('search-slot')).toBeNull();
  });
});

describe('PDFToolbar.Navigation', () => {
  it('clamps out-of-range page numbers before calling setPageIndex', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Navigation>
          {(props) => <input {...props.getInputProps()} data-testid="page-input" />}
        </PDFToolbar.Navigation>
      </PDFToolbar>,
    );

    const input = screen.getByTestId('page-input');
    fireEvent.change(input, { target: { value: '999' } });
    expect(mockViewer.navigation.setPageIndex).toHaveBeenCalledWith(2);

    fireEvent.change(input, { target: { value: '0' } });
    expect(mockViewer.navigation.setPageIndex).toHaveBeenCalledWith(0);
  });
});

describe('PDFToolbar.ScrollMode', () => {
  it('ignores invalid select values', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.ScrollMode>
          {(props) => (
            <select {...props.getSelectProps()} data-testid="scroll-mode-select">
              <option value="continuous">Continuous</option>
              <option value="single">Single</option>
              <option value="horizontal">Horizontal</option>
            </select>
          )}
        </PDFToolbar.ScrollMode>
      </PDFToolbar>,
    );

    const select = screen.getByTestId('scroll-mode-select');
    fireEvent.change(select, { target: { value: 'invalid-mode' } });
    expect(mockViewer.scroll.setScrollMode).not.toHaveBeenCalled();
  });
});

describe('PDFToolbar.Rotation', () => {
  it('provides render props with correct prop-getter attributes', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Rotation>
          {(props) => (
            <div data-testid="rotation-slot">
              <button {...props.getRotateCwProps()} data-testid="cw">
                CW
              </button>
              <button {...props.getRotateCcwProps()} data-testid="ccw">
                CCW
              </button>
              <button {...props.getResetRotationProps()} data-testid="reset-rot">
                Reset
              </button>
            </div>
          )}
        </PDFToolbar.Rotation>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('rotation-slot')).toBeDefined();

    const cw = screen.getByTestId('cw');
    expect(cw.getAttribute('aria-label')).toBe('Rotate clockwise');
    expect(cw.getAttribute('type')).toBe('button');
    expect((cw as HTMLButtonElement).disabled).toBe(false);

    const ccw = screen.getByTestId('ccw');
    expect(ccw.getAttribute('aria-label')).toBe('Rotate counter-clockwise');
    expect((ccw as HTMLButtonElement).disabled).toBe(false);

    const resetRot = screen.getByTestId('reset-rot');
    expect(resetRot.getAttribute('aria-label')).toBe('Reset rotation');
    expect((resetRot as HTMLButtonElement).disabled).toBe(false);
  });

  it('exposes rotation state from the viewer', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Rotation>
          {(props) => <span data-testid="rot-size">{props.rotations.size}</span>}
        </PDFToolbar.Rotation>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('rot-size').textContent).toBe('0');
  });
});

describe('PDFToolbar.Spread', () => {
  it('provides render props with select prop-getter and options', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Spread>
          {(props) => (
            <div data-testid="spread-slot">
              <span data-testid="spread-mode">{props.spreadMode}</span>
              <span data-testid="spread-options">{props.options.length}</span>
              <select {...props.getSelectProps()} data-testid="spread-select">
                {props.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </PDFToolbar.Spread>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('spread-slot')).toBeDefined();
    expect(screen.getByTestId('spread-mode').textContent).toBe('none');
    expect(screen.getByTestId('spread-options').textContent).toBe('3');

    const select = screen.getByTestId('spread-select');
    expect(select.getAttribute('aria-label')).toBe('Spread mode');
  });

  it('lists all spread mode options', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Spread>
          {(props) => (
            <ul data-testid="spread-list">
              {props.options.map((o) => (
                <li key={o.value}>{o.label}</li>
              ))}
            </ul>
          )}
        </PDFToolbar.Spread>
      </PDFToolbar>,
    );

    expect(screen.getByText('No spreads')).toBeDefined();
    expect(screen.getByText('Odd spreads')).toBeDefined();
    expect(screen.getByText('Even spreads')).toBeDefined();
  });

  it('ignores invalid spread mode values', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Spread>
          {(props) => (
            <select {...props.getSelectProps()} data-testid="spread-select">
              <option value="none">No spreads</option>
              <option value="odd">Odd spreads</option>
              <option value="even">Even spreads</option>
            </select>
          )}
        </PDFToolbar.Spread>
      </PDFToolbar>,
    );

    const select = screen.getByTestId('spread-select');
    fireEvent.change(select, { target: { value: 'invalid-mode' } });
    expect(mockViewer.spread.setSpreadMode).not.toHaveBeenCalled();
  });
});

describe('PDFToolbar.Fullscreen', () => {
  it('provides render props with toggle prop-getter when not fullscreen', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Fullscreen>
          {(props) => (
            <div data-testid="fs-slot">
              <span data-testid="fs-state">{String(props.isFullscreen)}</span>
              <button {...props.getToggleProps()} data-testid="fs-toggle">
                Toggle
              </button>
            </div>
          )}
        </PDFToolbar.Fullscreen>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('fs-slot')).toBeDefined();
    expect(screen.getByTestId('fs-state').textContent).toBe('false');

    const toggle = screen.getByTestId('fs-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Enter fullscreen');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect((toggle as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows exit label and pressed state when fullscreen is active', () => {
    const fsViewer: UseViewerSetupResult = {
      ...mockViewer,
      fullscreen: {
        isFullscreen: true,
        enterFullscreen: vi.fn(async () => {}),
        exitFullscreen: vi.fn(async () => {}),
        toggleFullscreen: vi.fn(async () => {}),
      },
    };

    render(
      <PDFToolbar viewer={fsViewer}>
        <PDFToolbar.Fullscreen>
          {(props) => (
            <button {...props.getToggleProps()} data-testid="fs-toggle">
              Toggle
            </button>
          )}
        </PDFToolbar.Fullscreen>
      </PDFToolbar>,
    );

    const toggle = screen.getByTestId('fs-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Exit fullscreen');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('PDFToolbar.Print', () => {
  it('provides render props with print prop-getter when not printing', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.Print>
          {(props) => (
            <div data-testid="print-slot">
              <span data-testid="print-state">{String(props.isPrinting)}</span>
              <span data-testid="print-progress">{props.progress}</span>
              <button {...props.getPrintProps()} data-testid="print-btn">
                Print
              </button>
            </div>
          )}
        </PDFToolbar.Print>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('print-slot')).toBeDefined();
    expect(screen.getByTestId('print-state').textContent).toBe('false');
    expect(screen.getByTestId('print-progress').textContent).toBe('0');

    const btn = screen.getByTestId('print-btn');
    expect(btn.getAttribute('aria-label')).toBe('Print');
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows cancel label when actively printing', () => {
    const printingViewer: UseViewerSetupResult = {
      ...mockViewer,
      print: {
        isPrinting: true,
        progress: 0.5,
        print: vi.fn(),
        cancel: vi.fn(),
      },
    };

    render(
      <PDFToolbar viewer={printingViewer}>
        <PDFToolbar.Print>
          {(props) => (
            <div>
              <span data-testid="print-progress">{props.progress}</span>
              <button {...props.getPrintProps()} data-testid="print-btn">
                Print
              </button>
            </div>
          )}
        </PDFToolbar.Print>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('print-progress').textContent).toBe('0.5');
    expect(screen.getByTestId('print-btn').getAttribute('aria-label')).toBe('Cancel print');
  });
});

describe('PDFToolbar.InteractionMode', () => {
  it('provides render props with all mode prop-getters', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.InteractionMode>
          {(props) => (
            <div data-testid="mode-slot">
              <span data-testid="mode">{props.mode}</span>
              <span data-testid="dragging">{String(props.isDragging)}</span>
              <button {...props.getPointerProps()} data-testid="pointer">
                Pointer
              </button>
              <button {...props.getPanProps()} data-testid="pan">
                Pan
              </button>
              <button {...props.getMarqueeProps()} data-testid="marquee">
                Marquee
              </button>
            </div>
          )}
        </PDFToolbar.InteractionMode>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('mode-slot')).toBeDefined();
    expect(screen.getByTestId('mode').textContent).toBe('pointer');
    expect(screen.getByTestId('dragging').textContent).toBe('false');

    const pointer = screen.getByTestId('pointer');
    expect(pointer.getAttribute('aria-label')).toBe('Pointer tool');
    expect(pointer.getAttribute('aria-pressed')).toBe('true');
    expect((pointer as HTMLButtonElement).disabled).toBe(false);

    const pan = screen.getByTestId('pan');
    expect(pan.getAttribute('aria-label')).toBe('Hand tool');
    expect(pan.getAttribute('aria-pressed')).toBe('false');

    const marquee = screen.getByTestId('marquee');
    expect(marquee.getAttribute('aria-label')).toBe('Marquee zoom');
    expect(marquee.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects active mode in aria-pressed states', () => {
    const panViewer: UseViewerSetupResult = {
      ...mockViewer,
      interaction: {
        mode: 'pan' as const,
        setMode: vi.fn(),
        isDragging: true,
        marqueeRect: null,
      },
    };

    render(
      <PDFToolbar viewer={panViewer}>
        <PDFToolbar.InteractionMode>
          {(props) => (
            <div>
              <button {...props.getPointerProps()} data-testid="pointer">
                Pointer
              </button>
              <button {...props.getPanProps()} data-testid="pan">
                Pan
              </button>
              <button {...props.getMarqueeProps()} data-testid="marquee">
                Marquee
              </button>
            </div>
          )}
        </PDFToolbar.InteractionMode>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('pointer').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('pan').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('marquee').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('PDFToolbar.FirstLastPage', () => {
  it('provides render props with correct disabled states on first page', () => {
    render(
      <PDFToolbar viewer={mockViewer}>
        <PDFToolbar.FirstLastPage>
          {(props) => (
            <div data-testid="fl-slot">
              <span data-testid="is-first">{String(props.isFirst)}</span>
              <span data-testid="is-last">{String(props.isLast)}</span>
              <button {...props.getFirstProps()} data-testid="first-btn">
                First
              </button>
              <button {...props.getLastProps()} data-testid="last-btn">
                Last
              </button>
            </div>
          )}
        </PDFToolbar.FirstLastPage>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('fl-slot')).toBeDefined();
    expect(screen.getByTestId('is-first').textContent).toBe('true');
    expect(screen.getByTestId('is-last').textContent).toBe('false');

    const firstBtn = screen.getByTestId('first-btn');
    expect(firstBtn.getAttribute('aria-label')).toBe('First page');
    expect((firstBtn as HTMLButtonElement).disabled).toBe(true);

    const lastBtn = screen.getByTestId('last-btn');
    expect(lastBtn.getAttribute('aria-label')).toBe('Last page');
    expect((lastBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables last button when on last page', () => {
    const lastPageViewer: UseViewerSetupResult = {
      ...mockViewer,
      navigation: {
        ...mockViewer.navigation,
        pageIndex: 2,
        canNext: false,
        canPrev: true,
      },
    };

    render(
      <PDFToolbar viewer={lastPageViewer}>
        <PDFToolbar.FirstLastPage>
          {(props) => (
            <div>
              <span data-testid="is-first">{String(props.isFirst)}</span>
              <span data-testid="is-last">{String(props.isLast)}</span>
              <button {...props.getFirstProps()} data-testid="first-btn">
                First
              </button>
              <button {...props.getLastProps()} data-testid="last-btn">
                Last
              </button>
            </div>
          )}
        </PDFToolbar.FirstLastPage>
      </PDFToolbar>,
    );

    expect(screen.getByTestId('is-first').textContent).toBe('false');
    expect(screen.getByTestId('is-last').textContent).toBe('true');
    expect((screen.getByTestId('first-btn') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTestId('last-btn') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('PDFToolbar roving tabindex', () => {
  it('does not reset active roving item on unrelated rerenders', () => {
    const { rerender } = render(
      <PDFToolbar viewer={mockViewer} className="toolbar-a">
        <button type="button" data-testid="btn-a">
          A
        </button>
        <button type="button" data-testid="btn-b">
          B
        </button>
      </PDFToolbar>,
    );

    const toolbar = screen.getByRole('toolbar');
    const first = screen.getByTestId('btn-a');
    const second = screen.getByTestId('btn-b');

    first.focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(second.getAttribute('tabindex')).toBe('0');
    expect(first.getAttribute('tabindex')).toBe('-1');

    rerender(
      <PDFToolbar viewer={mockViewer} className="toolbar-b">
        <button type="button" data-testid="btn-a">
          A
        </button>
        <button type="button" data-testid="btn-b">
          B
        </button>
      </PDFToolbar>,
    );

    // Rerenders should keep the currently active roving item, not reset to first.
    expect(second.getAttribute('tabindex')).toBe('0');
    expect(first.getAttribute('tabindex')).toBe('-1');
  });
});
