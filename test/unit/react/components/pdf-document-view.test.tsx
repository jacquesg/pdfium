import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchState } from '../../../../src/react/components/pdf-document-view.js';
import { createMockDocument } from '../../../react-setup.js';

// ── Mocks ───────────────────────────────────────────────────────

const mockDocument = createMockDocument();
const mockDimensions = [
  { width: 612, height: 792 },
  { width: 612, height: 792 },
  { width: 612, height: 792 },
];

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => ({ document: mockDocument, documentRevision: 0 }),
}));

const mockUsePageDimensions = vi.fn().mockReturnValue({
  data: mockDimensions,
  isLoading: false,
  error: null,
});

vi.mock('../../../../src/react/hooks/use-page-dimensions.js', () => ({
  usePageDimensions: (...args: unknown[]) => mockUsePageDimensions(...args),
}));

const mockUseVisiblePages = vi.fn().mockReturnValue({
  visiblePages: [
    { pageIndex: 0, offsetY: 0 },
    { pageIndex: 1, offsetY: 800 },
  ],
  totalHeight: 2400,
  currentPageIndex: 0,
});

vi.mock('../../../../src/react/hooks/use-visible-pages.js', () => ({
  useVisiblePages: (...args: unknown[]) => mockUseVisiblePages(...args),
}));

vi.mock('../../../../src/react/prefetch.js', () => ({
  prefetchPageData: vi.fn(),
}));

vi.mock('../../../../src/react/internal/stores-context.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../../src/react/internal/stores-context.js')>();
  const stores = mod.createPDFiumStores();
  return {
    ...mod,
    usePDFiumStores: () => stores,
  };
});

// Stub PDFPageView to avoid deep dependency chains
vi.mock('../../../../src/react/components/pdf-page-view.js', () => ({
  PDFPageView: (props: Record<string, unknown>) => (
    <div data-testid={`page-${props.pageIndex}`} data-scale={props.scale} />
  ),
}));

const { PDFDocumentView } = await import('../../../../src/react/components/pdf-document-view.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Reset persistent mockReturnValue defaults to prevent leaks between describes.
  mockUsePageDimensions.mockReturnValue({
    data: mockDimensions,
    isLoading: false,
    error: null,
  });
  mockUseVisiblePages.mockReturnValue({
    visiblePages: [
      { pageIndex: 0, offsetY: 0 },
      { pageIndex: 1, offsetY: 800 },
    ],
    totalHeight: 2400,
    currentPageIndex: 0,
  });
});

describe('PDFDocumentView', () => {
  it('renders loading state when dimensions are loading', () => {
    mockUsePageDimensions.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<PDFDocumentView scale={1} />);

    expect(screen.getByText('Loading document...')).toBeDefined();
  });

  it('renders aria-busy="true" while loading', () => {
    mockUsePageDimensions.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<PDFDocumentView scale={1} />);

    // aria-busy is now on the scroll container (role="document") itself
    const scrollContainer = container.querySelector('[role="document"]');
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders continuous scroll container by default', () => {
    const { container } = render(<PDFDocumentView scale={1} />);

    const scrollContainer = container.querySelector('[role="document"]');
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer?.getAttribute('aria-label')).toBe('PDF document');
    expect(scrollContainer?.getAttribute('tabindex')).toBe('0');
  });

  it('renders visible pages in continuous mode', () => {
    render(<PDFDocumentView scale={1} />);

    expect(screen.getByTestId('page-0')).toBeDefined();
    expect(screen.getByTestId('page-1')).toBeDefined();
  });

  it('sets total height on the inner spacer div', () => {
    const { container } = render(<PDFDocumentView scale={1} />);

    const scrollContainer = container.querySelector('[role="document"]');
    const spacer = scrollContainer?.firstElementChild as HTMLElement;
    // totalHeight (2400) + gap*2 (16*2=32) = 2432
    expect(spacer.style.height).toBe('2432px');
  });

  it('positions pages absolutely with offsetY and no willChange', () => {
    const { container } = render(<PDFDocumentView scale={1} />);

    const scrollContainer = container.querySelector('[role="document"]');
    const spacer = scrollContainer?.firstElementChild;
    const pageWrappers = spacer?.children;

    const first = pageWrappers?.[0] as HTMLElement;
    const second = pageWrappers?.[1] as HTMLElement;

    // offsetY + gap (16) padding
    expect(first.style.top).toBe('16px');
    expect(second.style.top).toBe('816px');

    // willChange: 'transform' was removed (Issue 21)
    expect(first.style.willChange).toBe('');
    expect(second.style.willChange).toBe('');
  });

  it('renders single page mode', () => {
    render(<PDFDocumentView scale={1} scrollMode="single" currentPageIndex={1} />);

    expect(screen.getByTestId('page-1')).toBeDefined();
    expect(screen.queryByTestId('page-0')).toBeNull();
  });

  it('renders page 0 in single mode when no currentPageIndex', () => {
    render(<PDFDocumentView scale={1} scrollMode="single" />);

    expect(screen.getByTestId('page-0')).toBeDefined();
  });

  it('returns null in single mode when page index out of range', () => {
    const { container } = render(<PDFDocumentView scale={1} scrollMode="single" currentPageIndex={99} />);

    // Should render nothing (null) when out of range
    expect(container.querySelector('[data-testid]')).toBeNull();
  });

  it('passes scale to PDFPageView', () => {
    render(<PDFDocumentView scale={2.5} />);

    const page = screen.getByTestId('page-0');
    expect(page.getAttribute('data-scale')).toBe('2.5');
  });

  it('applies className and style', () => {
    const { container } = render(<PDFDocumentView scale={1} className="viewer" style={{ border: '1px solid red' }} />);

    const scrollContainer = container.querySelector('[role="document"]');
    expect(scrollContainer?.className).toContain('viewer');
    expect((scrollContainer as HTMLElement).style.border).toBe('1px solid red');
  });

  it('passes search results for page to PDFPageView', () => {
    const search: SearchState = {
      resultsByPage: new Map([
        [0, [{ charIndex: 0, charCount: 4, rects: [{ left: 0, top: 0, right: 10, bottom: 10 }] }]],
      ]),
      currentIndex: 0,
      matchIndexMap: [{ pageIndex: 0, localIndex: 0 }],
      currentMatchPageIndex: 0,
    };

    const { container } = render(<PDFDocumentView scale={1} search={search} />);
    expect(container.querySelector('[role="document"]')).not.toBeNull();
  });

  it('calls onCurrentPageChange when current page changes', () => {
    const onCurrentPageChange = vi.fn();

    const { rerender } = render(<PDFDocumentView scale={1} onCurrentPageChange={onCurrentPageChange} />);

    // Simulate page change by changing mock return value
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 1, offsetY: 800 }],
      totalHeight: 2400,
      currentPageIndex: 1,
    });

    rerender(<PDFDocumentView scale={1} onCurrentPageChange={onCurrentPageChange} />);

    expect(onCurrentPageChange).toHaveBeenCalledWith(1);
  });
});

