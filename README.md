# @scaryterry/pdfium

High-Performance Universal PDFium bindings for Browser and Node.js.

## Features

- **Hybrid Architecture** - Use **Native** bindings (C++) on Node.js for maximum speed, or **WASM** on browsers for portability.
- **Zero dependencies** - PDFium WASM is bundled; Native bindings are optional.
- **Type-safe** - Full TypeScript support with branded types and strict mode
- **Automatic resource cleanup** - `Symbol.dispose` support (`using` keyword)
- **Typed exceptions** - Error subclasses with error codes for precise handling
- **Universal** - Works in Node.js 22+ and modern browsers
- **ESM-only** - Modern ES2024 module format
- **Worker support** - Off-main-thread processing via `WorkerProxy`

## Installation

```sh
pnpm add @scaryterry/pdfium
```

## Quick Start

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Initialise the library
using pdfium = await PDFium.init();

// Open a PDF document
using document = await pdfium.openDocument(pdfBytes);
console.log(`Document has ${document.pageCount} pages`);

// Iterate over pages
for (const page of document.pages()) {
  using p = page;

  // Get page dimensions
  const { width, height } = p.size;
  console.log(`Page ${p.index}: ${width}x${height} points`);

  // Extract text
  const text = p.getText();
  console.log(text);

  // Render to RGBA bitmap
  const { data, width: renderWidth, height: renderHeight } = p.render({ scale: 2 });
  // data is a Uint8Array of RGBA pixels
}
```

## Error Handling

All operations throw typed error subclasses on failure:

```typescript
import { PDFium, DocumentError } from '@scaryterry/pdfium';

try {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(corruptBytes);
} catch (error) {
  if (error instanceof DocumentError) {
    console.error(error.code);    // numeric error code
    console.error(error.message); // human-readable message
    console.error(error.context); // optional context data
  }
}
```

## API Overview

### `PDFium`

The main entry point for the library.

| Method | Returns | Description |
|--------|---------|-------------|
| `PDFium.init(options?)` | `Promise<PDFium>` | Initialise the library |
| `pdfium.openDocument(data, options?)` | `Promise<PDFiumDocument>` | Open a PDF document |
| `pdfium.createDocument()` | `PDFiumDocumentBuilder` | Create a new PDF document |
| `pdfium.createProgressiveLoader(data)` | `ProgressivePDFLoader` | Create a progressive loader for linearised PDFs |

### `PDFiumDocument`

Represents a loaded PDF document.

| Property/Method | Returns | Description |
|-----------------|---------|-------------|
| `document.pageCount` | `number` | Number of pages |
| `document.getPage(index)` | `PDFiumPage` | Load a page by index |
| `document.pages()` | `Generator<PDFiumPage>` | Iterate all pages |
| `document.save(options?)` | `Uint8Array` | Serialise the document to bytes |
| `document.getBookmarks()` | `Bookmark[]` | Extract the bookmark tree |
| `document.attachmentCount` | `number` | Number of file attachments |
| `document.getAttachments()` | `PDFAttachment[]` | Extract file attachments |
| `document.importPages(source, options?)` | `void` | Import pages from another document |
| `document.createNUpDocument(options)` | `PDFiumDocument` | Create N-up layout document |

### `PDFiumPage`

Represents a single page in a PDF document.

| Property/Method | Returns | Description |
|-----------------|---------|-------------|
| `page.index` | `number` | Zero-based page index |
| `page.size` | `PageSize` | Page dimensions in points |
| `page.width` | `number` | Page width in points |
| `page.height` | `number` | Page height in points |
| `page.rotation` | `PageRotation` | Page rotation (0, 90, 180, 270) |
| `page.objectCount` | `number` | Number of objects on the page |
| `page.annotationCount` | `number` | Number of annotations on the page |
| `page.render(options?)` | `RenderResult` | Render to RGBA bitmap |
| `page.getText()` | `string` | Extract all text content |
| `page.getObjects()` | `PageObject[]` | Get page objects (text, images, paths) |
| `page.objects()` | `IterableIterator<PageObject>` | Lazy page object iterator |
| `page.getAnnotation(index)` | `Annotation` | Get annotation by index |
| `page.getAnnotations()` | `Annotation[]` | Get all annotations |
| `page.findText(query, flags?)` | `Generator<TextSearchResult>` | Search for text with positions |
| `page.getCharBox(charIndex)` | `CharBox \| undefined` | Get character bounding box |
| `page.getCharIndexAtPos(x, y)` | `number` | Get character index at position |
| `page.getTextInRect(l, t, r, b)` | `string` | Get text within a rectangle |
| `page.getCharacterInfo(index)` | `CharacterInfo` | Get detailed character info |
| `page.getStructureTree()` | `StructureElement[] \| undefined` | Get accessibility structure tree |

### `PDFiumDocumentBuilder`

Creates new PDF documents from scratch.

| Property/Method | Returns | Description |
|-----------------|---------|-------------|
| `builder.pageCount` | `number` | Number of pages added |
| `builder.addPage(options?)` | `PDFiumPageBuilder` | Add a new page |
| `builder.deletePage(index)` | `void` | Delete a page by index |
| `builder.loadStandardFont(name)` | `FontHandle` | Load a standard PDF font |
| `builder.save(options?)` | `Uint8Array` | Serialise the document to bytes |

### `ProgressivePDFLoader`

Detects linearisation and supports incremental loading.

| Property/Method | Returns | Description |
|-----------------|---------|-------------|
| `loader.isLinearised` | `boolean` | Whether the document is linearised |
| `loader.linearisationStatus` | `LinearisationStatus` | Detailed linearisation status |
| `loader.isDocumentAvailable` | `boolean` | Whether all document data is available |
| `loader.isPageAvailable(index)` | `boolean` | Whether a specific page is available |
| `loader.firstPageNumber` | `number` | First available page number |
| `loader.getDocument(password?)` | `PDFiumDocument` | Extract the loaded document |

### Render Options

```typescript
interface RenderOptions {
  scale?: number;           // Scale factor (default: 1)
  width?: number;           // Target width in pixels (overrides scale)
  height?: number;          // Target height in pixels (overrides scale)
  renderFormFields?: boolean; // Include form fields (default: false)
  backgroundColour?: number;  // ARGB integer (default: 0xFFFFFFFF)
  rotation?: PageRotation;    // Rotation to apply (default: None)
}
```

### Error Classes

| Error Class | Thrown By | Description |
|-------------|----------|-------------|
| `InitialisationError` | `PDFium.init()` | WASM load or library init failure |
| `DocumentError` | `pdfium.openDocument()` | Invalid format, password, file not found |
| `PageError` | `document.getPage()` | Page not found, load failure, out of range |
| `RenderError` | `page.render()` | Bitmap creation failure, invalid dimensions |
| `TextError` | `page.getText()` | Text extraction or text page load failure |
| `MemoryError` | Internal | WASM memory allocation failure |
| `WorkerError` | `WorkerProxy` | Worker creation or communication failure |

### Error Codes

| Range | Category | Examples |
|-------|----------|---------|
| 1xx | Initialisation | WASM load failure, library init failure |
| 2xx | Document | Invalid format, password required, file not found |
| 3xx | Page | Page not found, load failure, out of range |
| 4xx | Render | Bitmap creation failure, invalid dimensions |
| 5xx | Memory | Allocation failure, buffer overflow |
| 6xx | Text | Extraction failure, text page load failure |
| 7xx | Object | Unknown type, access failure |
| 8xx | Worker | Creation failure, communication error, timeout |

## Resource Management

All PDFium resources implement `Symbol.dispose` for automatic cleanup:

```typescript
// Recommended: using keyword (automatic cleanup)
{
  using page = document.getPage(0);
  // page is automatically disposed when scope exits
}

