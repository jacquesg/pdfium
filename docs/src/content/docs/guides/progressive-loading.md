---
title: Progressive Loading
description: Working with linearised PDFs and streaming document loading
---

This guide covers progressive PDF loading using `ProgressivePDFLoader`, which enables linearisation detection and incremental document loading.

## What is Linearisation?

**Linearised PDFs** (also called "fast web view" or "optimised for web") are structured so the first page can be displayed before the entire document is downloaded. This is useful for:

- Large documents over slow connections
- Web-based PDF viewers
- Streaming scenarios

## Prerequisites

- Understanding of [Document Lifecycle](/pdfium/concepts/document-lifecycle/)
- Familiarity with [Open Document](/pdfium/guides/open-document/)

## Checking Linearisation Status

Even with a complete buffer, `ProgressivePDFLoader` can detect if a PDF is linearised:

```typescript
import { PDFium, LinearisationStatus } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function checkLinearisation(filePath: string) {
  const pdfData = await fs.readFile(filePath);

  using pdfium = await PDFium.init();
  using loader = pdfium.createProgressiveLoader(pdfData);

  const status = loader.linearisationStatus;

  switch (status) {
    case LinearisationStatus.Linearised:
      console.log('Document is linearised (optimised for web)');
      break;
    case LinearisationStatus.NotLinearised:
      console.log('Document is not linearised');
      break;
    case LinearisationStatus.Unknown:
      console.log('Linearisation status could not be determined');
      break;
  }

  // Convenience boolean
  if (loader.isLinearised) {
    console.log('Fast web view is enabled');
  }
}
```

## Loading Documents Progressively

### From Complete Buffer

For complete buffers, use the loader primarily for linearisation detection:

```typescript
using pdfium = await PDFium.init();
using loader = pdfium.createProgressiveLoader(pdfData);

// Check if data is fully available
if (loader.isDocumentAvailable) {
  using document = loader.getDocument();
  console.log(`Loaded ${document.pageCount} pages`);
}
```

### Checking Page Availability

For linearised documents, you can check if specific pages are available:

```typescript
using loader = pdfium.createProgressiveLoader(pdfData);

// Check if specific pages are ready
if (loader.isPageAvailable(0)) {
  console.log('First page is available');
}

// For linearised PDFs, get the first available page number
const firstPage = loader.firstPageNumber;
if (firstPage >= 0) {
  console.log(`First available page: ${firstPage}`);
}
```

## ProgressivePDFLoader API

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `linearisationStatus` | `LinearisationStatus` | Detailed linearisation status |
| `isLinearised` | `boolean` | `true` if document is linearised |
| `isDocumentAvailable` | `boolean` | `true` if full document data is available |
| `firstPageNumber` | `number` | First available page index, or -1 |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isPageAvailable(index)` | `boolean` | Check if a specific page is available |
| `getDocument()` | `PDFiumDocument` | Get the loaded document |

## LinearisationStatus Enum

```typescript
enum LinearisationStatus {
  NotLinearised = 0,  // Document is not linearised
  Linearised = 1,     // Document is linearised
  Unknown = -1,       // Status cannot be determined
}
```

## DocumentAvailability Enum

Used internally to check data availability:

```typescript
enum DocumentAvailability {
  DataNotAvailable = 0,  // Data is not yet available
  DataAvailable = 1,     // Data is available
  DataError = -1,        // Error checking availability
}
```

## Common Patterns

### Linearisation Check Utility

```typescript
import { PDFium, LinearisationStatus } from '@scaryterry/pdfium';

interface LinearisationInfo {
  isLinearised: boolean;
  status: string;
  firstPageAvailable: number;
}

