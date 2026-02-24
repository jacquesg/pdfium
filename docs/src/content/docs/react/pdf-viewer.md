---
title: PDFViewer
description: Build viewer UIs with the PDFViewer compound component, slots, and state APIs.
---

# PDFViewer

`<PDFViewer>` is a compound component that assembles a fully-featured PDF viewer from smaller building blocks. It provides three tiers of abstraction so you can choose the right level of control for your use case.

## Abstraction Tiers

| Tier | What you use | When to use |
|------|-------------|-------------|
| **High-level** | `<PDFViewer />` with props | Zero-config viewer with sensible defaults. Customise via `classNames`, `renderPageOverlay`, or by passing `children` to replace the toolbar. |
| **Mid-level** | `useViewerSetup()` + slot components (`PDFViewer.Pages`, `PDFViewer.Thumbnails`, `PDFViewer.Search`, `PDFViewer.Bookmarks`) | You want to control layout and compose your own chrome, but still delegate page rendering, thumbnails, search, and bookmark navigation to pre-built components. |
| **Low-level** | Individual hooks (`usePageNavigation`, `useZoom`, `useRenderPage`, `useDocumentSearch`, etc.) | Full headless control. You build every piece of UI yourself and wire it to the hooks directly. |

---

## Quick Start

The snippets below assume you already have an `ArrayBuffer` named `pdfBytes` (from file input or fetch).
They also assume `workerUrl` and `wasmUrl` are already resolved as shown in [React setup](./index.md#setup-wasm--worker-assets).
Use the canonical setup snippets from:
[Worker entry snippet](./index.md#worker-entry-snippet-canonical) and
[provider bootstrap snippet](./index.md#provider-bootstrap-snippet-canonical).

### Zero-config

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'document.pdf' }}
    >
      <PDFViewer />
    </PDFiumProvider>
  );
}
```

### Styled with classNames

```tsx
<PDFiumProvider
  wasmUrl={wasmUrl}
  workerUrl={workerUrl}
  initialDocument={{ data: pdfBytes, name: 'document.pdf' }}
>
  <PDFViewer
    panels={['thumbnails', 'bookmarks']}
    classNames={{
      root: 'flex flex-col h-full',
      toolbar: 'bg-gray-100 border-b px-4 py-2',
      search: 'border-b px-4 py-2',
      content: 'flex flex-1 overflow-hidden',
      activityBar: 'border-r',
      panel: 'w-56 border-r overflow-y-auto',
      pages: 'flex-1 min-h-0',
    }}
  />