// Alternative: explicit dispose
const page = document.getPage(0);
try {
  // use page
} finally {
  page.dispose();
}
```

A `FinalizationRegistry` provides a safety net - if a resource is garbage collected
without being disposed, a warning is logged in development mode.

## Browser Usage

In browser environments, provide the WASM binary explicitly:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Option 1: Load from URL (recommended)
using pdfium = await PDFium.init({
  wasmUrl: '/pdfium.wasm'
});

// Option 2: Pre-load binary
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();

using pdfium = await PDFium.init({ wasmBinary });
```

## Worker Mode

For off-main-thread processing:

```typescript
import { PDFium } from '@scaryterry/pdfium';

await using pdfium = await PDFium.init({
  useWorker: true,
  workerUrl: '/worker.js',
  wasmUrl: '/pdfium.wasm',
});
await using document = await pdfium.openDocument(pdfArrayBuffer);
const result = await document.renderPage(0, { scale: 2 });
```

Need low-level control? Use `WorkerProxy` directly with `openDocument() -> loadPage() -> renderPage() -> closePage()`.

## Native Backend (Node.js)

For optimal performance in Node.js, use the native backend:

```typescript
import { PDFium } from '@scaryterry/pdfium';

// Attempt native, fall back to WASM
const pdfium = await PDFium.init({ useNative: true });
```

Install platform-specific packages:

```sh
pnpm add @scaryterry/pdfium-darwin-arm64   # macOS Apple Silicon
pnpm add @scaryterry/pdfium-darwin-x64     # macOS Intel
pnpm add @scaryterry/pdfium-linux-x64-gnu  # Linux x64
pnpm add @scaryterry/pdfium-linux-arm64-gnu # Linux ARM64
pnpm add @scaryterry/pdfium-win32-x64-msvc # Windows x64
```

The native backend provides faster performance by eliminating WASM marshalling overhead. See the [documentation](https://jacquesg.github.io/pdfium/concepts/backends/) for details on backend selection and feature coverage.

## Requirements

- **Node.js**: >= 22 LTS
- **Browsers**: Chrome 117+, Firefox 104+, Safari 16.4+
- **Module format**: ESM only

## Licence

MIT
