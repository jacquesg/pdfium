---
title: PDFiumDocument
description: Represents a loaded PDF document
---

The `PDFiumDocument` class represents a loaded PDF document. It provides access to pages, bookmarks, attachments, and document-level operations like saving.

## Import

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using document = await pdfium.openDocument(data);
```

## Properties

### pageCount

The total number of pages in the document.

```typescript
get pageCount(): number
```

#### Example

```typescript
console.log(`Document has ${document.pageCount} pages`);
```

---

### attachmentCount

The number of file attachments embedded in the document.

```typescript
get attachmentCount(): number
```

#### Example

```typescript
if (document.attachmentCount > 0) {
  console.log(`Found ${document.attachmentCount} attachments`);
}
```

---

### handle

The internal document handle. Used for advanced WASM operations.

```typescript
get handle(): DocumentHandle
```

:::caution
This is an internal property for advanced use cases. Most users should not need to access this directly.
:::

---

### formHandle

The form fill environment handle for interactive forms.

```typescript
get formHandle(): FormHandle
```

:::caution
This is an internal property for advanced use cases.
:::

## Methods

### getPage()

Gets a specific page by its zero-based index.

```typescript
getPage(pageIndex: number): PDFiumPage
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageIndex` | `number` | Zero-based page index |

#### Returns

[`PDFiumPage`](/pdfium/api/classes/pdfium-page/) — The requested page.

#### Throws

- [`PageError`](/pdfium/errors/#pageerror) with code:
  - `PAGE_INDEX_OUT_OF_RANGE` (303) — Index is negative or >= pageCount
  - `PAGE_LOAD_FAILED` (301) — Failed to load the page

#### Example

```typescript
// Get the first page
using page = document.getPage(0);

// Get the last page
using lastPage = document.getPage(document.pageCount - 1);
```

---

### pages()

Returns a generator that yields all pages in order. Each page must be disposed after use.

```typescript
*pages(): Generator<PDFiumPage>
```

#### Yields

[`PDFiumPage`](/pdfium/api/classes/pdfium-page/) — Each page in sequence.

#### Example

```typescript
for (const page of document.pages()) {
  using p = page;
  console.log(`Page ${p.index}: ${p.width} x ${p.height}`);
}
```

:::tip
Always use the `using` keyword inside the loop to ensure each page is properly disposed before moving to the next.
:::

---

### getBookmarks()

Returns the document's bookmark (outline) tree.

```typescript
getBookmarks(): Bookmark[]
```

#### Returns

`Bookmark[]` — Array of top-level bookmarks with nested children.

#### Bookmark Interface

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Bookmark display text |
| `pageIndex` | `number \| undefined` | Target page index (if any) |
| `children` | `Bookmark[]` | Nested child bookmarks |

#### Example

```typescript
function printBookmarks(bookmarks: Bookmark[], indent = 0) {
  for (const bookmark of bookmarks) {
    const prefix = '  '.repeat(indent);
    const page = bookmark.pageIndex !== undefined ? ` (page ${bookmark.pageIndex + 1})` : '';
    console.log(`${prefix}- ${bookmark.title}${page}`);
    printBookmarks(bookmark.children, indent + 1);
  }
}

const bookmarks = document.getBookmarks();
printBookmarks(bookmarks);
```

---

### getAttachment()

Gets a specific attachment by its zero-based index.

```typescript
getAttachment(index: number): PDFAttachment
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `index` | `number` | Zero-based attachment index |

#### Returns

`PDFAttachment` — The attachment data.

#### PDFAttachment Interface

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | Attachment index |
| `name` | `string` | Original filename |
| `data` | `Uint8Array` | File contents |

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) — If index is out of range

#### Example

```typescript
const attachment = document.getAttachment(0);
console.log(`Attachment: ${attachment.name} (${attachment.data.byteLength} bytes)`);

// Save to disk
await fs.writeFile(attachment.name, attachment.data);
```

---

### getAttachments()

Gets all attachments embedded in the document.

```typescript
getAttachments(): PDFAttachment[]
```

#### Returns

`PDFAttachment[]` — Array of all attachments.

#### Example

```typescript
const attachments = document.getAttachments();

for (const attachment of attachments) {
  console.log(`${attachment.name}: ${attachment.data.byteLength} bytes`);
}
```

---

### save()

Saves the document to a byte array.

```typescript
save(options?: SaveOptions): Uint8Array
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `SaveOptions` | Optional save settings |

#### SaveOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flags` | `SaveFlags` | `None` | Save behaviour flags |
| `version` | `number` | — | PDF version (e.g., 17 for 1.7) |

#### SaveFlags Values

| Value | Description |
|-------|-------------|
| `None` | Default save (full rewrite) |
| `Incremental` | Append changes (preserves signatures) |
| `NoIncremental` | Force full rewrite |
| `RemoveSecurity` | Remove encryption |

#### Returns

`Uint8Array` — The saved PDF data.

#### Throws

- [`DocumentError`](/pdfium/errors/#documenterror) with code `DOC_SAVE_FAILED` (207)

#### Example

```typescript
import { SaveFlags } from '@scaryterry/pdfium';

// Basic save
const bytes = document.save();
await fs.writeFile('output.pdf', bytes);

// Incremental save (preserves digital signatures)
const bytes = document.save({ flags: SaveFlags.Incremental });

// Save as specific PDF version
const bytes = document.save({ version: 17 }); // PDF 1.7

// Remove encryption
const bytes = document.save({ flags: SaveFlags.RemoveSecurity });
```

## Resource Management

`PDFiumDocument` implements the `Disposable` interface. Always use the `using` keyword or call `dispose()`:

```typescript
// Recommended: using keyword
using document = await pdfium.openDocument(data);
// Document closed when scope exits

// Alternative: manual disposal
const document = await pdfium.openDocument(data);
try {
  // Use document...
} finally {
  document.dispose();
}
```

### dispose()

Closes the document and releases all resources.

```typescript
dispose(): void
```

:::caution
After calling `dispose()`:
- The document cannot be used
- All pages obtained from this document become invalid
- Any attempt to use the document throws `RESOURCE_DISPOSED` (900)
:::

## Complete Example

```typescript
import { PDFium, SaveFlags } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function processDocument() {
  const data = await fs.readFile('input.pdf');

  using pdfium = await PDFium.init();
  using document = await pdfium.openDocument(data);

  // Document info
  console.log(`Pages: ${document.pageCount}`);
  console.log(`Attachments: ${document.attachmentCount}`);

  // Process all pages
  for (const page of document.pages()) {
    using p = page;
    console.log(`Page ${p.index + 1}: ${p.width}x${p.height} points`);
  }

  // Extract bookmarks
  const bookmarks = document.getBookmarks();
  console.log(`Top-level bookmarks: ${bookmarks.length}`);

  // Extract attachments
  for (const attachment of document.getAttachments()) {
    await fs.writeFile(`attachments/${attachment.name}`, attachment.data);
  }

  // Save a copy
  const output = document.save({ version: 17 });
  await fs.writeFile('output.pdf', output);
}

processDocument();
```

## See Also

- [PDFium](/pdfium/api/classes/pdfium/) — Opening documents
- [PDFiumPage](/pdfium/api/classes/pdfium-page/) — Working with pages
- [Open Document Guide](/pdfium/guides/open-document/) — Detailed loading guide
- [Save Document Guide](/pdfium/guides/save-document/) — Save options explained
- [Bookmarks Guide](/pdfium/guides/bookmarks/) — Working with outlines
- [Attachments Guide](/pdfium/guides/attachments/) — Extracting embedded files
