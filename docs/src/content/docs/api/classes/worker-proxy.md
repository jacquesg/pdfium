---
title: WorkerProxy
description: Off-main-thread PDF processing using Web Workers
---

The `WorkerProxy` class enables processing PDFs in a Web Worker, keeping the main thread responsive. This is particularly useful for browser applications rendering large PDFs or processing multiple documents.

## Import

```typescript
import { WorkerProxy } from '@scaryterry/pdfium';
```

## When to Use Workers

**Use WorkerProxy when:**
- Rendering takes more than 16ms (one frame at 60fps)
- Processing multiple PDFs concurrently
- User interface responsiveness is critical
- Working with large documents

**Use the main thread when:**
- Processing is fast (small documents, low resolution)
- Server-side (Node.js) — use standard `PDFium` class
- Simplicity is preferred

## Static Methods

### create()

Creates a new WorkerProxy instance.

```typescript
static async create(
  workerUrl: string | URL,
  wasmBinary: ArrayBuffer,
  options?: WorkerProxyOptions
): Promise<WorkerProxy>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workerUrl` | `string \| URL` | URL to the worker script |
| `wasmBinary` | `ArrayBuffer` | PDFium WASM binary |
| `options` | `WorkerProxyOptions` | Optional settings |

#### WorkerProxyOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `timeout` | `number` | `30000` | Operation timeout in milliseconds |

#### Returns

`Promise<WorkerProxy>` — A ready-to-use worker proxy.

#### Throws

