---
title: ProgressivePDFLoader
description: Loader for linearised (web-optimised) PDFs with streaming support
---

The `ProgressivePDFLoader` class enables progressive loading of linearised PDFs. Linearised PDFs are optimised for web delivery, allowing the first page to be displayed before the entire file has downloaded.

## Import

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using loader = pdfium.createProgressiveLoader(initialChunk);
```

## What is Linearisation?

Linearised PDFs (also called "web-optimised" or "fast web view" PDFs) restructure the file so that:

1. The first page's resources appear at the beginning of the file
2. A hint table enables random access to other pages
3. Objects are ordered to minimise seeking during display

This enables:
- Displaying the first page before the full download completes
- Better perceived performance for large PDFs
- Efficient streaming over HTTP

## Static Methods

### fromBuffer()

Creates a progressive loader from an initial data buffer.

```typescript
static fromBuffer(
  data: Uint8Array,
  module: PDFiumWASM,
  memory: WASMMemoryManager,
  limits?: PDFiumLimits
): ProgressivePDFLoader
```

:::note
Most users should use `pdfium.createProgressiveLoader()` instead of this static method.
:::

## Properties

### isLinearised

Whether the PDF is linearised (web-optimised).

```typescript
get isLinearised(): boolean
```

#### Example

```typescript
if (loader.isLinearised) {
  console.log('PDF is optimised for progressive loading');
} else {
  console.log('PDF requires complete download');
}
```

---

### isComplete

Whether enough data has been received to fully load the document.

```typescript
get isComplete(): boolean
```

#### Example

```typescript
while (!loader.isComplete) {
  const chunk = await fetchNextChunk();
  loader.feedData(chunk);
}

using document = loader.getDocument();
```

## Methods

### feedData()

Adds more data to the loader. Call this as data chunks arrive from your download.

```typescript
feedData(newData: Uint8Array): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `newData` | `Uint8Array` | Additional PDF data |

#### Example

```typescript
const response = await fetch(pdfUrl);
const reader = response.body!.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  loader.feedData(value);

  // Check progress
  if (loader.isComplete) {
    console.log('Full document available');
    break;
  }
}
```

---

### getDocument()

Gets the document once sufficient data is available.

```typescript
getDocument(password?: string): PDFiumDocument
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | `string` | Optional password for encrypted PDFs |

#### Returns

[`PDFiumDocument`](/pdfium/api/classes/pdfium-document/) — The loaded document.

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) with code:
  - `DOC_FORMAT_INVALID` (201) — Invalid PDF data
  - `DOC_PASSWORD_REQUIRED` (202) — Password needed
  - `DOC_PASSWORD_INCORRECT` (203) — Wrong password

#### Example

```typescript
if (loader.isComplete) {
  using document = loader.getDocument();
  console.log(`Document has ${document.pageCount} pages`);
}

// For encrypted PDFs
using document = loader.getDocument('password123');
```

---

### checkProgress()

Returns a value indicating how much of the document is available.

```typescript
checkProgress(): number
```

#### Returns

`number` — Progress indicator:
- `-1` — Error occurred
- `0` — Data not yet available
- `1` — Data is available
- `2` — Linearisation status unknown

#### Example

```typescript
const progress = loader.checkProgress();
switch (progress) {
  case 1:
    console.log('Document ready');
    break;
  case 0:
    console.log('Need more data');
    break;
  case -1:
    console.log('Error loading document');
    break;
}
```

## Resource Management

`ProgressivePDFLoader` implements the `Disposable` interface:

```typescript
// Recommended: using keyword
using loader = pdfium.createProgressiveLoader(data);
// Loader disposed when scope exits

