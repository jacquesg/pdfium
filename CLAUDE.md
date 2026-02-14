# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Universal PDFium wrapper for Browser and Node.js (`@scaryterry/pdfium`). Provides a type-safe TypeScript API around the PDFium C++ library with two backends: WASM (universal) and native N-API addon (Node.js, optional). ESM-only, ES2024 target, Node.js >= 22.

## Commands

```bash
pnpm build          # Build with tsup (ESM-only, ES2024 target)
pnpm test           # Run vitest tests (unit + integration + visual projects)
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage
pnpm test:mutation  # Run Stryker mutation tests (threshold: 50% break)
pnpm test:bench     # Run benchmarks (vitest bench)
pnpm test:visual    # Run visual regression tests
pnpm test:browser   # Run Playwright browser tests
pnpm lint           # Lint with Biome (--error-on-warnings)
pnpm lint:fix       # Auto-fix lint issues
pnpm typecheck      # TypeScript check (strict mode, both tsconfig.json and tsconfig.test.json)
pnpm check          # Run lint + typecheck + test
```

Run a single test file:
```bash
pnpm vitest run test/integration/page.test.ts
```

Run a single test project:
```bash
pnpm vitest run --project unit
pnpm vitest run --project integration
```

## Architecture

### Dual Backend

The library abstracts over two backends via `PDFiumBackend` interface (`src/backend/types.ts`):

- **WasmBackend** (`src/backend/wasm.ts`) — WASM module, universal (browser + Node.js)
- **NativeBackend** (`src/backend/native.ts`) — N-API addon, Node.js only, optional

`PDFium.init()` selects the backend based on `useNative`/`forceWasm` options. The backend interface encapsulates the full alloc-call-read-free cycle so consumers don't handle memory management.

### Entry Points

Four entry points for different environments:

- `src/index.ts` — Main auto-detecting entry (re-exports everything)
- `src/browser.ts` — Browser-specific (requires explicit WASM binary)
- `src/node.ts` — Node.js-specific (auto-loads WASM from filesystem)
- `src/worker.ts` — Web Worker script for off-main-thread processing

Additionally `./internal` and `./types` sub-path exports exist for advanced/low-level usage.

### Key Layers

```
PDFium (src/pdfium.ts)          ← Main entry: init(), openDocument(), createDocument()
  ↓
PDFiumDocument (src/document/)  ← Document operations: pages, bookmarks, save, import
  ↓
PDFiumBackend (src/backend/)    ← Abstraction over WASM or native
  ↓
WASMMemoryManager (src/wasm/)   ← WASM heap management, struct wrappers
  ↓
PDFiumWASM (src/wasm/bindings/) ← Typed bindings to the C functions (_FPDF_*)
```

### Resource Management

All resources implement `Symbol.dispose` / `Symbol.asyncDispose` via base classes in `src/core/disposable.ts`:
- `Disposable` — synchronous disposal (documents, pages, allocations)
- `AsyncDisposable` — async disposal (worker proxies)
- `FinalizationRegistry` safety net warns in `__DEV__` mode and runs cleanup callbacks

### WASM Memory

- `WASMMemoryManager` (`src/wasm/memory.ts`) — alloc/free with tracking, typed reads/writes
- `WASMAllocation` (`src/wasm/allocation.ts`) — RAII wrapper with `using` support and `take()` for ownership transfer
- `NativeHandle` (`src/wasm/allocation.ts`) — RAII wrapper for C handles (bitmaps, etc.)
- Struct wrappers in `src/wasm/structs.ts`: `FSRectF`, `FSMatrix`, `FSPointF`, `FSQuadPointsF`

### Branded Types

All handles are branded number types in `src/internal/handles.ts` (e.g. `DocumentHandle`, `PageHandle`, `WASMPointer`). Use `asHandle<T>()` and `asPointer()` to create them — never raw casts.

### Build-Time Constants

Declared in `src/env.d.ts`, injected by tsup's `define`:
- `__DEV__` — enables diagnostics and warnings (true in tests, false in production)
- `__PACKAGE_VERSION__` — from package.json
- `__WASM_HASH__` — SHA-256 prefix of bundled WASM binary

### Error System

`src/core/errors.ts` — hierarchical error classes with numeric codes:
- 1xx: Initialisation, 2xx: Document, 3xx: Page, 4xx: Render, 5xx: Memory, 6xx: Text, 7xx: Object/Annotation, 8xx: Worker, 9xx: Resource
- Base class `PDFiumError` with `code`, `message`, `context`
- Context is sanitised in production (strips internal WASM details)

### Plugin System

`src/core/plugin.ts` — simple lifecycle hooks (`onDocumentOpened`). Registered via `registerPlugin()`.

### React Integration Layer

`src/react/` exports a full React SDK (`@scaryterry/pdfium/react`) for building PDF viewers. All PDFium operations run off-main-thread via the Worker backend.

#### Provider and Context

`PDFiumProvider` (`src/react/context.tsx`) initialises `WorkerPDFium`, manages document lifecycle, and exposes split contexts:
- `PDFiumInstanceContext` — worker instance (stable after init)
- `PDFiumDocumentContext` — current document, revision counter, password flow, load/dispose

