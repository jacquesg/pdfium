# PDFium Workbench — Vite + React Demo

A comprehensive React application demonstrating the full `@scaryterry/pdfium` API surface. 12 interactive labs cover rendering, text extraction, annotations, document creation, form handling, security, and more — all with proper resource management using `using` / `Symbol.dispose`.

## Labs

| Tab | Lab | APIs Demonstrated |
|-----|-----|-------------------|
| Viewer | PDF rendering with page properties | `render()`, `getPageBox()`, `rotation`, `hasTransparency()`, `getPageLabel()`, `save()` |
| Creator | Build PDFs from scratch | `createDocumentBuilder()`, `addPage()`, `addText()`, `addRectangle()`, `loadStandardFont()`, `save()` |
| Text | Text extraction, search, character inspection | `getText()`, `findText()`, `getCharacterInfo()`, `getCharBox()`, `getCharIndexAtPos()`, `getTextInRect()` |
| Annots | Annotation browsing and creation | `getAnnotations()`, `createAnnotation()`, `removeAnnotation()`, full `PDFiumAnnotation` API |
| Objects | Page object inspection (text, image, path) | `getObjects()`, `PDFiumFont.getMetrics()`, font flags, `PDFiumImageObject` metadata, `PDFiumPathObject` details |
| Structure | Bookmarks, attachments, links, structure tree | `getBookmarks()`, `getAttachments()`, `getLinks()`, `getWebLinks()`, `getStructureTree()`, `getNamedDestinations()` |
| Forms | Interactive form fields and flattening | `hasForm()`, `formType`, widget annotations, `flatten()`, `FlattenFlags`, highlight colours |
| Mixer | Merge documents and N-up layouts | `importPages()`, `createNUpDocument()`, `copyViewerPreferences()`, `save()` |
| Render | Progressive rendering, thumbnails, coordinates | `startProgressiveRender()`, `hasThumbnail()`, `getThumbnailAsBitmap()`, `pageToDevice()`, `deviceToPage()` |
| Worker | Off-main-thread processing via Web Workers | `WorkerPDFium`, `WorkerPDFiumDocument`, `WorkerPDFiumPage`, `getTextLayout()` |
| Inspector | Document metadata, permissions, viewer prefs | `getMetadata()`, `getPermissions()`, `getViewerPreferences()`, `getSignatures()`, `getJavaScriptActions()` |
| Security | Password-protected PDFs and error handling | `openDocument({ password })`, `PDFiumError` hierarchy, error codes |

## Prerequisites

- Node.js 22 or later
- pnpm (package manager)
- Main package built (`pnpm build` from repository root)

## Quick Start

### Development Mode (from cloned repository)

1. Build the main package:
   ```bash
   # From repository root
   pnpm build
   ```

2. Install dependencies and start the dev server:
   ```bash
   pnpm --dir demo/vite install
   pnpm --dir demo/vite dev
   ```
   `dev` runs asset sync automatically (`demo/scripts/setup.ts`) before starting Vite.
   It also auto-heals stale linked library output via `demo/scripts/ensure-lib-build.ts`
   (which runs `pnpm build` only when `dist/` is out of date).

   For the editor workflow, use the root-level orchestrator:
   ```bash
   pnpm dev:editor
   ```
   This runs an initial library build, starts `build:watch`, and launches the Vite demo together.

3. Open http://localhost:5173

### Standalone Mode (from npm)

1. Generate a standalone demo:
   ```bash
   pnpm tsx demo/scripts/make-standalone.ts vite /path/to/output
   ```

2. Install and run:
   ```bash
   cd /path/to/output
   npm install
   npm run dev
   ```

## Code Walkthrough

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@scaryterry/pdfium'],
  },
  plugins: [react()],
});
```

**Critical**: You must exclude `@scaryterry/pdfium` from Vite's dependency optimisation. The package uses a runtime fetch/eval pattern that Vite's pre-bundling breaks.

### Loading the WASM Binary

```typescript
import wasmUrl from '@scaryterry/pdfium/pdfium.wasm?url';

const pdfium = await PDFium.init({
  wasmBinary: await fetch(wasmUrl).then((r) => r.arrayBuffer()),
});
```

Vite's `?url` suffix gives you a resolved URL to the WASM binary that works in both development and production builds.

### Resource Management

All PDFium resources use the `using` keyword for automatic cleanup:

```typescript
// Synchronous resources (pages, fonts, builders)
using page = document.getPage(0);
const text = page.getText();
// page is automatically disposed at end of scope

