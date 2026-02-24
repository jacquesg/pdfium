import { useBookmarks } from '../hooks/use-bookmarks.js';
import { usePDFPanelOptional, usePDFViewer } from './pdf-viewer-context.js';
import {
  ViewerBookmarksSlot,
  type ViewerBookmarksSlotOptions,
  ViewerPagesSlot,
  type ViewerPagesSlotOptions,
  ViewerSearchSlot,
  type ViewerSearchSlotOptions,
  ViewerThumbnailsSlot,
  type ViewerThumbnailsSlotOptions,
} from './viewer-slots.js';

type PagesSlotProps = ViewerPagesSlotOptions;

type PanelCloseContext = ReturnType<typeof usePDFPanelOptional>;

function resolvePanelCloseHandler(
  onClose: (() => void) | undefined,
  panelCtx: PanelCloseContext,
  panelId: 'thumbnails' | 'bookmarks',
): () => void {
  return onClose ?? (() => panelCtx?.togglePanel(panelId));
}

function Pages(props: PagesSlotProps) {
  const { viewer, search, documentViewRef } = usePDFViewer();
  return <ViewerPagesSlot {...props} viewer={viewer} search={search} documentViewRef={documentViewRef} />;
}

type ThumbnailsSlotProps = ViewerThumbnailsSlotOptions & { onClose?: (() => void) | undefined };

function PagesThumbnails({ onClose, ...options }: ThumbnailsSlotProps) {
  const { viewer, documentViewRef } = usePDFViewer();
  const panelCtx = usePDFPanelOptional();
  const closeFn = resolvePanelCloseHandler(onClose, panelCtx, 'thumbnails');
  return <ViewerThumbnailsSlot {...options} viewer={viewer} documentViewRef={documentViewRef} onClose={closeFn} />;
}

type SearchSlotProps = ViewerSearchSlotOptions;

function PagesSearch(props: SearchSlotProps) {
  const { search, searchQuery, setSearchQuery, toggleSearch } = usePDFViewer();
  return (
    <ViewerSearchSlot
      {...props}
      search={search}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      toggleSearch={toggleSearch}
    />
  );
}

type BookmarksSlotProps = ViewerBookmarksSlotOptions & { onClose?: (() => void) | undefined };

function PagesBookmarks({ onClose, ...options }: BookmarksSlotProps) {
  const { viewer, documentViewRef } = usePDFViewer();
  const panelCtx = usePDFPanelOptional();
  const closeFn = resolvePanelCloseHandler(onClose, panelCtx, 'bookmarks');
  const { data: bookmarks } = useBookmarks(viewer.document);
  return (
    <ViewerBookmarksSlot
      {...options}
      viewer={viewer}
      documentViewRef={documentViewRef}
      bookmarks={bookmarks ?? []}
      onClose={closeFn}
    />
  );
}

export { Pages, PagesBookmarks, PagesSearch, PagesThumbnails };
export type { BookmarksSlotProps, PagesSlotProps, SearchSlotProps, ThumbnailsSlotProps };