</PDFiumProvider>
```

---

## Props Reference

### `PDFViewerProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialScale` | `number` | `1` | Initial zoom scale applied when the viewer mounts. |
| `initialScrollMode` | `'continuous' \| 'single' \| 'horizontal'` | `'continuous'` | Scroll mode on mount. |
| `initialSpreadMode` | `SpreadMode` | `'none'` | Initial spread mode for page layout. |
| `initialInteractionMode` | `InteractionMode` | `'pointer'` | Initial interaction mode (for tools such as marquee/select workflows). |
| `showSearch` | `boolean` | `true` | Whether the search panel toggle is available. When `false`, the Ctrl/Cmd+F shortcut is also disabled. |
| `panels` | `readonly PanelEntry[]` | `undefined` | Enables panel mode and defines which panel tabs are available in the activity bar. Use built-in IDs (`'thumbnails'`, `'bookmarks'`, etc.) or custom panel configs. |
| `initialPanel` | `PanelId \| string` | `undefined` | Panel to open on mount when panel mode is enabled. |
| `showTextLayer` | `boolean` | `true` | Render the selectable text overlay on each page. |
| `showAnnotations` | `boolean` | `true` | Render annotation overlays on each page. |
| `showLinks` | `boolean` | `true` | Render clickable link regions on each page. |
| `renderFormFields` | `boolean` | `false` | Render interactive form fields into the page bitmap. |
| `gap` | `number` | `16` | Gap between pages in CSS pixels (continuous scroll mode). |
| `bufferPages` | `number` | `1` | Number of pages to render above and below the viewport for smoother scrolling. |
| `keyboardShortcuts` | `boolean` | `true` | Enable built-in keyboard shortcuts for navigation, zoom, and search. See [Keyboard Shortcuts](#keyboard-shortcuts). |
| `renderPageOverlay` | `(info: PageOverlayInfo) => ReactNode` | `undefined` | Callback to render custom content on top of each page. Receives page geometry and a `transformRect` helper for coordinate conversion. |
| `className` | `string` | `undefined` | CSS class applied to the root element. Merged with `classNames.root` when both are provided. |
| `classNames` | `PDFViewerClassNames` | `undefined` | Per-slot CSS class overrides. See [classNames Reference](#classnames-reference). |
| `style` | `CSSProperties` | `undefined` | Inline styles for the root element (merged with the default flex-column layout). |
| `children` | `ReactNode \| ((state: PDFViewerState & PDFPanelState) => ReactNode)` | `undefined` | Override the entire viewer body. Pass a `ReactNode` to replace the default layout, or a render function to receive viewer + panel state for full headless control. |

#### `PageOverlayInfo`

The object passed to `renderPageOverlay`:

| Field | Type | Description |
|-------|------|-------------|
| `pageIndex` | `number` | Zero-based page index. |
| `width` | `number` | Scaled page width in CSS pixels. |
| `height` | `number` | Scaled page height in CSS pixels. |
| `originalWidth` | `number` | Original page width in PDF points. |
| `originalHeight` | `number` | Original page height in PDF points. |
| `scale` | `number` | Current zoom scale. |
| `transformRect` | `(rect) => { x, y, width, height }` | Converts a PDF rect (bottom-left origin) to a screen rect (top-left origin, CSS pixels). |
| `transformPoint` | `(point: { x, y }) => { x, y }` | Converts a PDF point (bottom-left origin) to a screen point (top-left origin, CSS pixels). |

---

## classNames Reference

### `PDFViewerClassNames`

Each key targets a specific element in the default layout.

| Key | HTML Element | Description |
|-----|-------------|-------------|
| `root` | Outermost `<div>` | The root container. Uses `display: flex; flex-direction: column; height: 100%` by default. Merged with the `className` prop. |
| `toolbar` | `<div role="toolbar">` | The `<DefaultToolbar>` wrapper. |
| `search` | `<div>` | The `<SearchPanel>` wrapper, rendered only when search is open. |
| `content` | `<div>` | The middle row containing the sidebar and page area. Uses `display: flex; flex: 1; overflow: hidden`. |
| `activityBar` | `<div>` | The activity bar wrapper (panel mode only). |
| `panel` | `<div>` | The currently open panel container (panel mode only). |
| `pages` | `<div>` | The `PDFViewer.Pages` wrapper that hosts `<PDFDocumentView>`. Uses `flex: 1; min-height: 0`. |

---

## Slot Components

Slot components are attached to the `PDFViewer` function and read state from the nearest `<PDFViewer>` context. Use them when building a custom layout inside `children`.

### `PDFViewer.Pages`

Renders the main page area (virtualised `PDFDocumentView`).

```tsx
<PDFViewer.Pages
  gap={16}
  bufferPages={2}
  showTextLayer
  showAnnotations
  showLinks
  renderFormFields={false}
/>
```

#### `PagesSlotProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | CSS class for the scroll container. |
| `style` | `CSSProperties` | `undefined` | Inline styles for the scroll container. |
| `gap` | `number` | `undefined` | Gap between pages in CSS pixels. |
| `bufferPages` | `number` | `undefined` | Number of off-screen pages to pre-render. |
| `showTextLayer` | `boolean` | `true` | Render selectable text overlay. |
| `showAnnotations` | `boolean` | `true` | Render annotation overlays. |
| `showLinks` | `boolean` | `true` | Render clickable link regions. |
| `renderFormFields` | `boolean` | `false` | Render form fields into the page bitmap. |
| `renderPageOverlay` | `(info: PageOverlayInfo) => ReactNode` | `undefined` | Custom per-page overlay callback. |
| `loadingContent` | `ReactNode` | `undefined` | Content to display while pages are loading. |