// Alternative: manual disposal
const loader = pdfium.createProgressiveLoader(data);
try {
  // Use loader...
} finally {
  loader.dispose();
}
```

### dispose()

Releases resources held by the loader.

```typescript
dispose(): void
```

## Complete Example

### Basic Progressive Loading

```typescript
import { PDFium } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function loadProgressively() {
  using pdfium = await PDFium.init();

  // Read file in chunks (simulating network download)
  const fileHandle = await fs.open('large-document.pdf', 'r');
  const stats = await fileHandle.stat();

  const chunkSize = 64 * 1024; // 64KB chunks
  let offset = 0;

  // Create loader with first chunk
  const firstChunk = Buffer.alloc(chunkSize);
  await fileHandle.read(firstChunk, 0, chunkSize, 0);
  offset += chunkSize;

  using loader = pdfium.createProgressiveLoader(firstChunk);

  console.log(`Linearised: ${loader.isLinearised}`);

  // Feed remaining chunks
  while (offset < stats.size && !loader.isComplete) {
    const chunk = Buffer.alloc(Math.min(chunkSize, stats.size - offset));
    await fileHandle.read(chunk, 0, chunk.length, offset);
    offset += chunk.length;

    loader.feedData(chunk);
    console.log(`Progress: ${Math.round((offset / stats.size) * 100)}%`);
  }

  await fileHandle.close();

  // Now work with the document
  using document = loader.getDocument();
  console.log(`Loaded ${document.pageCount} pages`);
}
```

### Fetch API Streaming

```typescript
async function streamPDFFromNetwork(url: string) {
  using pdfium = await PDFium.init();

  const response = await fetch(url);

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  let loader: ProgressivePDFLoader | undefined;

  try {
    // Read first chunk to create loader
    const { done, value } = await reader.read();
    if (done || !value) {
      throw new Error('Empty response');
    }

    loader = pdfium.createProgressiveLoader(value);

    // Continue reading
    while (!loader.isComplete) {
      const { done, value } = await reader.read();
      if (done) break;

      loader.feedData(value);
    }

    // Get document
    using document = loader.getDocument();
    return document.pageCount;
  } finally {
    reader.releaseLock();
    loader?.dispose();
  }
}
```

### Early First Page Render

```typescript
async function renderFirstPageEarly(url: string) {
  using pdfium = await PDFium.init();

  const response = await fetch(url);
  const reader = response.body!.getReader();

  let chunks: Uint8Array[] = [];
  let loader: ProgressivePDFLoader | undefined;
  let firstPageRendered = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    const allData = concatArrays(chunks);

    if (!loader) {
      loader = pdfium.createProgressiveLoader(allData);
    } else {
      loader.feedData(value);
    }

    // Try to render first page as soon as possible
    if (!firstPageRendered && loader.isLinearised && loader.checkProgress() === 1) {
      try {
        using document = loader.getDocument();
        using page = document.getPage(0);
        const result = page.render({ scale: 1 });
        console.log('First page rendered early!');
        firstPageRendered = true;
      } catch {
        // Not enough data yet
      }
    }
  }

  loader?.dispose();
}

function concatArrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
```

## Comparison: Progressive vs Standard Loading

| Feature | Standard Loading | Progressive Loading |
|---------|------------------|---------------------|
| Memory | Needs full file in memory | Can process chunks |
| First page | After full download | After first chunk (linearised) |
| Non-linearised PDFs | Works fine | Falls back to standard |
| Network efficiency | Download then process | Process while downloading |
| Complexity | Simple | More complex |

## When to Use Progressive Loading

**Use progressive loading when:**
- Loading large PDFs over the network
- User experience benefits from early first-page display
- Working with linearised PDFs

**Use standard loading when:**
- PDFs are already in memory
- PDFs are small
- Files are definitely not linearised
- Simplicity is preferred

## See Also

- [PDFium](/pdfium/api/classes/pdfium/) — Creating progressive loaders
- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — Working with loaded documents
- [Progressive Loading Guide](/pdfium/guides/progressive-loading/) — Detailed usage patterns
- [DocumentAvailability Enum](/pdfium/api/enums/document-availability/) — Availability states
- [LinearisationStatus Enum](/pdfium/api/enums/linearisation-status/) — Linearisation detection