describe('PDFDocumentView controlled scroll', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;
  let origScrollTo: typeof HTMLElement.prototype.scrollTo;

  beforeEach(() => {
    scrollToSpy = vi.fn();
    origScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollToSpy as typeof HTMLElement.prototype.scrollTo;
  });

  afterEach(() => {
    HTMLElement.prototype.scrollTo = origScrollTo;
  });

  it('calls scrollTo when controlledPageIndex changes externally', () => {
    const { rerender } = render(<PDFDocumentView scale={1} currentPageIndex={0} />);

    // Change controlled page to trigger scroll effect
    rerender(<PDFDocumentView scale={1} currentPageIndex={2} />);

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('does not scroll in single page mode', () => {
    const { rerender } = render(<PDFDocumentView scale={1} scrollMode="single" currentPageIndex={0} />);

    rerender(<PDFDocumentView scale={1} scrollMode="single" currentPageIndex={2} />);

    // scrollTo should not be called in single page mode
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not call scrollTo for scroll-driven controlled page sync', () => {
    // Simulate that page 1 is already the currently visible page.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 1, offsetY: 800 }],
      totalHeight: 2400,
      currentPageIndex: 1,
    });

    render(<PDFDocumentView scale={1} currentPageIndex={1} />);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls when scrollGeneration changes with the same controlled page', () => {
    // Current visible page already matches controlled page.
    mockUseVisiblePages.mockReturnValue({
      visiblePages: [{ pageIndex: 1, offsetY: 800 }],
      totalHeight: 2400,
      currentPageIndex: 1,
    });

    const { rerender } = render(<PDFDocumentView scale={1} currentPageIndex={1} scrollGeneration={0} />);
    expect(scrollToSpy).not.toHaveBeenCalled();

    rerender(<PDFDocumentView scale={1} currentPageIndex={1} scrollGeneration={1} />);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('does not call scrollTo when controlled page catches up after scroll callback lag', () => {
    const onCurrentPageChange = vi.fn();

    // Initial state: page 0 visible and controlled.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 0, offsetY: 0 }],
      totalHeight: 2400,
      currentPageIndex: 0,
    });
    const { rerender } = render(
      <PDFDocumentView scale={1} currentPageIndex={0} onCurrentPageChange={onCurrentPageChange} />,
    );
    expect(scrollToSpy).not.toHaveBeenCalled();

    // User scrolls: hook now reports page 1, parent callback fires.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 1, offsetY: 800 }],
      totalHeight: 2400,
      currentPageIndex: 1,
    });
    rerender(<PDFDocumentView scale={1} currentPageIndex={0} onCurrentPageChange={onCurrentPageChange} />);
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Parent catches up to page 1, but visible-page state is still one frame behind (0).
    // This must not trigger a programmatic smooth scroll.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 0, offsetY: 0 }],
      totalHeight: 2400,
      currentPageIndex: 0,
    });
    rerender(<PDFDocumentView scale={1} currentPageIndex={1} onCurrentPageChange={onCurrentPageChange} />);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not call scrollTo when controlled sync lag spans multiple renders', () => {
    const onCurrentPageChange = vi.fn();

    // Initial state: page 0 visible and controlled.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 0, offsetY: 0 }],
      totalHeight: 2400,
      currentPageIndex: 0,
    });
    const { rerender } = render(
      <PDFDocumentView scale={1} currentPageIndex={0} onCurrentPageChange={onCurrentPageChange} />,
    );

    // User scroll reports page 1.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 1, offsetY: 800 }],
      totalHeight: 2400,
      currentPageIndex: 1,
    });
    rerender(<PDFDocumentView scale={1} currentPageIndex={0} onCurrentPageChange={onCurrentPageChange} />);
    expect(onCurrentPageChange).toHaveBeenCalledWith(1);
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Parent catches up to page 1, but hook remains behind for multiple renders.
    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 0, offsetY: 0 }],
      totalHeight: 2400,
      currentPageIndex: 0,
    });
    rerender(<PDFDocumentView scale={1} currentPageIndex={1} onCurrentPageChange={onCurrentPageChange} />);
    expect(scrollToSpy).not.toHaveBeenCalled();

    mockUseVisiblePages.mockReturnValueOnce({
      visiblePages: [{ pageIndex: 0, offsetY: 0 }],
      totalHeight: 2400,
      currentPageIndex: 0,
    });
    rerender(<PDFDocumentView scale={1} currentPageIndex={1} onCurrentPageChange={onCurrentPageChange} />);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('still scrolls when scrollGeneration forces navigation after manual scrolling input', () => {
    const { rerender, container } = render(<PDFDocumentView scale={1} currentPageIndex={0} scrollGeneration={0} />);
    const scrollContainer = container.querySelector('[role="document"]');
    expect(scrollContainer).not.toBeNull();

    scrollContainer?.dispatchEvent(new Event('wheel'));

    rerender(<PDFDocumentView scale={1} currentPageIndex={1} scrollGeneration={1} />);

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('scrolls to spread-row position (not linear page stack) when spreadMode is odd', () => {
    const { rerender } = render(<PDFDocumentView scale={1} spreadMode="odd" currentPageIndex={0} />);

    // In odd spread mode with equal page heights:
    // page 0 is solo at y=16, pages 1 and 2 share the next row at y=824.
    rerender(<PDFDocumentView scale={1} spreadMode="odd" currentPageIndex={2} />);

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 824, behavior: 'smooth' }));
  });

  it('does not suppress controlled navigation from plain scroll events', () => {
    const { rerender, container } = render(<PDFDocumentView scale={1} currentPageIndex={0} />);
    const scrollContainer = container.querySelector('[role="document"]');
    expect(scrollContainer).not.toBeNull();

    // Programmatic/inertial scroll events should not be interpreted as
    // user-wheel intent for suppression logic.
    scrollContainer?.dispatchEvent(new Event('scroll'));

    rerender(<PDFDocumentView scale={1} currentPageIndex={1} />);

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });
});

