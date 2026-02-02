---
title: NativePDFiumDocument
description: API reference for NativePDFiumDocument class
---

`NativePDFiumDocument` represents a loaded PDF document backed by the native PDFium addon. It supports core operations including page access, text extraction, rendering, bookmarks, and save/export.

## Import

```typescript
import { NativePDFiumInstance } from '@scaryterry/pdfium';
```

Documents are obtained from `NativePDFiumInstance.openDocument()`:

```typescript
const pdfium = await PDFium.initNative();
if (pdfium) {
  using doc = pdfium.openDocument(pdfBytes);
}
```

## Properties

### pageCount

Number of pages in the document.

```typescript
get pageCount(): number
```

### fileVersion

PDF file version (e.g., 14 for PDF 1.4, 17 for PDF 1.7).

```typescript
get fileVersion(): number | undefined
```

### permissions

Document permissions bitmask.

```typescript
get permissions(): number
```

### userPermissions

User permissions bitmask.

```typescript
get userPermissions(): number
```

### pageMode

Initial page mode when the document is opened.

```typescript
get pageMode(): PageMode
```

### securityHandlerRevision

Security handler revision, or -1 if unencrypted.

```typescript
get securityHandlerRevision(): number
```

### signatureCount

Number of digital signatures in the document.

```typescript
get signatureCount(): number
```

### attachmentCount

Number of file attachments in the document.

```typescript
get attachmentCount(): number
```

## Page Methods

### getPage()

Load a specific page by index.

```typescript
getPage(pageIndex: number): NativePDFiumPage
```

**Throws:** `DocumentError` if the page index is out of range.

**Example:**

```typescript
using page = doc.getPage(0);
console.log(`Page size: ${page.width}x${page.height}`);
```

### pages()

Iterate over all pages in the document.

```typescript
*pages(): Generator<NativePDFiumPage>
```

Each yielded page must be disposed by the caller.

**Example:**

```typescript
for (const page of doc.pages()) {
  using p = page;
  console.log(p.getText());
}
```

## Metadata Methods

### getMetadata()

Get all standard metadata fields.

```typescript
getMetadata(): DocumentMetadata
```

**Example:**

```typescript
const meta = doc.getMetadata();
console.log(`Title: ${meta.title}`);
console.log(`Author: ${meta.author}`);
```

### getMetaText()

Get a specific metadata field by tag name.

```typescript
getMetaText(tag: string): string | undefined
```

Valid tags: `Title`, `Author`, `Subject`, `Keywords`, `Creator`, `Producer`, `CreationDate`, `ModDate`.

### isTagged()

Check if the document is tagged (accessible).

```typescript
isTagged(): boolean
```

### getPageLabel()

Get the label for a specific page.

```typescript
getPageLabel(pageIndex: number): string | undefined
```

## Bookmark Methods

### getBookmarks()

Get the bookmark (outline) tree.

```typescript
getBookmarks(): Bookmark[]
```

Returns an empty array if no bookmarks exist.

### bookmarks()

Iterate over top-level bookmarks lazily.

```typescript
*bookmarks(): Generator<Bookmark>
```

**Example:**

```typescript
for (const bookmark of doc.bookmarks()) {
  console.log(`${bookmark.title} -> page ${bookmark.pageIndex}`);
}
```

## Signature Methods

### hasSignatures()

Check if the document has digital signatures.

```typescript
hasSignatures(): boolean
```

### getSignature()

Get a digital signature by index.

```typescript
getSignature(index: number): PDFSignature | undefined
```

### getSignatures()

Get all digital signatures.

```typescript
getSignatures(): PDFSignature[]
```

## Attachment Methods

### getAttachment()

Get an attachment by index.

```typescript
getAttachment(index: number): PDFAttachment | undefined
```

### getAttachments()

Get all attachments.

```typescript
getAttachments(): PDFAttachment[]
```

**Example:**

```typescript
for (const att of doc.getAttachments()) {
  console.log(`${att.name}: ${att.data.length} bytes`);
}
```

## Save/Export Methods

### save()

Save the document to a byte array.

```typescript
save(options?: SaveOptions): Uint8Array
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `flags` | `SaveFlags` | Save flags (default: `SaveFlags.None`) |
| `version` | `number` | PDF version (e.g., 17 for PDF 1.7) |

**Example:**

```typescript
const bytes = doc.save();
await fs.writeFile('output.pdf', bytes);

// Save as PDF 1.7
const pdf17 = doc.save({ version: 17 });
```

## Page Import Methods

### importPages()

Import pages from a source document.

```typescript
importPages(source: NativePDFiumDocument, options?: ImportPagesOptions): void
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `pageRange` | `string` | Page range (e.g., "1,3,5-7") |
| `insertIndex` | `number` | Insertion point (default: end) |

**Example:**

```typescript
// Import all pages
doc.importPages(sourceDoc);

// Import specific pages at position 2
doc.importPages(sourceDoc, { pageRange: "1,3", insertIndex: 2 });
```

### importPagesByIndex()

Import pages by zero-based index array.

```typescript
importPagesByIndex(
  source: NativePDFiumDocument,
  pageIndices: number[],
  insertIndex?: number
): void
```

### createNUpDocument()

Create a new document with N-up layout.

```typescript
createNUpDocument(options: NUpLayoutOptions): NativePDFiumDocument | undefined
```

**Example:**

```typescript
const nup = doc.createNUpDocument({
  outputWidth: 842,
  outputHeight: 595,
  pagesPerRow: 2,
  pagesPerColumn: 1,
});

if (nup) {
  const bytes = nup.save();
  nup.dispose();
}
```

### copyViewerPreferences()

Copy viewer preferences from another document.

```typescript
copyViewerPreferences(source: NativePDFiumDocument): boolean
```

## Resource Management

```typescript
// Automatic cleanup with using
{
  using doc = pdfium.openDocument(data);
  // Pages opened from doc are tracked
  const page = doc.getPage(0);
  // When doc is disposed, pages are automatically closed
}

// Manual cleanup
const doc = pdfium.openDocument(data);
try {
  // Use document...
} finally {
  doc.dispose();
}
```

## See Also

- [NativePDFiumInstance](/pdfium/api/classes/native-pdfium-instance/) — Instance class
- [NativePDFiumPage](/pdfium/api/classes/native-pdfium-page/) — Page class
- [PDFiumDocument](/pdfium/api/classes/pdfium-document/) — WASM document class
