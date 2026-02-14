# Styling Guide

`@scaryterry/pdfium/react` is designed to be visually unopinionated. Every component ships with the minimum inline styles needed for correct layout and stacking, and exposes a layered system for consumers to apply their own visual design.

## Styling philosophy

The library uses a five-layer approach, from most constrained to most flexible:

| Layer | What it controls | How it works |
|---|---|---|
| **Structural** | Layout essentials (flex, overflow, position, contain) | Inline `style` applied by the library -- never overridden |
| **Themeable** | Visual properties (colours, shadows, borders) | CSS custom properties prefixed `--pdfium-*` |
| **Override** | Full consumer control on the root element | `className` and `style` props on every component |
| **Sub-elements** | Fine-grained class targeting on inner elements | `classNames` object prop (e.g. `classNames.page`) |
| **Complex UI** | Toolbar controls, search bar, error fallback | Render props -- zero visual opinion from the library |

**Structural styles are not themeable.** The library sets `position: relative`, `overflow: hidden`, `display: flex`, etc. directly on elements because they are required for correct behaviour (virtualisation, stacking, scrolling). These are applied as inline styles and always win in specificity. If you need to override structural layout, use the `style` prop on the relevant component.

**Visual styles are always themeable.** Background colours, shadows, borders, and accent colours all read from CSS custom properties with sensible defaults. You can set these properties on any ancestor element and they will cascade down.

---

## CSS custom properties

Every `--pdfium-*` custom property can be set on a parent element (or `:root`) to theme all instances at once, or on the component's own `style` prop for per-instance control.

### PDFDocumentView

| Property | Default | Description |
|---|---|---|
| `--pdfium-container-bg` | `#e8eaed` | Background colour of the scroll container (the grey surround behind pages) |
| `--pdfium-loading-colour` | `inherit` | Text colour of the default "Loading document..." placeholder |

### PDFPageView

| Property | Default | Description |
|---|---|---|
| `--pdfium-page-bg` | `#fff` | Background colour of a loaded page |
| `--pdfium-page-bg-loading` | `#f3f4f6` | Background colour shown while the page bitmap is loading |
| `--pdfium-page-shadow` | `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)` | Box shadow around each page |
| `--pdfium-page-border` | `none` | Border around each page |

### ThumbnailStrip

| Property | Default | Description |
|---|---|---|
| `--pdfium-thumb-active-colour` | `#3b82f6` | Outline colour of the currently active thumbnail |
| `--pdfium-thumb-shadow` | `0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.08)` | Box shadow on each thumbnail canvas |
| `--pdfium-thumb-label-colour` | `#6b7280` | Text colour of the page number label below each thumbnail |

### BookmarkPanel

| Property | Default | Description |
|---|---|---|
| `--pdfium-bookmark-active-colour` | `#3b82f6` | Text colour of the active bookmark (matching the current page) |
| `--pdfium-bookmark-indent` | `16px` | Per-level indentation for nested bookmark items |

### TextOverlay

| Property | Default | Description |
|---|---|---|
| `--pdfium-selection-colour` | `rgba(20, 100, 255, 0.3)` | Background colour of selected text (applied via `::selection`) |

