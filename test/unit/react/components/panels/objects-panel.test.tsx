import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedPageObject } from '../../../../../src/context/protocol.js';
import {
  ImageColourSpace,
  ImageMarkedContentType,
  LineCapStyle,
  LineJoinStyle,
  PageObjectType,
  PathFillMode,
  PathSegmentType,
} from '../../../../../src/core/types.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetPanelOverlay = vi.fn();

const mockViewerState = {
  viewer: {
    document: { id: 'mock-doc' },
    navigation: { pageIndex: 0, pageCount: 5, setPageIndex: vi.fn(), next: vi.fn(), prev: vi.fn() },
  },
  search: { totalMatches: 0, currentIndex: -1, isSearching: false },
  searchQuery: '',
  setSearchQuery: vi.fn(),
  isSearchOpen: false,
  toggleSearch: vi.fn(),
  documentViewRef: { current: null },
};

const mockPanelState = {
  activePanel: 'objects',
  togglePanel: vi.fn(),
  setPanelOverlay: mockSetPanelOverlay,
};

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => ({ ...mockViewerState, ...mockPanelState }),
  usePDFPanel: () => mockPanelState,
}));

const mockObjectsData: SerialisedPageObject[] = [];

vi.mock('../../../../../src/react/hooks/use-page-objects.js', () => ({
  usePageObjects: () => ({ data: mockObjectsData }),
}));

