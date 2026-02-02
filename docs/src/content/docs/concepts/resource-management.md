---
title: Resource Management
description: Understanding resource lifecycle and disposal patterns in @scaryterry/pdfium
---

The `@scaryterry/pdfium` library uses native WASM resources that must be explicitly released. This guide explains the resource management patterns and best practices.

## Why Resource Management Matters

PDFium allocates resources in WASM memory (outside JavaScript's garbage collector):

- **Document handles** — Loaded PDF file data
- **Page handles** — Rendered page content
- **Bitmap handles** — Pixel buffers for rendering
- **Text page handles** — Text extraction state
- **Search handles** — Text search context

If these resources aren't released, they accumulate and eventually exhaust available memory.

## The `using` Keyword (Recommended)

ES2024 introduced explicit resource management with the `using` keyword. This is the recommended approach:

```typescript
import { PDFium } from '@scaryterry/pdfium';

async function processDocument(data: Uint8Array) {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);
  using page = document.getPage(0);

  const text = page.getText();
  return text;
} // All resources automatically disposed here
```

### How `using` Works

The `using` keyword:

1. Stores the value in a variable
2. Calls `[Symbol.dispose]()` when the variable goes out of scope
3. Works with `try`/`finally` semantics (disposal happens even if errors occur)

```typescript
// This:
{
  using page = document.getPage(0);
  // use page...
}

// Is equivalent to:
{
  const page = document.getPage(0);
  try {
    // use page...
  } finally {
    page[Symbol.dispose]();
  }
}
```

### TypeScript Configuration

To use `using`, configure TypeScript:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

Or with newer targets:

```json
{
  "compilerOptions": {
    "target": "ES2024"
  }
}
```

## Manual Disposal

If you can't use the `using` keyword, call `dispose()` explicitly:

```typescript
const pdfium = await PDFium.init();
const document = await pdfium.openDocument(data);
const page = document.getPage(0);

try {
  const text = page.getText();
  return text;
} finally {
  page.dispose();
  document.dispose();
  pdfium.dispose();
}
```

### Disposal Order

Resources must be disposed in reverse order of creation:

```typescript
// Creation order: pdfium → document → page
const pdfium = await PDFium.init();
const document = await pdfium.openDocument(data);
const page = document.getPage(0);

// Disposal order: page → document → pdfium
page.dispose();
document.dispose();
pdfium.dispose();
```

:::caution
Disposing a parent (e.g., document) before its children (e.g., pages) may cause errors or memory leaks.
:::

## Disposable Classes

The following classes implement `Disposable`:

| Class | Synchronous | Notes |
|-------|-------------|-------|
| `PDFium` | ✓ | Main library instance |
| `PDFiumDocument` | ✓ | Loaded PDF document |
| `PDFiumPage` | ✓ | Single page |
| `PDFiumDocumentBuilder` | ✓ | Document creation builder |
| `PDFiumPageBuilder` | ✓ | Page content builder |
| `ProgressivePDFLoader` | ✓ | Progressive loading |
| `WorkerProxy` | Async | Uses `await using` |

## Async Disposal

`WorkerProxy` requires async disposal:

```typescript
// With await using (recommended)
await using proxy = await WorkerProxy.create(workerUrl, wasmBinary);
// Disposed asynchronously when scope exits

// Manual async disposal
const proxy = await WorkerProxy.create(workerUrl, wasmBinary);
try {
  // use proxy...
} finally {
  await proxy.dispose();
}
```

## Loop Patterns

When processing multiple pages, dispose each before moving to the next:

### Generator Pattern

```typescript
for (const page of document.pages()) {
  using p = page;
  console.log(p.getText());
} // Each page disposed after its iteration
```

### Index Pattern

```typescript
for (let i = 0; i < document.pageCount; i++) {
  using page = document.getPage(i);
  console.log(page.getText());
} // Page disposed after each iteration
```

### Collecting Results

```typescript
const results: string[] = [];

for (const page of document.pages()) {
  using p = page;
  results.push(p.getText());
} // Pages disposed, but results array persists

return results;
```

## Nested Scopes

Use block scopes to control disposal timing:

```typescript
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(data);

// First page processing
{
  using page = document.getPage(0);
  const result1 = page.render({ scale: 2 });
  await saveImage(result1, 'page1.png');
} // page1 disposed here

// Second page processing
{
  using page = document.getPage(1);
  const result2 = page.render({ scale: 2 });
  await saveImage(result2, 'page2.png');
} // page2 disposed here
```

## Common Patterns

### Process and Return

```typescript
async function extractFirstPageText(pdfData: Uint8Array): Promise<string> {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(pdfData);
  using page = document.getPage(0);

  return page.getText(); // Resources disposed after return
}
```

### Conditional Processing

```typescript
async function renderIfSmall(data: Uint8Array): Promise<Uint8Array | null> {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  if (document.pageCount > 100) {
    return null; // Resources still disposed
  }

  using page = document.getPage(0);
  return page.render({ scale: 2 }).data;
}
```

### Error Handling

```typescript
async function safeExtract(data: Uint8Array): Promise<string | null> {
  try {
    using pdfium = await PDFium.init();
    using document = await pdfium.openDocument(data);
    using page = document.getPage(0);

    return page.getText();
  } catch (error) {
    console.error('Extraction failed:', error);
    return null;
  }
  // Resources disposed even on error
}
```

### Builder Pattern

```typescript
async function createPDF(): Promise<Uint8Array> {
  using pdfium = await PDFium.init();
  using builder = pdfium.createDocument();

  const font = builder.loadStandardFont('Helvetica');

  {
    using page = builder.addPage();
    page.addText('Hello', 72, 720, font, 24);
    page.finalize();
  } // Page builder disposed

  return builder.save(); // Document builder disposed after save
}
```

## Anti-Patterns

### Forgetting to Dispose

```typescript
// BAD: Resources leak
async function leaky(data: Uint8Array) {
  const pdfium = await PDFium.init();
  const document = await pdfium.openDocument(data);
  const page = document.getPage(0);

  return page.getText();
  // No disposal!
}

// GOOD: Use using
async function proper(data: Uint8Array) {
  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);
  using page = document.getPage(0);

  return page.getText();
}
```

### Storing References

```typescript
// BAD: Stored reference becomes invalid
let storedPage: PDFiumPage;

{
  using document = await pdfium.openDocument(data);
  storedPage = document.getPage(0); // Don't store!
}
// storedPage is now invalid (document disposed)

// GOOD: Process within scope
{
  using document = await pdfium.openDocument(data);
  using page = document.getPage(0);
  const text = page.getText(); // Extract data, not reference
}
```

### Early Returns Without Disposal

```typescript
// BAD: Early return leaks resources
function processPage(document: PDFiumDocument, index: number) {
  const page = document.getPage(index);

  if (page.width === 0) {
    return null; // page not disposed!
  }

  const text = page.getText();
  page.dispose();
  return text;
}

// GOOD: using handles all paths
function processPage(document: PDFiumDocument, index: number) {
  using page = document.getPage(index);

  if (page.width === 0) {
    return null; // page still disposed
  }

  return page.getText();
}
```

## Checking Disposal Status

All disposable classes have a `disposed` property:

```typescript
const page = document.getPage(0);
console.log(page.disposed); // false

page.dispose();
console.log(page.disposed); // true

// Using disposed resource throws
page.getText(); // Throws RESOURCE_DISPOSED error
```

## FinalizationRegistry (Backup)

The library uses `FinalizationRegistry` as a safety net:

- If you forget to dispose, the garbage collector will eventually release resources
- This is NOT reliable for memory-constrained environments
- Always use explicit disposal via `using` or `dispose()`

```typescript
// The library registers cleanup:
const registry = new FinalizationRegistry((handle) => {
  // Release WASM resource
});
```

:::caution
Don't rely on FinalizationRegistry. It may not run promptly, or at all in some cases. Always use `using` or explicit `dispose()`.
:::

## Summary

| Approach | Pros | Cons |
|----------|------|------|
| `using` keyword | Automatic, clean syntax, error-safe | Requires ES2024/TypeScript config |
| Manual `dispose()` | Works everywhere | Verbose, easy to forget, error-prone |
| FinalizationRegistry | Automatic backup | Unreliable timing, not guaranteed |

**Recommendation**: Use the `using` keyword whenever possible.

## See Also

- [Architecture](/pdfium/concepts/architecture/) — How the library works
- [Memory Management](/pdfium/concepts/memory/) — WASM memory details
- [Error Handling](/pdfium/concepts/error-handling/) — Error patterns
