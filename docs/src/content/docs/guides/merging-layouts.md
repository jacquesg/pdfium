---
title: Merging & Layouts
description: How to merge documents, import pages, and create N-up layouts
---

PDFium allows you to combine multiple documents into one or create "N-up" layouts (multiple pages per sheet) for printing.

## Merging Documents

You can import pages from one document into another. This is done using the `importPages` or `importPagesByIndex` methods.

### Basic Merge (Append All)

```typescript
import { PDFium } from '@scaryterry/pdfium';

using pdfium = await PDFium.init();
using destDoc = await pdfium.createDocument(); // Or open an existing one
using sourceDoc = await pdfium.openDocument(sourceBytes);

// Append all pages from sourceDoc to the end of destDoc
destDoc.importPages(sourceDoc);

// Save the result
const mergedBytes = destDoc.save();
```

### Partial Merge (Specific Pages)

You can specify a page range string (e.g., "1,3,5-7") or an array of indices.

```typescript
// Import pages 1, 3, and 5 through 7 (1-based index string)
destDoc.importPages(sourceDoc, { 
  pageRange: '1,3,5-7',
  insertIndex: 0 // Insert at the beginning
});

// OR: Import by zero-based index array
destDoc.importPagesByIndex(sourceDoc, [0, 2, 4], 0);
```

:::caution
Resources like fonts and images are copied into the destination document. Importing pages from many different source documents may result in a large file size due to duplicated resources.
:::

## N-Up Layouts (Printing)

"N-up" refers to placing multiple pages from a source document onto a single page in a new document. This is commonly used for printing handouts (e.g., 2 slides per page) or booklets.

### Creating a 2-Up Document

```typescript
using sourceDoc = await pdfium.openDocument(pdfBytes);

// Create a new document where every 2 source pages = 1 output page
// The output page size is A4 Landscape (842 x 595 points)
using nUpDoc = sourceDoc.createNUpDocument({
  outputWidth: 842,
  outputHeight: 595,
  pagesPerRow: 2,
  pagesPerColumn: 1
});

if (nUpDoc) {
  const bytes = nUpDoc.save();
  // nUpDoc is a completely new document instance
}
```

### Common Layouts

| Layout | Rows | Cols | Orientation |
|--------|------|------|-------------|
| **2-Up** (Side-by-side) | 1 | 2 | Landscape |
| **4-Up** (Grid) | 2 | 2 | Portrait |
| **6-Up** (Handouts) | 3 | 2 | Portrait |

## Copying Viewer Preferences

When merging documents, you might want to preserve the viewer preferences (like "Two Page View" or "Print Scaling") from the source.

```typescript
// Copy preferences (PrintScaling, Duplex, NumCopies, etc.)
destDoc.copyViewerPreferences(sourceDoc);
```
