---
title: useViewerSetup
description: Compose navigation, zoom, fit, and container behavior with a single viewer orchestration hook.
---

# useViewerSetup()

**Scope:** React viewer toolkit (`@scaryterry/pdfium/react`).

`useViewerSetup()` is the single orchestration hook for building PDF viewer UIs. It composes five lower-level hooks (`usePageNavigation`, `useZoom`, `useFitZoom`, `useWheelZoom`, `usePageDimensions`) into one unified result object with logically grouped state slices. The result plugs directly into `<PDFToolbar>` and `<PDFDocumentView>`.

```typescript
import { useViewerSetup } from '@scaryterry/pdfium/react';

const viewer = useViewerSetup({ initialScale: 1.5 });
```

## Options

`useViewerSetup` accepts an optional `UseViewerSetupOptions` object:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `initialScale` | `number` | `1` | Starting zoom level. Clamped to the range `[0.25, 5]` by the underlying `useZoom` hook. |
| `initialScrollMode` | `'continuous' \| 'single'` | `'continuous'` | Starting scroll mode. `'continuous'` renders all pages in a scrollable container; `'single'` renders one page at a time. |

## Return type

`useViewerSetup` returns a `UseViewerSetupResult` containing the current document plus five state groups:

### `document`

| Field | Type | Description |
| --- | --- | --- |
| `document` | `WorkerPDFiumDocument \| null` | The currently loaded document from `PDFiumProvider`, or `null` if no document is open. |

### `navigation` — `NavigationState`

| Field | Type | Description |
| --- | --- | --- |
| `pageIndex` | `number` | Zero-based index of the current page. |
| `setPageIndex` | `(index: number) => void` | Navigate to a page by zero-based index. The value is clamped to valid bounds. |
| `next` | `() => void` | Navigate to the next page. No-op if already on the last page. |
| `prev` | `() => void` | Navigate to the previous page. No-op if already on the first page. |
| `canNext` | `boolean` | `true` when navigation forward is possible (i.e. not on the last page). |
| `canPrev` | `boolean` | `true` when navigation backward is possible (i.e. not on the first page). |
| `pageCount` | `number` | Total number of pages in the document. `0` when no document is loaded. |

### `zoom` — `ZoomState`

| Field | Type | Description |
| --- | --- | --- |
| `scale` | `number` | Current zoom scale factor (e.g. `1` = 100%, `2` = 200%). |
| `setScale` | `(scale: number) => void` | Set the zoom level to an arbitrary value. Clamped to `[0.25, 5]`. Also clears any active fit mode. |
| `zoomIn` | `() => void` | Increase zoom by one step (default step: 0.25). Clears the active fit mode. |
| `zoomOut` | `() => void` | Decrease zoom by one step (default step: 0.25). Clears the active fit mode. |
| `reset` | `() => void` | Reset zoom to `initialScale`. Clears the active fit mode. |
| `canZoomIn` | `boolean` | `true` when the current scale is below the maximum (default: 5). |
| `canZoomOut` | `boolean` | `true` when the current scale is above the minimum (default: 0.25). |

> **Note:** All manual zoom actions (`setScale`, `zoomIn`, `zoomOut`, `reset`) automatically clear the active fit mode. This prevents the fit-mode auto-reapply from overriding the user's explicit zoom choice.

### `fit` — `FitState`

| Field | Type | Description |
| --- | --- | --- |
| `fitWidth` | `() => void` | Set the zoom level so the current page fills the container width (minus 32px padding). Activates the `'page-width'` fit mode. |
| `fitPage` | `() => void` | Set the zoom level so the entire current page fits within the container. Activates the `'page-fit'` fit mode. |
| `fitScale` | `(mode: FitMode) => number` | Compute the scale value for a given fit mode without applying it. Useful for custom UI (e.g. displaying what the scale would be). |
| `activeFitMode` | `FitMode \| null` | The currently active fit mode (`'page-width'` or `'page-fit'`), or `null` if the user has manually zoomed since the last fit action. |

`FitMode` is defined as:

```typescript
type FitMode = 'page-width' | 'page-height' | 'page-fit';
```

### `scroll` — `ScrollModeState`

| Field | Type | Description |
| --- | --- | --- |
| `scrollMode` | `'continuous' \| 'single'` | The current scroll mode. |
| `setScrollMode` | `(mode: 'continuous' \| 'single') => void` | Switch between continuous and single-page scroll modes. |

### `container` — `ContainerState`

| Field | Type | Description |
| --- | --- | --- |
| `ref` | `RefObject<HTMLDivElement \| null>` | React ref to attach to the scroll container element. Shared between `useFitZoom` (for `ResizeObserver` measurements), `useWheelZoom` (for `wheel` event listening), and `PDFDocumentView` (for scroll virtualisation). |
| `dimensions` | `PageDimension[] \| undefined` | Array of `{ width, height }` for every page in the document (in PDF points). `undefined` while loading. |
| `zoomAnchorRef` | `RefObject<ZoomAnchor \| null>` | Ref used for cursor-anchored zoom coordination between `useWheelZoom` and `useVisiblePages`. Pass this to `PDFDocumentView` so that Ctrl/Cmd+wheel zoom keeps the point under the cursor stationary. |

