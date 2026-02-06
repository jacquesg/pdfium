---
title: Document Lifecycle
description: Understanding the lifecycle of PDF documents
---

This guide explains the lifecycle of documents, pages, and related resources in the library.

## Lifecycle Overview

```
PDFium.init()
    │
    ├── openDocument()
    │       │
    │       ├── getPage() / pages()
    │       │       │
    │       │       ├── render()
    │       │       ├── getText()
    │       │       ├── findText()
    │       │       ├── getObjects() / objects()
    │       │       └── getAnnotations()
    │       │       │
    │       │       └── page.dispose()
    │       │
    │       ├── getBookmarks()
    │       ├── getAttachments()
    │       └── save()
    │       │
    │       └── document.dispose()
    │
    ├── createDocument()
    │       │
    │       ├── addPage()
    │       │       │
    │       │       ├── addText()
    │       │       ├── addRect()
    │       │       └── finalize()
    │       │       │
    │       │       └── pageBuilder.dispose()
    │       │
    │       └── save()
    │       │
    │       └── builder.dispose()
    │
    └── pdfium.dispose()
```

## States

### PDFium Instance

| State | Description |
|-------|-------------|
| Uninitialised | Before `PDFium.init()` |
| Ready | After `init()`, before `dispose()` |
| Disposed | After `dispose()` |

### Document

| State | Description |
|-------|-------------|
| Loading | During `openDocument()` |
| Open | Successfully loaded |
| Disposed | After `dispose()` |

### Page

| State | Description |
|-------|-------------|
| Loading | During `getPage()` |
| Open | Successfully loaded |
| Disposed | After `dispose()` |

## Ownership Rules

### Parent-Child Relationships

```
PDFium (owns)
  └── PDFiumDocument (owns)
        └── PDFiumPage
```

**Rules:**
- Parent must outlive children
- Disposing parent may invalidate children
- Always dispose children before parents

```typescript
// CORRECT: Dispose in reverse order
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(data);
using page = document.getPage(0);
// Use page...
// page disposed
// document disposed
// pdfium disposed

// INCORRECT: Parent disposed first
const pdfium = await PDFium.init();
const document = await pdfium.openDocument(data);
pdfium.dispose(); // BAD: document still open
document.dispose(); // May crash or leak
```

### Reference Invalidation

When a document is disposed, all its pages become invalid:

```typescript
using document = await pdfium.openDocument(data);
const page = document.getPage(0); // Don't store!

document.dispose();

page.getText(); // ERROR: Document is closed
```

## Using Keyword Flow

The `using` keyword ensures proper cleanup:

```typescript
async function processDocument(data: Uint8Array) {
  using pdfium = await PDFium.init();
  // pdfium is ready

  using document = await pdfium.openDocument(data);
  // document is open

  using page = document.getPage(0);
  // page is open

  const text = page.getText();
  return text;

  // At this point (end of function):
  // 1. page is disposed
  // 2. document is disposed
  // 3. pdfium is disposed
}
```

### Nested Scopes

Use block scopes for fine-grained control:

```typescript
using pdfium = await PDFium.init();
using document = await pdfium.openDocument(data);

// Process pages in sequence
for (let i = 0; i < document.pageCount; i++) {
  using page = document.getPage(i);
  await processPage(page);
  // page disposed at end of each iteration
}

// Or with explicit blocks
{
  using page = document.getPage(0);
  // Use page...
} // page disposed here

{
  using page = document.getPage(1);
  // Use page...
} // page disposed here
```

## Generator Pattern

The `pages()` generator yields pages that must be managed:

```typescript
// CORRECT: using inside loop
for (const page of document.pages()) {
  using p = page; // Assign to using variable
  console.log(p.getText());
} // Each page disposed after its iteration

// INCORRECT: Storing generator results
const allPages = [...document.pages()]; // Don't do this!
// Pages won't be properly disposed
```

## Builder Lifecycle

### Document Builder

```typescript
using builder = pdfium.createDocument();

// Add pages
{
  using page = builder.addPage();
  page.addText('Hello', 72, 720, font, 24);
  page.finalize(); // REQUIRED before dispose
} // page builder disposed

// Save document
const bytes = builder.save();
// builder disposed when scope ends
```

### Page Builder Rules

1. Must call `finalize()` before scope ends
2. Cannot modify after `finalize()`
3. Disposed when block scope ends

```typescript
{
  using page = builder.addPage();
  page.addText('Title', 72, 720, font, 24);
  // page.finalize(); // MISSING - page will be incomplete!
}

// Better pattern
{
  using page = builder.addPage();
  try {
    page.addText('Title', 72, 720, font, 24);
    page.addRect(72, 700, 200, 50, style);
  } finally {
    page.finalize(); // Always called
  }
}
```

## Document Events

`PDFiumDocument` exposes an `events` emitter for lifecycle hooks:

```typescript
using document = await pdfium.openDocument(data);

document.events.on('pageLoaded', ({ pageIndex }) => {
  console.log(`Page ${pageIndex} loaded`);
});

document.events.on('willSave', () => {
  console.log('Document is about to be saved');
});
```

### Available Events

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `pageLoaded` | `{ pageIndex: number }` | A page is loaded via `getPage()` or `pages()` |
| `willSave` | `undefined` | Immediately before `save()` writes the document |

:::note
Event listeners are **not** automatically removed when the document is disposed. If you subscribe from a long-lived object, remove the listener manually to avoid retaining references to the disposed document.
:::

## Error Handling and Cleanup

Resources are cleaned up even when errors occur:

```typescript
async function safeProcess(data: Uint8Array) {
  using pdfium = await PDFium.init();

  try {
    using document = await pdfium.openDocument(data);
    using page = document.getPage(999); // May throw

    return page.getText();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
  // All resources disposed even on error
}
```

## Anti-Patterns

### Storing References

```typescript
// BAD: Stored reference becomes invalid
class PDFViewer {
  private page?: PDFiumPage;

  async loadPage(document: PDFiumDocument, index: number) {
    this.page = document.getPage(index); // Don't store!
  }
}

// GOOD: Process immediately
class PDFViewer {
  async renderPage(document: PDFiumDocument, index: number) {
    using page = document.getPage(index);
    return page.render({ scale: 2 });
    // page disposed, result data persists
  }
}
```

### Returning Undisposed Resources

```typescript
// BAD: Caller must remember to dispose
function getFirstPage(document: PDFiumDocument) {
  return document.getPage(0); // Who disposes this?
}

// GOOD: Return processed data
function getFirstPageText(document: PDFiumDocument): string {
  using page = document.getPage(0);
  return page.getText();
}

// OK: Document return (caller owns it)
async function openDocument(data: Uint8Array): Promise<PDFiumDocument> {
  using pdfium = await PDFium.init();
  return await pdfium.openDocument(data);
  // Note: pdfium disposed but document returned
  // This requires careful handling
}
```

## Best Practices

1. **Use `using` keyword** for all disposable resources
2. **Process, don't store** pages and temporary resources
3. **Dispose in reverse order** of creation
4. **Keep scopes tight** for memory efficiency
5. **Always call `finalize()`** on page builders

## See Also

- [Resource Management](/pdfium/concepts/resource-management/) — Disposal patterns
- [Error Handling](/pdfium/concepts/error-handling/) — Error recovery
- [Memory Management](/pdfium/concepts/memory/) — Memory considerations
