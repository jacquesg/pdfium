import { render } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseBookmarks = vi.fn();
const mockUsePDFViewer = vi.fn();
const mockUsePDFPanelOptional = vi.fn();

const capturedViewerPagesSlotProps: Array<Record<string, unknown>> = [];
const capturedViewerThumbnailsSlotProps: Array<Record<string, unknown>> = [];
const capturedViewerSearchSlotProps: Array<Record<string, unknown>> = [];
const capturedViewerBookmarksSlotProps: Array<Record<string, unknown>> = [];

vi.mock('../../../../src/react/hooks/use-bookmarks.js', () => ({
  useBookmarks: (document: unknown) => mockUseBookmarks(document),
}));

vi.mock('../../../../src/react/components/pdf-viewer-context.js', () => ({
  usePDFViewer: () => mockUsePDFViewer(),
  usePDFPanelOptional: () => mockUsePDFPanelOptional(),
}));

vi.mock('../../../../src/react/components/viewer-slots.js', () => ({
  ViewerPagesSlot: (props: Record<string, unknown>) => {
    capturedViewerPagesSlotProps.push(props);
    return <div data-testid="viewer-pages-slot" />;
  },
  ViewerThumbnailsSlot: (props: Record<string, unknown>) => {
    capturedViewerThumbnailsSlotProps.push(props);
    return <div data-testid="viewer-thumbnails-slot" />;
  },
  ViewerSearchSlot: (props: Record<string, unknown>) => {
    capturedViewerSearchSlotProps.push(props);
    return <div data-testid="viewer-search-slot" />;
  },
  ViewerBookmarksSlot: (props: Record<string, unknown>) => {
    capturedViewerBookmarksSlotProps.push(props);
    return <div data-testid="viewer-bookmarks-slot" />;
  },
}));

const { Pages, PagesBookmarks, PagesSearch, PagesThumbnails } = await import(
  '../../../../src/react/components/pdf-viewer-slot-wrappers.js'
);

beforeEach(() => {
  capturedViewerPagesSlotProps.length = 0;
  capturedViewerThumbnailsSlotProps.length = 0;
  capturedViewerSearchSlotProps.length = 0;
  capturedViewerBookmarksSlotProps.length = 0;
  vi.clearAllMocks();

  mockUsePDFViewer.mockReturnValue({
    viewer: {
      document: { id: 'doc-1' },
      navigation: { pageIndex: 1, pageCount: 3, setPageIndex: vi.fn() },
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
    documentViewRef: createRef(),
    searchQuery: 'term',
    setSearchQuery: vi.fn(),
    toggleSearch: vi.fn(),
  });

  mockUsePDFPanelOptional.mockReturnValue({
    togglePanel: vi.fn(),
  });
});

describe('pdf-viewer-slot-wrappers', () => {
  it('maps viewer context into Pages slot', () => {
    render(<Pages gap={24} showTextLayer={false} />);

    const props = capturedViewerPagesSlotProps.at(-1)!;
    const { viewer, search, documentViewRef } = mockUsePDFViewer.mock.results[0]!.value;

    expect(props.gap).toBe(24);
    expect(props.showTextLayer).toBe(false);
    expect(props.viewer).toBe(viewer);
    expect(props.search).toBe(search);
    expect(props.documentViewRef).toBe(documentViewRef);
  });

  it('uses default thumbnails close handler when onClose is omitted', () => {
    render(<PagesThumbnails thumbnailScale={0.2} />);

    const props = capturedViewerThumbnailsSlotProps.at(-1)!;
    const panelCtx = mockUsePDFPanelOptional.mock.results[0]!.value;
    (props.onClose as () => void)();

    expect(panelCtx.togglePanel).toHaveBeenCalledWith('thumbnails');
    expect(props.thumbnailScale).toBe(0.2);
  });

  it('uses provided close handlers and maps search/bookmarks slot props', () => {
    const onCloseThumbs = vi.fn();
    const onCloseBookmarks = vi.fn();
    const bookmarks = [{ title: 'A', pageIndex: 0, children: [] }];
    mockUseBookmarks.mockReturnValue({ data: bookmarks });

    render(<PagesThumbnails onClose={onCloseThumbs} />);
    render(<PagesSearch className="search" />);
    render(<PagesBookmarks onClose={onCloseBookmarks} />);

    const thumbnailsProps = capturedViewerThumbnailsSlotProps.at(-1)!;
    (thumbnailsProps.onClose as () => void)();
    expect(onCloseThumbs).toHaveBeenCalledTimes(1);

    const searchProps = capturedViewerSearchSlotProps.at(-1)!;
    const viewerContext = mockUsePDFViewer.mock.results[2]!.value;
    expect(searchProps.search).toBe(viewerContext.search);
    expect(searchProps.searchQuery).toBe('term');
    expect(searchProps.setSearchQuery).toBe(viewerContext.setSearchQuery);
    expect(searchProps.toggleSearch).toBe(viewerContext.toggleSearch);

    const bookmarksProps = capturedViewerBookmarksSlotProps.at(-1)!;
    (bookmarksProps.onClose as () => void)();
    expect(onCloseBookmarks).toHaveBeenCalledTimes(1);
    expect(bookmarksProps.bookmarks).toBe(bookmarks);
    expect(mockUseBookmarks).toHaveBeenCalledWith(viewerContext.viewer.document);
  });

  it('defaults bookmarks to an empty array when hook data is undefined', () => {
    mockUseBookmarks.mockReturnValue({ data: undefined });

    render(<PagesBookmarks />);

    const bookmarksProps = capturedViewerBookmarksSlotProps.at(-1)!;
    expect(bookmarksProps.bookmarks).toEqual([]);
  });
});
