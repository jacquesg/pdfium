import { type CSSProperties, type ReactNode, type RefObject, useCallback, useMemo } from 'react';
import type { Bookmark } from '../../core/types.js';
import type { UseDocumentSearchResult } from '../hooks/use-document-search.js';
import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import { BookmarkPanel, type BookmarkPanelClassNames } from './bookmark-panel.js';
import { MarqueeOverlay } from './marquee-overlay.js';
import { BUILTIN_LABELS } from './panels/types.js';
import type { PDFDocumentViewHandle } from './pdf-document-view.js';
import { PDFDocumentView } from './pdf-document-view.js';
import type { PageOverlayInfo } from './pdf-page-view.js';
import { SearchPanel } from './search-panel.js';
import { SidebarPanel } from './sidebar-panel.js';
import { ThumbnailStrip } from './thumbnail-strip.js';

interface ViewerPagesSlotOptions {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  gap?: number | undefined;
  bufferPages?: number | undefined;
  showTextLayer?: boolean | undefined;
  showAnnotations?: boolean | undefined;
  showLinks?: boolean | undefined;
  renderFormFields?: boolean | undefined;
  renderPageOverlay?: ((info: PageOverlayInfo) => ReactNode) | undefined;
  loadingContent?: ReactNode | undefined;
  /** Version counter to trigger re-render when overlay ref changes. */
  overlayVersion?: number | undefined;
}

interface ViewerPagesSlotProps extends ViewerPagesSlotOptions {
  viewer: UseViewerSetupResult;
  search: UseDocumentSearchResult;
  documentViewRef: RefObject<PDFDocumentViewHandle | null>;
}

function ViewerPagesSlot({
  className,
  style: styleProp,
  gap,
  bufferPages,
  showTextLayer = true,
  showAnnotations = true,
  showLinks = true,
  renderFormFields = false,
  renderPageOverlay,
  loadingContent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read to force re-render
  overlayVersion: _overlayVersion,
  viewer,
  search,
  documentViewRef,
}: ViewerPagesSlotProps) {
  const searchState = useMemo(
    () =>
      search.totalMatches > 0 || search.isSearching
        ? {
            resultsByPage: search.resultsByPage,
            currentIndex: search.currentIndex,
            matchIndexMap: search.matchIndexMap,
            currentMatchPageIndex: search.currentMatchPageIndex,
          }
        : undefined,
    [search],
  );

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, ...styleProp }} className={className}>
      <PDFDocumentView
        ref={documentViewRef}
        containerRef={viewer.container.ref}
        zoomAnchorRef={viewer.container.zoomAnchorRef}
        scrollMode={viewer.scroll.scrollMode}
        scale={viewer.zoom.scale}
        currentPageIndex={viewer.navigation.pageIndex}
        onCurrentPageChange={viewer.navigation.setPageIndex}
        getRotation={viewer.rotation.getRotation}
        spreadMode={viewer.spread.spreadMode}
        showTextLayer={showTextLayer}
        showAnnotations={showAnnotations}
        showLinks={showLinks}
        renderFormFields={renderFormFields}
        renderPageOverlay={renderPageOverlay}
        search={searchState}
        gap={gap}
        bufferPages={bufferPages}
        loadingContent={loadingContent}
        style={{ height: '100%' }}
      />
      <MarqueeOverlay rect={viewer.interaction.marqueeRect} containerRef={viewer.container.ref} />
    </div>
  );
}

interface ViewerThumbnailsSlotOptions {
  thumbnailScale?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

interface ViewerThumbnailsSlotProps extends ViewerThumbnailsSlotOptions {
  viewer: UseViewerSetupResult;
  documentViewRef: RefObject<PDFDocumentViewHandle | null>;
  onClose: () => void;
}

function ViewerThumbnailsSlot({
  thumbnailScale,
  className,
  style: styleProp,
  viewer,
  documentViewRef,
  onClose,
}: ViewerThumbnailsSlotProps) {
  const handlePageSelect = useCallback(
    (pageIndex: number) => {
      viewer.navigation.setPageIndex(pageIndex);
      documentViewRef.current?.scrollToPage(pageIndex);
    },
    [viewer.navigation, documentViewRef],
  );

  return (
    <SidebarPanel title={BUILTIN_LABELS.thumbnails} onClose={onClose} className={className} style={styleProp}>
      <ThumbnailStrip
        document={viewer.document}
        pageCount={viewer.navigation.pageCount}
        currentPageIndex={viewer.navigation.pageIndex}
        onPageSelect={handlePageSelect}
        {...(thumbnailScale !== undefined ? { thumbnailScale } : undefined)}
        style={{ minHeight: 0, height: '100%' }}
      />
    </SidebarPanel>
  );
}

interface ViewerSearchSlotOptions {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

interface ViewerSearchSlotProps extends ViewerSearchSlotOptions {
  search: UseDocumentSearchResult;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
}

function ViewerSearchSlot({
  className,
  style: styleProp,
  search,
  searchQuery,
  setSearchQuery,
  toggleSearch,
}: ViewerSearchSlotProps) {
  return (
    <SearchPanel
      query={searchQuery}
      onQueryChange={setSearchQuery}
      totalMatches={search.totalMatches}
      currentIndex={search.currentIndex}
      isSearching={search.isSearching}
      onNext={search.next}
      onPrev={search.prev}
      onClose={toggleSearch}
      className={className}
      style={styleProp}
    />
  );
}

interface ViewerBookmarksSlotOptions {
  defaultExpanded?: boolean | undefined;
  showFilter?: boolean | undefined;
  classNames?: BookmarkPanelClassNames | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

interface ViewerBookmarksSlotProps extends ViewerBookmarksSlotOptions {
  viewer: UseViewerSetupResult;
  documentViewRef: RefObject<PDFDocumentViewHandle | null>;
  bookmarks: readonly Bookmark[];
  onClose: () => void;
}

function ViewerBookmarksSlot({
  defaultExpanded,
  showFilter,
  classNames: bookmarkClassNames,
  className,
  style: styleProp,
  viewer,
  documentViewRef,
  bookmarks,
  onClose,
}: ViewerBookmarksSlotProps) {
  const handleBookmarkSelect = useCallback(
    (pageIndex: number) => {
      viewer.navigation.setPageIndex(pageIndex);
      documentViewRef.current?.scrollToPage(pageIndex);
    },
    [viewer.navigation, documentViewRef],
  );

  return (
    <SidebarPanel title={BUILTIN_LABELS.bookmarks} onClose={onClose} className={className} style={styleProp}>
      <BookmarkPanel
        bookmarks={bookmarks}
        currentPageIndex={viewer.navigation.pageIndex}
        onBookmarkSelect={handleBookmarkSelect}
        defaultExpanded={defaultExpanded}
        showFilter={showFilter}
        classNames={bookmarkClassNames}
        style={{ minHeight: 0, height: '100%' }}
      />
    </SidebarPanel>
  );
}

export { ViewerBookmarksSlot, ViewerPagesSlot, ViewerSearchSlot, ViewerThumbnailsSlot };
export type {
  ViewerBookmarksSlotOptions,
  ViewerPagesSlotOptions,
  ViewerSearchSlotOptions,
  ViewerThumbnailsSlotOptions,
};
