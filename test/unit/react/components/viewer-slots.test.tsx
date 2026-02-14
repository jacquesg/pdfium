import { render, screen } from '@testing-library/react';
import { createRef, type ReactNode, type RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bookmark, TextSearchResult } from '../../../../src/core/types.js';
import { BUILTIN_LABELS } from '../../../../src/react/components/panels/types.js';
import type { PDFDocumentViewHandle } from '../../../../src/react/components/pdf-document-view.js';
import type { UseDocumentSearchResult } from '../../../../src/react/hooks/use-document-search.js';
import type { UseViewerSetupResult } from '../../../../src/react/hooks/use-viewer-setup.js';

const capturedDocumentViewProps: Array<Record<string, unknown>> = [];
const capturedMarqueeProps: Array<Record<string, unknown>> = [];
const capturedThumbnailStripProps: Array<Record<string, unknown>> = [];
const capturedSearchPanelProps: Array<Record<string, unknown>> = [];
const capturedBookmarkPanelProps: Array<Record<string, unknown>> = [];

vi.mock('../../../../src/react/components/pdf-document-view.js', async () => {
  const React = await import('react');
  return {
    PDFDocumentView: React.forwardRef((props: Record<string, unknown>, _ref) => {
      capturedDocumentViewProps.push(props);
      return <div data-testid="pdf-document-view" />;
    }),
  };
});

vi.mock('../../../../src/react/components/marquee-overlay.js', () => ({
  MarqueeOverlay: (props: Record<string, unknown>) => {
    capturedMarqueeProps.push(props);
    return <div data-testid="marquee-overlay" />;
  },
}));

vi.mock('../../../../src/react/components/sidebar-panel.js', () => ({
  SidebarPanel: (props: {
    title: string;
    onClose: () => void;
    className?: string;
    style?: Record<string, unknown>;
    children: ReactNode;
  }) => (
    <div
      data-testid="sidebar-panel"
      data-title={props.title}
      data-classname={props.className ?? ''}
      data-has-style={props.style ? 'true' : 'false'}
    >
      <button type="button" data-testid={`close-${props.title.toLowerCase()}`} onClick={props.onClose}>
        close
      </button>
      {props.children}
    </div>
  ),
}));

vi.mock('../../../../src/react/components/thumbnail-strip.js', () => ({
  ThumbnailStrip: (props: Record<string, unknown>) => {
    capturedThumbnailStripProps.push(props);
    return <div data-testid="thumbnail-strip" />;
  },
}));

vi.mock('../../../../src/react/components/search-panel.js', () => ({
  SearchPanel: (props: Record<string, unknown>) => {
    capturedSearchPanelProps.push(props);
    return <div data-testid="search-panel" />;
  },
}));

vi.mock('../../../../src/react/components/bookmark-panel.js', () => ({
  BookmarkPanel: (props: Record<string, unknown>) => {
    capturedBookmarkPanelProps.push(props);
    return <div data-testid="bookmark-panel" />;
  },
}));

const { ViewerBookmarksSlot, ViewerPagesSlot, ViewerSearchSlot, ViewerThumbnailsSlot } = await import(
  '../../../../src/react/components/viewer-slots.js'
);

beforeEach(() => {
  capturedDocumentViewProps.length = 0;
  capturedMarqueeProps.length = 0;
  capturedThumbnailStripProps.length = 0;
  capturedSearchPanelProps.length = 0;
  capturedBookmarkPanelProps.length = 0;
});

function createViewer(overrides?: Partial<UseViewerSetupResult>): {
  viewer: UseViewerSetupResult;
  setPageIndex: ReturnType<typeof vi.fn>;
} {
  const setPageIndex = vi.fn();
  const viewer = {
    document: { id: 'doc-1' },
    container: { ref: createRef<HTMLDivElement>(), zoomAnchorRef: createRef() },
    scroll: { scrollMode: 'continuous' as const },
    zoom: { scale: 1.5 },
    navigation: { pageIndex: 1, pageCount: 9, setPageIndex },
    rotation: { getRotation: vi.fn(() => 'None') },
    spread: { spreadMode: 'none' as const },
    interaction: { marqueeRect: { x: 1, y: 2, width: 3, height: 4 } },
  } as unknown as UseViewerSetupResult;

  return {
    viewer: { ...viewer, ...overrides },
    setPageIndex,
  };
}

function createSearch(overrides?: Partial<UseDocumentSearchResult>): UseDocumentSearchResult {
  return {
    matches: [],
    totalMatches: 0,
    currentIndex: -1,
    isSearching: false,
    next: vi.fn(),
    prev: vi.fn(),
    goToMatch: vi.fn(),
    resultsByPage: new Map(),
    matchIndexMap: [],
    currentMatchPageIndex: undefined,
    ...overrides,
  };
}