// Async resources (worker proxies)
await using page = await workerDoc.getPage(0);
const result = await page.render({ scale: 2 });
```

**Never** call `.dispose()` manually — always use `using` / `await using` or `[Symbol.dispose]()` / `[Symbol.asyncDispose]()`.

### Store-Backed React Hooks

```typescript
const { renderKey, width, height, isLoading } = useRenderPage(document, 0, { scale: 2 });
```

The React package ships built-in async hooks with loading/error states and cache management. The hooks return plain serialisable data and dispose worker page handles internally.

## Project Structure

```
demo/vite/
├── public/
│   ├── pdfium.cjs           # WASM glue code (copied by setup)
│   ├── sample.pdf            # Default document
│   ├── reference.pdf         # Reference document (for Text lab)
│   ├── annots.pdf            # Annotated document (for Annotations lab)
│   └── protected.pdf         # Password-protected document (for Security lab)
├── src/
│   ├── App.tsx               # Main app with 12-tab navigation, React.lazy code splitting
│   ├── pdfium.worker.ts      # Worker entry (imports @scaryterry/pdfium/worker)
│   ├── client.ts             # React Query client configuration
│   ├── main.tsx              # Entry point with providers
│   ├── index.css             # Utility CSS classes
│   ├── components/
│   │   ├── Button.tsx        # Shared button (primary/secondary/danger variants)
│   │   ├── CodeSnippet.tsx   # Monospace code block with copy button
│   │   ├── DocPanel.tsx      # Collapsible API documentation sidebar
│   │   ├── DownloadButton.tsx # Save document as PDF download
│   │   ├── DragDropZone.tsx  # Full-screen drag-and-drop PDF loading
│   │   ├── ErrorBoundary.tsx # React error boundary for each lab
│   │   ├── FilePicker.tsx    # File input for loading custom PDFs
│   │   ├── PasswordDialog.tsx # Modal for password-protected PDFs
│   │   ├── PDFCanvas.tsx     # Canvas renderer for PDF pixel data
│   │   ├── PropertyTable.tsx # Key-value property display table
│   │   ├── SubTabNav.tsx     # Horizontal sub-tab navigation (ARIA tablist)
│   │   ├── TextLayer.tsx     # Selectable text overlay on rendered pages
│   │   ├── TextOverlay.tsx   # Text position overlay (Worker lab)
│   │   ├── TreeView.tsx      # Recursive collapsible tree (ARIA tree)
│   │   └── __tests__/        # Component unit tests
│   ├── hooks/
│   │   ├── usePDFium.tsx     # PDFium context provider (init, document management, passwords)
│   │   ├── useRender.ts      # React Query hook for page rendering
│   │   ├── useDownload.ts    # Document save + download hook
│   │   └── useOnScreen.ts    # IntersectionObserver visibility hook
│   └── features/
│       ├── Viewer/           # PDF rendering + page properties
│       ├── Creation/         # Document builder
│       ├── Text/             # Text extraction with 4 sub-tabs (Selection, Search, Characters, Extraction)
│       ├── Annotations/      # Annotation browsing + creation + detail view
│       ├── Objects/          # Page object inspection (text, image, path)
│       ├── Structure/        # Bookmarks, attachments, links, web links, structure tree, named dests
│       ├── Forms/            # Form fields, highlighting, flattening
│       ├── Layouts/          # Document merger + N-up layouts
│       ├── Rendering/        # Progressive render, thumbnails, coordinate transforms
│       ├── Worker/           # Web Worker off-main-thread processing
│       ├── Inspector/        # Metadata, permissions, signatures, JavaScript, viewer prefs
│       └── Security/         # Password handling + error catalogue
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Patterns

### Hash-Based Deep Linking

Each lab is accessible via URL hash (e.g. `#viewer`, `#security`). The active tab syncs with `window.location.hash`.

### Code Splitting

All 12 labs are loaded via `React.lazy()` + `Suspense`, so only the active lab's code is downloaded.

### Error Handling

- `ErrorBoundary` wraps each lab to catch render-phase errors
- `PasswordDialog` handles password-protected PDFs (error code 202)
- `DragDropZone` wraps the main content area for drag-and-drop PDF loading
- All event handler errors use try/catch with local error state (not `alert()`)

### Cache Invalidation

After mutating operations (flatten, create/remove annotation, highlight colour change), labs call `bumpDocumentRevision()` from the `usePDFium` context. This increments a counter used in React Query cache keys, forcing re-renders.

## Testing

```bash
pnpm --dir demo/vite test
```

Tests use Vitest with `@testing-library/react` in browser mode (Playwright). Each lab has a test file with smoke tests verifying key UI elements render correctly.

## Editor Guarantees And Limits

The `#editor` demo is alpha-quality but now enforces a stricter model:

- Text markup annotations (Highlight/Underline/Strikeout) are text-selection actions, not draggable/resizeable shape modes.
- Shape tools are one-shot create actions: after creation, the editor returns to neutral selection mode.
- Selection overlays and property edits are driven by optimistic mutation state to stay responsive while worker commits finish.
- Undo/redo is session-scoped and reliable before saving/reloading.

Known limits to keep in mind:

- Line creation currently uses an Ink-based line fallback for rendering/editing consistency across current PDFium bindings.
- Redaction is a two-step workflow (`mark` then `apply`); apply is destructive page-content rewriting and should be validated in compliance workflows.
- CI currently validates editor browser behavior in Chromium. Firefox can be run via `pnpm test:browser:editor:firefox`; WebKit parity is planned separately.

## Troubleshooting

### Error: Failed to fetch /pdfium.cjs

**Cause**: The `pdfium.cjs` file is not in the `public/` directory.

**Solution**: Run asset sync:
```bash
pnpm --dir demo/vite run sync-assets
```
Or manually copy:
```bash
cp ../../dist/vendor/pdfium.cjs public/
```

### Error: sample.pdf not found

**Cause**: The sample PDF is not in the `public/` directory.

**Solution**: Run asset sync:
```bash
pnpm --dir demo/vite run sync-assets
```
Or manually copy:
```bash
cp ../shared/sample.pdf public/
```

### Error: Cannot find module '@scaryterry/pdfium'

**Cause**: Dependencies not installed or main package not built.

**Solution**:
1. Re-sync the linked build (auto-builds if needed): `pnpm --dir demo/vite run ensure-lib-build`
2. Install demo dependencies: `pnpm --dir demo/vite install`

### Vite optimisation breaks the WASM loading

**Cause**: `@scaryterry/pdfium` not excluded from optimizeDeps.

**Solution**: Ensure your `vite.config.ts` has:
```typescript
optimizeDeps: {
  exclude: ['@scaryterry/pdfium'],
}
```

## Related Resources

- [Main README](../../README.md) — Full API documentation
- [Documentation Site](https://jacquesg.github.io/pdfium/) — Guides and API reference
- [Node Demo](../node/) — Node.js server-side example
- [Plain Demo](../plain/) — Browser example without build tools