### `PDFViewer.Thumbnails`

Renders the thumbnail sidebar (`ThumbnailStrip`). Clicking a thumbnail navigates to that page and scrolls the main view.

```tsx
<PDFViewer.Thumbnails thumbnailScale={0.2} className="w-48 border-r" />
```

#### `ThumbnailsSlotProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `thumbnailScale` | `number` | `undefined` | Scale factor for thumbnail rendering. |
| `className` | `string` | `undefined` | CSS class for the thumbnail strip. |
| `style` | `CSSProperties` | `undefined` | Inline styles (receives `min-height: 0` by default). |

### `PDFViewer.Search`

Renders the search panel (`SearchPanel`). Wired to the viewer's search state automatically.

```tsx
<PDFViewer.Search className="border-b px-4 py-2" />
```

#### `SearchSlotProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | CSS class for the search panel. |
| `style` | `CSSProperties` | `undefined` | Inline styles for the search panel. |

### `PDFViewer.Bookmarks`

Renders the bookmark sidebar (`BookmarkPanel`). Displays the document's table of contents as a collapsible tree. Clicking a bookmark navigates to that page and scrolls the main view. Includes a built-in filter input and full WAI-ARIA TreeView keyboard navigation.

```tsx
<PDFViewer.Bookmarks defaultExpanded showFilter className="w-56 border-r" />
```

#### `BookmarksSlotProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultExpanded` | `boolean` | `false` | Start with all parent nodes expanded. |
| `showFilter` | `boolean` | `true` | Show a filter input at the top of the tree. |
| `className` | `string` | `undefined` | CSS class for the bookmark panel. |
| `style` | `CSSProperties` | `undefined` | Inline styles (receives `min-height: 0` by default). |

---

## `usePDFViewer()` Hook

Returns the full `PDFViewerState` from the nearest `<PDFViewer>` context. Throws if called outside a `<PDFViewer>`.

```tsx
import { usePDFViewer } from '@scaryterry/pdfium/react';

function CustomToolbar() {
  const { viewer, isSearchOpen, toggleSearch } = usePDFViewer();
  // ...
}
```

### `PDFViewerState`

| Field | Type | Description |
|-------|------|-------------|
| `viewer` | `UseViewerSetupResult` | Grouped viewer state. See sub-tables below. |
| `search` | `UseDocumentSearchResult` | Cross-document search results: `matches`, `resultsByPage`, `matchIndexMap`, `currentIndex`, `totalMatches`, `isSearching`, `currentMatchPageIndex`, `next()`, `prev()`, `goToMatch(index)`. |
| `searchQuery` | `string` | Current search query string. |
| `setSearchQuery` | `(query: string) => void` | Update the search query (triggers a debounced search). |
| `isSearchOpen` | `boolean` | Whether the search panel is currently visible. |
| `toggleSearch` | `() => void` | Toggle search panel visibility. Clears the query when closing. |
| `activePanel` | `string \| null` | Currently open panel ID, or `null` when no panel is open. |
| `togglePanel` | `(id: string) => void` | Toggle a panel by ID (open if closed, close if already active). |
| `setPanelOverlay` | `(renderer: ((info: PageOverlayInfo) => ReactNode) \| null) => void` | Register/clear a panel-specific page overlay renderer. |
| `hasPanelBar` | `boolean` | Whether panel mode is enabled (`panels` prop provided and non-empty). |
| `documentViewRef` | `RefObject<PDFDocumentViewHandle \| null>` | Imperative handle for the page scroll container. Exposes `scrollToPage(pageIndex, behaviour?)`. |

### `UseViewerSetupResult`

The `viewer` field is a composite of five state groups:

