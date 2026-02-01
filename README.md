# @jacquesg/pdfium

Universal PDFium WASM wrapper for Browser and Node.js with modern TypeScript patterns.

## Features

- **Zero dependencies** - PDFium compiled to WebAssembly and bundled with the package
- **Type-safe** - Full TypeScript support with branded types and strict mode
- **Automatic resource cleanup** - `Symbol.dispose` support (`using` keyword)
- **Typed exceptions** - Error subclasses with error codes for precise handling
- **Universal** - Works in Node.js 22+ and modern browsers
- **ESM-only** - Modern ES2024 module format
- **Worker support** - Off-main-thread processing via `WorkerProxy`

## Installation

```sh
pnpm add @jacquesg/pdfium
```

## Quick Start

```typescript
import { PDFium } from '@jacquesg/pdfium';

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
import { PDFium, DocumentError, PageError } from '@jacquesg/pdfium';

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

### `PDFiumDocument`

Represents a loaded PDF document.

| Property/Method | Returns | Description |
|-----------------|---------|-------------|
| `document.pageCount` | `number` | Number of pages |
| `document.getPage(index)` | `PDFiumPage` | Load a page by index |
| `document.pages()` | `Generator<PDFiumPage>` | Iterate all pages |

### `PDFiumPage`

Represents a single page in a PDF document.

| Property/Method | Returns | Description |
|-----------------|---------|-------------|
| `page.index` | `number` | Zero-based page index |
| `page.size` | `PageSize` | Page dimensions in points |
| `page.width` | `number` | Page width in points |
| `page.height` | `number` | Page height in points |
| `page.objectCount` | `number` | Number of objects on the page |
| `page.render(options?)` | `RenderResult` | Render to RGBA bitmap |
| `page.getText()` | `string` | Extract text content |

### Render Options

```typescript
interface RenderOptions {
  scale?: number;           // Scale factor (default: 1)
  width?: number;           // Target width in pixels (overrides scale)
  height?: number;          // Target height in pixels (overrides scale)
  renderFormFields?: boolean; // Include form fields (default: false)
  backgroundColour?: number;  // ARGB integer (default: 0xFFFFFFFF)
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
import { PDFium } from '@jacquesg/pdfium';

// Option 1: Fetch from a URL
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();

using pdfium = await PDFium.init({ wasmBinary });
```

## Worker Mode

For off-main-thread processing:

```typescript
import { WorkerProxy } from '@jacquesg/pdfium';

using proxy = await WorkerProxy.create('/worker.js', wasmBinary);
const { documentId, pageCount } = await proxy.openDocument(pdfArrayBuffer);
// All operations happen in the worker thread
```

## Requirements

- **Node.js**: >= 22 LTS
- **Browsers**: Chrome 117+, Firefox 104+, Safari 16.4+
- **Module format**: ESM only

## Migration from @hyzyla/pdfium

See [MIGRATION.md](MIGRATION.md) for a detailed migration guide.

| @hyzyla/pdfium v2 | @jacquesg/pdfium v3 |
|-------------------|---------------------|
| `PDFiumLibrary.init()` | `PDFium.init()` |
| `library.loadDocument(buff)` | `pdfium.openDocument(data)` |
| `document.destroy()` | `document.dispose()` or `using` |
| `document.getPage(i)` | `document.getPage(i)` |
| `document.getPageCount()` | `document.pageCount` |
| `page.render({ scale, render })` | `page.render({ scale })` |
| `page.getText()` | `page.getText()` |
| Throws exceptions | Throws typed exceptions |

## Licence

MIT