- [`WorkerError`](/pdfium/errors/#workererror) with code:
  - `WORKER_CREATE_FAILED` (800) — Failed to create worker
  - `WORKER_TIMEOUT` (802) — Initialisation timed out

#### Example

```typescript
// Load WASM binary
const wasmResponse = await fetch('/pdfium.wasm');
const wasmBinary = await wasmResponse.arrayBuffer();

// Create worker
using proxy = await WorkerProxy.create('/pdfium-worker.js', wasmBinary, {
  timeout: 60000, // 60 second timeout
});
```

## Instance Methods

### openDocument()

Opens a PDF document in the worker.

```typescript
async openDocument(
  data: Uint8Array | ArrayBuffer,
  options?: { password?: string }
): Promise<PDFiumDocument>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Uint8Array \| ArrayBuffer` | PDF file contents |
| `options` | `object` | Optional settings |
| `options.password` | `string` | Password for encrypted PDFs |

#### Returns

`Promise<PDFiumDocument>` — Proxy document object.

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) — Standard document errors
- [`WorkerError`](/pdfium/errors/#workererror) with code:
  - `WORKER_COMMUNICATION_FAILED` (801) — Communication failed
  - `WORKER_TIMEOUT` (802) — Operation timed out

#### Example

```typescript
const data = await fetch('/document.pdf').then(r => r.arrayBuffer());
using document = await proxy.openDocument(data);
console.log(`Pages: ${document.pageCount}`);
```

---

### renderPage()

Renders a specific page from a document.

```typescript
async renderPage(
  documentId: string,
  pageIndex: number,
  options?: RenderOptions,
  onProgress?: ProgressCallback
): Promise<RenderPageResponse>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `documentId` | `string` | Document identifier |
| `pageIndex` | `number` | Zero-based page index |
| `options` | `RenderOptions` | Render settings |
| `onProgress` | `ProgressCallback` | Progress callback |

#### RenderPageResponse

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Uint8Array` | RGBA pixel data |
| `width` | `number` | Width in pixels |
| `height` | `number` | Height in pixels |

#### Example

```typescript
const response = await proxy.renderPage(
  document.id,
  0,
  { scale: 2 },
  (progress) => console.log(`Rendering: ${progress}%`)
);

// Use with canvas
const canvas = document.createElement('canvas');
canvas.width = response.width;
canvas.height = response.height;
const ctx = canvas.getContext('2d')!;
const imageData = new ImageData(
  new Uint8ClampedArray(response.data),
  response.width,
  response.height
);
ctx.putImageData(imageData, 0, 0);
```

---

### getPageSize()

Gets the dimensions of a page without rendering.

```typescript
async getPageSize(
  documentId: string,
  pageIndex: number
): Promise<PageSizeResponse>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `documentId` | `string` | Document identifier |
| `pageIndex` | `number` | Zero-based page index |

#### PageSizeResponse

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Width in points |
| `height` | `number` | Height in points |

#### Example

```typescript
const size = await proxy.getPageSize(document.id, 0);
console.log(`Page size: ${size.width} x ${size.height} points`);
```

---

### getText()

Extracts text from a page.

```typescript
async getText(
  documentId: string,
  pageIndex: number
): Promise<string>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `documentId` | `string` | Document identifier |
| `pageIndex` | `number` | Zero-based page index |

#### Returns

`Promise<string>` — Extracted text content.

#### Example

```typescript
const text = await proxy.getText(document.id, 0);
console.log(text);
```

## Resource Management

`WorkerProxy` implements the `AsyncDisposable` interface:

```typescript
// Recommended: using keyword (requires ES2024 or TypeScript 5.2+)
await using proxy = await WorkerProxy.create(workerUrl, wasmBinary);
// Worker terminated when scope exits

// Alternative: manual disposal
const proxy = await WorkerProxy.create(workerUrl, wasmBinary);
try {
  // Use proxy...
} finally {
  await proxy.dispose();
}
```

### dispose()

Terminates the worker and releases all resources.

```typescript
async dispose(): Promise<void>
```

:::caution
After calling `dispose()`:
- All documents become invalid
- Pending operations may fail
- The worker is terminated
:::

## Worker Script Setup

You need to create a worker script that initialises PDFium:

```typescript
// pdfium-worker.js
import { PDFium } from '@scaryterry/pdfium';

let pdfium: PDFium;

self.onmessage = async (event) => {
  const { type, payload, id } = event.data;

  try {
    switch (type) {
      case 'init': {
        pdfium = await PDFium.init({ wasmBinary: payload.wasmBinary });
        self.postMessage({ id, type: 'init', success: true });
        break;
      }
      case 'openDocument': {
        const doc = await pdfium.openDocument(payload.data, payload.options);
        // Handle document...
        break;
      }
      // ... other message types
    }
  } catch (error) {
    self.postMessage({ id, type, error: serializeError(error) });
  }
};
```

## Complete Browser Example

```typescript
import { WorkerProxy } from '@scaryterry/pdfium';

async function renderPDFInWorker() {
  // Load WASM
  const wasmResponse = await fetch('/pdfium.wasm');
  const wasmBinary = await wasmResponse.arrayBuffer();

  // Create worker
  await using proxy = await WorkerProxy.create('/pdfium-worker.js', wasmBinary);

  // Load document
  const pdfResponse = await fetch('/document.pdf');
  const pdfData = await pdfResponse.arrayBuffer();
  using document = await proxy.openDocument(pdfData);

  // Render first page
  const result = await proxy.renderPage(document.id, 0, { scale: 2 });

  // Display in canvas
  const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
  canvas.width = result.width;
  canvas.height = result.height;

  const ctx = canvas.getContext('2d')!;
  const imageData = new ImageData(
    new Uint8ClampedArray(result.data),
    result.width,
    result.height
  );
  ctx.putImageData(imageData, 0, 0);

  console.log('Rendered PDF page');
}
```

## Multiple Documents Concurrently

```typescript
async function processMultiplePDFs(urls: string[]) {
  const wasmBinary = await fetch('/pdfium.wasm').then(r => r.arrayBuffer());
  await using proxy = await WorkerProxy.create('/pdfium-worker.js', wasmBinary);

  // Process all documents concurrently
  const results = await Promise.all(
    urls.map(async (url) => {
      const data = await fetch(url).then(r => r.arrayBuffer());
      using document = await proxy.openDocument(data);

      const texts: string[] = [];
      for (let i = 0; i < document.pageCount; i++) {
        const text = await proxy.getText(document.id, i);
        texts.push(text);
      }

      return { url, pageCount: document.pageCount, texts };
    })
  );

  return results;
}
```

## Error Handling

```typescript
import { WorkerError, PDFiumErrorCode } from '@scaryterry/pdfium';

try {
  await using proxy = await WorkerProxy.create(workerUrl, wasmBinary, {
    timeout: 10000,
  });

  using document = await proxy.openDocument(pdfData);
  const result = await proxy.renderPage(document.id, 0, { scale: 3 });
} catch (error) {
  if (error instanceof WorkerError) {
    switch (error.code) {
      case PDFiumErrorCode.WORKER_TIMEOUT:
        console.error('Operation timed out');
        break;
      case PDFiumErrorCode.WORKER_CREATE_FAILED:
        console.error('Failed to create worker');
        break;
      case PDFiumErrorCode.WORKER_COMMUNICATION_FAILED:
        console.error('Worker communication failed');
        break;
    }
  }
  throw error;
}
```

## Performance Considerations

### Message Passing Overhead

Worker communication involves serialisation and transfer. For optimal performance:

- Use `ArrayBuffer` with transferable objects when possible
- Batch operations to reduce message count
- Consider rendering at lower scale for previews

### Memory

Each worker has its own memory space:

- WASM memory is not shared between workers
- Large documents consume memory in the worker
- Dispose documents when no longer needed

### Number of Workers

Consider using multiple workers for parallel processing:

```typescript
const workerCount = navigator.hardwareConcurrency || 4;
const workers = await Promise.all(
  Array.from({ length: workerCount }, () =>
    WorkerProxy.create(workerUrl, wasmBinary)
  )
);
```

## See Also

- [PDFium](/pdfium/api/classes/pdfium/) — Main thread API
- [Worker Mode Guide](/pdfium/guides/worker-mode/) — Detailed setup guide
- [Browser Examples](/pdfium/examples/browser/) — React and vanilla JS examples
- [Performance Concepts](/pdfium/concepts/performance/) — Optimisation strategies