## Connecting to PDFToolbar

`PDFToolbar` accepts the entire `UseViewerSetupResult` object via its `viewer` prop. No mapping is required:

```tsx
import { PDFToolbar, useViewerSetup } from '@scaryterry/pdfium/react';

function Viewer() {
  const viewer = useViewerSetup();

  return (
    <PDFToolbar viewer={viewer}>
      <PDFToolbar.Navigation>
        {({ getPrevProps, getNextProps, pageNumber, pageCount }) => (
          <>
            <button {...getPrevProps()}>Prev</button>
            <span>{pageNumber} / {pageCount}</span>
            <button {...getNextProps()}>Next</button>
          </>
        )}
      </PDFToolbar.Navigation>

      <PDFToolbar.Zoom>
        {({ getZoomInProps, getZoomOutProps, percentage }) => (
          <>
            <button {...getZoomOutProps()}>-</button>
            <span>{percentage}%</span>
            <button {...getZoomInProps()}>+</button>
          </>
        )}
      </PDFToolbar.Zoom>
    </PDFToolbar>
  );
}
```

## Connecting to PDFDocumentView

`PDFDocumentView` requires several props sourced from different groups in the viewer result. The following table shows the mapping:

| `PDFDocumentView` prop | Source | Description |
| --- | --- | --- |
| `containerRef` | `viewer.container.ref` | Scroll container ref for layout measurements and wheel zoom. |
| `scale` | `viewer.zoom.scale` | Current zoom scale factor. |
| `scrollMode` | `viewer.scroll.scrollMode` | `'continuous'` or `'single'`. |
| `currentPageIndex` | `viewer.navigation.pageIndex` | Zero-based index of the current page. |
| `onCurrentPageChange` | `viewer.navigation.setPageIndex` | Callback fired when the visible page changes during scroll. |
| `zoomAnchorRef` | `viewer.container.zoomAnchorRef` | Cursor-anchored zoom coordination ref. |

```tsx
import { PDFDocumentView, useViewerSetup } from '@scaryterry/pdfium/react';

function Viewer() {
  const viewer = useViewerSetup();

  return (
    <PDFDocumentView
      containerRef={viewer.container.ref}
      scale={viewer.zoom.scale}
      scrollMode={viewer.scroll.scrollMode}
      currentPageIndex={viewer.navigation.pageIndex}
      onCurrentPageChange={viewer.navigation.setPageIndex}
      zoomAnchorRef={viewer.container.zoomAnchorRef}
    />
  );
}
```

## Migration guide

The `useViewerSetup` return type was restructured from a flat object into logical groups. The following table maps every property from the old flat API to its new grouped path:

| Old flat path | New grouped path |
| --- | --- |
| `viewer.pageIndex` | `viewer.navigation.pageIndex` |
| `viewer.setPageIndex` | `viewer.navigation.setPageIndex` |
| `viewer.next` | `viewer.navigation.next` |
| `viewer.prev` | `viewer.navigation.prev` |
| `viewer.canNext` | `viewer.navigation.canNext` |
| `viewer.canPrev` | `viewer.navigation.canPrev` |
| `viewer.pageCount` | `viewer.navigation.pageCount` |
| `viewer.scale` | `viewer.zoom.scale` |
| `viewer.setScale` | `viewer.zoom.setScale` |
| `viewer.zoomIn` | `viewer.zoom.zoomIn` |
| `viewer.zoomOut` | `viewer.zoom.zoomOut` |
| `viewer.reset` | `viewer.zoom.reset` |
| `viewer.canZoomIn` | `viewer.zoom.canZoomIn` |
| `viewer.canZoomOut` | `viewer.zoom.canZoomOut` |
| `viewer.fitWidth` | `viewer.fit.fitWidth` |
| `viewer.fitPage` | `viewer.fit.fitPage` |
| `viewer.fitScale` | `viewer.fit.fitScale` |
| `viewer.activeFitMode` | `viewer.fit.activeFitMode` |
| `viewer.scrollMode` | `viewer.scroll.scrollMode` |
| `viewer.setScrollMode` | `viewer.scroll.setScrollMode` |
| `viewer.containerRef` | `viewer.container.ref` |
| `viewer.dimensions` | `viewer.container.dimensions` |
| `viewer.zoomAnchorRef` | `viewer.container.zoomAnchorRef` |

### Before / after

