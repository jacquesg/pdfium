# React Examples & Recipes

Comprehensive examples for `@scaryterry/pdfium/react`. Each recipe includes a description, complete TSX code, and a list of key APIs used.

> All examples assume you have configured `PDFiumProvider` with the correct `workerUrl` and `wasmUrl` (or `wasmBinary`). See the [Getting Started guide](../getting-started.md) for initial setup.

---

## Table of Contents

### Basic (Tier 1 -- PDFViewer)

1. [Minimal PDF Viewer](#1-minimal-pdf-viewer)
2. [Styled Viewer](#2-styled-viewer)
3. [Viewer with Thumbnails](#3-viewer-with-thumbnails)
4. [Viewer with Search](#4-viewer-with-search)
5. [Viewer with Download Button](#5-viewer-with-download-button)
6. [Custom Toolbar](#6-custom-toolbar)

### Intermediate (Tier 2 -- useViewerSetup)

7. [Custom Viewer Layout](#7-custom-viewer-layout)
8. [Text Selection + Search](#8-text-selection--search)
9. [Annotation Inspector](#9-annotation-inspector)
10. [Form-Enabled Viewer](#10-form-enabled-viewer)
11. [Imperative Page Navigation](#11-imperative-page-navigation)
12. [Custom Page Overlays](#12-custom-page-overlays)

### Advanced (Tier 3 -- Low-level)

13. [Standalone Page Renderer](#13-standalone-page-renderer)
14. [PDF Thumbnail Generator](#14-pdf-thumbnail-generator)
15. [Document Creator](#15-document-creator)

### Integration

16. [Responsive Viewer](#16-responsive-viewer)
17. [Error Handling](#17-error-handling)

---

## Basic (Tier 1 -- PDFViewer)

### 1. Minimal PDF Viewer

Zero-configuration viewer. Wrap `PDFViewer` inside `PDFiumProvider` and you get navigation, zoom, and scroll out of the box.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function App() {
  return (
    <PDFiumProvider
      wasmUrl="/pdfium.wasm"
      workerUrl="/pdfium-worker.js"
      initialDocument={{ data: pdfBytes, name: 'document.pdf' }}
    >
      <div style={{ height: '100vh' }}>
        <PDFViewer />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFiumProvider`, `PDFViewer`

---

### 2. Styled Viewer

Apply Tailwind (or any CSS framework) classes to each section of the viewer using the `classNames` prop.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function StyledViewer() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <PDFViewer
        classNames={{
          root: 'flex flex-col h-full bg-slate-50',
          toolbar: 'flex items-center gap-2 px-4 py-2 bg-white border-b shadow-sm',
          search: 'px-4 py-2 bg-yellow-50 border-b',
          content: 'flex flex-1 overflow-hidden',
          sidebar: 'w-48 border-r bg-white overflow-y-auto',
          pages: 'flex-1 min-h-0',
        }}
      />
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer`, `PDFViewerClassNames`

---

### 3. Viewer with Thumbnails

Enable the thumbnail sidebar with the `showThumbnails` prop. Users can click a thumbnail to jump to that page.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function ViewerWithThumbnails() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer
          showThumbnails
          classNames={{
            sidebar: 'thumbnail-sidebar',
            pages: 'main-pages',
          }}
        />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer` (`showThumbnails` prop), `ThumbnailStrip` (rendered internally)

---

### 4. Viewer with Search

Search is enabled by default (`showSearch={true}`). The built-in keyboard shortcut `Ctrl+F` (or `Cmd+F` on macOS) opens the search panel. Press `Enter` to jump to the next match and `Shift+Enter` for the previous match.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function ViewerWithSearch() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer
          showSearch
          keyboardShortcuts
          classNames={{
            search: 'search-bar',
          }}
        />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer` (`showSearch`, `keyboardShortcuts`), `useKeyboardShortcuts`, `SearchPanel`

---

### 5. Viewer with Download Button

Add a download button by passing `children` to `DefaultToolbar`. The `useDownload` hook handles saving the document as a file.

```tsx
import {
  DefaultToolbar,
  PDFiumProvider,
  PDFViewer,
  useDownload,
  usePDFViewer,
} from '@scaryterry/pdfium/react';

function DownloadButton() {
  const { viewer } = usePDFViewer();
  const { download, isDownloading } = useDownload();

  return (
    <>
      <span aria-hidden="true" style={{ margin: '0 4px' }}>|</span>
      <button
        type="button"
        disabled={!viewer.document || isDownloading}
        onClick={() => {
          if (viewer.document) {
            download(viewer.document, 'my-document.pdf');
          }
        }}
      >
        {isDownloading ? 'Saving...' : 'Download'}
      </button>
    </>
  );
}

function ViewerWithDownload() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer>
          <DefaultToolbar>
            <DownloadButton />
          </DefaultToolbar>
        </PDFViewer>
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer`, `DefaultToolbar` (`children`), `useDownload`, `usePDFViewer`

---

### 6. Custom Toolbar

Build a completely custom toolbar using `usePDFViewer()` to access the grouped viewer state. This gives you full control over the UI whilst retaining all viewer behaviour.

```tsx
import { PDFiumProvider, PDFViewer, usePDFViewer } from '@scaryterry/pdfium/react';

function MyToolbar() {
  const { viewer, toggleSearch, isSearchOpen, isThumbnailsOpen, toggleThumbnails } = usePDFViewer();
  const { navigation, zoom, fit, scroll } = viewer;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>
      {/* Navigation */}
      <button type="button" disabled={!navigation.canPrev} onClick={navigation.prev}>
        Previous
      </button>
      <span>
        Page {navigation.pageIndex + 1} of {navigation.pageCount}
      </span>
      <button type="button" disabled={!navigation.canNext} onClick={navigation.next}>
        Next
      </button>

      <span aria-hidden="true">|</span>

      {/* Zoom */}
      <button type="button" disabled={!zoom.canZoomOut} onClick={zoom.zoomOut}>-</button>
      <span>{Math.round(zoom.scale * 100)}%</span>
      <button type="button" disabled={!zoom.canZoomIn} onClick={zoom.zoomIn}>+</button>

      <span aria-hidden="true">|</span>

      {/* Fit controls */}
      <button
        type="button"
        onClick={fit.fitWidth}
        aria-pressed={fit.activeFitMode === 'page-width'}
      >
        Fit Width
      </button>
      <button
        type="button"
        onClick={fit.fitPage}
        aria-pressed={fit.activeFitMode === 'page-fit'}
      >
        Fit Page
      </button>

      <span aria-hidden="true">|</span>

      {/* Scroll mode */}
      <select
        value={scroll.scrollMode}
        onChange={(e) => scroll.setScrollMode(e.target.value as 'continuous' | 'single')}
      >
        <option value="continuous">Continuous</option>
        <option value="single">Single Page</option>
      </select>

      <span aria-hidden="true">|</span>

      {/* Toggles */}
      <button type="button" onClick={toggleThumbnails}>
        {isThumbnailsOpen ? 'Hide Thumbnails' : 'Show Thumbnails'}
      </button>
      <button type="button" onClick={toggleSearch}>
        {isSearchOpen ? 'Close Search' : 'Search'}
      </button>
    </div>
  );
}

function CustomToolbarViewer() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer showThumbnails>
          {({ viewer, isSearchOpen, isThumbnailsOpen, documentViewRef }) => (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <MyToolbar />
              {isSearchOpen && <PDFViewer.Search />}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {isThumbnailsOpen && <PDFViewer.Thumbnails />}
                <PDFViewer.Pages style={{ flex: 1, minHeight: 0 }} />
              </div>
            </div>
          )}
        </PDFViewer>
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer` (render function children), `usePDFViewer`, `PDFViewer.Pages`, `PDFViewer.Thumbnails`, `PDFViewer.Search`, `PDFViewerState`

---

## Intermediate (Tier 2 -- useViewerSetup)

### 7. Custom Viewer Layout

Drop below `PDFViewer` and compose your own layout with `useViewerSetup`, `PDFDocumentView`, and `PDFToolbar`. This gives you full control over the slot arrangement and toolbar composition.

```tsx
import {
  PDFiumProvider,
  PDFDocumentView,
  PDFToolbar,
  ThumbnailStrip,
  useViewerSetup,
  usePDFiumDocument,
} from '@scaryterry/pdfium/react';
import { useRef } from 'react';
import type { PDFDocumentViewHandle } from '@scaryterry/pdfium/react';

function CustomLayout() {
  const viewer = useViewerSetup({ initialScale: 1.2, initialScrollMode: 'continuous' });
  const { document: doc } = usePDFiumDocument();
  const docViewRef = useRef<PDFDocumentViewHandle>(null);

  const handleThumbnailSelect = (pageIndex: number) => {
    viewer.navigation.setPageIndex(pageIndex);
    docViewRef.current?.scrollToPage(pageIndex);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar with all slots */}
      <PDFToolbar viewer={viewer}>
        <PDFToolbar.Navigation>
          {({ getPrevProps, getInputProps, getNextProps, pageCount }) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button {...getPrevProps()}>Prev</button>
              <input {...getInputProps()} style={{ width: 48, textAlign: 'center' }} />
              <span>/ {pageCount}</span>
              <button {...getNextProps()}>Next</button>
            </div>
          )}
        </PDFToolbar.Navigation>

        <PDFToolbar.Zoom>
          {({ getZoomOutProps, getZoomInProps, getResetProps, percentage }) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button {...getZoomOutProps()}>-</button>
              <span>{percentage}%</span>
              <button {...getZoomInProps()}>+</button>
              <button {...getResetProps()}>Reset</button>
            </div>
          )}
        </PDFToolbar.Zoom>

        <PDFToolbar.Fit>
          {({ getFitWidthProps, getFitPageProps }) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <button {...getFitWidthProps()}>Fit W</button>
              <button {...getFitPageProps()}>Fit P</button>
            </div>
          )}
        </PDFToolbar.Fit>

        <PDFToolbar.ScrollMode>
          {({ getSelectProps, options }) => (
            <select {...getSelectProps()}>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </PDFToolbar.ScrollMode>
      </PDFToolbar>

      {/* Content area with sidebar and pages */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ThumbnailStrip
          document={viewer.document}
          pageCount={viewer.navigation.pageCount}
          currentPageIndex={viewer.navigation.pageIndex}
          onPageSelect={handleThumbnailSelect}
          style={{ width: 180, minHeight: 0 }}
        />
        <PDFDocumentView
          ref={docViewRef}
          containerRef={viewer.container.ref}
          zoomAnchorRef={viewer.container.zoomAnchorRef}
          scrollMode={viewer.scroll.scrollMode}
          scale={viewer.zoom.scale}
          currentPageIndex={viewer.navigation.pageIndex}
          onCurrentPageChange={viewer.navigation.setPageIndex}
          showTextLayer
          showAnnotations
          showLinks
          style={{ flex: 1, minHeight: 0 }}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <CustomLayout />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `useViewerSetup`, `PDFDocumentView`, `PDFDocumentViewHandle`, `PDFToolbar`, `PDFToolbar.Navigation`, `PDFToolbar.Zoom`, `PDFToolbar.Fit`, `PDFToolbar.ScrollMode`, `ThumbnailStrip`

---

### 8. Text Selection + Search

Combine the text layer (for native text selection) with `useDocumentSearch` for find-in-document functionality. Search results are highlighted on each page.

```tsx
import {
  PDFiumProvider,
  PDFDocumentView,
  SearchPanel,
  useViewerSetup,
  useDocumentSearch,
} from '@scaryterry/pdfium/react';
import { useMemo, useState } from 'react';

function TextSearchViewer() {
  const viewer = useViewerSetup();
  const [query, setQuery] = useState('');

  const search = useDocumentSearch(viewer.document, query);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SearchPanel
        query={query}
        onQueryChange={setQuery}
        totalMatches={search.totalMatches}
        currentIndex={search.currentIndex}
        isSearching={search.isSearching}
        onNext={search.next}
        onPrev={search.prev}
        style={{ padding: 8 }}
      />
      <PDFDocumentView
        containerRef={viewer.container.ref}
        zoomAnchorRef={viewer.container.zoomAnchorRef}
        scrollMode={viewer.scroll.scrollMode}
        scale={viewer.zoom.scale}
        currentPageIndex={viewer.navigation.pageIndex}
        onCurrentPageChange={viewer.navigation.setPageIndex}
        showTextLayer
        search={searchState}
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <TextSearchViewer />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `useViewerSetup`, `useDocumentSearch`, `PDFDocumentView` (`showTextLayer`, `search`), `SearchPanel`

---

### 9. Annotation Inspector

Display annotation overlays on each page and list annotations in a sidebar using `useAnnotations`. Click an annotation in the list to highlight it on the page.

```tsx
import {
  PDFiumProvider,
  PDFViewer,
  usePDFViewer,
  useAnnotations,
  AnnotationOverlay,
} from '@scaryterry/pdfium/react';
import type { PageOverlayInfo, SerialisedAnnotation } from '@scaryterry/pdfium/react';
import { useState } from 'react';

function AnnotationSidebar() {
  const { viewer } = usePDFViewer();
  const pageIndex = viewer.navigation.pageIndex;
  const { data: annotations } = useAnnotations(viewer.document, pageIndex);

  if (!annotations || annotations.length === 0) {
    return <p style={{ padding: 12 }}>No annotations on this page.</p>;
  }

  return (
    <div style={{ padding: 12, overflowY: 'auto' }}>
      <h3>Annotations ({annotations.length})</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {annotations.map((ann, i) => (
          <li
            key={i}
            style={{
              padding: '8px 12px',
              marginBottom: 4,
              backgroundColor: '#f0f9ff',
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            <strong>{ann.subtype}</strong>
            {ann.contents && <p style={{ margin: '4px 0 0', color: '#6b7280' }}>{ann.contents}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnnotationPageOverlay(info: PageOverlayInfo) {
  const { viewer } = usePDFViewer();
  const { data: annotations } = useAnnotations(viewer.document, info.pageIndex);

  if (!annotations || annotations.length === 0) return null;

  return (
    <AnnotationOverlay
      annotations={annotations}
      width={info.width}
      height={info.height}
      originalHeight={info.originalHeight}
      scale={info.scale}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}
    />
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer
          showAnnotations={false}
          renderPageOverlay={(info) => <AnnotationPageOverlay {...info} />}
        >
          {() => (
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ width: 280, borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
                <AnnotationSidebar />
              </div>
              <PDFViewer.Pages style={{ flex: 1, minHeight: 0 }} />
            </div>
          )}
        </PDFViewer>
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `useAnnotations`, `AnnotationOverlay`, `PDFViewer` (`renderPageOverlay`), `PageOverlayInfo`, `SerialisedAnnotation`

---

### 10. Form-Enabled Viewer

Render form fields into the page bitmap and use the form action hooks to manage form state. After mutations (flatten, undo), the document revision is bumped automatically, which invalidates caches and re-renders pages.

```tsx
import {
  PDFiumProvider,
  PDFViewer,
  usePDFViewer,
  useDocumentFormActions,
  usePageFormActions,
  FlattenFlags,
} from '@scaryterry/pdfium/react';

function FormControls() {
  const { viewer } = usePDFViewer();
  const { killFocus, setHighlight } = useDocumentFormActions(viewer.document);
  const { flatten, undo, canUndo } = usePageFormActions(
    viewer.document,
    viewer.navigation.pageIndex,
  );

  return (
    <div style={{ display: 'flex', gap: 8, padding: 8, borderTop: '1px solid #e5e7eb' }}>
      <button
        type="button"
        onClick={async () => {
          await killFocus();
        }}
      >
        Kill Focus
      </button>
      <button
        type="button"
        onClick={async () => {
          const canDo = await canUndo();
          if (canDo) await undo();
        }}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={async () => {
          await flatten(FlattenFlags.NormalDisplay);
        }}
      >
        Flatten Page
      </button>
    </div>
  );
}

function FormViewer() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <PDFViewer renderFormFields style={{ flex: 1 }}>
          {() => (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <PDFViewer.Pages renderFormFields style={{ flex: 1, minHeight: 0 }} />
              <FormControls />
            </div>
          )}
        </PDFViewer>
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer` (`renderFormFields`), `useDocumentFormActions`, `usePageFormActions`, `FlattenFlags`

---

### 11. Imperative Page Navigation

Use the `PDFDocumentViewHandle` ref to programmatically scroll to any page with `scrollToPage`. This is useful for tables of contents, bookmark navigation, or external link handlers.

```tsx
import {
  PDFiumProvider,
  PDFViewer,
  usePDFViewer,
  useBookmarks,
} from '@scaryterry/pdfium/react';
import type { Bookmark } from '@scaryterry/pdfium/react';

function BookmarkList() {
  const { viewer, documentViewRef } = usePDFViewer();
  const { data: bookmarks } = useBookmarks(viewer.document);

  const handleClick = (bookmark: Bookmark) => {
    if (bookmark.destination?.pageIndex !== undefined) {
      const pageIndex = bookmark.destination.pageIndex;
      viewer.navigation.setPageIndex(pageIndex);
      documentViewRef.current?.scrollToPage(pageIndex, 'smooth');
    }
  };

  if (!bookmarks || bookmarks.length === 0) {
    return <p style={{ padding: 12 }}>No bookmarks found.</p>;
  }

  return (
    <nav style={{ padding: 12 }}>
      <h3>Bookmarks</h3>
      <ul>
        {bookmarks.map((bm, i) => (
          <li key={i}>
            <button type="button" onClick={() => handleClick(bm)} style={{ cursor: 'pointer' }}>
              {bm.title}
            </button>
            {bm.children && bm.children.length > 0 && (
              <ul>
                {bm.children.map((child, j) => (
                  <li key={j}>
                    <button type="button" onClick={() => handleClick(child)} style={{ cursor: 'pointer' }}>
                      {child.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BookmarkViewer() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <PDFViewer>
        {() => (
          <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ width: 260, borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
              <BookmarkList />
            </div>
            <PDFViewer.Pages style={{ flex: 1, minHeight: 0 }} />
          </div>
        )}
      </PDFViewer>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFDocumentViewHandle` (`scrollToPage`), `usePDFViewer` (`documentViewRef`), `useBookmarks`, `Bookmark`

---

### 12. Custom Page Overlays

Use `renderPageOverlay` to draw custom content on top of each page. The `PageOverlayInfo` provides `transformRect` and `transformPoint` to convert PDF coordinates (bottom-left origin) to screen coordinates (top-left origin, CSS pixels).

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';
import type { PageOverlayInfo } from '@scaryterry/pdfium/react';

/** Example: highlight a specific region in PDF coordinate space. */
const highlights = [
  { pageIndex: 0, rect: { left: 72, top: 720, right: 300, bottom: 700 } },
  { pageIndex: 0, rect: { left: 72, top: 680, right: 540, bottom: 660 } },
  { pageIndex: 1, rect: { left: 100, top: 500, right: 400, bottom: 480 } },
];

function PageHighlights(info: PageOverlayInfo) {
  const pageHighlights = highlights.filter((h) => h.pageIndex === info.pageIndex);
  if (pageHighlights.length === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {pageHighlights.map((h, i) => {
        const screen = info.transformRect(h.rect);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: screen.x,
              top: screen.y,
              width: screen.width,
              height: screen.height,
              backgroundColor: 'rgba(255, 220, 0, 0.3)',
              border: '1px solid rgba(255, 180, 0, 0.6)',
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

function OverlayViewer() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer renderPageOverlay={(info) => <PageHighlights {...info} />} />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFViewer` (`renderPageOverlay`), `PageOverlayInfo` (`transformRect`, `transformPoint`, `pageIndex`, `width`, `height`, `originalWidth`, `originalHeight`, `scale`)

---

## Advanced (Tier 3 -- Low-level)

### 13. Standalone Page Renderer

Render a single PDF page without any viewer chrome. Uses `useRenderPage` directly with `PDFCanvas`. Useful for embedding a single page preview inside another UI.

```tsx
import {
  PDFiumProvider,
  usePDFiumDocument,
  useRenderPage,
  PDFCanvas,
} from '@scaryterry/pdfium/react';

function SinglePagePreview({ pageIndex, scale = 1 }: { pageIndex: number; scale?: number }) {
  const { document } = usePDFiumDocument();
  const { renderKey, width, height, isLoading, error, retry } = useRenderPage(document, pageIndex, {
    scale,
  });

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <p>Render failed: {error.message}</p>
        <button type="button" onClick={retry}>Retry</button>
      </div>
    );
  }

  const displayWidth = width ? width / scale : 300;
  const displayHeight = height ? height / scale : 400;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
          }}
        >
          Loading...
        </div>
      )}
      <PDFCanvas
        width={width ?? 0}
        height={height ?? 0}
        renderKey={renderKey}
        style={{ width: displayWidth, height: displayHeight }}
      />
    </div>
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ display: 'flex', gap: 16, padding: 24 }}>
        <SinglePagePreview pageIndex={0} scale={2} />
        <SinglePagePreview pageIndex={1} scale={2} />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `useRenderPage`, `PDFCanvas`, `usePDFiumDocument`

---

### 14. PDF Thumbnail Generator

Generate small thumbnail images at a reduced scale. Renders each page at 0.3x and displays them in a grid. This is a lightweight alternative to `ThumbnailStrip` when you need custom thumbnail layouts.

```tsx
import {
  PDFiumProvider,
  usePDFiumDocument,
  useRenderPage,
  PDFCanvas,
} from '@scaryterry/pdfium/react';

function Thumbnail({ pageIndex }: { pageIndex: number }) {
  const { document } = usePDFiumDocument();
  const thumbScale = 0.3;
  const { renderKey, width, height, originalWidth, originalHeight, isLoading } = useRenderPage(
    document,
    pageIndex,
    { scale: thumbScale },
  );

  const displayWidth = originalWidth ? originalWidth * thumbScale : 80;
  const displayHeight = originalHeight ? originalHeight * thumbScale : 100;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor: isLoading ? '#f3f4f6' : 'transparent',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <PDFCanvas
          width={width ?? 0}
          height={height ?? 0}
          renderKey={renderKey}
          style={{ width: displayWidth, height: displayHeight }}
        />
      </div>
      <span style={{ fontSize: 12, color: '#6b7280' }}>Page {pageIndex + 1}</span>
    </div>
  );
}

function ThumbnailGrid() {
  const { document } = usePDFiumDocument();
  const pageCount = document?.pageCount ?? 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 16,
        padding: 24,
      }}
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <Thumbnail key={i} pageIndex={i} />
      ))}
    </div>
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <ThumbnailGrid />
    </PDFiumProvider>
  );
}
```

**Key APIs:** `useRenderPage` (at scale 0.3), `PDFCanvas`, `usePDFiumDocument`

---

### 15. Document Creator

Use `useSyncPDFium` to obtain a main-thread `PDFium` instance for synchronous operations like creating new documents. The created document can then be loaded into the viewer with `loadDocument`.

```tsx
import {
  PDFiumProvider,
  PDFViewer,
  useSyncPDFium,
  usePDFiumDocument,
} from '@scaryterry/pdfium/react';
import { useCallback } from 'react';

function CreateDocumentButton() {
  const { instance, isInitialising } = useSyncPDFium();
  const { loadDocument } = usePDFiumDocument();

  const handleCreate = useCallback(async () => {
    if (!instance) return;

    // Create a new blank PDF document
    using builder = instance.createDocument();

    // Add an A4 page (595 x 842 points)
    const page = builder.addPage({ width: 595, height: 842 });

    // Add text using a standard font
    const font = builder.loadStandardFont('Helvetica');
    page.addText('Hello from PDFium!', font, {
      x: 72,
      y: 770,
      fontSize: 24,
    });

    page.addText('This document was created programmatically.', font, {
      x: 72,
      y: 740,
      fontSize: 14,
    });

    // Save to bytes and load into the viewer
    const bytes = builder.save();
    await loadDocument(bytes, 'created-document.pdf');
  }, [instance, loadDocument]);

  return (
    <button type="button" onClick={handleCreate} disabled={isInitialising || !instance}>
      {isInitialising ? 'Initialising...' : 'Create Document'}
    </button>
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
          <CreateDocumentButton />
        </div>
        <div style={{ flex: 1 }}>
          <PDFViewer />
        </div>
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `useSyncPDFium`, `PDFiumDocumentBuilder` (`addPage`, `loadStandardFont`, `save`), `usePDFiumDocument` (`loadDocument`)

---

## Integration

### 16. Responsive Viewer

Use `useFitZoom` via the `fit` state from `useViewerSetup` to automatically fit the document to the container width on load. The fit mode is reapplied automatically when the container is resized or the page changes.

```tsx
import {
  PDFiumProvider,
  PDFViewer,
  usePDFViewer,
} from '@scaryterry/pdfium/react';
import { useEffect, useRef } from 'react';

function FitOnLoad() {
  const { viewer } = usePDFViewer();
  const hasFitted = useRef(false);

  // Fit to width once the document is loaded and dimensions are known
  useEffect(() => {
    if (viewer.document && viewer.container.dimensions && !hasFitted.current) {
      viewer.fit.fitWidth();
      hasFitted.current = true;
    }
  }, [viewer.document, viewer.container.dimensions, viewer.fit]);

  // Reset the flag when the document changes
  useEffect(() => {
    hasFitted.current = false;
  }, [viewer.document]);

  return null;
}

function ResponsiveViewer() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <PDFViewer>
          {() => (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <FitOnLoad />
              <PDFViewer.Pages style={{ flex: 1, minHeight: 0 }} />
            </div>
          )}
        </PDFViewer>
      </div>
    </PDFiumProvider>
  );
}
```

Once `fitWidth()` is called, `useViewerSetup` tracks the active fit mode internally. If the container resizes (e.g. the browser window is made narrower), the fit scale is recomputed and reapplied automatically. Manual zoom actions (scroll-wheel, buttons) clear the active fit mode.

**Key APIs:** `usePDFViewer`, `FitState` (`fitWidth`, `fitPage`, `activeFitMode`), `ContainerState` (`dimensions`)

---

### 17. Error Handling

Combine `PDFiumErrorBoundary` for catching render-time errors, `DragDropZone` for file loading, and the password flow from `usePDFiumDocument` for a resilient viewer.

```tsx
import {
  PDFiumProvider,
  PDFiumErrorBoundary,
  PDFViewer,
  DragDropZone,
  usePDFiumDocument,
} from '@scaryterry/pdfium/react';
import { useCallback } from 'react';

function PasswordDialog() {
  const { password } = usePDFiumDocument();

  if (!password.required) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100,
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const input = form.elements.namedItem('password') as HTMLInputElement;
          await password.submit(input.value);
        }}
        style={{
          padding: 24,
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: 300,
        }}
      >
        <h3 style={{ margin: '0 0 12px' }}>Password Required</h3>
        {password.error && (
          <p style={{ color: '#dc2626', marginBottom: 8, fontSize: 14 }}>{password.error}</p>
        )}
        <input
          name="password"
          type="password"
          placeholder="Enter document password"
          autoFocus
          style={{ width: '100%', padding: 8, marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" style={{ flex: 1 }}>
            Unlock
          </button>
          <button type="button" onClick={password.cancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div
      role="alert"
      style={{
        padding: 32,
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 8,
      }}
    >
      <h3>Something went wrong</h3>
      <p style={{ color: '#374151', fontSize: 14 }}>{error.message}</p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        style={{ marginTop: 12, padding: '8px 16px' }}
      >
        Try Again
      </button>
    </div>
  );
}

function ResilientViewer() {
  const { loadDocument, documentRevision, error } = usePDFiumDocument();

  const handleFileSelect = useCallback(
    async (data: Uint8Array, name: string) => {
      await loadDocument(data, name);
    },
    [loadDocument],
  );

  return (
    <>
      <PasswordDialog />
      <PDFiumErrorBoundary
        resetKeys={[documentRevision]}
        fallbackRender={({ error: boundaryError, resetErrorBoundary }) => (
          <ErrorFallback error={boundaryError} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <DragDropZone onFileSelect={handleFileSelect}>
          <PDFViewer />
        </DragDropZone>
      </PDFiumErrorBoundary>
      {error && !error.message.includes('password') && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: 12,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          {error.message}
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <PDFiumProvider wasmUrl="/pdfium.wasm" workerUrl="/pdfium-worker.js">
      <div style={{ height: '100vh' }}>
        <ResilientViewer />
      </div>
    </PDFiumProvider>
  );
}
```

**Key APIs:** `PDFiumErrorBoundary` (`resetKeys`, `fallbackRender`), `DragDropZone` (`onFileSelect`), `usePDFiumDocument` (`password`, `loadDocument`, `error`, `documentRevision`)