const { ObjectsPanel } = await import('../../../../../src/react/components/panels/objects-panel.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockObjectsData.length = 0;
  mockViewerState.viewer.navigation.pageIndex = 0;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEFAULT_MATRIX = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const DEFAULT_BOUNDS = { left: 10, top: 100, right: 60, bottom: 20 };

function makeObject(overrides?: Partial<SerialisedPageObject>): SerialisedPageObject {
  return {
    type: PageObjectType.Text,
    bounds: { ...DEFAULT_BOUNDS },
    matrix: { ...DEFAULT_MATRIX },
    marks: [],
    text: undefined,
    image: undefined,
    path: undefined,
    ...overrides,
  };
}

function makeTextObject(): SerialisedPageObject {
  return makeObject({
    type: PageObjectType.Text,
    text: {
      text: 'Hello PDF',
      fontSize: 12,
      fontName: 'Helvetica',
      familyName: 'Helvetica',
      weight: 400,
      isEmbedded: false,
      italicAngle: 0,
      fontFlags: 0,
      metrics: { ascent: 10, descent: -3 },
    },
  });
}

function makeImageObject(): SerialisedPageObject {
  return makeObject({
    type: PageObjectType.Image,
    image: {
      width: 640,
      height: 480,
      metadata: {
        width: 640,
        height: 480,
        horizontalDpi: 72,
        verticalDpi: 72,
        bitsPerPixel: 24,
        colourSpace: ImageColourSpace.DeviceRGB,
        markedContent: ImageMarkedContentType.None,
      },
    },
  });
}

function makePathObject(): SerialisedPageObject {
  return makeObject({
    type: PageObjectType.Path,
    path: {
      segmentCount: 4,
      segments: [
        { type: PathSegmentType.MoveTo, x: 0, y: 0, close: false },
        { type: PathSegmentType.LineTo, x: 100, y: 0, close: false },
        { type: PathSegmentType.LineTo, x: 100, y: 100, close: false },
        { type: PathSegmentType.LineTo, x: 0, y: 100, close: true },
      ],
      drawMode: { fill: PathFillMode.Winding, stroke: true },
      strokeWidth: 1.0,
      lineCap: LineCapStyle.Butt,
      lineJoin: LineJoinStyle.Miter,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ObjectsPanel', () => {
  it('renders list of page objects with type badges', () => {
    mockObjectsData.push(makeTextObject(), makeImageObject(), makePathObject());

    render(<ObjectsPanel />);

    // Count summary
    expect(screen.getByText('3 total')).toBeDefined();
    // Type badges
    expect(screen.getByText(PageObjectType.Text)).toBeDefined();
    expect(screen.getByText(PageObjectType.Image)).toBeDefined();
    expect(screen.getByText(PageObjectType.Path)).toBeDefined();
  });

  it('selects object on click and shows detail', () => {
    mockObjectsData.push(makeTextObject());

    render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });

    // Detail heading should appear
    expect(screen.getByText(/Object #0/)).toBeDefined();
  });

  it('shows text detail for text objects (font, size)', () => {
    mockObjectsData.push(makeTextObject());

    render(<ObjectsPanel />);

    // Select the text object
    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });

    // Text details section should appear
    expect(screen.getByText('Text Details')).toBeDefined();
    // Text appears in both the list item preview and detail section
    const textElements = screen.getAllByText('Hello PDF');
    expect(textElements.length).toBeGreaterThanOrEqual(2);
    // Font name appears as both Name and Family since they are identical in the fixture
    const fontElements = screen.getAllByText('Helvetica');
    expect(fontElements.length).toBeGreaterThanOrEqual(1);
    // Font size label in property table
    expect(screen.getByText('Font Size')).toBeDefined();
  });

  it('shows image detail for image objects (dimensions)', () => {
    mockObjectsData.push(makeImageObject());

    render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Image).closest('button')!;
    act(() => {
      itemButton.click();
    });

    expect(screen.getByText('Image Details')).toBeDefined();
    // Width and Height values
    expect(screen.getByText('640')).toBeDefined();
    expect(screen.getByText('480')).toBeDefined();
  });

  it('shows path detail for path objects (segment count)', () => {
    mockObjectsData.push(makePathObject());

    render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Path).closest('button')!;
    act(() => {
      itemButton.click();
    });

    expect(screen.getByText('Path Details')).toBeDefined();
    // Segment count
    expect(screen.getByText('4')).toBeDefined();
  });

  it('shows bounding box coordinates in detail', () => {
    mockObjectsData.push(makeTextObject());

    render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });

    // Bounds shown in detail (left, top, right, bottom as formatted values)
    expect(screen.getByText('10.00')).toBeDefined();
    expect(screen.getByText('100.00')).toBeDefined();
    expect(screen.getByText('60.00')).toBeDefined();
    expect(screen.getByText('20.00')).toBeDefined();
  });

  it('calls setPanelOverlay with SVG overlay on selection', () => {
    mockObjectsData.push(makeTextObject());

    render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });

    // setPanelOverlay should be called with a function (the overlay renderer)
    expect(mockSetPanelOverlay).toHaveBeenCalledWith(expect.any(Function));

    // Invoke the overlay function and verify it produces visible SVG for the correct page
    const overlayFn = mockSetPanelOverlay.mock.calls.at(-1)?.[0] as
      | ((info: import('../../../../../src/react/components/pdf-page-view.js').PageOverlayInfo) => unknown)
      | undefined;
    expect(overlayFn).toBeDefined();

    const mockInfo: import('../../../../../src/react/components/pdf-page-view.js').PageOverlayInfo = {
      pageIndex: 0,
      width: 612,
      height: 792,
      originalWidth: 612,
      originalHeight: 792,
      scale: 1,
      transformRect: (rect) => ({
        x: rect.left,
        y: 792 - rect.top,
        width: rect.right - rect.left,
        height: rect.top - rect.bottom,
      }),
      transformPoint: (point) => ({ x: point.x, y: 792 - point.y }),
    };

    // Should render for page 0 (matching pageIndex)
    const result = overlayFn!(mockInfo);
    expect(result).not.toBeNull();

    // Should NOT render for a different page
    const wrongPage = overlayFn!({ ...mockInfo, pageIndex: 5 });
    expect(wrongPage).toBeNull();
  });

  it('clears overlay on deselection', () => {
    mockObjectsData.push(makeTextObject());

    render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;

    // Select
    act(() => {
      itemButton.click();
    });
    mockSetPanelOverlay.mockClear();

    // Deselect by clicking again
    act(() => {
      itemButton.click();
    });

    expect(mockSetPanelOverlay).toHaveBeenCalledWith(null);
  });

  it('shows empty state when no objects exist', () => {
    render(<ObjectsPanel />);

    expect(screen.getByText('No page objects found')).toBeDefined();
  });

  it('resets selection on page change', () => {
    mockObjectsData.push(makeTextObject());

    const { rerender } = render(<ObjectsPanel />);

    // Select object
    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });
    expect(screen.getByText(/Object #0/)).toBeDefined();

    // Simulate page change
    mockSetPanelOverlay.mockClear();
    mockViewerState.viewer.navigation.pageIndex = 2;
    rerender(<ObjectsPanel />);

    // Selection should be reset (detail gone, overlay cleared)
    expect(mockSetPanelOverlay).toHaveBeenCalledWith(null);
  });

  it('resets selection when document instance changes on the same page', () => {
    mockObjectsData.push(makeTextObject());

    const { rerender } = render(<ObjectsPanel />);

    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });
    expect(screen.getByText(/Object #0/)).toBeDefined();

    mockSetPanelOverlay.mockClear();
    mockViewerState.viewer.document = { id: 'next-doc' };
    rerender(<ObjectsPanel />);

    expect(mockSetPanelOverlay).toHaveBeenCalledWith(null);
  });

  it('shows close button in detail view that clears selection', () => {
    mockObjectsData.push(makeTextObject());

    render(<ObjectsPanel />);

    // Select an object
    const itemButton = screen.getByText(PageObjectType.Text).closest('button')!;
    act(() => {
      itemButton.click();
    });
    expect(screen.getByText(/Object #0/)).toBeDefined();

    // Close button should exist
    const closeBtn = screen.getByRole('button', { name: 'Close detail' });
    expect(closeBtn).toBeDefined();

    // Clicking close clears the selection
    mockSetPanelOverlay.mockClear();
    act(() => {
      closeBtn.click();
    });
    expect(mockSetPanelOverlay).toHaveBeenCalledWith(null);
  });

  it('truncates list at 200 objects and shows "Show all" button', () => {
    // Push 210 objects
    for (let i = 0; i < 210; i++) {
      mockObjectsData.push(makeTextObject());
    }

    render(<ObjectsPanel />);

    // Should show truncation message
    expect(screen.getByText(/Showing 200 of 210 objects/)).toBeDefined();

    // "Show all" button should exist
    const showAllBtn = screen.getByRole('button', { name: 'Show all' });
    expect(showAllBtn).toBeDefined();

    // Clicking "Show all" reveals all objects
    act(() => {
      showAllBtn.click();
    });

    // Truncation message should be gone
    expect(screen.queryByText(/Showing 200 of 210 objects/)).toBeNull();
  });

  it('resets show-all expansion when page changes', () => {
    for (let i = 0; i < 210; i++) {
      mockObjectsData.push(makeTextObject());
    }

    const { rerender } = render(<ObjectsPanel />);

    const showAllBtn = screen.getByRole('button', { name: 'Show all' });
    act(() => {
      showAllBtn.click();
    });
    expect(screen.queryByText(/Showing 200 of 210 objects/)).toBeNull();

    mockViewerState.viewer.navigation.pageIndex = 1;
    rerender(<ObjectsPanel />);

    expect(screen.getByText(/Showing 200 of 210 objects/)).toBeDefined();
  });

  it('adds data-panel-item attribute to list item buttons', () => {
    mockObjectsData.push(makeTextObject());

    const { container } = render(<ObjectsPanel />);

    const panelItems = container.querySelectorAll('[data-panel-item]');
    expect(panelItems.length).toBeGreaterThanOrEqual(1);
  });
});