describe('PDFDocumentView imperative handle', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;
  let origScrollTo: typeof HTMLElement.prototype.scrollTo;

  beforeEach(() => {
    scrollToSpy = vi.fn();
    origScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollToSpy as typeof HTMLElement.prototype.scrollTo;
  });

  afterEach(() => {
    HTMLElement.prototype.scrollTo = origScrollTo;
  });

  it('exposes scrollToPage via imperative handle', () => {
    const ref = { current: null } as React.RefObject<
      import('../../../../src/react/components/pdf-document-view.js').PDFDocumentViewHandle | null
    >;
    render(<PDFDocumentView ref={ref} scale={1} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current!.scrollToPage).toBe('function');
  });

  it('scrollToPage calls container scrollTo', () => {
    const ref = { current: null } as React.RefObject<
      import('../../../../src/react/components/pdf-document-view.js').PDFDocumentViewHandle | null
    >;
    render(<PDFDocumentView ref={ref} scale={1} />);

    ref.current!.scrollToPage(2);

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });
});

describe('getLocalMatchIndex (via PDFDocumentView)', () => {
  it('resolves currentMatchOnPage for single page mode', () => {
    const matchIndexMap = [
      { pageIndex: 0, localIndex: 0 },
      { pageIndex: 0, localIndex: 1 },
      { pageIndex: 1, localIndex: 0 },
    ];

    const search: SearchState = {
      resultsByPage: new Map(),
      currentIndex: 1,
      matchIndexMap,
      currentMatchPageIndex: 0,
    };

    const { container } = render(
      <PDFDocumentView scale={1} scrollMode="single" currentPageIndex={0} search={search} />,
    );

    expect(container.querySelector('[data-testid="page-0"]')).not.toBeNull();
  });
});