> **Note:** `--pdfium-selection-colour` is set internally by `TextOverlay` as a CSS variable on its container `div`. You can override the default by passing the `selectionColour` prop (see [Props-based colour configuration](#props-based-colour-configuration) below).

---

## Props-based colour configuration

Some overlay components accept colour props directly, because they paint onto `<canvas>` elements where CSS custom properties cannot reach.

### TextOverlay

| Prop | Type | Default | Description |
|---|---|---|---|
| `selectionColour` | `string` | `'rgba(20, 100, 255, 0.3)'` | Background colour of text selection. Sets `--pdfium-selection-colour` internally. |

### SearchHighlightOverlay

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentMatchColour` | `string` | `'rgba(255, 165, 0, 0.4)'` | Fill colour for the active search match |
| `otherMatchColour` | `string` | `'rgba(255, 255, 0, 0.35)'` | Fill colour for all other search matches |

### CharacterInspectorOverlay

| Prop | Type | Default | Description |
|---|---|---|---|
| `boxStroke` | `string` | `'rgba(220, 38, 38, 0.9)'` | Stroke colour of the character bounding box |
| `boxFill` | `string` | `'rgba(220, 38, 38, 0.1)'` | Fill colour of the character bounding box |

---

## `classNames` reference

Several components expose a `classNames` object prop for targeting inner elements without having to use render props or deep CSS selectors.

### PDFDocumentViewClassNames

```ts
interface PDFDocumentViewClassNames {
  container?: string;    // Outer scroll container
  page?: string;         // Each PDFPageView wrapper
  loadingPlaceholder?: string; // "Loading document..." fallback
}
```

Usage:

```tsx
<PDFDocumentView
  scale={1}
  classNames={{
    container: 'my-scroll-area',
    page: 'my-page',
    loadingPlaceholder: 'my-loading',
  }}
/>
```

### ThumbnailStripClassNames

```ts
interface ThumbnailStripClassNames {
  container?: string;   // Outer scrollable sidebar
  thumbnail?: string;   // Inactive thumbnail button
  active?: string;      // Active (selected) thumbnail button -- replaces `thumbnail` when active
  label?: string;       // Page number label below each thumbnail
}
```

> **Note:** When a thumbnail is active, `classNames.active` is used *instead of* `classNames.thumbnail`, not in addition to it. If you need shared styles, compose them in both class names or use a common utility class.

### BookmarkPanelClassNames

```ts
interface BookmarkPanelClassNames {
  container?: string;  // Outer tree container (role="tree")
  item?: string;       // Inactive bookmark item
  active?: string;     // Active bookmark item (replaces `item` when active)
  toggle?: string;     // Expand/collapse arrow
  title?: string;      // Bookmark title text
  filter?: string;     // Filter input field
}
```

> **Note:** When a bookmark is active, `classNames.active` is used *instead of* `classNames.item`, not in addition to it. If you need shared styles, compose them in both class names.

### PDFViewerClassNames

```ts
interface PDFViewerClassNames {
  root?: string;      // Outermost viewer wrapper (flex column)
  toolbar?: string;   // DefaultToolbar container
  search?: string;    // SearchPanel container
  content?: string;   // Content area (flex row containing sidebar + pages)
  sidebar?: string;   // ThumbnailStrip (PagesThumbnails slot)
  bookmarks?: string; // BookmarkPanel (PagesBookmarks slot)
  pages?: string;     // PDFDocumentView (Pages slot)
}
```

Usage with the default layout:

```tsx
<PDFViewer
  classNames={{
    root: 'viewer-root',
    toolbar: 'viewer-toolbar',
    search: 'viewer-search',
    content: 'viewer-content',
    sidebar: 'viewer-sidebar',
    bookmarks: 'viewer-bookmarks',
    pages: 'viewer-pages',
  }}
/>
```

---

## Z-index stacking order

Inside each `PDFPageView`, overlay layers are stacked using the following z-index values. The base canvas has no explicit z-index (it sits at the default stacking level).

| z-index | Layer | Purpose |
|---|---|---|
| _(base)_ | `PDFCanvas` | Rendered page bitmap |
| **10** | `TextOverlay` | Transparent selectable text spans |
| **15** | `LinkOverlay` | Clickable link hit regions |
| **20** | `SearchHighlightOverlay` | Search match rectangles |
| **30** | `AnnotationOverlay` | Annotation bounding boxes |
| **40** | `CharacterInspectorOverlay` | Character inspection hit surface |
| **50** | `DragDropZone` overlay | File drop indicator |

All overlays use `position: absolute; inset: 0` to fill their parent page container. The `DragDropZone` overlay is a top-level overlay that covers the entire viewer, not just a single page.

If you add custom overlays via `renderPageOverlay`, choose a z-index that fits within this stack. For example, a custom bounding-box highlight would sit comfortably between 20 and 30.

---

## Theming recipes

### Dark mode

Set CSS custom properties on a parent with a dark-mode selector:

```css
[data-theme='dark'] {
  --pdfium-container-bg: #1a1a2e;
  --pdfium-page-bg: #16213e;
  --pdfium-page-bg-loading: #1a1a2e;
  --pdfium-page-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3);
  --pdfium-page-border: 1px solid rgba(255, 255, 255, 0.08);
  --pdfium-loading-colour: #9ca3af;
  --pdfium-thumb-active-colour: #60a5fa;
  --pdfium-thumb-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 1px 2px rgba(0, 0, 0, 0.3);
  --pdfium-thumb-label-colour: #9ca3af;
}
```

For the canvas-drawn overlays, pass colour props:

```tsx
<TextOverlay selectionColour="rgba(96, 165, 250, 0.35)" />
<SearchHighlightOverlay
  currentMatchColour="rgba(251, 191, 36, 0.5)"
  otherMatchColour="rgba(253, 224, 71, 0.3)"
/>
```

### Tailwind CSS integration

Use Tailwind utility classes via `className` and `classNames` props. CSS custom properties can be set with Tailwind's arbitrary property syntax:

```tsx
<PDFDocumentView
  scale={scale}
  className="rounded-lg border border-gray-200 dark:border-gray-700"
  style={{
    '--pdfium-container-bg': 'var(--color-gray-100)',
    '--pdfium-page-shadow': 'var(--shadow-md)',
  } as React.CSSProperties}
  classNames={{
    page: 'transition-shadow hover:shadow-lg',
    loadingPlaceholder: 'text-gray-400 animate-pulse',
  }}
/>
```

For the `PDFViewer` compound component:

```tsx
<PDFViewer
  classNames={{
    root: 'h-full flex flex-col bg-white dark:bg-gray-900',
    toolbar: 'flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700',
    content: 'flex flex-1 min-h-0',
    sidebar: 'w-48 border-r border-gray-200 dark:border-gray-700 overflow-y-auto',
    pages: 'flex-1 min-h-0',
  }}
/>
```

### Minimal / clean look

Remove shadows and borders for a flat appearance:

```css
.pdf-minimal {
  --pdfium-container-bg: #ffffff;
  --pdfium-page-shadow: none;
  --pdfium-page-border: none;
  --pdfium-thumb-shadow: none;
}
```

```tsx
<PDFDocumentView scale={scale} className="pdf-minimal" />
```

### Branded colours

Apply your organisation's colour palette:

```css
.my-brand {
  --pdfium-container-bg: #f0f4f8;
  --pdfium-thumb-active-colour: #e63946;
  --pdfium-thumb-label-colour: #457b9d;
  --pdfium-page-shadow: 0 2px 8px rgba(69, 123, 157, 0.15);
}
```

Override search highlight colours to match:

```tsx
<SearchHighlightOverlay
  currentMatchColour="rgba(230, 57, 70, 0.4)"
  otherMatchColour="rgba(230, 57, 70, 0.15)"
/>
```

---

## What is NOT styled

The following elements ship with either no visual styles or minimal functional-only styles. The library intentionally leaves these unstyled so you have full control:

| Element | What you get | What you need to provide |
|---|---|---|
| **Toolbar buttons** (`DefaultToolbar`, `PDFToolbar`) | Native `<button>` and `<select>` elements with no visual styling | All button/input styling (colours, padding, borders, hover states) |
| **SearchPanel controls** | Native `<input type="search">` and `<button>` with flex layout only | Input styling, button styling, spacing, colours |
| **Error boundary fallback** (`PDFiumErrorBoundary`) | Minimal inline styles with light red background | Override via `fallbackRender` or `fallback` prop for full control |
| **DragDropZone overlay** | Basic dashed border with light blue tint | Override via `renderDragOverlay` prop for custom drop indicator |
| **Link hover styles** (`LinkOverlay`) | Invisible hit regions with `cursor: pointer` | Hover/focus styling if you want visible link indicators |
| **Annotation colours** (`AnnotationOverlay`) | Hard-coded blue (normal) and red (selected) strokes on canvas | Pass your own canvas drawing via `renderPageOverlay` for custom annotation visuals |
| **Minimap rectangle** (`PageNavigatorMinimap`) | Hard-coded blue fill/stroke SVG rectangle | Use `className` and `style` on the component; the viewport rectangle is not independently themeable |
| **Overall layout** | No wrapper div, no height/width constraints on the root | You must provide a sized container (the viewer fills its parent) |
| **Scrollbar** | Browser-default scrollbar on the scroll container | Style via CSS `::webkit-scrollbar` or `scrollbar-*` properties on the container class |

The `DefaultToolbar` and `SearchPanel` are reference implementations. For production use, consider building your own toolbar using the `PDFToolbar` render-prop primitives (`PDFToolbar.Navigation`, `PDFToolbar.Zoom`, `PDFToolbar.Fit`, `PDFToolbar.ScrollMode`, `PDFToolbar.Search`), or use the `PDFViewer` render-prop children pattern:

```tsx
<PDFViewer>
  {(state) => (
    <>
      <MyCustomToolbar viewer={state.viewer} />
      <PDFViewer.Pages />
    </>
  )}
</PDFViewer>
```
