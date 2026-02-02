---
title: Performance
description: Optimising performance when working with PDFs
---

This guide covers performance considerations and optimisation strategies for PDF processing.

## Backend Performance

### Native vs WASM

In Node.js, the native backend provides faster performance:

| Operation | WASM | Native | Improvement |
|-----------|------|--------|-------------|
| Document load | 2.5ms | 1.8ms | ~1.4x |
| Page render (1x) | 15ms | 12ms | ~1.25x |
| Text extraction | 0.8ms | 0.5ms | ~1.6x |
| Character operations | 0.3ms | 0.15ms | ~2x |

```typescript
// Use native backend for better performance
const pdfium = await PDFium.init({ useNative: true });
```

### Choosing a Backend

| Scenario | Recommendation |
|----------|---------------|
| Browser app | WASM only |
| Node.js, high throughput | Native |
| Node.js, need forms/creation | WASM |
| Cross-platform scripts | WASM (portable) |

See [Native vs WASM Backends](/pdfium/concepts/backends/) for details.

## Rendering Performance

### Scale Factor Impact

Higher scale = more pixels = more time and memory:

| Scale | Pixels (US Letter) | Relative Time |
|-------|-------------------|---------------|
| 0.5 | 306 × 396 | 0.25x |
| 1 | 612 × 792 | 1x |
| 2 | 1224 × 1584 | 4x |
| 3 | 1836 × 2376 | 9x |

```typescript
// Use appropriate scale for use case
const thumbnail = page.render({ scale: 0.3 }); // Quick preview
const display = page.render({ scale: 1.5 });   // Screen display
const print = page.render({ scale: 3 });       // High quality
```

### Use Specific Dimensions

When you need exact dimensions, use `width`/`height` instead of `scale`:

```typescript
// Instead of calculating scale...
const scale = targetWidth / page.width;
const result = page.render({ scale });

// Use direct dimensions
const result = page.render({ width: 800, height: 1000 });
```

## Document Processing

### Process Pages Sequentially

Don't load all pages at once:

```typescript
// BAD: All pages in memory
const pages = [];
for (let i = 0; i < document.pageCount; i++) {
  pages.push(document.getPage(i));
}

// GOOD: Process one at a time
for (const page of document.pages()) {
  using p = page;
  await processPage(p);
}
```

### Reuse PDFium Instance

```typescript
// BAD: New instance per document
for (const file of files) {
  using pdfium = await PDFium.init();
  using doc = await pdfium.openDocument(file);
  // ...
}

// GOOD: Reuse instance
using pdfium = await PDFium.init();
for (const file of files) {
  using doc = await pdfium.openDocument(file);
  // ...
}
```

## Batch Processing

### Limit Concurrency

```typescript
async function processBatch(
  pdfium: PDFium,
  files: Uint8Array[],
  concurrency = 4
) {
  const results: string[][] = [];
  const queue = [...files];

  async function processNext(): Promise<void> {
    const data = queue.shift();
    if (!data) return;

    using document = await pdfium.openDocument(data);
    const texts: string[] = [];

    for (const page of document.pages()) {
      using p = page;
      texts.push(p.getText());
    }

    results.push(texts);
    await processNext();
  }

  // Start concurrent workers
  await Promise.all(
    Array.from({ length: concurrency }, processNext)
  );

  return results;
}
```

### Progress Reporting

```typescript
interface Progress {
  current: number;
  total: number;
  percentage: number;
}

async function processWithProgress(
  documents: Uint8Array[],
  onProgress: (progress: Progress) => void
) {
  using pdfium = await PDFium.init();
  const total = documents.length;

  for (let i = 0; i < total; i++) {
    using document = await pdfium.openDocument(documents[i]);
    // Process...

    onProgress({
      current: i + 1,
      total,
      percentage: Math.round(((i + 1) / total) * 100),
    });
  }
}
```

## Text Extraction

### Cache Text Results

```typescript
class PDFTextCache {
  private cache = new Map<string, string>();

  getText(page: PDFiumPage, cacheKey: string): string {
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const text = page.getText();
    this.cache.set(cacheKey, text);
    return text;
  }

  clear() {
    this.cache.clear();
  }
}
```

### Limit Text Extraction

Use `maxTextCharCount` for very large documents:

```typescript
const pdfium = await PDFium.init({
  limits: {
    maxTextCharCount: 100_000, // Stop after 100K chars
  },
});
```

## Search Optimisation

### Early Exit

