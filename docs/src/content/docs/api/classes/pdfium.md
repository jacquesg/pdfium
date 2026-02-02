---
title: PDFium
description: Main entry point for the @scaryterry/pdfium library
---

The `PDFium` class is the main entry point for the library. It manages the WASM module lifecycle and provides methods to open existing PDF documents or create new ones.

## Import

```typescript
import { PDFium } from '@scaryterry/pdfium';
```

## Static Methods

### init()

Initialises the PDFium library and returns a ready-to-use instance.

```typescript
static async init(options?: PDFiumInitOptions): Promise<PDFium>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `PDFiumInitOptions` | Optional configuration |

#### PDFiumInitOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `wasmUrl` | `string \| URL` | — | URL to load the WASM binary from |
| `wasmBinary` | `ArrayBuffer` | — | Pre-loaded WASM binary |
| `limits` | `PDFiumLimits` | See below | Resource limits |

#### PDFiumLimits

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxDocumentSize` | `number` | `536870912` (512 MB) | Maximum document size in bytes |
| `maxRenderDimension` | `number` | `32767` | Maximum render dimension in pixels |
| `maxTextCharCount` | `number` | `10000000` | Maximum text characters to extract |

#### Returns

`Promise<PDFium>` — A ready-to-use PDFium instance.

#### Throws

- [`InitialisationError`](/pdfium/errors/#initialisationerror) — If WASM loading or library initialisation fails.

#### Example

```typescript
// Node.js — automatic WASM loading
using pdfium = await PDFium.init();

// Browser — provide WASM binary
const response = await fetch('/pdfium.wasm');
const wasmBinary = await response.arrayBuffer();
using pdfium = await PDFium.init({ wasmBinary });

// With custom limits
using pdfium = await PDFium.init({
  limits: {
    maxDocumentSize: 50 * 1024 * 1024, // 50 MB
    maxRenderDimension: 8192,
  },
});
```

## Instance Methods

### openDocument()

Opens a PDF document from binary data.

```typescript
async openDocument(
  data: Uint8Array | ArrayBuffer,
  options?: OpenDocumentOptions
): Promise<PDFiumDocument>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Uint8Array \| ArrayBuffer` | PDF file contents |
| `options` | `OpenDocumentOptions` | Optional settings |

#### OpenDocumentOptions

| Property | Type | Description |
|----------|------|-------------|
| `password` | `string` | Password for encrypted PDFs |

#### Returns

`Promise<PDFiumDocument>` — The opened document.

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) with code:
  - `DOC_FORMAT_INVALID` (201) — Invalid PDF format
  - `DOC_PASSWORD_REQUIRED` (202) — Password required but not provided
  - `DOC_PASSWORD_INCORRECT` (203) — Incorrect password
  - `DOC_SECURITY_UNSUPPORTED` (204) — Unsupported security handler

#### Example

```typescript
import { promises as fs } from 'fs';

const data = await fs.readFile('document.pdf');

// Open unprotected document
using document = await pdfium.openDocument(data);

// Open password-protected document
using document = await pdfium.openDocument(data, { password: 'secret' });
```

---

### createDocument()

Creates a new empty PDF document for building from scratch.

```typescript
createDocument(): PDFiumDocumentBuilder
```

#### Returns

[`PDFiumDocumentBuilder`](/pdfium/api/classes/pdfium-document-builder/) — A builder for creating PDF content.

#### Example

```typescript
using builder = pdfium.createDocument();

// Add a page
using page = builder.addPage({ width: 612, height: 792 }); // US Letter

// Add content to the page
const font = builder.loadStandardFont('Helvetica');
page.addText('Hello, World!', 72, 720, font, 24);
page.finalize();

// Save the document
const pdfBytes = builder.save();
await fs.writeFile('output.pdf', pdfBytes);
```

---

### createProgressiveLoader()

Creates a progressive loader for linearised (web-optimised) PDFs.

```typescript
createProgressiveLoader(data: Uint8Array | ArrayBuffer): ProgressivePDFLoader
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Uint8Array \| ArrayBuffer` | Initial PDF data chunk |

#### Returns

[`ProgressivePDFLoader`](/pdfium/api/classes/progressive-pdf-loader/) — A loader for streaming PDF data.

#### Example

```typescript
// Start with initial chunk
using loader = pdfium.createProgressiveLoader(initialChunk);

// Feed more data as it arrives
loader.feedData(chunk2);
loader.feedData(chunk3);

// Check if document is ready
if (loader.isComplete) {
  using document = loader.getDocument();
  // Use document...
}
```

## Properties

### module

The underlying WASM module instance.

```typescript
get module(): PDFiumWASM
```

:::caution
This is an advanced property for direct WASM access. Most users should use the high-level API methods instead.
:::

---

### limits

The configured resource limits.

```typescript
get limits(): Readonly<Required<PDFiumLimits>>
```

#### Example

```typescript
const limits = pdfium.limits;
console.log(`Max document size: ${limits.maxDocumentSize} bytes`);
console.log(`Max render dimension: ${limits.maxRenderDimension}px`);
console.log(`Max text chars: ${limits.maxTextCharCount}`);
```

---

### memory

The WASM memory manager for advanced memory operations.

```typescript
get memory(): WASMMemoryManager
```

:::caution
This is an advanced property. Most users should not need to access the memory manager directly.
:::

## Resource Management

`PDFium` implements the `Disposable` interface. Always use the `using` keyword or call `dispose()` to release resources:

```typescript
// Recommended: using keyword (automatic cleanup)
using pdfium = await PDFium.init();
// Resources freed when scope exits

// Alternative: manual disposal
const pdfium = await PDFium.init();
try {
  // Use pdfium...
} finally {
  pdfium.dispose();
}
```

### dispose()

Releases all resources held by the PDFium instance.

```typescript
dispose(): void
```

:::caution
After calling `dispose()`, the instance cannot be used. Any attempt to use a disposed instance will throw a `PDFiumError` with code `RESOURCE_DISPOSED` (900).
:::

## See Also

- [Installation Guide](/pdfium/installation/)
- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — Working with loaded documents
- [PDFiumDocumentBuilder](/pdfium/api/classes/pdfium-document-builder/) — Creating new documents
- [Resource Management](/pdfium/concepts/resource-management/) — Understanding disposal patterns
