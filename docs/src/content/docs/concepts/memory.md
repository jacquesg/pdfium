---
title: Memory Management
description: Understanding WASM memory in @scaryterry/pdfium
---

PDFium uses WebAssembly linear memory for PDF processing. Understanding memory management helps optimise performance and prevent issues.

## WASM Memory Model

### Linear Memory

WebAssembly uses a single contiguous memory buffer:

```
┌────────────────────────────────────────────────────────────┐
│                    WASM Linear Memory                       │
├───────────┬───────────┬───────────┬───────────────────────┤
│  Static   │   Stack   │   Heap    │   Growth Space         │
│   Data    │           │           │                        │
├───────────┼───────────┼───────────┼───────────────────────┤
│   ~1MB    │   ~1MB    │  Dynamic  │   Up to ~2GB           │
└───────────┴───────────┴───────────┴───────────────────────┘
```

- **Static data**: Compiled-in constants and initial data
- **Stack**: Function call frames, local variables
- **Heap**: Dynamic allocations (documents, bitmaps, etc.)
- **Growth space**: Memory can grow up to ~2GB

### Memory Growth

WASM memory grows in 64KB pages:

```typescript
// Initial memory: ~16MB (256 pages)
// Maximum memory: ~2GB (32768 pages)

// Each allocation may trigger growth
const largeDocument = await pdfium.openDocument(hugeData);
```

## Memory Usage by Operation

### Document Loading

| Document Size | Approximate Memory |
|---------------|-------------------|
| 1 MB PDF | 2-5 MB |
| 10 MB PDF | 10-30 MB |
| 100 MB PDF | 50-200 MB |

:::note
Memory usage depends on PDF complexity, not just file size. A 1MB PDF with many embedded fonts may use more memory than a 10MB PDF with simple content.
:::

### Page Rendering

Bitmap memory = width × height × 4 bytes (RGBA)

| Resolution | Scale | Memory per Page |
|------------|-------|-----------------|
| US Letter @ 72 DPI | 1 | ~1.9 MB |
| US Letter @ 144 DPI | 2 | ~7.7 MB |
| US Letter @ 216 DPI | 3 | ~17.3 MB |

```typescript
// Calculate bitmap size
function bitmapMemory(width: number, height: number): number {
  return width * height * 4; // RGBA = 4 bytes per pixel
}

// US Letter at scale 2
const width = 612 * 2;  // 1224
const height = 792 * 2; // 1584
const memory = bitmapMemory(width, height);
// ~7.7 MB per render
```

### Text Extraction

Text pages consume additional memory for:
- Character positions
- Unicode text buffer
- Search indices

Approximate: 100-500 bytes per character

## Resource Limits

### Default Limits

```typescript
const defaultLimits: PDFiumLimits = {
  maxDocumentSize: 512 * 1024 * 1024,   // 512 MB
  maxRenderDimension: 32_767,            // 32767 × 32767 max
  maxTextCharCount: 10_000_000,          // 10 million chars
};
```

### Custom Limits

```typescript
const pdfium = await PDFium.init({
  limits: {
    maxDocumentSize: 50 * 1024 * 1024,  // 50 MB
    maxRenderDimension: 8192,           // Lower for memory-constrained
    maxTextCharCount: 1_000_000,        // 1 million chars
  },
});
```

### Limit Violations

Exceeding limits throws specific errors:

```typescript
try {
  const result = page.render({ scale: 10 }); // Very large render
} catch (error) {
  if (error instanceof RenderError) {
    if (error.code === PDFiumErrorCode.RENDER_INVALID_DIMENSIONS) {
      console.error('Render dimensions exceed maxRenderDimension');
    }
  }
}
```

## Memory Management Best Practices

### 1. Dispose Resources Promptly

```typescript
// Process pages one at a time
for (const page of document.pages()) {
  using p = page;
  const result = p.render({ scale: 2 });
  await saveImage(result);
} // Each page released before next
```

### 2. Limit Concurrent Operations

```typescript
// BAD: All pages in memory at once
const pages = Array.from({ length: document.pageCount }, (_, i) =>
  document.getPage(i)
);

// GOOD: Process sequentially or with limited concurrency
const concurrency = 3;
const queue = new PQueue({ concurrency });

for (let i = 0; i < document.pageCount; i++) {
  queue.add(async () => {
    using page = document.getPage(i);
    await processPage(page);
  });
}
```

### 3. Use Appropriate Scale

```typescript
// For preview/thumbnail: scale 0.5-1
const thumbnail = page.render({ scale: 0.5 });

// For display: scale 1-2
const display = page.render({ scale: 2 });

// For print: scale 3-4
const print = page.render({ scale: 4 });
```

### 4. Close Documents When Done

```typescript
// Open, process, close pattern
async function processAllPages(data: Uint8Array) {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  for (const page of document.pages()) {
    using p = page;
    // Process...
  }
} // Document and library freed
```

## Monitoring Memory

### JavaScript Heap

```typescript
// Browser
if (performance.memory) {
  console.log('JS Heap:', performance.memory.usedJSHeapSize);
}

// Node.js
console.log('Heap:', process.memoryUsage().heapUsed);
```

### WASM Memory

```typescript
// Access WASM memory (if needed)
const wasmMemory = pdfium.module.HEAP8.buffer;
console.log('WASM memory:', wasmMemory.byteLength);
```

## Memory Issues

### Out of Memory

```typescript
try {
  using document = await pdfium.openDocument(hugeData);
} catch (error) {
  if (error instanceof MemoryError) {
    console.error('Memory allocation failed');
    // Consider processing smaller chunks
    // or increasing system resources
  }
}
```

### Memory Leaks

Common causes:
- Forgetting to dispose resources
- Storing references to pages after document close
- Not using `using` keyword

```typescript
// LEAK: Stored page reference
let storedPage: PDFiumPage;
{
  using document = await pdfium.openDocument(data);
  storedPage = document.getPage(0); // Don't store!
}
// storedPage now points to freed memory
```

### Prevention

```typescript
// Use using keyword
using page = document.getPage(0);

// Or explicit disposal in finally
const page = document.getPage(0);
try {
  // Use page...
} finally {
  page.dispose();
}
```

## Platform Considerations

### Browser

- WASM memory limited by browser (typically 2-4GB)
- Tab memory limits may apply
- Consider using Web Workers for large operations

### Node.js

- More memory available (system-dependent)
- Can set `--max-old-space-size` for V8 heap
- WASM memory separate from V8 heap

```bash
# Increase Node.js memory for large PDFs
node --max-old-space-size=4096 script.js
```

## See Also

- [Resource Management](/pdfium/concepts/resource-management/) — Disposal patterns
- [Architecture](/pdfium/concepts/architecture/) — System overview
- [Performance](/pdfium/concepts/performance/) — Optimisation tips
