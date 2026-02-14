import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SerialisedAnnotation } from '../../../../../src/context/protocol.js';
import { AnnotationType } from '../../../../../src/core/types.js';

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
  activePanel: 'annotations',
  togglePanel: vi.fn(),
  setPanelOverlay: mockSetPanelOverlay,
};

vi.mock('../../../../../src/react/components/pdf-viewer.js', () => ({
  usePDFViewer: () => ({ ...mockViewerState, ...mockPanelState }),
  usePDFPanel: () => mockPanelState,
}));

const mockAnnotationsData: SerialisedAnnotation[] = [];

vi.mock('../../../../../src/react/hooks/use-annotations.js', () => ({
  useAnnotations: () => ({ data: mockAnnotationsData }),
}));

vi.mock('../../../../../src/react/components/annotation-overlay.js', () => ({
  AnnotationOverlay: () => <div data-testid="annotation-overlay" />,
}));

const { AnnotationsPanel } = await import('../../../../../src/react/components/panels/annotations-panel.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockAnnotationsData.length = 0;
  mockViewerState.viewer.navigation.pageIndex = 0;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAnnotation(overrides: Partial<SerialisedAnnotation> & { index: number }): SerialisedAnnotation {
  return {
    type: AnnotationType.Text,
    bounds: { left: 10, top: 100, right: 50, bottom: 20 },
    colour: { stroke: undefined, interior: undefined },
    flags: 0,
    contents: '',
    author: '',
    subject: '',
    border: null,
    appearance: null,
    fontSize: 0,
    line: undefined,
    vertices: undefined,
    inkPaths: undefined,
    attachmentPoints: undefined,
    widget: undefined,
    link: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnnotationsPanel', () => {
  it('renders annotation list grouped by type', () => {
    mockAnnotationsData.push(
      makeAnnotation({ index: 0, type: AnnotationType.Text }),
      makeAnnotation({ index: 1, type: AnnotationType.Highlight }),
      makeAnnotation({ index: 2, type: AnnotationType.Text }),
    );

    render(<AnnotationsPanel />);

    // Group headers should be present
    expect(screen.getByText('Text')).toBeDefined();
    expect(screen.getByText('Highlight')).toBeDefined();
  });

  it('shows annotation count in header', () => {
    mockAnnotationsData.push(makeAnnotation({ index: 0 }), makeAnnotation({ index: 1 }), makeAnnotation({ index: 2 }));

    render(<AnnotationsPanel />);

    expect(screen.getByText('3 total')).toBeDefined();
  });

  it('selects an annotation on click and shows detail view', () => {
    mockAnnotationsData.push(makeAnnotation({ index: 0, type: AnnotationType.Text, contents: 'A note' }));

    render(<AnnotationsPanel />);

    // Click annotation item (button with #0)
    const itemButton = screen.getByText('#0').closest('button')!;
    act(() => {
      itemButton.click();
    });

    // Detail view should appear with annotation heading
    expect(screen.getByText(/Annotation #0/)).toBeDefined();
  });

  it('shows annotation type, bounds, and contents in the detail view', () => {
    mockAnnotationsData.push(
      makeAnnotation({
        index: 0,
        type: AnnotationType.FreeText,
        contents: 'Hello world',
        bounds: { left: 10, top: 100, right: 50, bottom: 20 },
      }),
    );

    render(<AnnotationsPanel />);

    // Select the annotation
    const itemButton = screen.getByText('#0').closest('button')!;
    act(() => {
      itemButton.click();
    });

    // Type displayed in detail heading (contains both index and type)
    expect(screen.getByText(/Annotation #0.*FreeText/)).toBeDefined();
    // Contents displayed in both the list preview and the detail property table
    const contentElements = screen.getAllByText('Hello world');
    expect(contentElements.length).toBeGreaterThanOrEqual(2);
    // Bounds displayed (formatted as [left, top, right, bottom])
    expect(screen.getByText('[10.0, 100.0, 50.0, 20.0]')).toBeDefined();
  });

  it('calls setPanelOverlay on selection', () => {
    mockAnnotationsData.push(makeAnnotation({ index: 0 }));

    render(<AnnotationsPanel />);

    const itemButton = screen.getByText('#0').closest('button')!;
    act(() => {
      itemButton.click();
    });

    // setPanelOverlay should be called with a function (the overlay renderer)
    expect(mockSetPanelOverlay).toHaveBeenCalledWith(expect.any(Function));
  });

  it('clears overlay on deselection (clicking selected annotation again)', () => {
    mockAnnotationsData.push(makeAnnotation({ index: 0 }));

    render(<AnnotationsPanel />);

    const itemButton = screen.getByText('#0').closest('button')!;

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

  it('shows empty state when no annotations exist', () => {
    render(<AnnotationsPanel />);

    expect(screen.getByText('No annotations on this page.')).toBeDefined();
  });

  it('resets selection on page change', () => {
    mockAnnotationsData.push(makeAnnotation({ index: 0, contents: 'First page note' }));

    const { rerender } = render(<AnnotationsPanel />);

    // Select annotation
    const itemButton = screen.getByText('#0').closest('button')!;
    act(() => {
      itemButton.click();
    });
    expect(screen.getByText(/Annotation #0/)).toBeDefined();

    // Simulate page change
    mockSetPanelOverlay.mockClear();
    mockViewerState.viewer.navigation.pageIndex = 1;
    rerender(<AnnotationsPanel />);

    // The detail view should disappear (selection reset via useEffect)
    // setPanelOverlay(null) should have been called
    expect(mockSetPanelOverlay).toHaveBeenCalledWith(null);
  });

  it('resets selection when document instance changes on the same page', () => {
    mockAnnotationsData.push(makeAnnotation({ index: 0, contents: 'Switchable note' }));

    const { rerender } = render(<AnnotationsPanel />);

    const itemButton = screen.getByText('#0').closest('button')!;
    act(() => {
      itemButton.click();
    });
    expect(screen.getByText(/Annotation #0/)).toBeDefined();

    mockSetPanelOverlay.mockClear();
    mockViewerState.viewer.document = { id: 'next-doc' };
    rerender(<AnnotationsPanel />);

    expect(mockSetPanelOverlay).toHaveBeenCalledWith(null);
  });
});