async function getLinearisationInfo(data: Uint8Array): Promise<LinearisationInfo> {
  using pdfium = await PDFium.init();
  using loader = pdfium.createProgressiveLoader(data);

  const statusMap: Record<LinearisationStatus, string> = {
    [LinearisationStatus.Linearised]: 'Linearised',
    [LinearisationStatus.NotLinearised]: 'Not Linearised',
    [LinearisationStatus.Unknown]: 'Unknown',
  };

  return {
    isLinearised: loader.isLinearised,
    status: statusMap[loader.linearisationStatus],
    firstPageAvailable: loader.firstPageNumber,
  };
}
```

### Conditional Loading Strategy

```typescript
async function loadDocument(data: Uint8Array) {
  using pdfium = await PDFium.init();

  // Try progressive loading first to check linearisation
  using loader = pdfium.createProgressiveLoader(data);

  if (loader.isLinearised) {
    console.log('Using progressive loading for linearised PDF');

    // For linearised PDFs, you can start rendering the first page
    // immediately while the rest loads
    if (loader.isPageAvailable(0)) {
      using document = loader.getDocument();
      using page = document.getPage(0);
      return page.render({ scale: 1 });
    }
  }

  // Fall back to standard loading
  console.log('Using standard loading');
  using document = await pdfium.openDocument(data);
  using page = document.getPage(0);
  return page.render({ scale: 1 });
}
```

### Batch Linearisation Check

```typescript
async function checkMultipleFiles(files: string[]) {
  using pdfium = await PDFium.init();

  const results = [];

  for (const filePath of files) {
    const data = await fs.readFile(filePath);
    using loader = pdfium.createProgressiveLoader(data);

    results.push({
      file: filePath,
      isLinearised: loader.isLinearised,
      size: data.length,
    });
  }

  // Report
  const linearised = results.filter(r => r.isLinearised);
  console.log(`${linearised.length}/${results.length} files are linearised`);

  return results;
}
```

## Complete Example

```typescript
import { PDFium, LinearisationStatus } from '@scaryterry/pdfium';
import { promises as fs } from 'fs';

async function analyseAndLoadPDF(filePath: string) {
  const pdfData = await fs.readFile(filePath);

  using pdfium = await PDFium.init();

  // Create progressive loader
  using loader = pdfium.createProgressiveLoader(pdfData);

  // Report linearisation status
  console.log('=== PDF Analysis ===');
  console.log(`File: ${filePath}`);
  console.log(`Size: ${pdfData.length} bytes`);
  console.log(`Linearised: ${loader.isLinearised ? 'Yes' : 'No'}`);
  console.log(`Document available: ${loader.isDocumentAvailable ? 'Yes' : 'No'}`);

  if (loader.isLinearised) {
    console.log(`First page number: ${loader.firstPageNumber}`);
  }

  // Load the document
  if (!loader.isDocumentAvailable) {
    throw new Error('Document data not fully available');
  }

  using document = loader.getDocument();
  console.log(`\n=== Document Info ===`);
  console.log(`Pages: ${document.pageCount}`);

  // Check page availability for first 5 pages
  console.log('\n=== Page Availability ===');
  for (let i = 0; i < Math.min(5, document.pageCount); i++) {
    const available = loader.isPageAvailable(i);
    console.log(`Page ${i + 1}: ${available ? 'Available' : 'Not available'}`);
  }

  // Render first page
  using page = document.getPage(0);
  const { width, height } = page.render({ scale: 1 });
  console.log(`\nFirst page rendered: ${width}×${height}`);
}

// Run
analyseAndLoadPDF('document.pdf').catch(console.error);
```

## When to Use Progressive Loading

**Use `ProgressivePDFLoader` when:**

- You need to check if a PDF is linearised
- You're building a web viewer that shows pages as they download
- You want to display the first page before the full download completes
- You need to validate PDF structure before full loading

**Use standard `openDocument()` when:**

- You have the complete file and just need to process it
- You don't care about linearisation status
- Simplicity is preferred

## Limitations

- Progressive loading of partial data streams is not exposed in the high-level API
- The current implementation works best with complete buffers
- True streaming (byte-by-byte) requires lower-level WASM interaction

## See Also

- [Open Document Guide](/pdfium/guides/open-document/) — Standard document loading
- [ProgressivePDFLoader](/pdfium/api/classes/progressive-pdf-loader/) — API reference
- [LinearisationStatus](/pdfium/api/enums/linearisation-status/) — Status enum
- [DocumentAvailability](/pdfium/api/enums/document-availability/) — Availability enum