#### `viewer.navigation` — `NavigationState`

| Field | Type | Description |
|-------|------|-------------|
| `pageIndex` | `number` | Current zero-based page index. |
| `setPageIndex` | `(index: number) => void` | Jump to a specific page. |
| `next` | `() => void` | Navigate to the next page. |
| `prev` | `() => void` | Navigate to the previous page. |
| `canNext` | `boolean` | `true` if there is a next page. |
| `canPrev` | `boolean` | `true` if there is a previous page. |
| `pageCount` | `number` | Total number of pages in the document. |

#### `viewer.zoom` — `ZoomState`

| Field | Type | Description |
|-------|------|-------------|
| `scale` | `number` | Current zoom scale (1 = 100%). |
| `setScale` | `(scale: number) => void` | Set an exact scale value. Clears any active fit mode. |
| `zoomIn` | `() => void` | Increment zoom by one step. Clears any active fit mode. |
| `zoomOut` | `() => void` | Decrement zoom by one step. Clears any active fit mode. |
| `reset` | `() => void` | Reset zoom to the initial scale. Clears any active fit mode. |
| `canZoomIn` | `boolean` | `true` if zoom has not reached the maximum. |
| `canZoomOut` | `boolean` | `true` if zoom has not reached the minimum. |

#### `viewer.fit` — `FitState`

| Field | Type | Description |
|-------|------|-------------|
| `fitWidth` | `() => void` | Zoom to fit the page width within the container. Sets `activeFitMode` to `'page-width'`. |
| `fitPage` | `() => void` | Zoom to fit the entire page within the container. Sets `activeFitMode` to `'page-fit'`. |
| `fitScale` | `(mode: FitMode) => number` | Compute the scale for a given fit mode without applying it. |
| `activeFitMode` | `FitMode \| null` | Currently active fit mode (`'page-width'`, `'page-height'`, `'page-fit'`), or `null` if the user has manually zoomed. Auto-reapplied on container resize. |

#### `viewer.scroll` — `ScrollModeState`

| Field | Type | Description |
|-------|------|-------------|
| `scrollMode` | `'continuous' \| 'single'` | Current scroll mode. |
| `setScrollMode` | `(mode: 'continuous' \| 'single') => void` | Switch between scroll modes. |

#### `viewer.container` — `ContainerState`

| Field | Type | Description |
|-------|------|-------------|
| `ref` | `RefObject<HTMLDivElement \| null>` | Ref to the scroll container element. Attach to the element that should receive scroll events. |
| `dimensions` | `PageDimension[] \| undefined` | Array of `{ width, height }` for every page in PDF points. `undefined` while loading. |
| `zoomAnchorRef` | `RefObject<ZoomAnchor \| null>` | Internal ref used to coordinate cursor-anchored zoom between `useWheelZoom` and `useVisiblePages`. |

---

## Usage Patterns

### 1. Zero-config

The simplest possible viewer. The default layout includes `DefaultToolbar`, search, and a full-page scroll area.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'report.pdf' }}
    >
      <PDFViewer />
    </PDFiumProvider>
  );
}
```

### 2. Styled with classNames (Tailwind)

Apply Tailwind classes to each slot without changing structure or behaviour.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'report.pdf' }}
    >
      <PDFViewer
        panels={['thumbnails', 'bookmarks']}
        initialPanel="thumbnails"
        classNames={{
          root: 'flex flex-col h-screen bg-gray-50',
          toolbar: 'flex items-center gap-2 bg-white border-b border-gray-200 px-4 py-2 shadow-sm',
          search: 'bg-yellow-50 border-b border-yellow-200 px-4 py-2',
          content: 'flex flex-1 overflow-hidden',
          activityBar: 'bg-white border-r border-gray-200',
          panel: 'bg-gray-100 border-r border-gray-200 overflow-y-auto',
          pages: 'flex-1 min-h-0 bg-gray-200',
        }}
      />
    </PDFiumProvider>
  );
}
```