```diff
  function Viewer() {
    const viewer = useViewerSetup();

    return (
      <>
-       <button onClick={viewer.prev} disabled={!viewer.canPrev}>Prev</button>
-       <span>{viewer.pageIndex + 1} / {viewer.pageCount}</span>
-       <button onClick={viewer.next} disabled={!viewer.canNext}>Next</button>
+       <button onClick={viewer.navigation.prev} disabled={!viewer.navigation.canPrev}>Prev</button>
+       <span>{viewer.navigation.pageIndex + 1} / {viewer.navigation.pageCount}</span>
+       <button onClick={viewer.navigation.next} disabled={!viewer.navigation.canNext}>Next</button>

-       <button onClick={viewer.zoomOut} disabled={!viewer.canZoomOut}>-</button>
-       <span>{Math.round(viewer.scale * 100)}%</span>
-       <button onClick={viewer.zoomIn} disabled={!viewer.canZoomIn}>+</button>
+       <button onClick={viewer.zoom.zoomOut} disabled={!viewer.zoom.canZoomOut}>-</button>
+       <span>{Math.round(viewer.zoom.scale * 100)}%</span>
+       <button onClick={viewer.zoom.zoomIn} disabled={!viewer.zoom.canZoomIn}>+</button>

        <PDFDocumentView
-         containerRef={viewer.containerRef}
-         scale={viewer.scale}
-         scrollMode={viewer.scrollMode}
-         currentPageIndex={viewer.pageIndex}
-         onCurrentPageChange={viewer.setPageIndex}
-         zoomAnchorRef={viewer.zoomAnchorRef}
+         containerRef={viewer.container.ref}
+         scale={viewer.zoom.scale}
+         scrollMode={viewer.scroll.scrollMode}
+         currentPageIndex={viewer.navigation.pageIndex}
+         onCurrentPageChange={viewer.navigation.setPageIndex}
+         zoomAnchorRef={viewer.container.zoomAnchorRef}
        />
      </>
    );
  }
```

## 3-tier architecture

`useViewerSetup` sits at the middle tier of a three-layer composition:

```
┌─────────────────────────────────────────────────────────────────┐
│  Tier 3 — Component layer                                       │
│                                                                 │
│  PDFToolbar            PDFDocumentView                          │
│  (consumes viewer)     (consumes viewer slices)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│  Tier 2 — Orchestration hook                                    │
│                                                                 │
│  useViewerSetup()                                               │
│  ├─ composes individual hooks                                   │
│  ├─ wires cross-cutting behaviour                               │
│  └─ returns grouped state slices                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│  Tier 1 — Primitive hooks                                       │
│                                                                 │
│  usePageNavigation   useZoom   useFitZoom                       │
│  useWheelZoom        usePageDimensions                          │
└─────────────────────────────────────────────────────────────────┘
```

### Why an orchestration layer?

The five primitive hooks are independently useful, but combining them introduces cross-cutting behaviour that none of them should own individually. `useViewerSetup` handles these interactions:

#### Fit-mode clearing on manual zoom

When the user calls `zoomIn()`, `zoomOut()`, `setScale()`, or `reset()`, the hook wraps the underlying `useZoom` actions to also clear `activeFitMode`. Without this, the auto-reapply effect would immediately override the user's manual zoom choice.

#### Fit-mode auto-reapply on resize

When `activeFitMode` is set (e.g. `'page-width'`), the hook computes the corresponding scale via `fitScale(activeFitMode)` and reapplies it whenever the computed value changes. This happens when:

- The container is resized (detected by `useFitZoom`'s `ResizeObserver`)
- The user navigates to a page with different dimensions
- The document is swapped

The reapply runs in a `useEffect` that watches `activeFitScaleValue`, ensuring the page always fills the available space while the fit mode is active.

#### Cursor-anchored wheel zoom

`useWheelZoom` listens for Ctrl/Cmd+wheel events on the container and computes proportional zoom (each tick multiplies or divides the scale by a factor of 1.1). It writes anchor data — cursor position, scroll offsets, and the scale ratio — to `zoomAnchorRef`. `useVisiblePages` (inside `PDFDocumentView`) reads this anchor in a layout effect and adjusts the scroll position so the content under the cursor remains stationary. The `onManualZoom` callback clears the active fit mode, keeping the zoom and fit systems consistent.

#### Container ref sharing

A single `containerRef` is shared between three consumers:

1. **`useFitZoom`** — attaches a `ResizeObserver` to track the container's client dimensions for fit-scale computation.
2. **`useWheelZoom`** — attaches a `wheel` event listener (with `{ passive: false }`) for Ctrl/Cmd+wheel zoom.
3. **`PDFDocumentView`** — uses it as the scroll container for virtualised page rendering.

All three handle late-mounting gracefully: if the ref target is `null` on first render (e.g. conditionally rendered content), they attach once the element mounts.

## See also

- [PDFViewer](./pdf-viewer.md) — Compound viewer component and page rendering primitives
- [Toolbar](./toolbar.md) — Headless toolbar with prop-getter pattern
- [Examples](./examples.md) — End-to-end compositions built from `useViewerSetup` and viewer slots