Three consumer hooks: `usePDFiumInstance()`, `usePDFiumDocument()`, `usePDFium()` (merged convenience).

#### State Management (QueryStore + RenderStore)

Two `useSyncExternalStore`-backed stores replace traditional React state for data fetching:

- **QueryStore** (`src/react/internal/query-store.ts`) — heterogeneous cache (pending/success/error entries). All data hooks use `useStoreQuery` which reads from this store, fetches on cache miss, and supports `keepPreviousData`.
- **LRURenderStore** (`src/react/internal/render-store.ts`) — LRU cache for rendered bitmaps (default 30 pages). `touch()` must be called from `useLayoutEffect`, never from `getSnapshot`.

Cache keys use null-byte (`\0`) separator: `buildCacheKey(docId, hookName, revision, ...params)` (`src/react/internal/cache-key.ts`). The `documentRevision` counter invalidates all caches when bumped (e.g. after form fills or annotation edits). Purge on document swap uses `purgeByPrefix(docId + '\0')`.

#### Hook Categories

- **Data hooks** (14): `usePageInfo`, `useTextContent`, `useAnnotations`, `useBookmarks`, `useLinks`, `useWebLinks`, `useFormWidgets`, `usePageObjects`, `useStructureTree`, `useAttachments`, `useNamedDestinations`, `useDocumentInfo`, `useTextSearch`, `usePageLabel` — all follow the `useStoreQuery(key, fetcher)` pattern
- **Interaction hooks**: `usePageNavigation`, `useVisiblePages`, `useZoom`, `useFitZoom`, `useKeyboardShortcuts`, `useCharacterInspector`
- **Form hooks**: `useDocumentFormActions`, `usePageFormActions` — call `bumpDocumentRevision()` after mutations
- **Rendering**: `useRenderPage` (writes to `LRURenderStore`)
- **Utility**: `useDownload`, `useDocumentSearch` (cross-page incremental search)

#### Components

- `PDFDocumentView` — scroll container with virtualised pages (continuous + single-page modes)
- `PDFPageView` — single page with canvas + overlay layers
- `PDFCanvas` — bitmap renderer consuming `renderKey` from `useRenderPage`
- `ThumbnailStrip` — virtualised thumbnail sidebar
- `SearchPanel` — headless search UI for `useDocumentSearch`
- `TextLayer`, `TextOverlay` — selectable text overlay
- `SearchHighlightOverlay`, `AnnotationOverlay` — canvas overlays
- `DragDropZone` — file drop target with accessibility
- `PDFiumErrorBoundary` — error boundary with retry

#### Coordinate Transforms

`src/react/coordinates.ts` — PDF uses bottom-left origin, screen uses top-left. Three functions: `pdfToScreen`, `screenToPdf`, `pdfRectToScreen`. All require `{ scale, originalHeight }`.

#### Cache Invalidation Pattern

1. Mutation hooks call `bumpDocumentRevision()` after modifying the document
2. All cache keys include `revision` — bumping it produces new keys
3. `useStoreQuery` sees a cache miss on the new key and re-fetches
4. `clearCache()` purges both stores but does NOT trigger re-fetches — always call `bumpDocumentRevision()` after it

## Code Style

- **Biome** for linting/formatting (120 char lines, 2 spaces, single quotes, semicolons, trailing commas)
- `noExplicitAny: "error"` and `noUnusedImports: "error"` — Biome will fail on `any` and unused imports
- `useExportType` / `useImportType` enforced — use `import type` and `export type` where possible
- **TypeScript strict mode** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- **ESM-only** output targeting ES2024
- **Conventional commits** enforced via commitlint

## Testing

Vitest with three workspace projects (configured in `vitest.config.ts`):
- `unit` — fast isolated tests in `test/unit/`
- `integration` — tests requiring WASM module in `test/integration/` (15s timeout)
- `visual` — visual regression tests in `test/visual/` (30s timeout, forks pool)

Test fixtures (PDF files) in `test/fixtures/`. External ground-truth PDFs from chromium/pdfium in `test/fixtures/pdfium/`. Setup file: `test/setup.ts`.

Snapshot test at `test/unit/api.test.ts` tracks all public API symbols — update with `pnpm vitest run --project unit --update` when exports change.

Coverage thresholds: 95% lines, 90% branches, 95% functions, 95% statements.

## Critical Gotchas

### FS_RECTF Layout
The C struct layout is `{ left, top, right, bottom }` at byte offsets `[0, 4, 8, 12]`. **NOT** `{ left, bottom, right, top }`. This has been a recurring source of bugs.

### WASM Memory Safety
- Always use `memory.readFloat32()` / `memory.readUint32()` — never raw `TypedArray` views
- Use `ptrOffset(ptr, bytes)` for pointer arithmetic — never `(ptr + N) as WASMPointer`
- Use `using alloc = memory.alloc(size)` for automatic cleanup
- Use `alloc.take()` to transfer ownership when passing to a resource that will manage the pointer

### Text Encoding
PDFium uses UTF-16LE for text. Use `encodeUTF16LE()` from `src/wasm/memory.ts` and `memory.readUTF16LE()` for reading.

### Environment Detection
Centralised in `src/core/env.ts` → `isNodeEnvironment()`. Do not duplicate this check.