```typescript
// Find first occurrence only
function findFirst(document: PDFiumDocument, query: string) {
  for (const page of document.pages()) {
    using p = page;

    for (const result of p.findText(query)) {
      return { pageIndex: p.index, result };
    }
  }
  return null;
}
```

### Limit Results

```typescript
function findLimited(
  document: PDFiumDocument,
  query: string,
  maxResults = 100
) {
  const results: { pageIndex: number; charIndex: number }[] = [];

  for (const page of document.pages()) {
    using p = page;

    for (const result of p.findText(query)) {
      results.push({
        pageIndex: p.index,
        charIndex: result.charIndex,
      });

      if (results.length >= maxResults) {
        return results;
      }
    }
  }

  return results;
}
```

## Browser Performance

### Use Web Workers

Move PDF processing off the main thread:

```typescript
// Main thread stays responsive
await using proxy = await WorkerProxy.create(workerUrl, wasmBinary);
const result = await proxy.renderPage(docId, 0, { scale: 2 });
```

### Progressive Rendering

Render visible pages first:

```typescript
async function renderVisiblePages(
  document: PDFiumDocument,
  visibleIndices: number[],
  allIndices: number[]
) {
  // Render visible pages first
  for (const i of visibleIndices) {
    using page = document.getPage(i);
    const result = page.render({ scale: 2 });
    displayPage(i, result);
  }

  // Then render remaining
  for (const i of allIndices) {
    if (!visibleIndices.includes(i)) {
      using page = document.getPage(i);
      const result = page.render({ scale: 2 });
      cachePage(i, result);
    }
  }
}
```

### Lazy Loading

```typescript
class LazyPageRenderer {
  private rendered = new Map<number, RenderResult>();

  constructor(
    private document: PDFiumDocument,
    private scale: number
  ) {}

  async getPage(index: number): Promise<RenderResult> {
    if (this.rendered.has(index)) {
      return this.rendered.get(index)!;
    }

    using page = this.document.getPage(index);
    const result = page.render({ scale: this.scale });
    this.rendered.set(index, result);
    return result;
  }

  evict(index: number) {
    this.rendered.delete(index);
  }

  evictOldest(keepCount: number) {
    const indices = [...this.rendered.keys()];
    while (this.rendered.size > keepCount) {
      const oldest = indices.shift()!;
      this.rendered.delete(oldest);
    }
  }
}
```

## Memory vs Speed Trade-offs

### Low Memory Mode

```typescript
// Process and discard immediately
async function lowMemoryProcess(document: PDFiumDocument) {
  const results: string[] = [];

  for (const page of document.pages()) {
    using p = page;
    results.push(p.getText());
    // Page memory freed after each iteration
  }

  return results;
}
```

### High Speed Mode (More Memory)

```typescript
// Pre-load for faster access
async function highSpeedProcess(document: PDFiumDocument) {
  const pages: PDFiumPage[] = [];

  // Load all pages first
  for (let i = 0; i < document.pageCount; i++) {
    pages.push(document.getPage(i));
  }

  try {
    // Fast random access
    const results = await Promise.all(
      pages.map(async (page, i) => ({
        index: i,
        text: page.getText(),
      }))
    );
    return results;
  } finally {
    // Cleanup all
    for (const page of pages) {
      page.dispose();
    }
  }
}
```

## Profiling

### Measure Operations

```typescript
function measureOperation<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}

const text = measureOperation('getText', () => page.getText());
const result = measureOperation('render', () => page.render({ scale: 2 }));
```

### Memory Tracking

```typescript
function logMemory(label: string) {
  if (typeof process !== 'undefined') {
    const usage = process.memoryUsage();
    console.log(`${label}: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
}

logMemory('Before load');
using document = await pdfium.openDocument(data);
logMemory('After load');
```

## Summary

| Scenario | Recommendation |
|----------|---------------|
| Thumbnails | Scale 0.3-0.5 |
| Screen display | Scale 1-2 |
| Print quality | Scale 3-4 |
| Many documents | Reuse PDFium instance |
| Large documents | Process pages sequentially |
| Browser UI | Use Web Workers |
| Memory constrained | Lower limits, sequential processing |

## See Also

- [Native vs WASM Backends](/pdfium/concepts/backends/) — Backend comparison
- [Memory Management](/pdfium/concepts/memory/) — Memory details
- [Worker Mode](/pdfium/guides/worker-mode/) — Browser workers
- [Architecture](/pdfium/concepts/architecture/) — System overview