### 3. Replace toolbar with custom ReactNode children

When `children` is provided, the entire default layout is replaced. Use slot components to compose your own arrangement.

```tsx
import { PDFiumProvider, PDFViewer, usePDFViewer } from '@scaryterry/pdfium/react';

function CustomToolbar() {
  const { viewer, toggleSearch } = usePDFViewer();
  return (
    <header className="flex items-center gap-4 p-3 bg-blue-600 text-white">
      <button onClick={viewer.navigation.prev} disabled={!viewer.navigation.canPrev}>
        Previous
      </button>
      <span>
        Page {viewer.navigation.pageIndex + 1} of {viewer.navigation.pageCount}
      </span>
      <button onClick={viewer.navigation.next} disabled={!viewer.navigation.canNext}>
        Next
      </button>
      <button onClick={viewer.zoom.zoomOut}>Zoom Out</button>
      <span>{Math.round(viewer.zoom.scale * 100)}%</span>
      <button onClick={viewer.zoom.zoomIn}>Zoom In</button>
      <button onClick={toggleSearch}>Search</button>
    </header>
  );
}

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'report.pdf' }}
    >
      <PDFViewer>
        <div className="flex flex-col h-screen">
          <CustomToolbar />
          <PDFViewer.Pages className="flex-1 min-h-0" />
        </div>
      </PDFViewer>
    </PDFiumProvider>
  );
}
```

### 4. Extend DefaultToolbar with children

`<DefaultToolbar>` accepts `children` that are appended after the built-in controls. This is the easiest way to add extra buttons without rebuilding the entire toolbar.

```tsx
import { PDFiumProvider, PDFViewer, DefaultToolbar, usePDFViewer } from '@scaryterry/pdfium/react';

function DownloadButton() {
  return (
    <>
      <span aria-hidden="true" style={{ margin: '0 4px' }}>|</span>
      <button onClick={() => window.print()}>Print</button>
    </>
  );
}

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'report.pdf' }}
    >
      <PDFViewer>
        <div className="flex flex-col h-screen">
          <DefaultToolbar>
            <DownloadButton />
          </DefaultToolbar>
          <PDFViewer.Pages className="flex-1 min-h-0" />
        </div>
      </PDFViewer>
    </PDFiumProvider>
  );
}
```

### 5. Full headless render function

Pass a function as `children` to receive `PDFViewerState` and build the entire UI yourself. No default layout is rendered.

```tsx
import { PDFiumProvider, PDFViewer } from '@scaryterry/pdfium/react';

function App() {
  return (
    <PDFiumProvider
      wasmUrl={wasmUrl}
      workerUrl={workerUrl}
      initialDocument={{ data: pdfBytes, name: 'report.pdf' }}
    >
      <PDFViewer panels={['thumbnails', 'bookmarks']}>
        {(state) => (
          <div className="flex flex-col h-screen">
            <div className="p-4 bg-gray-800 text-white flex items-center gap-4">
              <button onClick={state.viewer.navigation.prev} disabled={!state.viewer.navigation.canPrev}>
                Back
              </button>
              <span>
                {state.viewer.navigation.pageIndex + 1} / {state.viewer.navigation.pageCount}
              </span>
              <button onClick={state.viewer.navigation.next} disabled={!state.viewer.navigation.canNext}>
                Forward
              </button>
              <span>{Math.round(state.viewer.zoom.scale * 100)}%</span>
              <button onClick={state.toggleSearch}>
                {state.isSearchOpen ? 'Close' : 'Find'}
              </button>
              <button onClick={() => state.togglePanel('thumbnails')}>
                {state.activePanel === 'thumbnails' ? 'Hide Thumbnails' : 'Show Thumbnails'}
              </button>
              <button onClick={() => state.togglePanel('bookmarks')}>
                {state.activePanel === 'bookmarks' ? 'Hide Bookmarks' : 'Show Bookmarks'}
              </button>
            </div>
            {state.isSearchOpen && <PDFViewer.Search />}
            <div className="flex flex-1 overflow-hidden">
              {state.activePanel === 'thumbnails' && <PDFViewer.Thumbnails className="w-48 border-r" />}
              {state.activePanel === 'bookmarks' && <PDFViewer.Bookmarks className="w-56 border-r" />}
              <PDFViewer.Pages className="flex-1 min-h-0" showTextLayer showAnnotations />
            </div>
          </div>
        )}
      </PDFViewer>
    </PDFiumProvider>
  );
}
```