describe('ViewerPagesSlot', () => {
  it('forwards viewer state and omits search payload when there are no matches', () => {
    const { viewer } = createViewer();
    const search = createSearch();
    const documentViewRef = createRef<PDFDocumentViewHandle>() as RefObject<PDFDocumentViewHandle | null>;

    render(
      <ViewerPagesSlot
        className="pages"
        style={{ padding: '8px' }}
        showTextLayer={false}
        showAnnotations={false}
        showLinks={false}
        renderFormFields
        viewer={viewer}
        search={search}
        documentViewRef={documentViewRef}
      />,
    );

    const forwarded = capturedDocumentViewProps.at(-1)!;
    expect(forwarded.className).toBeUndefined();
    expect(forwarded.showTextLayer).toBe(false);
    expect(forwarded.showAnnotations).toBe(false);
    expect(forwarded.showLinks).toBe(false);
    expect(forwarded.renderFormFields).toBe(true);
    expect(forwarded.search).toBeUndefined();

    const marquee = capturedMarqueeProps.at(-1)!;
    expect(marquee.rect).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(screen.getByTestId('pdf-document-view')).toBeDefined();
    expect(screen.getByTestId('marquee-overlay')).toBeDefined();
  });

  it('forwards active search payload when matches exist', () => {
    const { viewer } = createViewer();
    const search = createSearch({
      totalMatches: 5,
      currentIndex: 2,
      isSearching: false,
      resultsByPage: new Map<number, TextSearchResult[]>([
        [
          0,
          [
            {
              charIndex: 10,
              charCount: 6,
              rects: [{ left: 1, top: 3, right: 2, bottom: 1 }],
            },
          ],
        ],
      ]),
      matchIndexMap: [{ pageIndex: 0, localIndex: 0 }],
      currentMatchPageIndex: 0,
    });

    render(<ViewerPagesSlot viewer={viewer} search={search} documentViewRef={createRef()} />);

    const forwarded = capturedDocumentViewProps.at(-1)!;
    expect(forwarded.search).toEqual({
      resultsByPage: search.resultsByPage,
      currentIndex: 2,
      matchIndexMap: search.matchIndexMap,
      currentMatchPageIndex: 0,
    });
  });
});

describe('ViewerThumbnailsSlot', () => {
  it('selects pages by updating viewer navigation and scrolling document view', () => {
    const { viewer, setPageIndex } = createViewer();
    const scrollToPage = vi.fn();
    const documentViewRef = { current: { scrollToPage } } as RefObject<PDFDocumentViewHandle | null>;
    const onClose = vi.fn();

    render(
      <ViewerThumbnailsSlot
        thumbnailScale={0.25}
        viewer={viewer}
        documentViewRef={documentViewRef}
        onClose={onClose}
        className="thumbs"
      />,
    );

    expect(screen.getByTestId('sidebar-panel').getAttribute('data-title')).toBe(BUILTIN_LABELS.thumbnails);
    const props = capturedThumbnailStripProps.at(-1)!;
    expect(props.currentPageIndex).toBe(1);
    expect(props.pageCount).toBe(9);
    expect(props.thumbnailScale).toBe(0.25);

    (props.onPageSelect as (pageIndex: number) => void)(4);
    expect(setPageIndex).toHaveBeenCalledWith(4);
    expect(scrollToPage).toHaveBeenCalledWith(4);
  });
});

describe('ViewerSearchSlot', () => {
  it('maps search control props into SearchPanel', () => {
    const search = createSearch({ totalMatches: 8, currentIndex: 3, isSearching: true });
    const setSearchQuery = vi.fn();
    const toggleSearch = vi.fn();

    render(
      <ViewerSearchSlot
        search={search}
        searchQuery="term"
        setSearchQuery={setSearchQuery}
        toggleSearch={toggleSearch}
        className="search"
      />,
    );

    const props = capturedSearchPanelProps.at(-1)!;
    expect(props.query).toBe('term');
    expect(props.totalMatches).toBe(8);
    expect(props.currentIndex).toBe(3);
    expect(props.isSearching).toBe(true);
    expect(props.onQueryChange).toBe(setSearchQuery);
    expect(props.onClose).toBe(toggleSearch);
  });
});

describe('ViewerBookmarksSlot', () => {
  it('passes bookmarks and handles bookmark selection', () => {
    const { viewer, setPageIndex } = createViewer();
    const scrollToPage = vi.fn();
    const documentViewRef = { current: { scrollToPage } } as RefObject<PDFDocumentViewHandle | null>;
    const bookmarks: readonly Bookmark[] = [{ title: 'Intro', pageIndex: 0, children: [] }];

    render(
      <ViewerBookmarksSlot
        viewer={viewer}
        documentViewRef={documentViewRef}
        bookmarks={bookmarks}
        onClose={vi.fn()}
        defaultExpanded
        showFilter={false}
      />,
    );

    expect(screen.getByTestId('sidebar-panel').getAttribute('data-title')).toBe(BUILTIN_LABELS.bookmarks);
    const props = capturedBookmarkPanelProps.at(-1)!;
    expect(props.bookmarks).toBe(bookmarks);
    expect(props.currentPageIndex).toBe(1);
    expect(props.defaultExpanded).toBe(true);
    expect(props.showFilter).toBe(false);

    (props.onBookmarkSelect as (pageIndex: number) => void)(6);
    expect(setPageIndex).toHaveBeenCalledWith(6);
    expect(scrollToPage).toHaveBeenCalledWith(6);
  });
});
