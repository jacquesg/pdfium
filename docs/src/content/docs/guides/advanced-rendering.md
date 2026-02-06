---
title: Advanced Rendering
description: Master high-performance rendering techniques including sub-region rendering (clip rects) and progress monitoring.
---

Beyond basic full-page rendering, @scaryterry/pdfium offers advanced controls for high-performance applications, such as map viewers, design tools, or large-format document viewers.

## Sub-Region Rendering (Clip Rects)

For large pages (e.g., engineering drawings) or when implementing zooming interfaces (like Google Maps), you often only need to render the visible portion of a page. Rendering the entire page at high zoom levels would consume excessive memory.

Use `clipRect` to render only a specific region of the page into your output bitmap.

```typescript
using page = document.getPage(0);

// Define the visible viewport on the page (in PDF points)
const viewport = {
  left: 100,
  top: 100,
  right: 300,
  bottom: 300
};

// Render just that region into a 200x200 bitmap
const { data, width, height } = page.render({
  scale: 1, // Scale relative to the page coordinates
  width: 200,
  height: 200,
  clipRect: viewport
});

console.log(`Rendered region: ${width}x${height}`);
```

### Coordinate Systems

*   **PDF Coordinates:** Origin is usually bottom-left. `clipRect` uses these coordinates.
*   **Device Coordinates:** Origin is top-left of the bitmap.

When using `clipRect`, PDFium calculates the transformation matrix to map the specified `clipRect` from page space to the full bounds of the output bitmap.

## Rendering Progress

Rendering complex PDF pages (especially those with large images or complex vector paths) can take time. Blocking the main thread without feedback is bad UX.

Use the `onProgress` callback to update your UI during the render process.

```typescript
const { data } = page.render({
  scale: 2,
  onProgress: (progress) => {
    // progress is a number between 0 and 1
    console.log(`Rendering: ${Math.round(progress * 100)}%`);
    updateProgressBar(progress);
  }
});
```

**Note:** The callback is synchronous. If you need to yield to the event loop to keep the UI responsive in a single-threaded environment (like the browser main thread), consider running PDFium in a Worker (see the [Worker Guide](/pdfium/guides/worker-mode/)).

## Progressive Rendering

For extremely complex pages, even `onProgress` might not be enough if the render call blocks for too long between updates. PDFium supports **Progressive Rendering**, which allows you to pause and resume the rendering process.

```typescript
import { ProgressiveRenderStatus } from '@scaryterry/pdfium';

// Start the render
using render = page.startProgressiveRender({ scale: 2 });

// Loop until done, yielding to the event loop
while (render.status === ProgressiveRenderStatus.ToBeContinued) {
  // Perform a chunk of rendering
  render.continue();

  // Yield to let the browser paint/process events
  await new Promise(resolve => setTimeout(resolve, 0));
}

if (render.status === ProgressiveRenderStatus.Done) {
  // Get the final result
  const { data, width, height } = render.getResult();
  // ... display image ...
} else {
  console.error('Render failed');
}
```

### Progressive Context Properties

The `ProgressiveRenderContext` returned by `startProgressiveRender()` exposes:

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `status` | `ProgressiveRenderStatus` | Current state: `ToBeContinued`, `Done`, or `Failed` |
| `width` | `number` | Rendered width in pixels |
| `height` | `number` | Rendered height in pixels |
| `continue()` | `ProgressiveRenderStatus` | Performs the next rendering chunk and returns the updated status |
| `getResult()` | `RenderResult` | Returns the final RGBA pixel data (only valid when `status` is `Done`) |

The context implements `Symbol.dispose`, so use `using` for automatic cleanup.

### `onProgress` vs `startProgressiveRender()`

| | `onProgress` callback | `startProgressiveRender()` |
|---|---|---|
| **Control** | PDFium drives the loop — you receive callbacks | You drive the loop — call `continue()` at your pace |
| **Yielding** | Cannot yield between updates | Can yield (`setTimeout`, `scheduler.yield()`) between chunks |
| **Complexity** | Simple — one callback function | More involved — manage a loop and context disposal |
| **Use case** | Progress bars, logging | Keeping UI responsive on the main thread |

Use `onProgress` when you only need to report progress. Use `startProgressiveRender()` when you need to yield control between rendering chunks (e.g., to keep the browser responsive without a Worker).

:::caution
`clipRect` is **not supported** with `startProgressiveRender()`. Use the standard `render()` method for sub-region rendering.
:::