---

## DefaultToolbar

`<DefaultToolbar>` is a reference implementation toolbar rendered by default inside `<PDFViewer>`. It provides unstyled, accessible native HTML controls for navigation, zoom, fit mode, scroll mode, and search toggle.

### `DefaultToolbarProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `viewer` | `UseViewerSetupResult` | `undefined` | Override the viewer state used for navigation, zoom, fit, and scroll controls. By default, reads from the nearest `<PDFViewer>` context. Can also be used outside `<PDFViewer>` by passing an explicit `viewer` — the search toggle will be omitted since search state lives in the `<PDFViewer>` context. |
| `className` | `string` | `undefined` | CSS class for the toolbar wrapper. |
| `style` | `CSSProperties` | `undefined` | Inline styles for the toolbar wrapper. |
| `children` | `ReactNode` | `undefined` | Additional content appended after the default toolbar controls. |

### Built-in Control Groups

The toolbar renders five control groups separated by dividers:

1. **Navigation** — Previous/Next buttons with a page number input and total count.
2. **Zoom** — Zoom out/in buttons with a percentage display.
3. **Fit** — Fit Width and Fit Page buttons.
4. **Scroll Mode** — A `<select>` to switch between continuous and single-page modes.
5. **Search** — A toggle button that opens/closes the search panel.

---

## Keyboard Shortcuts

All shortcuts are enabled by default (`keyboardShortcuts={true}`). They call `preventDefault()` to avoid browser default behaviour (e.g. Ctrl+F opening the browser's find bar, Ctrl+= zooming the browser page).

Arrow key shortcuts are suppressed when focus is inside a text input, textarea, or contentEditable element.

| Shortcut | Action |
|----------|--------|
| ArrowRight / ArrowDown / PageDown | Next page |
| ArrowLeft / ArrowUp / PageUp | Previous page |
| Ctrl/Cmd + `=` | Zoom in |
| Ctrl/Cmd + `-` | Zoom out |
| Ctrl/Cmd + `0` | Reset zoom |
| Ctrl/Cmd + `F` | Toggle search panel |
| Enter | Next search match (when search is open) |
| Shift + Enter | Previous search match (when search is open) |

---

## Accessibility

The default layout applies the following ARIA roles:

| Element | ARIA Role | Notes |
|---------|-----------|-------|
| Toolbar (`<DefaultToolbar>`) | `toolbar` | Groups navigation, zoom, and search controls. |
| Document view (`<PDFDocumentView>`) | `document` | The scrollable page area, indicating primary content. |
| Thumbnail strip (`<ThumbnailStrip>`) | `listbox` | Each thumbnail is a selectable option within the list. |
| Bookmark panel (`<BookmarkPanel>`) | `tree` | WAI-ARIA TreeView with `treeitem` nodes, `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`. Full keyboard navigation (Arrow keys, Home, End, Enter, Space, `*`). |

The `<DefaultToolbar>` renders native `<button>`, `<input>`, and `<select>` elements, which are keyboard-focusable and screen-reader-accessible by default. Custom toolbars should preserve equivalent semantics.

## See also

- [Toolbar](./toolbar.md) - `DefaultToolbar` and headless `PDFToolbar` composition model.
- [useViewerSetup](./use-viewer-setup.md) - Orchestration hook that powers viewer navigation and zoom state.
- [Styling Guide](./styling.md) - `classNames` targeting and CSS variable theming.
- [Examples](./examples.md) - End-to-end integration patterns.
