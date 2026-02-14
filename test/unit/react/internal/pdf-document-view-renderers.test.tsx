import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/react/components/pdf-page-view.js', () => ({
  PDFPageView: (props: Record<string, unknown>) => (
    <div data-testid={`page-${props.pageIndex}`} data-match={props.currentMatchOnPage} data-scale={props.scale} />
  ),
}));

const { getLocalMatchIndex, renderScrollableDocument, renderSinglePageDocument } = await import(
  '../../../../src/react/internal/pdf-document-view-renderers.js'
);

const mockSharedProps = {
  document: { id: 'doc' } as unknown as import('../../../../src/context/worker-client.js').WorkerPDFiumDocument,
  scale: 1,
  showTextLayer: true,
  showAnnotations: true,
  showLinks: true,
  renderFormFields: false,
  getRotation: undefined,
  onCurrentPageChange: vi.fn(),
  renderPageOverlay: undefined,
  pageClassName: undefined,
  searchResultsByPage: new Map(),
  searchCurrentIndex: undefined,
  searchMatchIndexMap: undefined,
};

describe('pdf-document-view-renderers', () => {
  it('resolves local match index safely', () => {
    expect(
      getLocalMatchIndex(2, 1, [
        { pageIndex: 1, localIndex: 0 },
        { pageIndex: 2, localIndex: 3 },
      ]),
    ).toBe(3);
    expect(getLocalMatchIndex(2, 5, [{ pageIndex: 2, localIndex: 0 }])).toBe(-1);
    expect(getLocalMatchIndex(2, undefined, [{ pageIndex: 2, localIndex: 0 }])).toBe(-1);
  });

  it('renders single-page content for current page index', () => {
    render(
      renderSinglePageDocument({
        ...mockSharedProps,
        effectiveRef: { current: null },
        dimensions: [
          { width: 612, height: 792 },
          { width: 500, height: 500 },
        ],
        controlledPageIndex: 1,
        containerClassName: undefined,
        containerStyle: undefined,
        gap: 16,
      }),
    );

    expect(screen.getByTestId('page-1')).toBeDefined();
    expect(screen.queryByTestId('page-0')).toBeNull();
  });

  it('renders scrollable loading state when dimensions are missing', () => {
    render(
      renderScrollableDocument({
        ...mockSharedProps,
        effectiveRef: { current: null },
        dimensions: undefined,
        dimensionsLoading: true,
        groupedRows: new Map(),
        totalHeight: 0,
        totalWidth: 0,
        maxContentWidth: 0,
        isHorizontal: false,
        gap: 16,
        classNames: {},
        containerClassName: undefined,
        loadingContent: undefined,
        containerStyle: undefined,
      }),
    );

    expect(screen.getByText('Loading document...')).toBeDefined();
  });

  it('renders grouped pages in scrollable mode', () => {
    const groupedRows = new Map<
      number,
      Array<{ pageIndex: number; offsetY: number; rowIndex?: number; offsetX?: number }>
    >([
      [0, [{ pageIndex: 0, offsetY: 0, rowIndex: 0 }]],
      [1, [{ pageIndex: 1, offsetY: 800, rowIndex: 1 }]],
    ]);

    render(
      renderScrollableDocument({
        ...mockSharedProps,
        effectiveRef: { current: null },
        dimensions: [
          { width: 612, height: 792 },
          { width: 612, height: 792 },
        ],
        dimensionsLoading: false,
        groupedRows,
        totalHeight: 1600,
        totalWidth: 0,
        maxContentWidth: 612,
        isHorizontal: false,
        gap: 16,
        classNames: {},
        containerClassName: undefined,
        loadingContent: undefined,
        containerStyle: undefined,
      }),
    );

    expect(screen.getByTestId('page-0')).toBeDefined();
    expect(screen.getByTestId('page-1')).toBeDefined();
  });

  it('returns null for out-of-range single-page index', () => {
    const { container } = render(
      renderSinglePageDocument({
        ...mockSharedProps,
        effectiveRef: { current: null },
        dimensions: [{ width: 612, height: 792 }],
        controlledPageIndex: 9,
        containerClassName: undefined,
        containerStyle: undefined,
        gap: 8,
      }),
    );

    expect(container.textContent).toBe('');
  });

  it('uses custom loading content when provided', () => {
    render(
      renderScrollableDocument({
        ...mockSharedProps,
        effectiveRef: { current: null },
        dimensions: undefined,
        dimensionsLoading: true,
        groupedRows: new Map(),
        totalHeight: 0,
        totalWidth: undefined,
        maxContentWidth: 0,
        isHorizontal: false,
        gap: 16,
        classNames: {},
        containerClassName: undefined,
        loadingContent: <div>Custom loading</div>,
        containerStyle: undefined,
      }),
    );

    expect(screen.getByText('Custom loading')).toBeDefined();
    expect(screen.queryByText('Loading document...')).toBeNull();
  });

  it('renders horizontal rows and ignores empty rows safely', () => {
    const groupedRows = new Map<
      number,
      Array<{ pageIndex: number; offsetY: number; rowIndex?: number; offsetX?: number }>
    >([
      [0, []],
      [1, [{ pageIndex: 0, offsetY: 0, rowIndex: 1, offsetX: 120 }]],
      [2, [{ pageIndex: 1, offsetY: 0, rowIndex: 2 }]],
    ]);

    render(
      renderScrollableDocument({
        ...mockSharedProps,
        effectiveRef: { current: null },
        dimensions: [
          { width: 612, height: 792 },
          { width: 612, height: 792 },
        ],
        dimensionsLoading: false,
        groupedRows,
        totalHeight: 1000,
        totalWidth: undefined,
        maxContentWidth: 0,
        isHorizontal: true,
        gap: 16,
        classNames: {},
        containerClassName: undefined,
        loadingContent: undefined,
        containerStyle: undefined,
      }),
    );

    expect(screen.getByTestId('page-0')).toBeDefined();
    expect(screen.getByTestId('page-1')).toBeDefined();
  });

  it('renders multi-page vertical row with match index mapping', () => {
    const groupedRows = new Map<
      number,
      Array<{ pageIndex: number; offsetY: number; rowIndex?: number; offsetX?: number }>
    >([
      [
        0,
        [
          { pageIndex: 0, offsetY: 0, rowIndex: 0 },
          { pageIndex: 1, offsetY: 0, rowIndex: 0 },
        ],
      ],
    ]);

    render(
      renderScrollableDocument({
        ...mockSharedProps,
        searchCurrentIndex: 1,
        searchMatchIndexMap: [
          { pageIndex: 0, localIndex: 7 },
          { pageIndex: 1, localIndex: 3 },
        ],
        effectiveRef: { current: null },
        dimensions: [
          { width: 612, height: 792 },
          { width: 612, height: 792 },
        ],
        dimensionsLoading: false,
        groupedRows,
        totalHeight: 900,
        totalWidth: 0,
        maxContentWidth: 612,
        isHorizontal: false,
        gap: 16,
        classNames: {},
        containerClassName: undefined,
        loadingContent: undefined,
        containerStyle: undefined,
      }),
    );

    expect(screen.getByTestId('page-0').getAttribute('data-match')).toBe('-1');
    expect(screen.getByTestId('page-1').getAttribute('data-match')).toBe('3');
  });
});
